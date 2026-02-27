import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

GMAIL_ADDRESS = os.getenv("GMAIL_ADDRESS")
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD")
DOCTOR_EMAIL = os.getenv("DOCTOR_EMAIL") or "niasingh.shekhawat@gmail.com"

def send_doctor_alert(patient_name, reason, severity):
    sender = GMAIL_ADDRESS
    receiver = DOCTOR_EMAIL
    
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"🚨 CareFlow Alert - {severity.upper()} - {patient_name}"
    msg["From"] = sender
    msg["To"] = receiver
    
    body = f"""
    <h2>⚠️ Patient Alert from CareFlow</h2>
    <p><b>Patient:</b> {patient_name}</p>
    <p><b>Severity:</b> {severity}</p>
    <p><b>Reason:</b> {reason}</p>
    <p>Please check the CareFlow dashboard immediately.</p>
    """
    
    msg.attach(MIMEText(body, "html"))
    
    # Using Port 465 for SMTP_SSL
    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(sender, GMAIL_APP_PASSWORD)
            server.sendmail(sender, receiver, msg.as_string())
            print("✅ Alert email sent via Port 465!")
            return True
    except Exception as e:
        print(f"❌ Port 465 failed: {e}. Trying Port 587...")
        try:
            with smtplib.SMTP("smtp.gmail.com", 587) as server:
                server.ehlo()
                server.starttls()
                server.login(sender, GMAIL_APP_PASSWORD)
                server.sendmail(sender, receiver, msg.as_string())
                print("✅ Alert email sent via Port 587!")
                return True
        except Exception as e587:
            print(f"❌ Port 587 failed: {e587}")
            return False

def notify_doctor_for_patient_help(db, patient, message):
    """
    Orchestrates alert for proactive patient help request
    """
    patient_name = patient.get("name", "Unknown Patient")
    return send_doctor_alert(
        patient_name=patient_name,
        reason=message,
        severity="high"
    )

def notify_doctor_for_lab_result(db, patient, payload):
    """
    Orchestrates alert for updated lab results
    """
    patient_name = patient.get("name", "Unknown Patient")
    lab_name = payload.get("lab_name", "Lab Test")
    result_val = payload.get("value", "N/A")
    
    reason = f"Updated lab result for {lab_name}: {result_val}"
    return send_doctor_alert(
        patient_name=patient_name,
        reason=reason,
        severity="medium"
    )

def send_followup_email(patient_email: str, patient_name: str, duration: str):
    """
    Sends a follow-up notification email to the patient
    """
    sender = GMAIL_ADDRESS
    receiver = patient_email
    
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"CareFlow Follow-up Notification - {patient_name}"
    msg["From"] = sender
    msg["To"] = receiver
    
    body = f"""
    <h2>🏥 CareFlow Follow-up Notification</h2>
    <p>Dear {patient_name},</p>
    <p>This is to inform you that you are now under <b>follow-up care</b> at CareFlow.</p>
    <p><b>Duration of Follow-up:</b> {duration}</p>
    <p>Our team will be monitoring your progress during this period. Please stay tuned for further updates or check-ins via WhatsApp.</p>
    <p>Thank you for choosing CareFlow.</p>
    """
    
    msg.attach(MIMEText(body, "html"))
    
    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(sender, GMAIL_APP_PASSWORD)
            server.sendmail(sender, receiver, msg.as_string())
            print(f"✅ Follow-up email sent to {patient_email}")
            return True
    except Exception as e:
        print(f"❌ Failed to send follow-up email: {e}")
        return False

def send_intake_email(patient_email: str, patient_name: str, patient_code: str):
    """
    Sends a welcome email with Patient ID to the patient
    """
    sender = GMAIL_ADDRESS
    receiver = patient_email
    
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"Welcome to CareFlow - Your Patient ID: {patient_code}"
    msg["From"] = sender
    msg["To"] = receiver
    
    body = f"""
    <h2>🏥 Welcome to CareFlow</h2>
    <p>Dear {patient_name},</p>
    <p>You have been successfully registered at CareFlow.</p>
    <p><b>Your Patient ID:</b> <span style="font-family: monospace; font-weight: bold; font-size: 1.2em;">{patient_code}</span></p>
    <p>Use this ID to access your real-time tracking dashboard at our Patient Portal:</p>
    <p><a href="http://localhost:3000/patient" style="background-color: #0d9488; color: white; padding: 10px 20px; text-decoration: none; rounded: 8px;">Access Patient Portal</a></p>
    <p>Wishing you a speedy recovery.</p>
    <p>Best regards,<br>CareFlow Team</p>
    """
    
    msg.attach(MIMEText(body, "html"))
    
    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(sender, GMAIL_APP_PASSWORD)
            server.sendmail(sender, receiver, msg.as_string())
            print(f"✅ Intake welcome email sent to {patient_email}")
            return True
    except Exception as e:
        print(f"❌ Failed to send intake email: {e}")
        return False

def send_doctor_registration_email(doctor_email: str, doctor_name: str):
    """
    Sends a confirmation email to the doctor upon registration
    """
    sender = GMAIL_ADDRESS
    receiver = doctor_email
    
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"CareFlow Registration Confirmation - Dr. {doctor_name}"
    msg["From"] = sender
    msg["To"] = receiver
    
    body = f"""
    <h2>🏥 Welcome to CareFlow, Dr. {doctor_name}</h2>
    <p>You have been successfully registered as a medical professional on the CareFlow platform.</p>
    <p>Your contact information has been verified. You will now receive important patient updates and system alerts via this email and WhatsApp.</p>
    <p>Thank you for your dedication to patient care.</p>
    <p>Best regards,<br>CareFlow Administration</p>
    """
    
    msg.attach(MIMEText(body, "html"))
    
    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(sender, GMAIL_APP_PASSWORD)
            server.sendmail(sender, receiver, msg.as_string())
            print(f"✅ Doctor registration email sent to {doctor_email}")
            return True
    except Exception as e:
        print(f"❌ Failed to send doctor registration email: {e}")
        return False
