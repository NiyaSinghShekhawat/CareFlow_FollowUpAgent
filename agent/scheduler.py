from __future__ import annotations

import os
from datetime import datetime
from typing import Any

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI

from . import firebase_client
from . import whatsapp

_scheduler: BackgroundScheduler | None = None


def _proactive_patient_checkins() -> None:
    """
    Example background job that scans Firestore and sends gentle nudges
    to inpatients who might benefit from a status update.
    """
    db = firebase_client.get_firestore()
    patients = firebase_client.get_patients_needing_checkin(db)

    for patient in patients:
        phone = patient.get("phone")
        if not phone:
            continue

        name = patient.get("name") or "there"
        text = (
            f"👋 Hi {name}, this is CareFlow. Your care team is actively working on "
            "your case. If you have urgent concerns, please use the call button "
            "or notify nearby staff."
        )
        whatsapp.send_whatsapp_message(phone=phone, text=text)


def start_scheduler(app: FastAPI) -> None:
    """
    Attach and start a background APScheduler with the FastAPI app.

    You typically don't need to call this manually; `main.py` wires it up.
    """
    global _scheduler
    if _scheduler is not None:
        return

    interval_minutes = int(os.getenv("CHECKIN_INTERVAL_MINUTES", "30"))

    scheduler = BackgroundScheduler(timezone="UTC")
    scheduler.add_job(
        _proactive_patient_checkins,
        "interval",
        minutes=interval_minutes,
        id="proactive_patient_checkins",
        next_run_time=datetime.utcnow(),
    )

    scheduler.start()
    _scheduler = scheduler

    # Ensure clean shutdown when app stops.
    @app.on_event("shutdown")
    async def _shutdown_scheduler() -> None:  # pragma: no cover - small lifecycle hook
        if scheduler.running:
            scheduler.shutdown(wait=False)

