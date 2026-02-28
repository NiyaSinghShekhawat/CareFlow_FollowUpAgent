import os
import json
from typing import Any, Dict

from fastapi import FastAPI, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

from .agent import CareFlowAgent
from .scheduler import start_scheduler
from .whatsapp import send_whatsapp_message
from .alerts import send_doctor_alert
from .firebase_client import (
    db, flag_alert,
    get_patient_by_phone, update_followup,
    save_checkin, save_alert
)
from .response_analyzer import run_full_analysis_pipeline
from firebase_admin import firestore


class WebhookEvent(BaseModel):
    event_type: str
    patient_id: str | None = None
    payload: Dict[str, Any] | None = None


# ── Phone normalizer ─────────────────────────────────────
def normalize_phone(phone: str) -> str:
    """
    Normalizes phone number to match Firestore format.
    +919876543210  → 919876543210
    919876543210   → 919876543210
    9876543210     → 919876543210 (adds India 91)
    whatsapp:+91.. → 919876543210
    """
    phone = str(phone).strip()
    phone = phone.replace("whatsapp:", "")
    phone = phone.replace("+", "")
    phone = phone.replace(" ", "")
    phone = phone.replace("-", "")
    if len(phone) == 10:
        phone = "91" + phone
    return phone


# ── Find patient with multi-format phone lookup ──────────
def get_patient_by_phone(phone: str):
    """
    Tries multiple phone formats to find the patient.
    Handles format mismatches between UltraMsg and Firestore.
    """
    normalized = normalize_phone(phone)
    formats_to_try = set([
        phone,
        normalized,
        "+" + normalized,
        normalized[2:] if normalized.startswith("91") else "91" + normalized,
    ])

    for fmt in formats_to_try:
        docs = list(
            db.collection("followup_patients")
            .where("patientPhone", "==", fmt)
            .where("status", "==", "active")
            .limit(1)
            .stream()
        )
        if docs:
            data = docs[0].to_dict()
            data["doc_id"] = docs[0].id
            print(f"[FOUND] Patient with phone format '{fmt}'")
            return data

    # Debug — show all active patients so you can compare phone formats
    print(f"[NOT FOUND] No patient for phone: '{phone}' (normalized: '{normalized}')")
    all_docs = list(
        db.collection("followup_patients")
        .where("status", "==", "active")
        .stream()
    )
    print(f"  Active patients in Firestore:")
    for d in all_docs:
        pdata = d.to_dict()
        print(f"    -> '{pdata.get('patientName')}': '{pdata.get('patientPhone')}'")
    return None


