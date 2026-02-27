import os
import datetime
from typing import Any, Dict, List
from .firebase_client import db
from .whatsapp import send_whatsapp_message, send_doctor_alert_whatsapp
from .alerts import send_doctor_alert

def send_critical_alert(patient: Dict[str, Any], p_doc_id: str, day_number: int) -> None:
    """
    Q1: Answer C (Critical)
    """
    p_name = f"{patient.get('firstName', '')} {patient.get('lastName', '')}"
    p_phone = patient.get("phoneNumber")
    p_email = patient.get("email")
    
    # 1. Save to critical_alerts
    alert_ref = db.collection("critical_alerts").document()
    alert_ref.set({
        "patientDocId": p_doc_id,
        "patientName": p_name,
        "patientPhone": p_phone,
        "patientEmail": p_email,
        "doctorId": patient.get("doctorId"),
        "doctorName": patient.get("doctorName"),
        "alertType": "critical",
        "selfReportedCondition": "critical",
        "triggerQuestion": "standard_first_question",
        "dayNumber": day_number,
        "timestamp": datetime.datetime.now(datetime.timezone.utc),
        "resolved": False,
        "notifiedVia": ["whatsapp", "email", "dashboard"]
    })

    # 2. Notify Doctor
    reason = "Patient self-reported CRITICAL condition in Q1 check-in."
    send_doctor_alert(p_name, reason, "critical")
    send_doctor_alert_whatsapp(p_name, reason, "critical")

    # 3. Inform Patient
    msg = (
        f"🚨 *URGENT:* We have immediately alerted Dr. {patient.get('doctorName', 'Mehta')}. "
        "Please stay calm and avoid any physical activity. Help is on the way."
    )
    send_whatsapp_message(p_phone, msg)

def send_moderate_alert(patient: Dict[str, Any], p_doc_id: str, day_number: int) -> None:
    """
    Q1: Answer B (Moderate)
    """
    p_name = f"{patient.get('firstName', '')} {patient.get('lastName', '')}"
    p_phone = patient.get("phoneNumber")
    p_email = patient.get("email")

    # 1. Save to critical_alerts
    alert_ref = db.collection("critical_alerts").document()
    alert_ref.set({
        "patientDocId": p_doc_id,
        "patientName": p_name,
        "patientPhone": p_phone,
        "patientEmail": p_email,
        "doctorId": patient.get("doctorId"),
        "doctorName": patient.get("doctorName"),
        "alertType": "moderate",
        "selfReportedCondition": "moderate",
        "triggerQuestion": "standard_first_question",
        "dayNumber": day_number,
        "timestamp": datetime.datetime.now(datetime.timezone.utc),
        "resolved": False,
        "notifiedVia": ["whatsapp", "email", "dashboard"]
    })

    # 2. Notify Doctor
    reason = "Patient reported MODERATE discomfort in Q1 check-in."
    send_doctor_alert(p_name, reason, "moderate")
    send_doctor_alert_whatsapp(p_name, reason, "moderate")

    # 3. Inform Patient
    msg = (
        f"Thank you {patient.get('firstName', 'Patient')}! Dr. {patient.get('doctorName', 'Mehta')} "
        "has been notified and will prioritize your case."
    )
    send_whatsapp_message(p_phone, msg)
