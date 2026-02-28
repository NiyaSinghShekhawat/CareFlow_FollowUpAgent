# CareFlow — AI Patient Follow-Up Agent

> The Python AI backend for [CareFlow](https://care-flow-lilac.vercel.app/) — an automated post-discharge patient monitoring system that contacts patients via WhatsApp, collects daily recovery check-ins, and alerts doctors and emergency contacts when needed.

---

## ✨ Features at a Glance

| Feature | Description |
|---|---|
| 🤖 **AI Question Generation** | Gemini AI generates personalized follow-up questions; falls back to reliable templates if AI fails |
| 💬 **WhatsApp Conversations** | Full two-way WhatsApp conversation flow via UltraMsg |
| 🚨 **3-Tier Alert System** | Normal → Moderate → Critical with escalating doctor + emergency contact notifications |
| ⏱️ **No-Response Emergency** | Auto-detects patient silence and alerts doctor + emergency contact after 18 seconds (configurable) |
| 🔄 **Conversation State Machine** | Tracks exact state of every patient conversation to avoid double-sends and race conditions |
| 📊 **AI Response Analysis** | Groq/Gemini AI parses free-text patient replies, rates severity, and writes structured data to Firestore |
| 📅 **Daily CRON Scheduler** | APScheduler sends daily check-ins to all enrolled patients automatically |
| 📧 **Email Alerts** | HTML email notifications to emergency contacts and doctors via Gmail SMTP |
| 🔥 **Firebase Integration** | Full Firestore read/write for patient records, check-in logs, and alert history |
| 📞 **Multi-Format Phone Lookup** | Handles `+91`, `91`, 10-digit, and WhatsApp-prefixed phone formats transparently |
| 🌐 **FastAPI REST Server** | Webhook endpoint for UltraMsg + internal Next.js events via a single `/webhook` route |

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    CareFlow Agent (FastAPI)                  │
│                                                             │
│  POST /webhook ──► UltraMsg WhatsApp Replies               │
│                ──► Next.js Internal Events                  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Conversation State Machine                  │  │
│  │  idle → awaiting_q1 → q1_answered → awaiting_params  │  │
│  │       → parameters_answered → completed_today         │  │
│  │       → no_response_emergency_sent (if silent)        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  question_generator.py  ──► Gemini AI / Template fallback  │
│  response_analyzer.py   ──► Groq AI / Gemini AI            │
│  followup_timer.py      ──► Background threading timer     │
│  scheduler.py           ──► APScheduler daily CRON         │
│  alerts.py              ──► WhatsApp + Email notifications  │
│  firebase_client.py     ──► Firestore CRUD helpers         │
└─────────────────────────────────────────────────────────────┘
              │                          │
              ▼                          ▼
       Firebase Firestore         UltraMsg API
    (followup_patients,         (WhatsApp delivery)
     checkin_responses,
     critical_alerts)
```

---

## 📂 Project Structure

```
agent/
├── main.py                  # FastAPI app + webhook router + phone normalizer
├── agent.py                 # High-level event orchestration (CareFlowAgent)
├── ai_client.py             # Unified AI client (Gemini + Groq fallback)
├── firebase_client.py       # Firestore CRUD helpers (get, update, save, flag)
├── question_generator.py    # AI + template-based check-in question builder
├── response_analyzer.py     # AI pipeline to parse & score patient replies
├── followup_timer.py        # Threaded timer: Q1 → wait → emergency trigger
├── scheduler.py             # APScheduler integration for daily CRON jobs
├── whatsapp.py              # UltraMsg WhatsApp message sending helpers
├── alerts.py                # Doctor & email alert dispatchers
├── critical_alerts.py       # Critical/moderate alert handlers
├── diagnose.py              # Firebase connectivity diagnostics
├── test_full_flow.py        # End-to-end follow-up flow test
├── test_gemini.py           # Gemini AI connectivity test
├── test_gemini_only.py      # Isolated Gemini model test
├── test_questions.py        # Question generation unit test
├── test_timer.py            # Timer + emergency flow test
├── test_whatsapp.py         # WhatsApp send test
├── test_email.py            # Email alert test
└── requirements.txt         # Python dependencies
```

---

## 🔄 Full Patient Follow-Up Flow

```
Doctor discharges patient (Next.js) 
        │
        ▼
POST /webhook  {event_type: "patient_followup"}
        │
        ▼
1. Enroll patient in Firestore (followup_patients)
2. Send confirmation WhatsApp + Email
3. Start background timer thread
        │
        ▼ (after 25s)
4. Send Q1: "How is your condition? A/B/C"
   Set state → awaiting_q1
        │
   ┌────┴────────────────────────┐
   │ Patient replies within 18s  │  Patient SILENT > 18s
   │                             │
   ▼                             ▼
5A. Parse A/B/C reply       5B. EMERGENCY TRIGGERED
   ├── A (Normal) ──► Send parameter questions
   ├── B (Moderate) ──► Moderate alert + parameter questions  
   └── C (Critical) ──► Critical alert → END
        │
        ▼ (state: awaiting_parameters)
6. Patient sends free-text health update
        │
        ▼
7. AI Analysis Pipeline (Groq/Gemini)
   - Extract pain ratings, fever, swelling
   - Score severity
   - Generate doctor summary
   - Generate empathetic patient reply
        │
        ▼
8. Save checkin_responses to Firestore
9. Update patient record
10. If alert_doctor → notify doctor via WhatsApp + flag in Firestore
11. Send empathetic reply to patient
    State → completed_today
```

---

## 🚨 Alert System

### 3-Tier Condition Classification

| Patient Reply | Tier | Actions Taken |
|---|---|---|
| **A — Normal** | ✅ Normal | Send parameter questions only |
| **B — Moderate** | ⚠️ Moderate | WhatsApp alert to doctor + parameter questions |
| **C — Critical** | 🚨 Critical | Immediate WhatsApp + Email to doctor and emergency contact. No further questions. |
| **No response (18s)** | 🚨 Emergency | Alert patient, emergency contact (WhatsApp + Email), and doctor |

### No-Response Emergency Flow
When a patient does not reply to Q1 within **18 seconds** (15s wait + 3s Firestore propagation buffer):
1. Sends reminder WhatsApp to the **patient**
2. Sends WhatsApp alert to the **emergency contact**
3. Sends **HTML email** to the emergency contact
4. Sends WhatsApp alert to the **doctor**
5. Saves a `critical_alerts` record in Firestore
6. Sets `conversationState` → `no_response_emergency_sent`

> If the patient replies after the emergency is sent, the system re-engages them gracefully.

---

## 🤖 AI Components

### Question Generation (`question_generator.py`)
- **Primary**: Gemini AI generates warm, contextual questions based on patient name, surgery type, recovery day, yesterday's ratings, and custom parameters
- **Fallback**: Template engine that reliably builds questions from the parameter schema — supports `rate` (0–5), `yesno`, and `value` (measurement) question types
- Supports **doctor-configurable custom parameters** per patient

### Response Analysis (`response_analyzer.py`)
- Parses free-text patient replies using Groq/Gemini
- Extracts structured ratings per parameter
- Classifies overall condition (`normal`, `warning`, `critical`)
- Generates a **doctor summary** for the Firestore record
- Generates an **empathetic patient reply**
- Triggers `alert_doctor` flag for crossed alarming thresholds

### AI Client (`ai_client.py`)
- Tries **Groq** (fast) first
- Falls back to **Google Gemini** if Groq fails
- Provides a single `ask_ai(prompt)` interface used across the codebase

---

## 📅 Daily Scheduler (`scheduler.py`)

Uses **APScheduler** to send daily check-ins to all patients with `status = "active"`:
- Reads all active patients from Firestore
- Increments `currentDay`
- Sends Q1 via WhatsApp
- Resets `conversationState` to `awaiting_q1`

---

## 🎯 Supported Webhook Events

The `/webhook` endpoint handles two input formats:

### 1. UltraMsg WhatsApp Replies (from patients)
Automatically detected by the presence of `data.body` in the payload.

### 2. Next.js Internal Events
Triggered by the frontend. Supported `event_type` values:

| Event Type | Description |
|---|---|
| `patient_intake` | New patient registered → Welcome WhatsApp + Email |
| `patient_followup` | Patient discharged → Enroll in follow-up program |
| `patient_checkin` | Patient checked in via portal → Acknowledge WhatsApp |
| `patient_help_request` | Patient requested help → Alert doctor |
| `lab_result_updated` | Lab result ready → Notify patient + doctor |
| `doctor_registration` | Doctor registered contact info → Welcome notification |

---

## ⚡ Getting Started

### Prerequisites
- Python 3.10+
- Firebase project with Firestore enabled
- UltraMsg account (WhatsApp API)
- Google Gemini API key
- Groq API key
- Gmail account with App Password (for email alerts)

### Installation

1. **Clone and navigate to the agent folder:**
   ```bash
   git clone https://github.com/NiyaSinghShekhawat/CareFlow_FollowUpAgent.git
   cd CareFlow_FollowUpAgent
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment variables:**

   Create a `.env` file:
   ```env
   # AI
   GOOGLE_API_KEY=your_gemini_api_key
   GROQ_API_KEY=your_groq_api_key

   # WhatsApp (UltraMsg)
   ULTRAMSG_INSTANCE=instance12345
   ULTRAMSG_TOKEN=your_ultramsg_token

   # Email (Gmail SMTP)
   GMAIL_ADDRESS=your_gmail@gmail.com
   GMAIL_APP_PASSWORD=your_google_app_password

   # Doctor alert phone (WhatsApp number)
   DOCTOR_PHONE=919876543210

   # CORS (Next.js frontend URL)
   CORS_ALLOW_ORIGINS=http://localhost:3000
   ```

4. **Add Firebase credentials:**

   Place your Firebase service account key at:
   ```
   agent/firebase_credentials.json
   ```

5. **Run the agent:**
   ```bash
   uvicorn agent.main:app --reload --port 8000
   ```

   The API will be live at **http://localhost:8000**

6. **Expose to the internet (for WhatsApp webhooks):**
   ```bash
   ngrok http 8000
   ```
   Set the ngrok URL as your UltraMsg webhook URL.

---

## 🔗 API Endpoints

| Method | Route | Description |
|---|---|---|
| `GET` | `/` | Health check |
| `POST` | `/webhook` | Universal webhook — handles both WhatsApp replies and Next.js events |
| `GET` | `/docs` | Interactive Swagger UI (auto-generated by FastAPI) |

---

## 🧪 Testing

```bash
# Test Gemini AI connection
python -m agent.test_gemini

# Test question generation
python -m agent.test_questions

# Test end-to-end follow-up flow
python -m agent.test_full_flow

# Test WhatsApp send
python -m agent.test_whatsapp

# Test email alert
python -m agent.test_email

# Test timer + emergency
python -m agent.test_timer

# Diagnose Firebase connection
python -m agent.diagnose
```

---

## 🔥 Firestore Collections

| Collection | Purpose |
|---|---|
| `followup_patients` | Enrolled patients, conversation state, parameters |
| `checkin_responses` | Daily check-in records with AI analysis |
| `critical_alerts` | Critical/no-response alert log |
| `patients` | Main patient records (from Next.js frontend) |

---

## 🛡️ License

Distributed under the MIT License.

---

> Part of the **CareFlow** ecosystem — built for VNR Hackathon 2026.  
> Frontend: [github.com/NiyaSinghShekhawat/CareFlow](https://github.com/NiyaSinghShekhawat/CareFlow) | Live: [care-flow-lilac.vercel.app](https://care-flow-lilac.vercel.app)
