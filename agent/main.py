import os
import json
from typing import Any, Dict

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables before local imports to ensure Firebase init works
load_dotenv()

from .agent import CareFlowAgent
from .scheduler import start_scheduler
from .whatsapp import send_whatsapp_message, send_doctor_alert_whatsapp
from .alerts import send_doctor_alert
from .firebase_client import db, save_checkin_response, flag_alert
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
    async def universal_webhook(request: Request):
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

                print(f"👤 WhatsApp from {patient_name} ({from_number}): {message_text}")

                # Find patient in 'patients' collection (matching existing DB structure)
                # The user's snippet suggested 'followup_patients' and 'patientPhone'
                # but our existing code uses 'patients' and 'phone'.
                patient_query = db.collection("patients")\
                                  .where("phoneNumber", "==", from_number)\
                                  .limit(1)\
                                  .stream()
                
                patient_data = None
                p_doc_id = None
                for doc in patient_query:
                    patient_data = doc.to_dict()
                    p_doc_id = doc.id
                
                if not patient_data:
                    print(f"⚠️ No enrolled patient found for {from_number}")
                    return {"status": "patient not found"}

                # Enhanced Analysis Pipeline
                analysis = run_full_analysis_pipeline(
                    patient=patient_data,
                    day_number=patient_data.get("currentDay", 1),
                    raw_reply=message_text
                )

                # Save Response with new structure
                save_checkin_response(from_number, {
                    "patientDocId": p_doc_id,
                    "patientName": f"{patient_data.get('firstName')} {patient_data.get('lastName')}",
                    "dayNumber": patient_data.get("currentDay", 1),
                    "rawReply": message_text,
                    "ratings": analysis["ratings"],
                    "subjective": analysis["subjective"],
                    "conditionCategory": analysis["condition_category"],
                    "statusPerParameter": analysis["status_per_parameter"],
                    "alertTriggered": analysis["alert_doctor"],
                    "alertedParameters": analysis["alerted_parameters"],
                    "doctorSummary": analysis["doctor_summary"]
                })

                # Alert Doctor if needed
                if analysis.get("alert_doctor"):
                    flag_alert(p_doc_id, analysis["overall_status"], analysis["doctor_summary"])
                    send_doctor_alert(
                        patient_name=f"{patient_data.get('firstName')} {patient_data.get('lastName')}",
                        reason=analysis["doctor_summary"],
                        severity=analysis["overall_status"]
                    )
                    send_doctor_alert_whatsapp(
                        patient_name=f"{patient_data.get('firstName')} {patient_data.get('lastName')}",
                        reason=analysis["doctor_summary"],
                        severity=analysis["overall_status"]
                    )

                # Send reply back
                send_whatsapp_message(from_number, analysis["patient_reply"])
                return {"status": "ok", "source": "ultramsg"}

            # ─── CASE 2: Next.js Internal Event ─────────────────────────
            if "event_type" in body:
                event = WebhookEvent(**body)
                result = await agent.handle_event(event.dict())
                return {"ok": True, "result": result, "source": "nextjs"}

            return {"status": "unknown format"}

        except Exception as e:
            print(f"❌ Webhook error: {e}")
            return {"status": "error", "detail": str(e)}

    start_scheduler(app)
    return app

app = create_app()

