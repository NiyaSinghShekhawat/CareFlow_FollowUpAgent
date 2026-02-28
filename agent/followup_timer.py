# agent/followup_timer.py
# COMPLETE REWRITE — uses plain threading, no asyncio

import time
import threading
import requests
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv
load_dotenv()

# ── these imports happen at call time to avoid circular imports
INSTANCE = os.getenv("ULTRAMSG_INSTANCE")
TOKEN    = os.getenv("ULTRAMSG_TOKEN")
GMAIL    = os.getenv("GMAIL_ADDRESS")
APP_PASS = os.getenv("GMAIL_APP_PASSWORD")
DOC_PHONE = os.getenv("DOCTOR_PHONE")

# ─────────────────────────────────────────────
# CORE WHATSAPP SENDER
# ─────────────────────────────────────────────
def _send_wa(phone: str, msg: str):
    try:
        url = f"https://api.ultramsg.com/{INSTANCE}/messages/chat"
        r = requests.post(url,
                          json={"token": TOKEN, "to": phone, "body": msg},
                          timeout=10)
        print(f"📲 WA sent to {phone}: {r.status_code}")
    except Exception as e:
        print(f"❌ WA send failed: {e}")


# ─────────────────────────────────────────────
# EMERGENCY EMAIL
# ─────────────────────────────────────────────
def _send_emergency_email(patient: dict):
    ec = patient.get("emergencyContact", {})
    ec_email = ec.get("email", "")
    if not ec_email:
        return

    subject = f"🚨 EMERGENCY — {patient['patientName']} Not Responding"
    body = f"""
<html><body style="font-family:Arial;padding:20px;">
<div style="max-width:580px;margin:auto;border:2px solid #CC0000;
            border-radius:12px;overflow:hidden;">
  <div style="background:#CC0000;padding:20px;text-align:center;">
    <h2 style="color:white;margin:0;">🚨 CareFlow Emergency Alert</h2>
  </div>
  <div style="padding:25px;">
    <p>Dear <b>{ec.get('name','Emergency Contact')}</b>,</p>
    <p><b>{patient['patientName']}</b> has not responded to their
       post-surgery recovery check-in from CareFlow.</p>
    <p style="color:#CC0000;font-weight:bold;">
      Please check on them immediately and contact
      Dr. {patient.get('doctorName','their doctor')} if needed.
    </p>
  </div>
  <div style="background:#f5f5f5;padding:12px;text-align:center;">
    <small style="color:#999;">Automated — CareFlow Patient Care</small>
  </div>
</div>
</body></html>"""

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = f"CareFlow <{GMAIL}>"
        msg["To"]      = ec_email
        msg.attach(MIMEText(body, "html"))
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as s:
            s.login(GMAIL, APP_PASS)
            s.sendmail(GMAIL, ec_email, msg.as_string())
        print(f"📧 Emergency email sent to {ec_email}")
    except Exception as e:
        print(f"❌ Emergency email failed: {e}")


# ─────────────────────────────────────────────
# BUILD Q1 MESSAGE
# ─────────────────────────────────────────────
def _build_q1(patient: dict) -> str:
    return (
        f"🏥 *CareFlow — Day 1 Recovery Check-in*\n\n"
        f"Hello *{patient['patientName']}* 👋\n\n"
        f"Your follow-up with *Dr. {patient.get('doctorName','your doctor')}* "
        f"has begun. Let's start:\n\n"
        f"*1. How is your condition currently?*\n"
        f"   A) Normal — recovering well\n"
        f"   B) Moderate — some discomfort\n"
        f"   C) Critical — need immediate attention\n\n"
        f"Please reply with *A*, *B*, or *C*."
    )


# ─────────────────────────────────────────────
# NO-RESPONSE EMERGENCY TRIGGER
# ─────────────────────────────────────────────
def _trigger_emergency(patient: dict, doc_id: str):
    from .firebase_client import db
    from firebase_admin import firestore as fs

    name = patient["patientName"]
    ec   = patient.get("emergencyContact", {})
    ec_phone = ec.get("phone", "")
    ec_name  = ec.get("name", "Emergency Contact")
    ec_rel   = ec.get("relation", "Contact")

    print(f"🚨 Triggering emergency for {name}")

    # 1 — Message to patient
    _send_wa(patient["patientPhone"],
        f"🚨 *CareFlow — Urgent Reminder*\n\n"
        f"Hello *{name}*, we sent your check-in but received no reply.\n\n"
        f"We have notified *{ec_name}* and "
        f"*Dr. {patient.get('doctorName','')}.*\n\n"
        f"If you are in an emergency please call your hospital now.\n"
        f"If you are fine, please reply *A*, *B*, or *C* to continue."
    )

    # 2 — Message to emergency contact
    if ec_phone:
        _send_wa(ec_phone,
            f"🚨 *CareFlow Emergency Alert*\n\n"
            f"Hello *{ec_name}*,\n\n"
            f"Your {ec_rel.lower()} *{name}* has NOT responded to "
            f"their post-surgery check-in.\n\n"
            f"Please check on them immediately and contact "
            f"Dr. {patient.get('doctorName','')} if needed.\n\n"
            f"_— CareFlow Patient Care_ 🏥"
        )

    # 3 — Email to emergency contact
    _send_emergency_email(patient)

    # 4 — Message to doctor
    if DOC_PHONE:
        _send_wa(DOC_PHONE,
            f"🚨 *Patient Not Responding*\n\n"
            f"*Patient:* {name}\n"
            f"*Surgery:* {patient.get('surgeryType','')}\n"
            f"*Day:* 1\n\n"
            f"{name} did not respond to their Day 1 check-in.\n"
            f"Emergency contact notified."
        )

    # 5 — Save to Firestore
    try:
        db.collection("critical_alerts").add({
            "patientDocId":  doc_id,
            "patientName":   name,
            "patientPhone":  patient["patientPhone"],
            "doctorId":      patient.get("doctorId", ""),
            "doctorName":    patient.get("doctorName", ""),
            "alertType":     "no_response",
            "dayNumber":     1,
            "reason":        f"{name} did not respond to Day 1 check-in",
            "resolved":      False,
            "notifiedVia":   ["whatsapp", "email"],
            "timestamp":     fs.SERVER_TIMESTAMP
        })

        db.collection("followup_patients").document(doc_id).update({
            "conversationState":     "no_response_emergency_sent",
            "lastNoResponseAlert":   fs.SERVER_TIMESTAMP
        })
        print(f"✅ Emergency saved to Firestore for {name}")
    except Exception as e:
        print(f"❌ Firestore emergency save failed: {e}")