def create_app() -> FastAPI:
    app = FastAPI(
        title="CareFlow Agent",
        description="Python AI / automation backend for CareFlow.",
        version="0.2.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=os.getenv("CORS_ALLOW_ORIGINS", "http://localhost:3000").split(","),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    agent = CareFlowAgent()

    @app.get("/")
    def health_check():
        return {"status": "CareFlow Agent is running"}

    @app.post("/webhook")
    async def universal_webhook(request: Request, background_tasks: BackgroundTasks):
        try:
            body = await request.json()
            print(f"\n[WEBHOOK] Received: {json.dumps(body, indent=2)}")

            # ─── CASE 1: UltraMsg WhatsApp Reply ────────────────────────
            if "data" in body and "body" in body.get("data", {}):
                data = body.get("data", {})
                from_number = data.get("from", "")
                message_text = data.get("body", "").strip()

                # Ignore outgoing messages
                if data.get("fromMe", False):
                    print("[SKIP] Outgoing message — ignored")
                    return {"status": "ignored - outgoing"}

                # Ignore empty messages
                if not message_text or not from_number:
                    print("[SKIP] Empty message — ignored")
                    return {"status": "ignored - empty"}

                # Normalize phone before lookup
                from_number_normalized = normalize_phone(from_number)
                print(f"[PHONE] Raw: '{from_number}' → Normalized: '{from_number_normalized}'")
                print(f"[MSG] Text: '{message_text}'")

                # Find patient (tries multiple formats)
                patient_data = get_patient_by_phone(from_number)

                if not patient_data:
                    return {"status": "patient not found"}

                p_doc_id = patient_data["doc_id"]
                name = patient_data.get("patientName", "Patient")
                state = patient_data.get("conversationState", "awaiting_q1")
                current_day = patient_data.get("currentDay", 1)
                phone = patient_data.get("patientPhone", from_number)

                print(f"[PATIENT] {name} | State: '{state}' | Day: {current_day}")

                # ════════════════════════════════════════════════════════
                # CRITICAL: Update conversationState in Firestore FIRST
                # BEFORE doing anything else — this cancels the 15s timer.
                # The timer checks this field; if still "awaiting_q1"
                # after 18s (15s+3s buffer) → emergency fires.
                # ════════════════════════════════════════════════════════

                if state == "awaiting_q1":
                    # Step 1 — Update state IMMEDIATELY
                    db.collection("followup_patients").document(p_doc_id).update({
                        "conversationState": "q1_answered",
                        "q1AnsweredAt": firestore.SERVER_TIMESTAMP,
                        "q1RawReply": message_text
                    })
                    print(f"[STATE] Updated to 'q1_answered' — emergency timer cancelled")

                    # Step 2 — Parse A/B/C
                    from .response_analyzer import parse_q1_answer
                    q1_result = parse_q1_answer(message_text)
                    print(f"[Q1] Parsed as: '{q1_result}'")

                    # Save Q1 result
                    db.collection("followup_patients").document(p_doc_id).update({
                        "lastQ1Answer": q1_result
                    })

                    if q1_result == "critical":
                        from .critical_alerts import send_critical_alert
                        send_critical_alert(patient_data, p_doc_id, current_day)
                        db.collection("followup_patients").document(p_doc_id).update({
                            "conversationState": "completed_today",
                            "lastStatus": "critical"
                        })
                        db.collection("checkin_responses").add({
                            "patientDocId": p_doc_id,
                            "patientName": name,
                            "dayNumber": current_day,
                            "rawReply": message_text,
                            "conditionCategory": "critical",
                            "alertTriggered": True,
                            "doctorSummary": f"{name} reported CRITICAL condition.",
                            "timestamp": firestore.SERVER_TIMESTAMP
                        })
                        return {"status": "critical handled"}

                    elif q1_result == "moderate":
                        from .critical_alerts import send_moderate_alert
                        send_moderate_alert(patient_data, p_doc_id, current_day)

                    else:
                        send_whatsapp_message(
                            phone,
                            f"Glad to hear you are feeling okay *{name}*!\n\n"
                            f"Please answer a few quick questions:"
                        )

                    # Send parameter questions in background
                    background_tasks.add_task(
                        _send_parameter_questions, patient_data, p_doc_id, current_day, phone
                    )
                    return {"status": "q1 processed", "q1": q1_result}

                elif state == "awaiting_parameters":
                    # Update state IMMEDIATELY
                    db.collection("followup_patients").document(p_doc_id).update({
                        "conversationState": "parameters_answered",
                        "rawParameterReply": message_text,
                        "repliedAt": firestore.SERVER_TIMESTAMP
                    })
                    print(f"[STATE] Updated to 'parameters_answered'")

                    # Process in background
                    background_tasks.add_task(
                        _process_parameter_reply, patient_data, p_doc_id, current_day,
                        message_text, phone
                    )
                    return {"status": "parameters received"}

                elif state == "no_response_emergency_sent":
                    # Patient replied AFTER emergency was sent
                    db.collection("followup_patients").document(p_doc_id).update({
                        "conversationState": "q1_answered",
                        "lateReply": message_text,
                        "repliedAt": firestore.SERVER_TIMESTAMP
                    })
                    send_whatsapp_message(
                        phone,
                        f"Thank you for responding *{name}*! "
                        f"We're glad you're okay.\n\n"
                        f"*How is your condition currently?*\n"
                        f"A) Normal\nB) Moderate\nC) Critical\n\n"
                        f"Please reply A, B, or C."
                    )
                    return {"status": "re-engaged"}

                else:
                    print(f"[SKIP] State '{state}' — no action needed")
                    if state != "completed_today":
                        send_whatsapp_message(
                            phone,
                            "Thank you! Your responses for today have been recorded."
                        )
                    return {"status": f"state: {state}"}

            # ─── CASE 2: Next.js Internal Event ─────────────────────────
            if "event_type" in body:
                event = WebhookEvent(**body)
                result = await agent.handle_event(event.dict())
                return {"ok": True, "result": result, "source": "nextjs"}

            return {"status": "unknown format"}

        except Exception as e:
            print(f"[ERROR] Webhook error: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()
            return {"status": "error", "detail": str(e)}

    start_scheduler(app)
    return app


# ── Background: Send parameter questions ────────────────
def _send_parameter_questions(patient: dict, doc_id: str, day: int, phone: str):
    try:
        from .question_generator import generate_parameter_questions
        msg = generate_parameter_questions(patient, day)

        update_followup(doc_id, {"conversationState": "awaiting_parameters"})
        send_whatsapp_message(phone, msg)
        print(f"[OK] Parameter questions sent to {patient.get('patientName')}")
    except Exception as e:
        print(f"[ERROR] send_parameter_questions: {e}")
        import traceback
        traceback.print_exc()
        # Send a fallback so patient is never left hanging
        try:
            send_whatsapp_message(phone,
                "Please describe how you are feeling today "
                "and rate your pain from 0 to 5."
            )
        except:
            pass


# ── Background: Process parameter reply ─────────────────
def _process_parameter_reply(
    patient: dict, doc_id: str, day: int, raw_reply: str, phone: str
):
    try:
        q1_ans = patient.get("lastQ1Answer", "normal")
        analysis = run_full_analysis_pipeline(
            patient=patient,
            day_number=day,
            raw_reply=raw_reply,
            q1_answer=q1_ans
        )

        if not analysis:
            print(f"[WARN] Analysis returned None for {patient.get('patientName')}")
            send_whatsapp_message(phone,
                f"Thank you *{patient.get('patientName')}*! "
                f"Your responses have been recorded. Your doctor will review them."
            )
            update_followup(doc_id, {
                "conversationState": "completed_today",
                "checkinsCompleted": patient.get("checkinsCompleted", 0) + 1
            })
            return

        # Save checkin response using centralized helper
        save_checkin(doc_id, {
            "patientDocId":       doc_id,
            "patientName":        patient.get("patientName", "Patient"),
            "dayNumber":          day,
            "rawReply":           raw_reply,
            "ratings":            analysis.get("ratings", {}),
            "subjective":         analysis.get("subjective", ""),
            "conditionCategory":  analysis.get("condition_category", "normal"),
            "statusPerParameter": analysis.get("status_per_parameter", {}),
            "overallStatus":      analysis.get("overall_status", "good"),
            "alertTriggered":     analysis.get("alert_doctor", False),
            "alertedParameters":  [p["name"] for p in analysis.get("crossed_parameters", [])],
            "doctorSummary":      analysis.get("doctor_summary", ""),
            "timestamp":          firestore.SERVER_TIMESTAMP
        })

        # Update patient record using centralized helper
        update_followup(doc_id, {
            "conversationState":  "completed_today",
            "lastStatus":         analysis.get("condition_category", "normal"),
            "lastRatings":        analysis.get("ratings", {}),
            "lastSubjective":     analysis.get("subjective", ""),
            "checkinsCompleted":  patient.get("checkinsCompleted", 0) + 1
        })

        # Alert doctor if needed
        if analysis.get("alert_doctor"):
            flag_alert(doc_id, analysis.get("condition_category", "warning"),
                       analysis.get("doctor_summary", ""))
            send_doctor_alert(
                patient_name=patient.get("patientName", "Patient"),
                reason=analysis.get("doctor_summary", ""),
                severity=analysis.get("condition_category", "warning")
            )

        # Empathetic reply to patient
        patient_reply = analysis.get("patient_reply", "")
        if patient_reply:
            send_whatsapp_message(phone, patient_reply)
        else:
            send_whatsapp_message(phone,
                f"Thank you *{patient.get('patientName')}*! "
                f"Your responses have been recorded. "
                f"Dr. {patient.get('doctorName', 'your doctor')} will review them."
            )

        print(f"[OK] Full analysis complete for {patient.get('patientName')}")

    except Exception as e:
        print(f"[ERROR] process_parameter_reply: {e}")
        import traceback
        traceback.print_exc()


app = create_app()
