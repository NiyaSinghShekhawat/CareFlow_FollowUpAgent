# agent/ai_client.py — updated with your available models

import os
from dotenv import load_dotenv
load_dotenv()

API_KEY  = os.getenv("GROQ_API_KEY")

# ── Model priority list ──────────────────────
PRIMARY_MODEL  = "meta-llama/llama-4-scout-17b-16e-instruct"
FALLBACK_MODEL = "qwen/qwen3-32b"
LAST_MODEL     = "llama-3.3-70b-versatile" # Added versatile suffix since that is usually the groq tag, but fallbacks ensure safety 

def ask_ai(prompt: str) -> str:
    if not API_KEY:
        print("[WARN] GROQ_API_KEY is not defined in .env")
        return None
        
    for model in [PRIMARY_MODEL, FALLBACK_MODEL, LAST_MODEL]:
        result = _call(prompt, model)
        if result:
            return result
    print("[FAILED] All Groq models failed")
    return None

def _call(prompt: str, model: str) -> str:
    try:
        from groq import Groq
        client = Groq(api_key=API_KEY)
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4,
            max_tokens=1024
        )
        text = response.choices[0].message.content.strip()
        print(f"[SUCCESS] {model} responded ({len(text)} chars)")
        return text
    except Exception as e:
        print(f"[WARN] {model} failed: {e}")
        return None
