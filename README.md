# CareFlow — Real-Time Clinical Workflow Coordination System

> A unified command center for emergency departments and hospital settings, built with Next.js, Firebase, and an intelligent AI Follow-Up Agent.

🚀 **Live Demo**: [care-flow-lilac.vercel.app](https://care-flow-lilac.vercel.app/)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Role-Based Dashboards](#role-based-dashboards)
- [Follow-Up Agent](#follow-up-agent)
- [Getting Started](#getting-started)
- [Demo Access](#demo-access)
- [Testing Flow](#recommended-testing-flow)
- [Project Structure](#project-structure)
- [License](#license)

---

## Overview

**CareFlow** is a next-generation clinical workflow coordination platform designed for real-world hospital and emergency department use. It replaces fragmented, paper-based communication between clinical teams with a live, synchronized dashboard ecosystem — so doctors, nurses, lab technicians, radiologists, and pharmacists are always on the same page.

At its core, CareFlow is built around three principles:
- **Real-time visibility** — every action is instantly reflected across all relevant dashboards via Firebase Firestore.
- **Role-based clarity** — each staff member sees exactly what they need, nothing more and nothing less.
- **Intelligent follow-up** — an AI agent layer monitors patient journeys and proactively flags delayed or pending tasks.

> Built for the **KLH Hackathon 2026**.

---

## Key Features

- **Unified Command Center** — Specialized dashboards for Doctors, Nurses, Labs, Radiology, and Pharmacy, all synchronized in real time.
- **Real-Time Synergy** — Instant updates across all roles using Firebase Firestore. When a doctor orders a lab test, it appears immediately in the lab queue.
- **Granular Status Tracking** — A three-stage clinical lifecycle (`Pending → Processing → Completed`) for every major task.
- **Patient-Centric Portal** — A dedicated interface for patients to track their own care journey, view assigned staff, and monitor test results live.
- **Intelligent Triage & Intake** — Priority-based patient admission with sorting levels: `STAT`, `Urgent`, and `Normal`.
- **Auto-Discovery & Assignment** — Automatic patient-to-doctor and patient-to-nurse assignment based on hospital IDs.
- **AI Follow-Up Agent** — Python-based agent that monitors workflows and surfaces pending/overdue clinical tasks.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js](https://nextjs.org/) (App Router) |
| Language | [TypeScript](https://www.typescriptlang.org/) |
| Database / Real-time | [Firebase Firestore](https://firebase.google.com/products/firestore) |
| Styling | [Tailwind CSS](https://tailwindcss.com/) |
| Animations | [Framer Motion](https://www.framer.com/motion/) |
| Icons | [Lucide React](https://lucide.dev/) |
| AI Agent | Python |

---

## Architecture

```
CareFlow/
├── app/              # Next.js App Router pages and layouts
├── agent/            # Python-based AI Follow-Up Agent
├── components/       # Reusable React UI components
├── hooks/            # Custom React hooks
├── lib/              # Firebase config, utilities
├── types/            # TypeScript type definitions
└── public/           # Static assets
```

The frontend communicates with Firebase Firestore for all real-time data. The `agent/` module is a Python service that runs independently and interfaces with Firestore to monitor clinical task states and trigger intelligent follow-up actions.

---

## Role-Based Dashboards

### 👨‍⚕️ Doctor (`/doctor`)
- Patient intake and triage
- Ordering laboratory tests, radiology imaging, and medications
- Specialist referrals and consultancy tracking
- Case management: Discharge or Follow-up scheduling

### 🧪 Laboratory (`/lab`)
- Real-time queue of bloodwork and sample requests
- Status management: `Pending → Processing → Completed`
- High-priority STAT request alerting

### ☢️ Radiology (`/radiology`)
- Imaging request management (X-Ray, CT, MRI, Ultrasound)
- Radiology-specific workflow status updates

### 💊 Pharmacy (`/pharmacy`)
- Prescription fulfillment tracking
- Medication dispensing status management

### 👩‍⚕️ Nurse (`/nurse`)
- Patient monitoring
- Care task coordination and nurse-to-patient assignment visibility

### 👤 Patient Portal (`/patient`)
- Live "Clinical Journey" tracker
- Visibility into pending tests, medications, and results
- View of assigned nurse and care team

---

## Follow-Up Agent

The `agent/` directory contains a Python-based AI follow-up agent that adds an intelligent monitoring layer on top of the real-time dashboard system. It connects to Firebase Firestore to:

- Monitor the status of all active clinical tasks
- Detect tasks that have been `Pending` beyond an acceptable threshold
- Flag or escalate overdue items to the appropriate clinical staff
- Support automated reminders and handoff coordination

This agent is designed to run as a background service alongside the Next.js frontend.

---

## Getting Started

### Prerequisites

- **Node.js** 18+
- **Python** 3.8+ (for the Follow-Up Agent)
- A **Firebase project** with Firestore enabled

### 1. Clone the Repository

```bash
git clone https://github.com/NiyaSinghShekhawat/CareFlow_FollowUpAgent.git
cd CareFlow_FollowUpAgent
```

### 2. Install Frontend Dependencies

```bash
npm install
```

### 3. Configure Firebase

Create a `.env.local` file in the project root and add your Firebase credentials:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

Alternatively, update `lib/firebase.ts` directly with your configuration.

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Run the Follow-Up Agent (Optional)

```bash
cd agent
pip install -r requirements.txt
python main.py
```

---

## Demo Access

Use the following credentials to explore CareFlow's cross-role functionality:

| Role | URL | Login ID |
|---|---|---|
| Doctor | `/doctor` | `DOC-0001` or `DOC-0002` |
| Nurse | `/nurse` | `NU-0001` or `NU-0002` |
| Patient | `/patient` | Dynamic Patient ID (see flow below) |
| Lab | `/lab` | Direct access (open queue) |
| Radiology | `/radiology` | Direct access (open queue) |
| Pharmacy | `/pharmacy` | Direct access (open queue) |

---

## Recommended Testing Flow

Follow this sequence to experience the full cross-role synchronization in action:

1. **Admission** — Log in as Doctor (`DOC-0001`) and admit a new patient. Note the generated **Patient ID** (e.g., `PT-1234-567`).
2. **Patient View** — Open the Patient Portal (`/patient`) and log in with that Patient ID to watch the journey live.
3. **Collaboration** — As the Doctor, order labs or medications.
4. **Fulfillment** — Switch to the Lab (`/lab`) or Pharmacy (`/pharmacy`) dashboard. Mark the task as `Processing`, then `Completed`.
5. **Real-Time Feedback** — Observe the Patient Portal and Doctor Dashboard updating instantly.
6. **Nurse Assignment** — Log in as Nurse (`NU-0001`) — note that only explicitly assigned patients are visible.

---

## Project Structure

```
CareFlow_FollowUpAgent/
├── agent/                  # AI Follow-Up Agent (Python)
├── app/                    # Next.js pages
│   ├── doctor/             # Doctor dashboard
│   ├── nurse/              # Nurse dashboard
│   ├── lab/                # Lab dashboard
│   ├── radiology/          # Radiology dashboard
│   ├── pharmacy/           # Pharmacy dashboard
│   └── patient/            # Patient portal
├── components/             # Shared UI components
├── hooks/                  # React hooks
├── lib/                    # Firebase init, helpers
├── types/                  # TypeScript types
├── public/                 # Static assets
├── .env.local              # Environment variables (create this)
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

---

## License

Distributed under the **MIT License**.

---

*Built with ❤️ for the VNR Hackathon 2026.*
