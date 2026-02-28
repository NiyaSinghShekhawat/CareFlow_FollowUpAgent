# agent/test_full_flow.py
# Simulates the entire check-in flow without needing a real new enrollment.
# Run: python -m agent.test_full_flow

import sys, os, time
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
load_dotenv()

from agent.firebase_client import db

print("="*55)
print("CAREFLOW FULL FLOW TEST")
print("="*55)

# Find first active patient for testing
docs = list(
    db.collection("followup_patients")
    .where("status", "==", "active")
    .limit(1)
    .stream()
)

if not docs:
    print("[ERROR] No active patients found in Firestore.")
    print("   Enroll a patient first from the dashboard.")
    sys.exit(1)

doc = docs[0]
doc_id = doc.id
patient = doc.to_dict()
patient["doc_id"] = doc_id

print(f"\n[OK] Testing with patient: {patient.get('patientName')}")
print(f"   Phone:  {patient.get('patientPhone')}")
print(f"   State:  {patient.get('conversationState')}")
print(f"   Params: {[p['name'] for p in patient.get('parameters', [])]}")

# ── TEST 1: Question generation ──────────────────────────
print("\n[TEST 1] Generating parameter questions...")
from agent.question_generator import build_parameter_questions
msg = build_parameter_questions(patient)
print(f"[OK] Questions:\n{'-'*40}\n{msg}\n{'-'*40}")

# ── TEST 2: Full timer flow ──────────────────────────────
print("\n[TEST 2] Starting timer flow...")
print("   Watch your WhatsApp — Q1 arrives in 25s")
print("   You have 15s to reply A/B/C after Q1 arrives")
print("   Then parameter questions will arrive")

from agent.followup_timer import schedule_first_questions
schedule_first_questions(patient, doc_id)

print("\n[RUNNING] Timer started. Press Ctrl+C to stop.\n")
try:
    while True:
        time.sleep(3)
        print(".", end="", flush=True)
except KeyboardInterrupt:
    print("\n\n[STOPPED]")
