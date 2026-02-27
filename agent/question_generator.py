import os
import json
import google.generativeai as genai
from typing import Any, Dict, List

def generate_standard_q1(patient_name: str, doctor_name: str, day_number: int, total_days: int) -> str:
    """
    Returns the hardcoded standard first question.
    """
    return (
        f"🏥 *CareFlow — Day {day_number} Recovery Check-in*\n\n"
        f"Hello {patient_name} 👋 This is your Day {day_number} of {total_days} check-in "
        f"from Dr. {doctor_name}.\n\n"
        "1. *How is your condition currently?*\n"
        "   A) Normal\n"
        "   B) Moderate\n"
        "   C) Critical\n\n"
        "_Please reply with A, B, or C._"
    )

from .firebase_client import get_firestore, get_patient_actions

def generate_parameter_questions(patient: Dict[str, Any], day_number: int) -> str:
    """
    Uses Gemini to generate personalized questions for all parameters, 
    referencing both yesterday's answers and overall treatment history.
    """
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    if not GEMINI_API_KEY:
        return "System error: API Key missing."

    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-1.5-flash')

    db = get_firestore()
    patient_id = patient.get("id") or patient.get("patientDocId")
    
    # 1. Fetch Treatment History (Actions)
    history_str = "No prior treatment history found."
    if patient_id:
        actions = get_patient_actions(db, patient_id)
        if actions:
            history_str = "\n".join([f"- {a.get('type')}: {a.get('description')}" for a in actions[-10:]]) # last 10 actions

    parameters = patient.get("parameters", [])
    last_ratings = patient.get("lastRatings", {})
    last_subjective = patient.get("lastSubjective", "")
    patient_name = patient.get("patientName", "Patient")
    surgery_type = patient.get("surgeryType", "recovery")

    # Construct context for Gemini
    params_context = []
    for p in parameters:
        p_name = p['name']
        p_type = p['questionType']
        p_unit = p.get('unit', '')
        last_val = last_ratings.get(p_name, "N/A")
        
        ctx = f"- Name: {p_name}, Type: {p_type}, Unit: {p_unit}, Last Answer: {last_val}"
        if p_type == "rate":
            ctx += f" (Scale: 0={p.get('scaleZero', 'Low')}, 5={p.get('scaleFive', 'High')})"
        params_context.append(ctx)

    prompt = f"""
    You are a professional medical assistant helping Dr. {patient.get('doctorName', 'Mehta')}.
    Generate the Day {day_number} follow-up questions for {patient_name}.
    
    TREATMENT HISTORY (Key Actions):
    {history_str}
    
    MONITORING PARAMETERS & YESTERDAY'S ANSWERS:
    {chr(10).join(params_context)}
    
    Patient's Summary Yesterday: "{last_subjective if last_subjective else 'No comment provided'}"
    
    YOUR TASK:
    Generate a single WhatsApp message containing all parameter questions plus one final subjective question.
    
    GUIDELINES:
    - Reference specific events from the TREATMENT HISTORY or yesterday's answers to make the questions personalized. (e.g., "Given your surgery on Tuesday...", "You mentioned pain was a 3 yesterday...")
    - Group by type: 🔢 Values, ✅ Yes/No, 💬 overall feeling.
    - FOR RATING QUESTIONS: Do NOT use numbers 0-5. Instead, ask the patient to choose between "Mild", "Medium", or "Severe" (e.g., "Is your pain Mild, Medium, or Severe?").
    - Question numbering starts from 2.
    - Use WhatsApp formatting (*bold*, _italic_).
    - Tone: Empathetic, supportive, and precise.
    
    Return ONLY the raw message text.
    """

    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        # Ensure we don't have markdown code block wraps if Gemini adds them
        text = text.replace("```text", "").replace("```", "").strip()
        
        intro = f"Thank you {patient_name}! Based on your records and yesterday's update, please answer the following:\n\n"
        return intro + text
    except Exception as e:
        print(f"❌ Gemini Error generating questions: {e}")
        return f"Thank you {patient_name}! Please answer the remaining check-in questions for your parameters."
