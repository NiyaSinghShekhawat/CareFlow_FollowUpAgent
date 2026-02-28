from __future__ import annotations

import os
from typing import Any, Dict, List, Optional

import firebase_admin
from firebase_admin import credentials, firestore

_firestore_client: Optional[firestore.Client] = None


def _init_firebase() -> firestore.Client:
    """
    Initialize Firebase Admin SDK and return a Firestore client.

    Expects one of:
    - GOOGLE_APPLICATION_CREDENTIALS pointing to a service account JSON, or
    - FIREBASE_SERVICE_ACCOUNT_JSON containing raw JSON, or
    - FIREBASE_SERVICE_ACCOUNT_PATH pointing to the JSON file.
    """
    if not firebase_admin._apps:  # type: ignore[attr-defined]
        service_account_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS") or os.getenv(
            "FIREBASE_SERVICE_ACCOUNT_PATH",
        )
        service_account_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")

        if service_account_json:
            cred = credentials.Certificate.from_json(service_account_json)
        elif service_account_path:
            cred = credentials.Certificate(service_account_path)
        else:
            raise RuntimeError(
                "Firebase credentials not configured. "
                "Set GOOGLE_APPLICATION_CREDENTIALS, FIREBASE_SERVICE_ACCOUNT_PATH, "
                "or FIREBASE_SERVICE_ACCOUNT_JSON.",
            )

        firebase_admin.initialize_app(cred)

    return firestore.client()


def get_firestore() -> firestore.Client:
    global _firestore_client
    if _firestore_client is None:
        _firestore_client = _init_firebase()
    return _firestore_client


def get_patient_by_id(db: firestore.Client, patient_id: str) -> Optional[Dict[str, Any]]:
    doc = db.collection("patients").document(patient_id).get()
    if not doc.exists:
        return None
    data = doc.to_dict() or {}
    data["id"] = doc.id
    return data


def update_patient(db: firestore.Client, patient_id: str, update: Dict[str, Any]) -> None:
    db.collection("patients").document(patient_id).set(update, merge=True)

def get_patient_actions(db: firestore.Client, patient_id: str) -> List[Dict[str, Any]]:
    """
    Fetches all treatment actions for a specific patient, sorted by time.
    """
    query = db.collection("actions")\
              .where("patientId", "==", patient_id)\
              .order_by("createdAt", direction=firestore.Query.ASCENDING)\
              .stream()
    return [doc.to_dict() for doc in query]


def get_patients_needing_checkin(db: firestore.Client) -> List[Dict[str, Any]]:
    """
    Returns all active inpatients.
    """
    query = db.collection("patients").where("status", "==", "admitted")
    return [
        {**(doc.to_dict() or {}), "id": doc.id}
        for doc in query.stream()
    ]

def get_active_followup_patients(db: firestore.Client) -> List[Dict[str, Any]]:
    """
    Returns all patients currently in the follow-up program.
    """
    query = db.collection("followup_patients")\
              .where("status", "==", "active")\
              .stream()
    return [{**doc.to_dict(), "id": doc.id} for doc in query]

def update_followup_patient(p_doc_id: str, data: Dict[str, Any]) -> None:
    """
    Updates a document in the followup_patients collection.
    """
    db.collection("followup_patients").document(p_doc_id).update(data)


# Module-level db client (must be before helper functions that reference db)
db = get_firestore()


def get_patient_by_phone(phone: str):
    """
    Finds an active followup_patient by phone number.
    Tries 4 phone formats to handle format mismatches between UltraMsg and Firestore.
    """
    raw = str(phone).strip()
    normalized = raw.replace("+", "").replace(" ", "").replace("-", "")
    
    formats = set([
        raw,
        normalized,
        "+" + normalized,
        normalized[2:] if normalized.startswith("91") and len(normalized) == 12 else "91" + normalized
    ])

    for fmt in formats:
        docs = list(
            db.collection("followup_patients")
            .where("patientPhone", "==", fmt)
            .where("status", "==", "active")
            .limit(1)
            .stream()
        )
        if docs:
            d = docs[0].to_dict()
            d["doc_id"] = docs[0].id
            print(f"[FOUND] Patient with phone format '{fmt}'")
            return d

    # Debug: show all active patients' phone numbers for diagnosis
    all_active = list(
        db.collection("followup_patients").where("status", "==", "active").stream()
    )
    print(f"[NOT FOUND] No patient for phone: '{raw}'")
    print(f"   DB has: {[d.to_dict().get('patientPhone') for d in all_active]}")
    return None


def update_followup(doc_id: str, data: dict) -> None:
    """Updates a document in the followup_patients collection."""
    db.collection("followup_patients").document(doc_id).update(data)


def save_checkin(doc_id: str, data: dict) -> None:
    """Saves a full checkin response record."""
    db.collection("checkin_responses").add(data)


def save_alert(data: dict) -> None:
    """Saves a critical/moderate/no_response alert record."""
    db.collection("critical_alerts").add(data)


def save_checkin_response(phone: str, data: Dict[str, Any]) -> None:
    """
    Saves a patient's WhatsApp reply analysis to the responses collection.
    """
    db.collection("patient_responses").add({
        **data,
        "phone": phone,
        "timestamp": firestore.SERVER_TIMESTAMP
    })

def flag_alert(doc_id: str, status: str, reason: str) -> None:
    """
    Flags a patient record in the warmup_patients collection if an alert is triggered.
    """
    # Assuming 'patients' is the main collection based on existing code
    db.collection("patients").document(doc_id).update({
        "lastStatus": status,
        "alertReason": reason,
        "alertFlagged": True,
        "updatedAt": firestore.SERVER_TIMESTAMP
    })

