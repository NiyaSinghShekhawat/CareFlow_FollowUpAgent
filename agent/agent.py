from __future__ import annotations

from typing import Any, Dict

from . import firebase_client
from . import whatsapp
from . import alerts

import json
import google.generativeai as genai


class CareFlowAgent:
    """
    High-level orchestration layer for CareFlow's automation / AI.

    This is intentionally lightweight to start with and can be expanded to
    include real LLM calls (LangChain, OpenAI, etc.) as you iterate.
    """

    async def handle_event(self, event: Dict[str, Any]) -> Dict[str, Any]:
        event_type = event.get("event_type")
        patient_id = event.get("patient_id")
        payload = event.get("payload") or {}

        if not event_type:
            raise ValueError("event_type is required")

        if event_type == "patient_checkin":
            return await self._handle_patient_checkin(patient_id, payload)

        if event_type == "patient_help_request":
            return await self._handle_patient_help_request(patient_id, payload)

        if event_type == "lab_result_updated":
            return await self._handle_lab_result_updated(patient_id, payload)

        if event_type == "patient_followup":
            return await self._handle_patient_followup(patient_id, payload)

        if event_type == "patient_intake":
            return await self._handle_patient_intake(patient_id, payload)

        if event_type == "doctor_registration":
            return await self._handle_doctor_registration(patient_id, payload)

        # Default: echo back for visibility during early wiring.
        return {
            "handled": False,
            "message": "Unknown event_type; no action taken.",
            "event_type": event_type,
        }

    async def _handle_patient_checkin(
        self,
        patient_id: str | None,
        payload: Dict[str, Any],
    ) -> Dict[str, Any]:
        if not patient_id:
            raise ValueError("patient_id is required for patient_checkin")

        db = firebase_client.get_firestore()
        patient = firebase_client.get_patient_by_id(db, patient_id)

        if not patient:
            return {"handled": False, "message": "Patient not found", "patient_id": patient_id}

        phone = patient.get("phone")
        if phone:
            whatsapp.send_whatsapp_message(
                phone=phone,
                text="👋 Thanks for checking in at CareFlow. We'll keep you updated on your care journey.",
            )

        firebase_client.update_patient(
            db,
            patient_id,
            {"last_checkin_source": payload.get("source", "portal")},
        )

        return {"handled": True, "action": "patient_checkin_acknowledged", "patient_id": patient_id}

    async def _handle_patient_help_request(
        self,
        patient_id: str | None,
        payload: Dict[str, Any],
    ) -> Dict[str, Any]:
        if not patient_id:
            raise ValueError("patient_id is required for patient_help_request")

        db = firebase_client.get_firestore()
        patient = firebase_client.get_patient_by_id(db, patient_id)

        alert_message = payload.get("message") or "Patient requested assistance."
        alerts.notify_doctor_for_patient_help(db=db, patient=patient, message=alert_message)

        return {"handled": True, "action": "doctor_alerted", "patient_id": patient_id}

    async def _handle_lab_result_updated(
        self,
        patient_id: str | None,
        payload: Dict[str, Any],
    ) -> Dict[str, Any]:
        if not patient_id:
            raise ValueError("patient_id is required for lab_result_updated")

        db = firebase_client.get_firestore()
        patient = firebase_client.get_patient_by_id(db, patient_id)

        if not patient:
            return {"handled": False, "message": "Patient not found", "patient_id": patient_id}

        phone = patient.get("phone")
        if phone:
            whatsapp.send_whatsapp_message(
                phone=phone,
                text="🧪 Your lab results have been updated in the CareFlow portal.",
            )

        alerts.notify_doctor_for_lab_result(db=db, patient=patient, payload=payload)

        return {"handled": True, "action": "lab_result_notified", "patient_id": patient_id}

    async def _handle_patient_followup(
        self,
        patient_id: str | None,
        payload: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Handles sending notifications when a patient is placed under follow-up.
        """
        patient_name = payload.get("patient_name") or "Patient"
        patient_email = payload.get("patient_email")
        phone = payload.get("phone")
        duration = payload.get("duration") or "the specified period"

        success_notifs = []

        if phone:
            whatsapp.send_followup_whatsapp(phone, patient_name, duration)
            success_notifs.append("whatsapp")

        if patient_email:
            alerts.send_followup_email(patient_email, patient_name, duration)
            success_notifs.append("email")

        return {
            "handled": True,
            "action": "patient_followup_notified",
            "patient_id": patient_id,
            "notifications_sent": success_notifs
        }

    async def _handle_patient_intake(
        self,
        patient_id: str | None,
        payload: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Handles sending notifications when a patient is first registered (intake).
        """
        patient_name = payload.get("patient_name") or "Patient"
        patient_email = payload.get("patient_email")
        phone = payload.get("phone")
        patient_code = payload.get("patient_code") or "N/A"

        success_notifs = []

        if phone:
            whatsapp.send_intake_whatsapp(phone, patient_name, patient_code)
            success_notifs.append("whatsapp")

        if patient_email:
            alerts.send_intake_email(patient_email, patient_name, patient_code)
            success_notifs.append("email")

        return {
            "handled": True,
            "action": "patient_intake_notified",
            "patient_id": patient_id,
            "patient_code": patient_code,
            "notifications_sent": success_notifs
        }

    async def _handle_doctor_registration(
        self,
        patient_id: str | None,
        payload: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Handles sending notifications when a doctor registers their contact info.
        """
        doctor_name = payload.get("doctor_name") or "Doctor"
        doctor_email = payload.get("email")
        doctor_phone = payload.get("phone")

        success_notifs = []

        if doctor_phone:
            whatsapp.send_doctor_registration_whatsapp(doctor_phone, doctor_name)
            success_notifs.append("whatsapp")

        if doctor_email:
            alerts.send_doctor_registration_email(doctor_email, doctor_name)
            success_notifs.append("email")

        return {
            "handled": True,
            "action": "doctor_registration_notified",
            "doctor": doctor_name,
            "notifications_sent": success_notifs
        }

def analyze_patient_response(
    patient_name: str,
    patient_reply: str,
    day_number: int,
    surgery_type: str,
    previous_status: str
) -> Dict[str, Any]:
    """
    Uses Gemini to analyze a patient's WhatsApp response.
    Returns a structured dictionary of findings.
    """
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    if not GEMINI_API_KEY:
        print("❌ GEMINI_API_KEY not found")
        return {}

    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-1.5-flash')

    prompt = f"""
    Analyze this post-surgery patient response and return a JSON object (no markdown).
    
    Patient: {patient_name}
    Surgery: {surgery_type}
    Recovery Day: {day_number}
    Last Status: {previous_status}
    Reply: "{patient_reply}"
    
    The JSON should have these keys:
    - pain_level: 0-10 integer
    - has_fever: boolean
    - has_swelling: boolean
    - overall_status: "good", "warning", or "critical"
    - alert_doctor: boolean
    - alert_reason: string (if alert_doctor is true)
    - summary: 1-sentence summary of patient condition
    - patient_reply: A empathetic 1-sentence reply to send back to the patient.
    """

    try:
        response = model.generate_content(prompt)
        # Clean up possible markdown code blocks
        text = response.text.strip().replace("```json", "").replace("```", "")
        return json.loads(text)
    except Exception as e:
        print(f"❌ Gemini Analysis Error: {e}")
        return {
            "pain_level": 0,
            "has_fever": False,
            "has_swelling": False,
            "overall_status": "error",
            "alert_doctor": False,
            "alert_reason": "Gemini analysis failed",
            "summary": "Check-in failed analysis",
            "patient_reply": "Thank you for your response. We will review it shortly."
        }

