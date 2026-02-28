import os
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from dotenv import load_dotenv
load_dotenv()

key = os.getenv("GEMINI_API_KEY")
print(f"Key found: {'YES — ' + key[:10] + '...' if key else 'NO — KEY MISSING IN .env'}")

import google.generativeai as genai
genai.configure(api_key=key)

models = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest", 
    "gemini-1.5-pro",
    "gemini-pro"
]

for m in models:
    try:
        model = genai.GenerativeModel(m)
        r = model.generate_content("Say the word HELLO only")
        print(f"[SUCCESS] {m} WORKS → {r.text.strip()}")
    except Exception as e:
        print(f"[FAILED] {m} FAILED → {e}")
