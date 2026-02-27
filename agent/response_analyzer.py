import os
import json
import google.generativeai as genai
from typing import Any, Dict, List
from . import alerts
from . import whatsapp

def parse_q1_answer(raw_reply: str) -> str:
    """
    Extracts 'normal', 'moderate', or 'critical' from Q1 response.
    """
    reply = str(raw_reply).strip().lower()
    
    # Direct matches
    if reply in ['a', 'a)', '1', 'normal', 'option a']:
        return "normal"
    if reply in ['b', 'b)', '2', 'moderate', 'option b', 'warning']:
        return "moderate"
    if reply in ['c', 'c)', '3', 'critical', 'option c', 'emergency']:
        return "critical"
    
    # Keyword search
    if "normal" in reply: return "normal"
    if "moderate" in reply: return "moderate"
    if "critical" in reply or "emergency" in reply: return "critical"
    
    # Default to normal if unclear but not empty
    return "normal"

def parse_parameter_replies(raw_reply: str, parameters: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Uses Gemini to extract numerical ratings and subjective comments from mixed WhatsApp text.
    """
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    if not GEMINI_API_KEY:
        return {"ratings": {}, "subjective": "Analysis failed: API Key missing"}

    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-1.5-flash')

    param_desc = []
    for p in parameters:
        qtype = p.get("questionType", "rate")
        desc = f"- {p['name']} ({qtype})"
        if qtype == "rate": desc += " (Scale 0-5)"
        elif qtype == "yesno": desc += " (expecting 'yes' or 'no')"
        elif qtype == "value": desc += f" ({p.get('unit', '')})"
        param_desc.append(desc)

    prompt = f"""
    Extract health data from this patient's WhatsApp message containing answers to multiple questions.
    
    Message: "{raw_reply}"
    
    Parameters to extract:
    {chr(10).join(param_desc)}
    
    YOUR TASK:
    Identify which answer belongs to which parameter. Patients might answer in a single block or mixed text (Hinglish).
    
    Return a JSON object:
    {{
      "ratings": {{ "ParameterName": value, ... }},
      "subjective": "The patient's open-ended response to the final overall feeling question"
    }}
    
    RULES:
    - For Yes/No, return exactly "yes" or "no".
    - For missing values, use null.
    """

    try:
        response = model.generate_content(prompt)
        text = response.text.strip().replace("```json", "").replace("```", "")
        return json.loads(text)
    except Exception as e:
        print(f"❌ Parsing Error: {e}")
        return {"ratings": {}, "subjective": "Error parsing response"}

def check_alarms(ratings: Dict[str, Any], parameters: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Checks parsed values against doctor-defined thresholds.
    """
    crossed = []
    for param in parameters:
        name = param["name"]
        val = ratings.get(name)
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
                # Value parsing (handling 120/80 etc)
                val_str = str(val).split('/')[0] # Check systolic for BP mostly
                val_num = float(val_str)
                lo = param.get("alarmingValueMin")
                hi = param.get("alarmingValueMax")
                if (lo is not None and val_num < lo) or (hi is not None and val_num > hi):
                    crossed.append(param)
            except: pass
    return crossed

def compute_condition_category(
    q1_answer: str,
    crossed_params: List[Dict[str, Any]],
    parameters: List[Dict[str, Any]]
) -> str:
    """
    Determines overall condition category for the day.
    q1_answer: 'normal' | 'moderate' | 'critical'
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

    # Priority 1: Self-reported Critical or Severe Alarms
    if q1_answer == "critical" or crossed_count >= 2 or has_critical_param:
        return "critical"
    
    # Priority 2: Self-reported Moderate or Single Alarm
    if q1_answer == "moderate" or crossed_count == 1:
        return "note"
    
    return "normal"

def compute_status_per_parameter(
    parameters: List[Dict[str, Any]],
    today_ratings: Dict[str, Any],
    yesterday_ratings: Dict[str, Any]
) -> Dict[str, str]:
    """
    Computes improving/stable/deteriorating for EACH parameter.
    """
    status = {}

    for param in parameters:
        name = param["name"]
        qtype = param["questionType"]
        today = today_ratings.get(name)
        yesterday = yesterday_ratings.get(name)

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
                # Basic float comparison for values
                today_val = float(str(today).split('/')[0])
                yesterday_val = float(str(yesterday).split('/')[0])
                
                lo = param.get("alarmingValueMin")
                hi = param.get("alarmingValueMax")

                if lo is not None and hi is not None:
                    # Target center of range
                    target = (lo + hi) / 2
                    if abs(today_val - target) < abs(yesterday_val - target):
                        status[name] = "improving"
                    elif abs(today_val - target) > abs(yesterday_val - target):
                        status[name] = "deteriorating"
                    else:
                        status[name] = "stable"
                else:
                    if today_val < yesterday_val: status[name] = "improving"
                    elif today_val > yesterday_val: status[name] = "deteriorating"
                    else: status[name] = "stable"
            except: status[name] = "stable"

    return status

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
    raw_reply: str,
    q1_answer: str
) -> Dict[str, Any]:
    """Master pipeline — now includes both criteria and two-step flow"""

    # 1. Parse ratings from Step 2 reply
    parsed_result = parse_parameter_replies(raw_reply, patient.get("parameters", []))
    today_ratings = parsed_result.get("ratings", {})
    subjective = parsed_result.get("subjective", "")

    # 2. Check alarms
    crossed = check_alarms(today_ratings, patient.get("parameters", []))

    # 3. Compute condition category (overall day)
    condition_category = compute_condition_category(
        q1_answer, crossed, patient.get("parameters", [])
    )

    # 4. Compute status per parameter (vs yesterday)
    yesterday_ratings = patient.get("lastRatings", {})
    status_per_param = compute_status_per_parameter(
        patient.get("parameters", []),
        today_ratings,
        yesterday_ratings
    )

    # 5. Gemini full analysis for clinician summary and patient empathetic reply
    analysis = analyze_patient_response(
        patient=patient,
        day_number=day_number,
        ratings=today_ratings,
        subjective=subjective,
        crossed_params=crossed
    )

    # Attach both criteria to analysis result
    analysis["ratings"] = today_ratings
    analysis["subjective"] = subjective
    analysis["crossed_parameters"] = crossed
    analysis["condition_category"] = condition_category
    analysis["status_per_parameter"] = status_per_param

    return analysis
