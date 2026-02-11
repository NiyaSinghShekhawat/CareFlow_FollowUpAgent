
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  Timestamp, 
  query, 
  where, 
  orderBy, 
  onSnapshot 
} from "firebase/firestore";
import { db } from "./firebase";
import { Patient, Action, ActionStatus, Department, ActionPriority } from "@/types";

// --- Patients ---

export const addPatient = async (patientData: Omit<Patient, 'id' | 'createdAt' | 'admittedAt'>) => {
  try {
    await addDoc(collection(db, "patients"), {
      ...patientData,
      admittedAt: Timestamp.now(),
      createdAt: Timestamp.now()
    });
  } catch (error) {
    console.error("Error adding patient: ", error);
    throw error;
  }
};

// --- Actions ---

export const addAction = async (actionData: Omit<Action, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => {
  try {
    await addDoc(collection(db, "actions"), {
      ...actionData,
      status: "Pending",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error("Error adding action: ", error);
    throw error;
  }
};

export const updateActionStatus = async (actionId: string, newStatus: ActionStatus) => {
  try {
    const ref = doc(db, "actions", actionId);
    await updateDoc(ref, {
      status: newStatus,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error("Error updating action status: ", error);
    throw error;
  }
};

// --- Real-time Hooks (Helper Logic) ---

export const subscribeToDepartmentActions = (department: Department, callback: (actions: Action[]) => void) => {
  const q = query(
    collection(db, "actions"),
    where("department", "==", department),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, (snapshot) => {
    const actions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Action));
    callback(actions);
  });
};

export const subscribeToPatientActions = (patientId: string, callback: (actions: Action[]) => void) => {
  const q = query(
    collection(db, "actions"),
    where("patientId", "==", patientId),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, (snapshot) => {
    const actions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Action));
    callback(actions);
  });
};
