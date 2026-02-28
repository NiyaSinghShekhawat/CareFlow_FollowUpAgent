# agent/test_questions.py

import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv
load_dotenv()

from .question_generator import generate_todays_questions

# Fake patient — no Firebase needed
test_patient = {
    "patientName":    "Test Patient",
    "surgeryType":    "Heart Surgery",
    "followupDays":   7,
    "doctorName":     "Dr. Sharma",
    "treatmentHistory": "Post bypass surgery",
    "lastRatings":    {},
    "lastSubjective": "",
    "parameters": [
        {
            "name": "Chest Pain",
            "questionType": "rate",
            "description": "Pain in chest area",
            "scaleZero": "No pain",
            "scaleFive": "Severe pain",
            "alarmingRate": 2
        },
        {
            "name": "Fever",
            "questionType": "yesno",
            "description": "Body temperature elevated",
            "alarmingAnswer": "yes"
        },
        {
            "name": "Blood Pressure",
            "questionType": "value",
            "description": "BP reading",
            "unit": "mmHg",
            "alarmingValueMin": 90,
            "alarmingValueMax": 140
        }
    ]
}

import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

print("="*50)
print("TESTING QUESTION GENERATION")
print("="*50)
result = generate_todays_questions(test_patient, 1)
print("\nGENERATED MESSAGE:")
print("-"*50)
print(result)
print("-"*50)
print("\n✅ Done — copy above and check if it looks correct")