# ─────────────────────────────────────────────
# MAIN TIMER FUNCTION — called from notifications.py
# ─────────────────────────────────────────────
def schedule_first_questions(patient: dict, doc_id: str):
    """
    Entry point. Call this right after enrollment confirmation.
    Runs entirely in a background thread.
    Thread is daemon=False so it NEVER gets killed silently.
    """

    def _run():
        from .firebase_client import db
        from firebase_admin import firestore as fs
        # from question_generator import generate_todays_questions

        name = patient.get("patientName", "Patient")
        phone = patient.get("patientPhone", "")

        # ── STEP 1: Wait 25 seconds ──────────────────────
        print(f"⏳ [{name}] Waiting 25s before sending Q1...")
        for i in range(25):
            time.sleep(1)
            if i % 5 == 0:
                print(f"   [{name}] {25 - i}s remaining...")

        # ── Verify patient still active ──────────────────
        try:
            snap = db.collection("followup_patients")\
                     .document(doc_id).get()
            if not snap.exists:
                print(f"❌ [{name}] Doc not found — aborting timer")
                return
            current = snap.to_dict()
            if current.get("status") != "active":
                print(f"⚠️ [{name}] Status={current.get('status')} "
                      f"— skipping questions")
                return
        except Exception as e:
            print(f"❌ [{name}] Firebase read error: {e}")
            return

        # ── STEP 2: Send Q1 ──────────────────────────────
        print(f"📤 [{name}] 25s complete — sending Q1")
        q1_msg = _build_q1(patient)
        _send_wa(phone, q1_msg)

        # Update Firestore state to awaiting_q1
        try:
            db.collection("followup_patients").document(doc_id).update({
                "conversationState": "awaiting_q1",
                "q1SentAt":          fs.SERVER_TIMESTAMP,
                "currentDay":        1
            })
            print(f"✅ [{name}] Firestore state → awaiting_q1")
        except Exception as e:
            print(f"❌ [{name}] Firestore update failed: {e}")
            return

        # ── STEP 3: Wait 15 seconds for response ─────────
        print(f"[WAIT] [{name}] Waiting 15s for patient response...")
        for i in range(15):
            time.sleep(1)
            if i % 5 == 0:
                print(f"   [{name}] {15 - i}s remaining...")

        # Extra 3s buffer — gives Firestore write from webhook
        # time to fully propagate before we check the state.
        # Without this, a race condition fires emergency even
        # when the patient DID reply (webhook hadn't finished writing).
        print(f"   [{name}] +3s buffer for Firestore write propagation...")
        time.sleep(3)

        # ── STEP 4: Check if patient responded ───────────
        try:
            snap2 = db.collection("followup_patients")\
                      .document(doc_id).get()
            if not snap2.exists:
                return

            updated = snap2.to_dict()
            state   = updated.get("conversationState", "")

            print(f"   [{name}] State after 18s total: '{state}'")

            # These states mean the patient replied — do NOT alert
            safe_states = {
                "q1_answered",
                "awaiting_parameters",
                "parameters_answered",
                "completed_today",
                "critical_reported",
                "q1_critical",
                "q1_moderate",
            }

            if state in safe_states:
                print(f"[OK] [{name}] Patient responded (state='{state}') "
                      f"— no emergency needed")
            elif state == "awaiting_q1":
                # Still waiting — patient genuinely did not respond
                print(f"[ALERT] [{name}] No response after 18s — triggering emergency")
                _trigger_emergency(patient, doc_id)
            else:
                print(f"[WARN] [{name}] Unexpected state '{state}' — skipping emergency")

        except Exception as e:
            print(f"❌ [{name}] Response check failed: {e}")

    # ── Start thread ─────────────────────────────────────
    # daemon=False is CRITICAL — keeps thread alive
    t = threading.Thread(target=_run, name=f"timer_{doc_id}",
                         daemon=False)
    t.start()
    print(f"🚀 Timer thread started for {patient.get('patientName', 'Patient')} "
          f"(thread id: {t.ident})")
