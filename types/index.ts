
import { Timestamp } from 'firebase/firestore';

export type PatientStatus = 
  | "waiting"
  | "under_treatment"
  | "referred"
  | "lab_ordered"
  | "radiology_ordered"
  | "pharmacy_ordered"
  | "completed"
  | "critical"
  | "follow_up";

export type Priority = "normal" | "urgent" | "stat";

export interface Patient {
  id: string;
  patientCode: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: string;
  condition: string;
  status: PatientStatus;
  priority: Priority;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // New detailed fields
  labTest?: string;        // e.g., "CBC", "X-Ray"
  radiologyTest?: string;  // e.g., "CT Scan", "MRI"
  referredTo?: string;     // e.g., "Cardiologist"
  medication?: string;     // e.g., "Aspirin"
  followUpDate?: string;   // ISO date string for follow-up appointment
  assignedNurse?: string;  // e.g., "NU-0001"
  pastMedications?: string; // Patient's medication history
  pastAllergies?: string;   // Patient's allergy history
  assignedDoctorId?: string; // ID of the doctor managing this patient
  
  // Status tracking for specific stages
  consultancyStatus?: "pending" | "processing" | "completed";
  labStatus?: "pending" | "processing" | "completed";
  radiologyStatus?: "pending" | "processing" | "completed";
  pharmacyStatus?: "pending" | "processing" | "completed";
}

export interface Action {
  id: string;
  patientId: string;
  type: string;
  status: string;
}

export type OrderStatus = "pending" | "processing" | "ready" | "completed";

export interface Order {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_mrn: string;
  test_type: string;
  priority: Priority;
  status: OrderStatus;
  ordered_at: string;
  updated_at: string;
  department: "lab" | "radiology" | "pharmacy";
  notes?: string;
  technician_id?: string;
  findings?: string;
}
