import os
import requests
from dotenv import load_dotenv
load_dotenv()

INSTANCE = os.getenv("ULTRAMSG_INSTANCE")
TOKEN = os.getenv("ULTRAMSG_TOKEN")

def send_message(to_number: str, message: str):
    url = f"https://api.ultramsg.com/{INSTANCE}/messages/chat"
    payload = {
        "token": TOKEN,
        "to": to_number,       # format: 919876543210 (no + sign)
        "body": message
    }
    response = requests.post(url, json=payload)
    return response.json()

def send_checkin(to_number: str, patient_name: str, day: int):
    message = f"""Hi {patient_name} 👋 This is your Day {day} recovery check-in from CareFlow.

Please answer these quick questions:
1️⃣ Pain level? (1-10)
2️⃣ Any fever? (Yes/No)
3️⃣ Any swelling at wound site? (Yes/No)
4️⃣ Overall feeling? (Good/Okay/Not well)

Your doctor is monitoring your responses 🏥"""

def send_whatsapp_message(phone: str, text: str):
    """
    Compatibility wrapper for agent.py
    """
    return send_message(phone, text)

def send_followup_whatsapp(phone: str, patient_name: str, duration: str):
    message = f"Hello {patient_name}, you are now under follow-up for {duration}. We will check in with you regularly. Take care!"
    return send_whatsapp_message(phone, message)

def send_intake_whatsapp(phone: str, patient_name: str, patient_code: str):
    message = f"Welcome {patient_name}! You have been registered at CareFlow. Your Patient ID is {patient_code}. Use this to access your dashboard at http://localhost:3000/patient. Get well soon!"
    return send_whatsapp_message(phone, message)

def send_doctor_registration_whatsapp(phone: str, doctor_name: str):
    message = f"Hello Dr. {doctor_name}, you have been successfully registered on CareFlow. You will now receive alerts for critical patient updates. Welcome aboard!"
    return send_whatsapp_message(phone, message)

def send_doctor_alert_whatsapp(patient_name: str, reason: str, severity: str):
    """
    Sends a critical alert to the default doctor number.
    """
    default_doc_phone = "9100514240"
    message = f"🚨 CareFlow ALERT ({severity.upper()})\nPatient: {patient_name}\nReason: {reason}\nPlease check the dashboard immediately."
    return send_whatsapp_message(default_doc_phone, message)
