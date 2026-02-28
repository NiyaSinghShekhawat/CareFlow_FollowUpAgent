# agent/question_generator.py — Cleaned up with AI + template fallback

import os
from .ai_client import ask_ai
from dotenv import load_dotenv
load_dotenv()


# ──────────────────────────────────────────────────────────
# Q1 — Standard first question (always the same)
# ──────────────────────────────────────────────────────────
def build_q1(patient: dict) -> str:
    """Standard Q1: always sent at the start of a check-in."""
    day = patient.get("currentDay", 1)
    name = patient.get("patientName", "Patient")
    doctor = patient.get("doctorName", "your doctor")
    return (
        f"*CareFlow - Day {day} Check-in*\n\n"
        f"Hello *{name}*\n\n"
        f"This is your daily check-in from "
        f"*Dr. {doctor}*.\n\n"
        f"*Q1. How is your condition right now?*\n\n"
        f"   A) Normal - recovering well\n"
        f"   B) Moderate - some discomfort\n"
        f"   C) Critical - need help urgently\n\n"
        f"Please reply with *A*, *B*, or *C*"
    )


# ──────────────────────────────────────────────────────────
# Parameter Questions
# ──────────────────────────────────────────────────────────
def build_parameter_questions(patient: dict) -> str:
    """
    Builds numbered parameter questions.
    Uses AI first, falls back to template if AI fails.
    """
    params = patient.get("parameters", [])

    if not params:
        return (
            "Please answer:\n\n"
            "2. Rate your pain from 0 to 5 (0=no pain, 5=severe)\n"
            "3. Do you have fever? (Yes/No)\n"
            "4. How are you feeling overall?"
        )

    # Try AI-generated
    ai_result = _ai_questions(patient, params)
    if ai_result:
        return ai_result

    # Always-working template fallback
    return _template_questions(patient, params)


def generate_parameter_questions(patient: dict, day_number: int) -> str:
    """Alias used by existing call-sites."""
    return build_parameter_questions(patient)


def generate_todays_questions(patient: dict, day_number: int) -> str:
    """Alias used by existing call-sites."""
    return build_parameter_questions(patient)


# ──────────────────────────────────────────────────────────
# AI Generation
# ──────────────────────────────────────────────────────────
def _ai_questions(patient: dict, params: list) -> str:
    """Generate questions using Groq via ai_client."""
    param_text = ""
    for p in params:
        qtype = p.get("questionType", "rate")
        name  = p.get("name", "")
        desc  = p.get("description", "")

        if qtype == "rate":
            param_text += (
                f"\n- {name} [RATE 0-5]: {desc} | "
                f"0={p.get('scaleZero', 'best')}, "
                f"5={p.get('scaleFive', 'worst')}"
            )
        elif qtype == "yesno":
            param_text += f"\n- {name} [YES/NO]: {desc}"
        elif qtype == "value":
            param_text += (
                f"\n- {name} [VALUE in {p.get('unit', '')}]: {desc}"
            )

    last = patient.get("lastRatings", {})
    yesterday = (
        ", ".join([f"{k}={v}" for k, v in last.items()])
        if last else "No previous data"
    )

    prompt = f"""Generate WhatsApp check-in questions for a post-surgery patient.

Patient: {patient.get('patientName', 'Patient')}
Surgery: {patient.get('surgeryType', '')}
Day: {patient.get('currentDay', 1)} of {patient.get('followupDays', 7)}
Yesterday: {yesterday}

Parameters to ask:{param_text}

Rules:
- Number questions starting from 2 (Q1 was already asked)
- RATE: ask to rate 0-5 with scale shown
- YES/NO: ask clear yes or no question
- VALUE: ask for actual measurement with unit example
- Add one open-ended question at the end
- Keep tone warm and simple
- No markdown headers, just numbered questions

Output ONLY the questions, nothing else."""

    try:
        result = ask_ai(prompt)
        if result and len(result) > 50:
            return result
    except Exception as e:
        print(f"[WARN] AI question generation failed: {e}")
    return None


# ──────────────────────────────────────────────────────────
# Template Fallback (100% reliable)
# ──────────────────────────────────────────────────────────
def _template_questions(patient: dict, params: list) -> str:
    lines = []
    num = 2

    rate_params  = [p for p in params if p.get("questionType") == "rate"]
    yesno_params = [p for p in params if p.get("questionType") == "yesno"]
    value_params = [p for p in params if p.get("questionType") == "value"]

    if rate_params:
        lines.append("*Rate 0 to 5 (0=best, 5=worst):*")
        for p in rate_params:
            z = p.get("scaleZero", "no issue")
            f5 = p.get("scaleFive", "very severe")
            last_val = patient.get("lastRatings", {}).get(p["name"])
            yesterday_note = f" (Yesterday: {last_val})" if last_val is not None else ""
            lines.append(
                f"{num}. *{p['name']}:* {p.get('description', '')}{yesterday_note}\n"
                f"   (0={z}, 5={f5})"
            )
            num += 1

    if yesno_params:
        lines.append("\n*Yes or No:*")
        for p in yesno_params:
            lines.append(
                f"{num}. *{p['name']}:* {p.get('description', '')}? (Yes / No)"
            )
            num += 1

    if value_params:
        lines.append("\n*Provide the value:*")
        for p in value_params:
            unit = p.get("unit", "")
            lines.append(
                f"{num}. *{p['name']}:* What is your {p['name']}?"
                f" (e.g. 98.6 {unit})"
            )
            num += 1

    lines.append(
        f"\n*In your own words:*\n"
        f"{num}. How are you feeling overall today? Anything unusual?"
    )

    doctor = patient.get("doctorName", "your doctor")
    name = patient.get("patientName", "")
    return (
        f"Thank you *{name}*! Please answer:\n\n"
        + "\n\n".join(lines)
        + f"\n\n_Dr. {doctor} reviews all responses_"
    )


# ──────────────────────────────────────────────────────────
# Standard Q1 daily trigger (used by scheduler)
# ──────────────────────────────────────────────────────────
def generate_standard_q1(
    patient_name: str, doctor_name: str,
    day_num: int = 1, total_days: int = 7
) -> str:
    """Standard Q1 sent by the daily CRON scheduler."""
    doc_text = f"Dr. {doctor_name}" if doctor_name else "your doctor"
    return (
        f"*CareFlow - Day {day_num} Recovery Check-in*\n\n"
        f"Hello *{patient_name}*\n\n"
        f"Your follow-up with *{doc_text}* has begun. Let's start:\n\n"
        f"*1. How is your condition currently?*\n"
        f"   A) Normal - recovering well\n"
        f"   B) Moderate - some discomfort\n"
        f"   C) Critical - need immediate attention\n\n"
        f"Please reply with *A*, *B*, or *C*."
    )
