import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

def test_gemini():
    if not GEMINI_API_KEY:
        print("❌ GEMINI_API_KEY not found in .env")
        return False
    
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content("Say 'Gemini is connected!'")
        print(f"✅ Gemini Response: {response.text}")
        return True
    except Exception as e:
        print(f"❌ Gemini Error: {e}")
        return False

if __name__ == "__main__":
    test_gemini()
