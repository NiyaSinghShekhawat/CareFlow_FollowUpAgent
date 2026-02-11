# CareFlow.

**CareFlow** is a next-generation, real-time clinical workflow coordination system designed for modern emergency departments and hospital settings. It provides a unified command center for doctors, nurses, and clinical departments to collaborate seamlessly through a role-based dashboard ecosystem.

## 🚀 Key Features

- **Unified Command Center**: Specialized dashboards for Doctors, Nurses, Labs, Radiology, and Pharmacy.
- **Real-Time Synergy**: Instance synchronization across all roles using Firebase Firestore. When a doctor orders a test, it appears instantly in the department's queue.
- **Granular Status Tracking**: Three-stage clinical lifecycle (Pending ➔ Processing ➔ Completed) for every major task.
- **Patient-Centric Portal**: A dedicated interface for patients to track their own care journey, see assigned staff, and monitor test results in real-time.
- **Intelligent Triage & Intake**: Streamlined patient admission process with priority-based sorting (Stat, Urgent, Normal).
- **Auto-Discovery & Assignment**: Intelligent logic to assign patients to doctors and nurses based on hospital IDs.

## 🛠️ Technology Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database/Real-time**: [Firebase Firestore](https://firebase.google.com/products/firestore)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)

## 🏥 Role-Based Dashboards

### 👨‍⚕️ Doctor Dashboard
- Patient intake and triage.
- Ordering laboratory tests, radiology imaging, and medications.
- Specialist referrals.
- Case management (Discharge / Follow-up scheduling).
- Consultancy status tracking.

### 🧪 Laboratory Dashboard
- Real-time queue of bloodwork and sample requests.
- Status management (Pending ➔ Processing ➔ Completed).
- High-priority (STAT) request alerting.

### ☢️ Radiology Dashboard
- Imaging request management (X-Ray, CT, MRI, Ultrasound).
- Radiology-specific workflow status updates.

### 💊 Pharmacy Dashboard
- Prescription fulfillment tracking.
- Medication dispensing statuses.

### 👩‍⚕️ Nurse Dashboard
- Patient monitoring.
- Care task coordination and nurse-to-patient assignment visibility.

### 👤 Patient Portal
- Real-time "Clinical Journey" tracker.
- Visibility into pending tests and medications.
- Assigned nurse identification.

## 📦 Getting Started

### Prerequisites
- Node.js 18+
- A Firebase project with Firestore enabled.

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/niya/vnr_hackathon.git
   cd vnr_hackathon
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Firebase**:
   Create a `.env.local` file in the root and add your Firebase configurations (or ensure `lib/firebase.ts` is correctly configured).

4. **Run the development server**:
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🛡️ License
Distributed under the MIT License. See `LICENSE` for more information.

---
Built for the VNR Hackathon 2026.
