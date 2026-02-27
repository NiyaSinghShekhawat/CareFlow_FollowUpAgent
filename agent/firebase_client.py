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


def get_patients_needing_checkin(db: firestore.Client) -> List[Dict[str, Any]]:
    """
    Simple example: return all active inpatients.

    You can refine this with timestamps, triage priority, etc.
    """
    query = db.collection("patients").where("status", "==", "admitted")
    return [
        {**(doc.to_dict() or {}), "id": doc.id}
        for doc in query.stream()
    ]


# V2: WhatsApp Interactivity Helpers
db = get_firestore()

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

