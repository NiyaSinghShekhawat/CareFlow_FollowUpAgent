from alerts import send_doctor_alert

send_doctor_alert(
    patient_name="John Doe",
    reason="Patient reported pain level 9/10 with fever and swelling",
    severity="critical"
)
