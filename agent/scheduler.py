from __future__ import annotations

import os
from datetime import datetime
from typing import Any

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI

from . import firebase_client
from . import whatsapp

_scheduler: BackgroundScheduler | None = None


import pytz
from .question_generator import generate_standard_q1

def run_daily_checkins() -> None:
    """
    Main job: Sends Q1 to all active follow-up patients at 9 AM IST.
    """
    print("🚀 Running daily check-in trigger...")
    db = firebase_client.get_firestore()
    active_patients = firebase_client.get_active_followup_patients(db)

    for patient in active_patients:
        p_doc_id = patient['id']
        current_day = patient.get("currentDay", 0) + 1
        total_days = patient.get("followupDays", 7)
        phone = patient.get("patientPhone") # Use patientPhone as per spec

        if not phone:
            print(f"⚠️ No phone for patient {patient.get('patientName', p_doc_id)}")
            continue

        # 1. Check if program is over
        if current_day > total_days:
            firebase_client.update_followup_patient(p_doc_id, {"status": "completed"})
            print(f"✅ Follow-up completed for {patient.get('patientName')}")
            continue

        # 2. Reset state and send Q1
        q1_msg = generate_standard_q1(
            patient.get("patientName", "Patient"),
            patient.get("doctorName", "Mehta"),
            current_day,
            total_days
        )
        
        from .whatsapp import send_whatsapp_message
        success = send_whatsapp_message(phone, q1_msg)
        
        if success:
            firebase_client.update_followup_patient(p_doc_id, {
                "currentDay": current_day,
                "conversationState": "awaiting_q1",
                "notificationSent": True
            })
            print(f"📲 Sent Day {current_day} Q1 to {patient.get('patientName')}")

def start_scheduler(app: FastAPI) -> None:
    global _scheduler
    if _scheduler is not None:
        return

    # IST timezone for 9AM trigger
    ist = pytz.timezone("Asia/Kolkata")
    
    scheduler = BackgroundScheduler(timezone=ist)
    
    # 1. Proactive Nudge (Existing, kept for compatibility)
    interval_min = int(os.getenv("CHECKIN_INTERVAL_MINUTES", "30"))
    scheduler.add_job(
        _proactive_patient_checkins,
        "interval",
        minutes=interval_min,
        id="proactive_nudges"
    )

    # 2. Daily Check-in Trigger at 09:00 IST
    scheduler.add_job(
        run_daily_checkins,
        "cron",
        hour=9,
        minute=0,
        id="daily_checkin_flow"
    )

    scheduler.start()
    _scheduler = scheduler
    print("⏰ Scheduler started: 9 AM IST Daily Check-ins enabled.")

    @app.on_event("shutdown")
    async def _shutdown_scheduler() -> None:
        if scheduler.running:
            scheduler.shutdown(wait=False)

