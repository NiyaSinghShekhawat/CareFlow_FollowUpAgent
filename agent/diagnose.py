# agent/diagnose.py
# Checks every possible reason emergency is firing wrongly

import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv
load_dotenv()

from firebase_client import db

print("="*55)
print("CAREFLOW DIAGNOSTIC - CHECKING RESPONSE RECORDING")
print("="*55)

# Check all active patients
patients = list(
    db.collection("followup_patients")
    .where("status", "==", "active")
    .stream()
)

print(f"\n[OK] Active patients: {len(patients)}")
for p in patients:
    d = p.to_dict()
    print(f"\n  Patient: {d.get('patientName')}")
    print(f"  Phone in DB:        '{d.get('patientPhone')}'")
    print(f"  conversationState:  '{d.get('conversationState')}'")
    print(f"  checkinsCompleted:  {d.get('checkinsCompleted', 0)}")
    print(f"  lastRatings:        {d.get('lastRatings', {})}")
    print(f"  lastStatus:         {d.get('lastStatus', 'none')}")

# Check recent checkin responses
print("\n" + "="*55)
checkins = list(
    db.collection("checkin_responses")
    .limit(5)
    .stream()
)
print(f"[OK] Recent checkin responses: {len(checkins)}")
for c in checkins:
    d = c.to_dict()
    print(f"  -> {d.get('patientName')} "
          f"Day {d.get('dayNumber')} "
          f"| Status: {d.get('overallStatus')} "
          f"| Ratings: {d.get('ratings')}")

# Check recent alerts
print("\n" + "="*55)
alerts = list(
    db.collection("critical_alerts")
    .limit(5)
    .stream()
)
print(f"[OK] Recent critical alerts: {len(alerts)}")
for a in alerts:
    d = a.to_dict()
    print(f"  -> {d.get('patientName')} "
          f"| Type: {d.get('alertType')} "
          f"| Resolved: {d.get('resolved')}")
