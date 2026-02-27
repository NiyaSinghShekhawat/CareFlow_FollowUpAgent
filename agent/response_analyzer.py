import os
import json
import google.generativeai as genai
from typing import Any, Dict, List
from . import alerts
from . import whatsapp

def parse_patient_reply(raw_reply: str, parameters: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Uses Gemini to extract numerical ratings and subjective comments from WhatsApp text.
    """
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    if not GEMINI_API_KEY:
        return {"parsed": {}, "subjective": "Analysis failed: API Key missing"}

    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-1.5-flash')

    param_desc = []
    for p in parameters:
        qtype = p.get("questionType", "rate")
        desc = f"- {p['name']} ({qtype})"
        if qtype == "rate": desc += " (Scale 0-5)"
        elif qtype == "yesno": desc += " (Yes/No)"
        elif qtype == "value": desc += f" ({p.get('unit', '')})"
        param_desc.append(desc)

    prompt = f"""
    Extract health data from this patient WhatsApp message.
    
    Message: "{raw_reply}"
    
    Parameters to extract:
    {chr(10).join(param_desc)}
    
    Return a JSON object:
    {{
      "parsed": {{ "ParameterName": value, ... }},
      "subjective": "Brief summary of patient's emotional state or specific complaints"
    }}
    
    For missing values, use null. For Yes/No, use "yes" or "no".
    """

    try:
        response = model.generate_content(prompt)
        text = response.text.strip().replace("```json", "").replace("```", "")
        return json.loads(text)
    except Exception as e:
        print(f"❌ Parsing Error: {e}")
        return {"parsed": {}, "subjective": "Error parsing response"}

def check_alarms(parsed: Dict[str, Any], parameters: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Checks parsed values against doctor-defined thresholds.
    """
    crossed = []
    for param in parameters:
        name = param["name"]
        val = parsed.get(name)
        if val is None:
            continue
        
        qtype = param["questionType"]
        if qtype == "rate":
            try:
                if float(val) >= float(param.get("alarmingRate", 5)):
                    crossed.append(param)
            except: pass
        elif qtype == "yesno":
            if str(val).lower() == str(param.get("alarmingAnswer", "yes")).lower():
                crossed.append(param)
        elif qtype == "value":
            try:
                val_num = float(val)
                lo = param.get("alarmingValueMin")
                hi = param.get("alarmingValueMax")
                if (lo is not None and val_num < lo) or (hi is not None and val_num > hi):
                    crossed.append(param)
            except: pass
    return crossed

def compute_condition_category(
    crossed_params: List[Dict[str, Any]],
    parameters: List[Dict[str, Any]],
    parsed: Dict[str, Any]
) -> str:
    """
    Determines overall condition category for the day.
    """
    critical_keywords = [
        "chest", "heart", "cardiac", "pulse", "bp",
        "blood pressure", "breathing", "oxygen"
    ]

    crossed_count = len(crossed_params)
    has_critical_param = any(
        any(kw in c["name"].lower() for kw in critical_keywords)
        for c in crossed_params
    )

    if crossed_count == 0:
        return "normal"
    elif crossed_count >= 2 or has_critical_param:
        return "critical"
    else:
        return "note"

def compute_status_per_parameter(
    parameters: List[Dict[str, Any]],
    today_parsed: Dict[str, Any],
    yesterday_parsed: Dict[str, Any]
) -> Dict[str, str]:
    """
    Computes improving/stable/deteriorating for EACH parameter.
    """
    status = {}

    for param in parameters:
        name = param["name"]
        qtype = param["questionType"]
        today = today_parsed.get(name)
        yesterday = yesterday_parsed.get(name)

        if today is None or yesterday is None:
            status[name] = "stable"
            continue

        if qtype == "rate":
            try:
                if float(today) < float(yesterday): status[name] = "improving"
                elif float(today) > float(yesterday): status[name] = "deteriorating"
                else: status[name] = "stable"
            except: status[name] = "stable"

        elif qtype == "yesno":
            alarming = str(param.get("alarmingAnswer", "yes")).lower()
            today_str = str(today).lower()
            yesterday_str = str(yesterday).lower()

            if today_str == alarming and yesterday_str != alarming:
                status[name] = "deteriorating"
            elif today_str != alarming and yesterday_str == alarming:
                status[name] = "improving"
            else:
                status[name] = "stable"

        elif qtype == "value":
            try:
                today_val = float(today)
                yesterday_val = float(yesterday)
                lo = param.get("alarmingValueMin")
                hi = param.get("alarmingValueMax")

                if lo is not None and hi is not None:
                    normal_mid = (lo + hi) / 2
                    today_dist = abs(today_val - normal_mid)
                    yesterday_dist = abs(yesterday_val - normal_mid)

                    if today_dist < yesterday_dist: status[name] = "improving"
                    elif today_dist > yesterday_dist: status[name] = "deteriorating"
                    else: status[name] = "stable"
                else:
                    if today_val < yesterday_val: status[name] = "improving"
                    elif today_val > yesterday_val: status[name] = "deteriorating"
                    else: status[name] = "stable"
            except: status[name] = "stable"

    return status

def analyze_patient_response(
    patient: Dict[str, Any],
    day_number: int,
    ratings: Dict[str, Any],
    subjective: str,
    crossed_params: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Uses Gemini to generate clinical summary and patient reply.
    """
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-1.5-flash')

    prompt = f"""
    Internal Clinical Analysis:
    Patient: {patient.get('patientName', 'N/A')}
    Surgery: {patient.get('surgeryType', 'N/A')}
    Day: {day_number}
    Ratings: {json.dumps(ratings)}
    Subjective: "{subjective}"
    Alarms Triggered: {[p['name'] for p in crossed_params]}
    
    Return a JSON object:
    {{
      "overall_status": "good/warning/critical",
      "trend": "improving/stable/declining",
      "alert_doctor": boolean,
      "alerted_parameters": list of names,
      "doctor_summary": "1-sentence summary for the clinician",
      "patient_reply": "Empathetic 1-sentence reply to the patient"
    }}
    """
    try:
        response = model.generate_content(prompt)
        text = response.text.strip().replace("```json", "").replace("```", "")
        return json.loads(text)
    except:
        return {{}}

def run_full_analysis_pipeline(
    patient: Dict[str, Any],
    day_number: int,
    raw_reply: str
) -> Dict[str, Any]:
    """Master pipeline — now includes both criteria"""

    # 1. Parse ratings
    parsed_result = parse_patient_reply(raw_reply, patient.get("parameters", []))
    today_parsed = parsed_result.get("parsed", {})
    subjective = parsed_result.get("subjective", "")

    # 2. Check alarms
    crossed = check_alarms(today_parsed, patient.get("parameters", []))

    # 3. Compute condition category (overall day)
    condition_category = compute_condition_category(
        crossed, patient.get("parameters", []), today_parsed
    )

    # 4. Compute status per parameter (vs yesterday)
    yesterday_parsed = patient.get("lastRatings", {})
    status_per_param = compute_status_per_parameter(
        patient.get("parameters", []),
        today_parsed,
        yesterday_parsed
    )

    # 5. Gemini full analysis
    analysis = analyze_patient_response(
        patient=patient,
        day_number=day_number,
        ratings=today_parsed,
        subjective=subjective,
        crossed_params=crossed
    )

    # Attach both criteria to analysis result
    analysis["ratings"] = today_parsed
    analysis["subjective"] = subjective
    analysis["crossed_parameters"] = crossed
    analysis["condition_category"] = condition_category
    analysis["status_per_parameter"] = status_per_param

    return analysis
