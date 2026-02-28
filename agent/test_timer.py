# agent/test_timer.py
# Run: python test_timer.py

import os
import sys
import time
from dotenv import load_dotenv
load_dotenv()

import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

print("=" * 50)
print("CAREFLOW TIMER DEBUG TEST")
print("=" * 50)

# Step 1 — Check all imports
print("\n[1] Testing imports...")
try:
    from .firebase_client import db
    print("   ✅ firebase_client OK")
except Exception as e:
    print(f"   ❌ firebase_client FAILED: {e}")
    sys.exit(1)

try:
    from .followup_timer import schedule_first_questions
    print("   ✅ followup_timer OK")
except Exception as e:
    print(f"   ❌ followup_timer FAILED: {e}")
    sys.exit(1)

try:
    from .question_generator import generate_standard_q1
    print("   ✅ question_generator OK (using standard Q1 for timer)")
except Exception as e:
    print(f"   ❌ question_generator FAILED: {e}")
    sys.exit(1)

# Step 2 — Get a real patient from Firestore
print("\n[2] Fetching patient from Firestore...")
try:
    docs = list(
        db.collection("followup_patients")
        .where("status", "==", "active")
        .limit(1)
        .stream()
    )
    if not docs:
        print("   ❌ No active patients in Firestore!")
        print("   → Enroll a patient first then run this test")
        sys.exit(1)

    doc    = docs[0]
    doc_id = doc.id
    patient = doc.to_dict()
    patient["doc_id"] = doc_id
    print(f"   ✅ Found patient: {patient.get('patientName', 'Patient')} "
          f"(doc_id: {doc_id})")
except Exception as e:
    print(f"   ❌ Firestore fetch failed: {e}")
    sys.exit(1)

# Step 3 — Test basic parameters
print("\n[3] Testing basic message building...")
try:
    from .followup_timer import _build_q1
    msg = _build_q1(patient)
    print(f"   ✅ message built: {len(msg)} chars")
except Exception as e:
    print(f"   ❌ Message building failed: {e}")

# Step 4 — Run the full timer (shortened for testing)
print("\n[4] Starting timer test...")
print("   → Will send Q1 in 25s")
print("   → Will check response in 40s")
print("   → Watch your WhatsApp and terminal output")
print("   → Keep this terminal open!")
print()

schedule_first_questions(patient, doc_id)

# Keep main thread alive so daemon=False threads can run
print("\n⏳ Main thread waiting — DO NOT close this terminal...")
try:
    while True:
        time.sleep(5)
        print("   ... still running ...")
except KeyboardInterrupt:
    print("\n🛑 Test stopped by user")
