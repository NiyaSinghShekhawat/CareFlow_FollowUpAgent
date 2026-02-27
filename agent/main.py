import os
import json
from typing import Any, Dict

from fastapi import FastAPI, Request, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables before local imports to ensure Firebase init works
load_dotenv()

from .agent import CareFlowAgent
from .scheduler import start_scheduler
from .whatsapp import send_whatsapp_message, send_doctor_alert_whatsapp
from .alerts import send_doctor_alert
from .firebase_client import db, save_checkin_response, flag_alert, firestore
from .response_analyzer import run_full_analysis_pipeline

class WebhookEvent(BaseModel):
    event_type: str
    patient_id: str | None = None
    payload: Dict[str, Any] | None = None

def create_app() -> FastAPI:
    app = FastAPI(
        title="CareFlow Agent",
        description="Python AI / automation backend for CareFlow.",
        version="0.1.0",
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
        return {"status": "CareFlow Agent is running ✅"}

    @app.post("/webhook")
    async def universal_webhook(request: Request, background_tasks: BackgroundTasks):
        try:
            body = await request.json()
            print(f"📩 Webhook received: {json.dumps(body, indent=2)}")

            # ─── CASE 1: UltraMsg WhatsApp Reply ────────────────────────
            if "data" in body and "body" in body["data"]:
                data = body.get("data", {})
                from_number = data.get("from", "")
                message_text = data.get("body", "")
                patient_name = data.get("pushname", "Patient")

                if data.get("fromMe"):
                    return {"status": "ignored - outgoing"}

                # Find patient in 'followup_patients' collection
                patient_query = db.collection("followup_patients")\
                                  .where("patientPhone", "==", from_number)\
                                  .where("status", "==", "active")\
                                  .limit(1)\
                                  .stream()
                
                patient_data = None
                p_doc_id = None
                for doc in patient_query:
                    patient_data = doc.to_dict()
                    p_doc_id = doc.id
                
                if not patient_data:
                    print(f"⚠️ No active follow-up patient found for {from_number}")
                    return {"status": "patient not found"}

                # ─── STATE MACHINE ───────────────────────────────────
                state = patient_data.get("conversationState", "awaiting_q1")
                current_day = patient_data.get("currentDay", 1)

                if state == "awaiting_q1":
                    from .response_analyzer import parse_q1_answer
                    from .critical_alerts import send_critical_alert, send_moderate_alert
                    from .question_generator import generate_parameter_questions
                    
                    q1_result = parse_q1_answer(message_text)
                    
                    # Update patient with their Q1 answer
                    db.collection("followup_patients").document(p_doc_id).update({
                        "lastQ1Answer": q1_result
                    })

                    if q1_result == "critical":
                        send_critical_alert(patient_data, p_doc_id, current_day)
                        db.collection("followup_patients").document(p_doc_id).update({
                            "conversationState": "completed_today"
                        })
                        # Also save a minimal response for the dashboard
                        save_checkin_response(from_number, {
                            "patientDocId": p_doc_id,
                            "patientName": patient_data.get('patientName', 'Patient'),
                            "dayNumber": current_day,
                            "rawReply": message_text,
                            "conditionCategory": "critical",
                            "alertTriggered": True,
                            "doctorSummary": "Patient reported CRITICAL condition at Q1. Check-in terminated for safety."
                        })
                    
                    elif q1_result == "moderate":
                        send_moderate_alert(patient_data, p_doc_id, current_day)
                        param_msg = generate_parameter_questions(patient_data, current_day)
                        send_whatsapp_message(from_number, param_msg)
                        db.collection("followup_patients").document(p_doc_id).update({
                            "conversationState": "awaiting_parameters"
                        })

                    else: # Normal
                        param_msg = generate_parameter_questions(patient_data, current_day)
                        send_whatsapp_message(from_number, param_msg)
                        db.collection("followup_patients").document(p_doc_id).update({
                            "conversationState": "awaiting_parameters"
                        })

                elif state == "awaiting_parameters":
                    # Step 2: Full Analysis
                    q1_ans = patient_data.get("lastQ1Answer", "normal")
                    analysis = run_full_analysis_pipeline(
                        patient=patient_data,
                        day_number=current_day,
                        raw_reply=message_text,
                        q1_answer=q1_ans
                    )

                    # Save Response to 'checkin_responses' as per spec
                    # Note: Spec says checkin_responses, existing code had patient_responses
                    db.collection("checkin_responses").add({
                        "patientDocId": p_doc_id,
                        "patientName": patient_data.get("patientName", "Patient"),
                        "dayNumber": current_day,
                        "rawReply": message_text,
                        "ratings": analysis["ratings"],
                        "subjective": analysis["subjective"],
                        "conditionCategory": analysis["condition_category"],
                        "statusPerParameter": analysis["status_per_parameter"],
                        "alertTriggered": analysis.get("alert_doctor", False),
                        "alertedParameters": [p['name'] for p in analysis.get("crossed_parameters", [])],
                        "doctorSummary": analysis.get("doctor_summary", "No summary generated"),
                        "timestamp": firestore.SERVER_TIMESTAMP
                    })

                    # Update Patient Master Record (followup_patients)
                    db.collection("followup_patients").document(p_doc_id).update({
                        "conversationState": "completed_today",
                        "lastStatus": analysis["condition_category"],
                        "lastRatings": analysis["ratings"],
                        "lastSubjective": analysis["subjective"]
                    })

                    # Final Alert if parameters alarmed (beyond Q1)
                    if analysis.get("alert_doctor"):
                        # Use spec's alert function if applicable, or flag in patient record
                        flag_alert(p_doc_id, analysis["condition_category"], analysis["doctor_summary"])
                        send_doctor_alert(
                            patient_name=patient_data.get("patientName", "Patient"),
                            reason=analysis["doctor_summary"],
                            severity=analysis["condition_category"]
                        )
                    
                    # Empathetic Reply
                    send_whatsapp_message(from_number, analysis["patient_reply"])

                else:
                    # completed_today or other status
                    send_whatsapp_message(from_number, "Thank you! Your responses for today have been recorded. Dr. Mehta will review them.")

                return {"status": "ok", "state": state}

            # ─── CASE 2: Next.js Internal Event ─────────────────────────
            if "event_type" in body:
                event = WebhookEvent(**body)
                result = await agent.handle_event(event.dict(), background_tasks)
                return {"ok": True, "result": result, "source": "nextjs"}

            return {"status": "unknown format"}

        except Exception as e:
            print(f"❌ Webhook error: {e}")
            return {"status": "error", "detail": str(e)}

    start_scheduler(app)
    return app

app = create_app()

