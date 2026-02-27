
"use client";

import { useState, useEffect, FormEvent } from "react";
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  onSnapshot, 
  query, 
  where,
  getDocs,
  orderBy, 
  Timestamp 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { addAction } from "@/lib/db";
import { Patient, PatientStatus, Priority } from "@/types";
import { 
  UserPlus, 
  User, 
  Activity, 
  AlertCircle, 
  Beaker, 
  Pill, 
  CheckCircle2, 
  ArrowRightCircle, 
  Clock, 
  X,
  Stethoscope,
  ChevronDown,
  Undo2,
  AlertTriangle,
  Lock,
  Calendar,
  Scan,
  MessageSquare,
  Send
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function DoctorDashboard() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [criticalBanner, setCriticalBanner] = useState(false);
  
  // Login State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [doctorIdInput, setDoctorIdInput] = useState("DOC-");
  const [loginError, setLoginError] = useState("");
  const [currentDoctorId, setCurrentDoctorId] = useState("");
  
  // Selection State
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'lab' | 'refer' | 'pharmacy' | 'nurse' | 'radiology' | null>(null);
  const [showDischargeConfirm, setShowDischargeConfirm] = useState(false);
  
  // Custom Input State
  const [customInput, setCustomInput] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpDuration, setFollowUpDuration] = useState("2 weeks");
  const [showFollowUpInput, setShowFollowUpInput] = useState(false);
  const [smsInput, setSmsInput] = useState("");
  const [isSendingSms, setIsSendingSms] = useState(false);
  
  // Doctor Registration State
  const [docPhone, setDocPhone] = useState("");
  const [docEmail, setDocEmail] = useState("");
  const [isRegisteringDoc, setIsRegisteringDoc] = useState(false);
  const [docRegistered, setDocRegistered] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState<'ongoing' | 'followup' | 'completed'>('ongoing');

  // Form State
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    age: "",
    gender: "Male",
    condition: "",
    priority: "normal" as Priority,
    pastMedications: "",
    pastAllergies: "",
    phoneNumber: "",
    email: ""
  });

  // Sound Alert Logic
  useEffect(() => {
    const hasCritical = patients.some(p => p.status === 'critical' || p.priority === 'stat');
    setCriticalBanner(hasCritical);
    if (hasCritical) playSound('alert');
  }, [patients]);

  const playSound = (type: 'alert' | 'click') => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'alert') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(440, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      }
    } catch (e) {
      console.error("Audio play failed", e);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setLoginError("");

    setTimeout(() => {
      const validIds = ["doc-0001", "doc-0002"];
      if (validIds.includes(doctorIdInput.toLowerCase())) {
        setIsLoggedIn(true);
        setCurrentDoctorId(doctorIdInput.toUpperCase());
        playSound('click');
      } else {
        setLoginError("Invalid Doctor ID. Access Denied.");
        playSound('alert');
      }
      setFormLoading(false);
    }, 800);
  };

  // 1. Live Patient List Subscription
  useEffect(() => {
    if (!currentDoctorId) return;

    const q = query(
      collection(db, "patients"), 
      where("assignedDoctorId", "==", currentDoctorId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const patientData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Patient[];
      
      patientData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      
      setPatients(patientData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentDoctorId]);

  // Simulation for Email Alerts
  const simulateEmail = (email: string, subject: string, body: string) => {
    console.log(`%c[EMAIL DISPATCHED] to ${email}`, "color: #3b82f6; font-weight: bold; font-size: 12px; border: 1px solid #3b82f6; padding: 4px; border-radius: 4px;");
    console.log(`%cSubject: ${subject}\n\n${body}`, "color: #94a3b8; font-size: 10px;");
  };

  // Simulation for SMS Alerts
  const simulateSMS = (phone: string, message: string) => {
    console.log(`%c[SMS ALERT] to ${phone}: ${message}`, "color: #10b981; font-weight: bold; font-size: 12px; border: 1px solid #10b981; padding: 4px; border-radius: 4px;");
  };

  // 2. Patient Creation
  const handleCreatePatient = async (e: FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const timestamp = Date.now().toString().slice(-4);
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const patientCode = `PT-${timestamp}-${random}`;

      const patientRef = await addDoc(collection(db, "patients"), {
        patientCode,
        firstName: formData.firstName,
        lastName: formData.lastName,
        age: Number(formData.age),
        gender: formData.gender,
        condition: formData.condition,
        priority: formData.priority,
        status: "waiting",
        pastMedications: formData.pastMedications,
        pastAllergies: formData.pastAllergies,
        assignedDoctorId: currentDoctorId,
        consultancyStatus: "pending",
        phoneNumber: formData.phoneNumber,
        email: formData.email,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      // Trigger Intake Notification
      try {
        await fetch("http://localhost:8000/webhook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event_type: "patient_intake",
            patient_id: patientRef.id,
            payload: {
              patient_name: `${formData.firstName} ${formData.lastName}`,
              patient_email: formData.email,
              phone: formData.phoneNumber,
              patient_code: patientCode
            }
          })
        });
      } catch (err) {
        console.error("Failed to trigger intake webhook", err);
      }

      // Log Admission Action
      await addAction({
        patientId: patientRef.id,
        patientName: `${formData.firstName} ${formData.lastName}`,
        type: "Patient Admission",
        description: `Patient admitted for ${formData.condition}. Initial assessment pending.`,
        priority: formData.priority.toUpperCase() as any,
        createdBy: currentDoctorId || "System",
        department: "Doctor"
      });

      // Trigger SMS for Admission if phone exists (though phone is usually added later by patient)
      if (formData.firstName && patientRef.id) {
         // This is a placeholder since phone is usually added by the patient themselves in their portal
      }

      setFormData({
        firstName: "",
        lastName: "",
        age: "",
        gender: "Male",
        condition: "",
        priority: "normal",
        pastMedications: "",
        pastAllergies: "",
        phoneNumber: "",
        email: ""
      });
      playSound('click');
    } catch (error) {
      console.error("Error creating patient:", error);
    } finally {
      setFormLoading(false);
    }
  };

  // 3. Actions Updates
  const updatePatientDetail = async (id: string, updates: Partial<Patient>, actionDescription?: string) => {
    try {
      const ref = doc(db, "patients", id);
      await updateDoc(ref, {
        ...updates,
        updatedAt: Timestamp.now()
      });

      if (actionDescription) {
        const p = patients.find(pat => pat.id === id);
        await addAction({
          patientId: id,
          patientName: p ? `${p.firstName} ${p.lastName}` : "Unknown",
          type: "Care Update",
          description: actionDescription,
          priority: (updates.priority || p?.priority || "normal").toUpperCase() as any,
          createdBy: currentDoctorId || "System",
          department: "Doctor"
        });

        // Trigger Automated SMS if phone exists
        if (p?.phoneNumber) {
          simulateSMS(p.phoneNumber, `CareFlow Update for ${p.firstName}: ${actionDescription}`);
        }

        // Trigger Discharge Special Alerts (Email + SMS)
        if (updates.status === 'completed' || updates.status === 'follow_up') {
          const dischargeMsg = updates.status === 'completed' 
            ? `Your treatment at CareFlow is complete. You have been formally discharged.` 
            : `Your inpatient treatment is complete. Please remember your follow-up appointment on ${updates.followUpDate || p?.followUpDate}.`;
          
          if (p?.phoneNumber) {
            simulateSMS(p.phoneNumber, `DISCHARGE NOTICE: ${dischargeMsg}`);
          }
          if (p?.email) {
            // Fetch full treatment history for the email report
            const actionsSnapshot = await getDocs(query(collection(db, "actions"), where("patientId", "==", id)));
            const history = actionsSnapshot.docs
              .map(doc => doc.data())
              .sort((a: any, b: any) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0))
              .map((a: any) => `[${a.type}] ${a.description || 'No details'}`)
              .join("\n");

            const emailBody = `Hello ${p.firstName},\n\n${dischargeMsg}\n\n` +
              `--- CLINICAL TREATMENT SUMMARY ---\n` +
              `${history || 'No treatment records found.'}\n\n` +
              `--- END OF REPORT ---\n\n` +
              `Your clinical records have been updated. Thank you for choosing CareFlow Medical Group.`;

            simulateEmail(
              p.email, 
              `Full Discharge Report - ${p.firstName} ${p.lastName}`, 
              emailBody
            );
          }
        }
      }

      playSound('click');
      closeModal();
    } catch (error) {
      console.error("Error updating patient:", error);
    }
  };

  const closeModal = () => {
    setSelectedPatientId(null);
    setActionType(null);
    setShowDischargeConfirm(false);
    setCustomInput("");
    setShowCustomInput(false);
    setFollowUpDate("");
    setFollowUpDuration("2 weeks");
  };

  const handleSendCustomSMS = async (p: Patient) => {
    if (!smsInput.trim() || !p.phoneNumber) return;
    setIsSendingSms(true);
    
    // Log the message as an action
    await addAction({
      patientId: p.id,
      patientName: `${p.firstName} ${p.lastName}`,
      type: "Doctor Message (SMS)",
      description: smsInput,
      priority: "NORMAL",
      createdBy: currentDoctorId,
      department: "Doctor"
    });

    simulateSMS(p.phoneNumber, `Message from Dr. ${currentDoctorId}: ${smsInput}`);
    setSmsInput("");
    setIsSendingSms(false);
  };

  const statusColors = {
    waiting: "bg-slate-800 text-slate-400 border-slate-700",
    under_treatment: "bg-teal-900/30 text-teal-400 border-teal-500/30",
    lab_ordered: "bg-blue-900/30 text-blue-400 border-blue-500/30",
    radiology_ordered: "bg-indigo-900/30 text-indigo-400 border-indigo-500/30",
    pharmacy_ordered: "bg-purple-900/30 text-purple-400 border-purple-500/30",
    referred: "bg-amber-900/30 text-amber-400 border-amber-500/30",
    completed: "bg-green-900/30 text-green-400 border-green-500/30",
    critical: "bg-red-900/30 text-red-500 border-red-500/50 animate-pulse",
    Critical: "bg-red-900/30 text-red-500 border-red-500/50 animate-pulse",
    follow_up: "bg-pink-900/30 text-pink-400 border-pink-500/30"
  };

  const priorityColors = {
    normal: "bg-slate-800 text-slate-400 border-slate-700",
    urgent: "bg-orange-900/30 text-orange-400 border-orange-500/30",
    stat: "bg-red-600 text-white animate-pulse shadow-red-900/50 shadow-lg"
  };

  const LabOptions = ["CBC", "BMP", "Troponin", "Urinalysis", "Arterial Blood Gas", "Liver Function Test", "Lipid Panel"];
  const RadiologyOptions = ["X-Ray Chest", "CT Scan Head", "MRI Brain", "Ultrasound Abdomen", "CT Abdomen/Pelvis", "X-Ray Extremity", "MRI Spine"];
  const DoctorReferrals = ["Cardiologist", "Neurologist", "Orthopedist", "General Surgeon", "Psychiatrist", "Pediatrician", "Oncologist"];
  const PharmOptions = ["Antibiotics", "Pain Management", "Anti-inflammatory", "Cardiac Meds", "Insulin"];

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[20%] right-[30%] w-[40%] h-[40%] bg-teal-900/10 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-[10%] left-[20%] w-[30%] h-[30%] bg-blue-900/10 rounded-full blur-[100px]"></div>
        </div>

        <div className="w-full max-w-xl bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-16 border border-slate-800/50 relative z-10 text-center">
          <div className="mb-12">
            <div className="w-24 h-24 bg-gradient-to-tr from-teal-500 to-blue-500 rounded-3xl flex items-center justify-center mx-auto mb-8 text-white shadow-2xl shadow-teal-500/20 transform rotate-3 hover:rotate-6 transition-all duration-500">
              <Stethoscope size={48} />
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight mb-4">Doctor Portal</h1>
            <p className="text-lg text-slate-400 font-medium tracking-wide">Secure access for medical staff only</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-8">
            <div className="space-y-3">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-[0.2em] text-left ml-1">Doctor ID</label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="e.g. DOC-0001"
                  suppressHydrationWarning
                  className="w-full pl-6 pr-4 py-4.5 rounded-2xl bg-slate-950 border border-slate-800 text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all uppercase font-mono tracking-widest placeholder:text-slate-700 text-lg shadow-inner"
                  value={doctorIdInput}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    if (!val.startsWith("DOC-")) {
                      setDoctorIdInput("DOC-");
                    } else {
                      setDoctorIdInput(val);
                    }
                  }}
                />
              </div>
            </div>

            {loginError && (
              <div className="p-4 bg-red-900/20 border border-red-500/30 text-red-400 text-sm rounded-xl flex items-center gap-3 animate-shake">
                <AlertTriangle size={20} />
                <span className="font-semibold">{loginError}</span>
              </div>
            )}

            <button 
              type="submit" 
              disabled={formLoading}
              suppressHydrationWarning
              className="w-full bg-teal-600 hover:bg-teal-500 text-white font-black py-4.5 rounded-2xl transition-all duration-300 shadow-xl shadow-teal-900/20 hover:shadow-teal-500/30 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98] text-lg tracking-wide group"
            >
              {formLoading ? "Verifying..." : (
                <>
                  Access Dashboard
                  <ArrowRightCircle size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form> 
          
          <div className="mt-12 pt-8 border-t border-slate-800 text-xs font-bold text-slate-600 tracking-[0.3em] uppercase">
            Authorized Personnel Only • v2.0.4
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans pb-20 relative overflow-x-hidden">
      
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[10%] left-[20%] w-[30%] h-[30%] bg-teal-900/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[20%] right-[10%] w-[25%] h-[25%] bg-blue-900/10 rounded-full blur-[100px]"></div>
      </div>
      
      <AnimatePresence>
        {criticalBanner && (
          <motion.div 
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="bg-red-600 text-white text-center py-2 font-bold uppercase tracking-widest flex items-center justify-center gap-2 overflow-hidden shadow-md z-50 sticky top-0"
          >
            <AlertCircle className="animate-bounce" />
            CRITICAL PATIENT ALERT - ACTION REQUIRED
            <AlertCircle className="animate-bounce" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-bold text-white tracking-tight flex items-center gap-3">
              <div className="p-3 bg-slate-900 rounded-2xl shadow-lg border border-slate-800 text-teal-400">
                <Stethoscope size={32} />
              </div>
              <div>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-blue-500">Doctor</span> Dashboard
              </div>
            </h1>
            <p className="text-slate-400 mt-2 font-medium">Emergency Dept • Command Center</p>
          </div>
          <div className="flex items-center gap-2 text-sm font-bold text-teal-400 bg-slate-900/50 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-slate-800">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500"></span>
            </span>
            System Live
          </div>
          <button 
            onClick={() => { setIsLoggedIn(false); setDoctorIdInput("DOC-"); }}
            className="ml-4 text-xs font-bold text-slate-500 hover:text-white transition-colors bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-800"
          >
            Log Out
          </button>
        </div>

        {/* Doctor Registration Card */}
        <div className="mb-10">
          <div className="bg-slate-900/40 backdrop-blur-xl rounded-3xl p-8 border border-slate-800/50 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <User size={120} />
            </div>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
              <div className="max-w-xl">
                <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                  <Lock className="text-teal-400" size={24} />
                  Professional Profile Registration
                </h2>
                <p className="text-slate-400 text-sm font-medium leading-relaxed">
                  Register your professional contact information to receive critical patient alerts, 
                  system notifications, and security updates directly to your WhatsApp and Email.
                </p>
              </div>

              {!docRegistered ? (
                <div className="flex flex-col sm:flex-row gap-4 flex-1 max-w-2xl">
                    <div className="flex-1 space-y-2">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Mobile Phone (WhatsApp)</label>
                      <input 
                        type="tel" 
                        placeholder="919876543210"
                        suppressHydrationWarning
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all font-mono"
                        value={docPhone}
                        onChange={(e) => setDocPhone(e.target.value)}
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Official Email Address</label>
                      <input 
                        type="email" 
                        placeholder="doctor@hospital.com"
                        suppressHydrationWarning
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all font-mono"
                        value={docEmail}
                        onChange={(e) => setDocEmail(e.target.value)}
                      />
                    </div>
                  <div className="flex items-end">
                    <button 
                      onClick={async () => {
                        if (!docPhone || !docEmail) return;
                        setIsRegisteringDoc(true);
                        try {
                          await fetch("http://localhost:8000/webhook", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              event_type: "doctor_registration",
                              patient_id: null,
                              payload: {
                                doctor_name: currentDoctorId,
                                phone: docPhone,
                                email: docEmail
                              }
                            })
                          });
                          setDocRegistered(true);
                        } catch (err) {
                          console.error("Failed to register doctor contact", err);
                        } finally {
                          setIsRegisteringDoc(false);
                        }
                      }}
                      disabled={isRegisteringDoc}
                      className="w-full sm:w-auto h-11 px-8 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm shadow-lg shadow-teal-900/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      {isRegisteringDoc ? "Registering..." : (
                        <>
                          <Send size={16} />
                          Confirm Info
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-teal-500/10 border border-teal-500/50 rounded-2xl p-6 flex items-center gap-4 text-teal-400"
                >
                  <div className="p-3 bg-teal-500 rounded-full text-slate-950 shadow-lg shadow-teal-500/20">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Verification Successful</h3>
                    <p className="text-xs text-teal-400/80 font-medium tracking-wide font-mono">Status: Registered & Verified</p>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-1 relative z-10">
            <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl shadow-xl border border-slate-800 p-6 sticky top-24">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 border-b border-slate-800 pb-4">
                <UserPlus size={20} className="text-teal-400" />
                Patient Intake
              </h2>
              
              <form onSubmit={handleCreatePatient} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">First Name</label>
                    <input 
                      required
                      type="text" 
                      className="w-full rounded-lg bg-slate-950 border-slate-800 text-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all p-2.5 text-sm placeholder:text-slate-600"
                      value={formData.firstName}
                      onChange={e => setFormData({...formData, firstName: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Last Name</label>
                    <input 
                      required
                      type="text" 
                      className="w-full rounded-lg bg-slate-950 border-slate-800 text-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all p-2.5 text-sm placeholder:text-slate-600"
                      value={formData.lastName}
                      onChange={e => setFormData({...formData, lastName: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Age</label>
                    <input 
                      required
                      type="number" 
                      className="w-full rounded-lg bg-slate-950 border-slate-800 text-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all p-2.5 text-sm placeholder:text-slate-600"
                      value={formData.age}
                      onChange={e => setFormData({...formData, age: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Gender</label>
                    <select 
                      className="w-full rounded-lg bg-slate-950 border-slate-800 text-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all p-2.5 text-sm"
                      value={formData.gender}
                      onChange={e => setFormData({...formData, gender: e.target.value})}
                    >
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Condition</label>
                  <input 
                    required
                    type="text" 
                    placeholder="e.g. Chest Pain"
                    className="w-full rounded-lg bg-slate-950 border-slate-800 text-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all p-2.5 text-sm placeholder:text-slate-600"
                    value={formData.condition}
                    onChange={e => setFormData({...formData, condition: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Past Medications</label>
                    <textarea 
                      rows={2}
                      placeholder="e.g. Aspirin"
                      className="w-full rounded-lg bg-slate-950 border-slate-800 text-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all p-2.5 text-sm placeholder:text-slate-600 resize-none"
                      value={formData.pastMedications}
                      onChange={e => setFormData({...formData, pastMedications: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Allergies</label>
                    <textarea 
                      rows={2}
                      placeholder="e.g. Penicillin"
                      className="w-full rounded-lg bg-slate-950 border-slate-800 text-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all p-2.5 text-sm placeholder:text-slate-600 resize-none"
                      value={formData.pastAllergies}
                      onChange={e => setFormData({...formData, pastAllergies: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Phone Number</label>
                    <input 
                      type="tel" 
                      placeholder="e.g. 919876543210"
                      suppressHydrationWarning
                      className="w-full rounded-lg bg-slate-950 border-slate-800 text-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all p-2.5 text-sm placeholder:text-slate-600"
                      value={formData.phoneNumber}
                      onChange={e => setFormData({...formData, phoneNumber: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
                    <input 
                      type="email" 
                      placeholder="patient@example.com"
                      suppressHydrationWarning
                      className="w-full rounded-lg bg-slate-950 border-slate-800 text-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all p-2.5 text-sm placeholder:text-slate-600"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Triage Priority</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['normal', 'urgent', 'stat'].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setFormData({...formData, priority: p as Priority})}
                        className={`text-xs py-2.5 rounded-lg font-bold uppercase transition-all duration-200 transform active:scale-95 ${
                          formData.priority === p 
                            ? (p === 'stat' ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' : p === 'urgent' ? 'bg-orange-500 text-white shadow-lg shadow-orange-900/20' : 'bg-slate-700 text-white shadow-lg')
                            : 'bg-slate-800 text-slate-500 hover:bg-slate-700 hover:text-slate-300'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  disabled={formLoading}
                  type="submit"
                  className="w-full py-3.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl shadow-lg shadow-teal-900/20 hover:shadow-teal-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-6 text-sm transform active:scale-[0.98]"
                >
                  {formLoading ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <UserPlus size={18} />
                      Admit Patient
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6 relative">
            
            <AnimatePresence>
              {selectedPatientId && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute inset-0 z-20 bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-700 shadow-2xl p-8 overflow-y-auto min-h-[500px]"
                >
                  {(() => {
                    const p = patients.find(pat => pat.id === selectedPatientId);
                    if (!p) return null;

                    return (
                      <div className="space-y-8">
                          <div className="flex justify-between items-start border-b border-slate-800 pb-6">
                            <div>
                              <h2 className="text-3xl font-bold text-white tracking-tight">{p.firstName} {p.lastName}</h2>
                              <div className="flex items-center gap-3 mt-2">
                                <p className="text-slate-400 text-xs font-mono bg-slate-800 px-2 py-1 rounded w-fit border border-slate-700">ID: {p.patientCode}</p>
                                {p.phoneNumber && (
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-teal-400 bg-teal-500/10 px-2 py-1 rounded border border-teal-500/20">
                                    <Activity size={14} />
                                    {p.phoneNumber}
                                  </div>
                                )}
                                {p.email && (
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">
                                    <AlertCircle size={14} />
                                    {p.email}
                                  </div>
                                )}
                              </div>
                            </div>
                            <button 
                              onClick={closeModal}
                              className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
                            >
                              <X size={28} />
                            </button>
                          </div>

                        {showDischargeConfirm ? (
                          <div className="bg-slate-950 p-6 rounded-xl border border-slate-700 shadow-2xl">
                             <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                               <CheckCircle2 className="text-teal-400" />
                               Finalize Patient Case
                             </h3>
                             <p className="text-slate-400 text-sm mb-6">Choose an action to proceed with this patient.</p>
                             
                             {!showFollowUpInput ? (
                               <div className="grid grid-cols-1 gap-3">
                                  <button 
                                    onClick={() => updatePatientDetail(p.id, { status: 'completed', consultancyStatus: 'completed' }, "Patient case finalized and discharged.")}
                                    className="p-4 rounded-lg bg-green-600 hover:bg-green-500 text-white font-bold flex items-center justify-between group transition-all"
                                  >
                                    <span>Discharge Only</span>
                                    <CheckCircle2 size={20} />
                                  </button>
                                  
                                  <button 
                                    onClick={() => setShowFollowUpInput(true)}
                                    className="p-4 rounded-lg bg-pink-600 hover:bg-pink-500 text-white font-bold flex items-center justify-between group transition-all"
                                  >
                                    <span>Follow-Up Required</span>
                                    <Calendar size={20} />
                                  </button>

                                  <button 
                                    onClick={() => setShowDischargeConfirm(false)}
                                    className="p-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold border border-slate-700 mt-2"
                                  >
                                    Cancel
                                  </button>
                               </div>
                             ) : (
                               <div className="space-y-4">
                                  <div>
                                    <label className="block text-xs font-bold text-pink-400 uppercase tracking-wider mb-2">Follow-Up Appointment Date</label>
                                    <input 
                                      type="date" 
                                      autoFocus
                                      min={new Date().toISOString().split('T')[0]}
                                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all font-medium"
                                      value={followUpDate}
                                      onChange={(e) => setFollowUpDate(e.target.value)}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold text-pink-400 uppercase tracking-wider mb-2">Follow-Up Duration</label>
                                    <input 
                                      type="text" 
                                      placeholder="e.g. 2 weeks"
                                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all font-medium"
                                      value={followUpDuration}
                                      onChange={(e) => setFollowUpDuration(e.target.value)}
                                    />
                                  </div>
                                  <div className="flex gap-3">
                                    <button 
                                      onClick={() => setShowFollowUpInput(false)}
                                      className="flex-1 py-3 items-center justify-center rounded-lg bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition-all"
                                    >
                                      Back
                                    </button>
                                    <button 
                                      onClick={async () => {
                                        if (!followUpDate) return;
                                        await updatePatientDetail(p.id, { 
                                          status: 'follow_up', 
                                          followUpDate: followUpDate,
                                          consultancyStatus: 'completed'
                                        }, `Care completed. Follow-up appointment scheduled for ${new Date(followUpDate).toLocaleDateString()}. Follow-up duration: ${followUpDuration}`);

                                        // Trigger Notification Webhook
                                        try {
                                          await fetch("http://localhost:8000/webhook", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({
                                              event_type: "patient_followup",
                                              patient_id: p.id,
                                              payload: {
                                                patient_name: `${p.firstName} ${p.lastName}`,
                                                patient_email: p.email,
                                                phone: p.phoneNumber,
                                                duration: followUpDuration
                                              }
                                            })
                                          });
                                        } catch (err) {
                                          console.error("Failed to trigger follow-up webhook", err);
                                        }
                                      }}
                                      className="flex-1 py-3 items-center justify-center rounded-lg bg-pink-600 text-white font-bold hover:bg-pink-500 shadow-lg shadow-pink-900/20 transition-all"
                                    >
                                      Confirm Follow-Up
                                    </button>
                                  </div>
                               </div>
                             )}
                          </div>
                        ) : (
                          <>
                            <div className="grid grid-cols-3 gap-6 bg-slate-950 p-6 rounded-xl border border-slate-800 shadow-inner">
                              <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Condition</p>
                                <p className="font-bold text-slate-200 text-lg">{p.condition}</p>
                              </div>
                               <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Current Status</p>
                                <div className="flex flex-col gap-1">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase w-fit border ${statusColors[p.status]}`}>
                                    Global: {p.status.replace('_', ' ')}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase w-fit border ${
                                    p.consultancyStatus === 'completed' ? 'bg-green-900/30 text-green-400 border-green-500/30' :
                                    p.consultancyStatus === 'processing' ? 'bg-blue-900/30 text-blue-400 border-blue-500/30' :
                                    'bg-slate-800 text-slate-400 border-slate-700'
                                  }`}>
                                    Consultancy: {p.consultancyStatus || 'Pending'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 space-y-4">
                               <div className="flex items-center justify-between">
                                  <h4 className="text-sm font-bold text-teal-400 uppercase tracking-widest flex items-center gap-2">
                                    <Stethoscope size={16} />
                                    Consultancy Status
                                  </h4>
                                  <div className="flex gap-2">
                                    {(['pending', 'processing', 'completed'] as const).map((s) => (
                                      <button
                                        key={s}
                                        onClick={() => updatePatientDetail(p.id, { consultancyStatus: s }, `Consultation status changed to ${s}.`)}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                                          p.consultancyStatus === s 
                                          ? 'bg-teal-600 text-white shadow-lg' 
                                          : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                                        }`}
                                      >
                                        {s}
                                      </button>
                                    ))}
                                  </div>
                               </div>

                               {/* Custom SMS Messenger */}
                               <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 space-y-4">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-bold text-teal-400 uppercase tracking-widest flex items-center gap-2">
                                      <MessageSquare size={16} />
                                      Patient Messenger (SMS)
                                    </h4>
                                    {p.phoneNumber ? (
                                      <span className="text-[10px] font-mono text-slate-500 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">TO: {p.phoneNumber}</span>
                                    ) : (
                                      <span className="text-[10px] font-bold text-amber-500 uppercase flex items-center gap-1">
                                        <AlertTriangle size={10} />
                                        No Phone Number Linked
                                      </span>
                                    )}
                                  </div>
                                  
                                  <div className="flex gap-2">
                                    <input 
                                      type="text" 
                                      disabled={!p.phoneNumber}
                                      placeholder={p.phoneNumber ? "Type a direct message to the patient..." : "Patient hasn't enabled SMS alerts yet"}
                                      className="flex-1 rounded-xl bg-slate-900 border-slate-800 text-slate-200 text-sm focus:border-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                      value={smsInput}
                                      onChange={(e) => setSmsInput(e.target.value)}
                                    />
                                    <button 
                                      onClick={() => handleSendCustomSMS(p)}
                                      disabled={!p.phoneNumber || !smsInput.trim() || isSendingSms}
                                      className="bg-teal-600 hover:bg-teal-500 text-white p-3 rounded-xl shadow-lg transition-all disabled:opacity-50 transform active:scale-95"
                                    >
                                      {isSendingSms ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={20} />}
                                    </button>
                                  </div>
                               </div>
                            </div>

                            {!actionType ? (
                              <div className="grid grid-cols-2 gap-4">
                                <button 
                                  onClick={() => setActionType('lab')}
                                  className="p-6 rounded-xl border border-slate-700 bg-slate-800 hover:border-blue-500/50 hover:shadow-lg transition-all group relative overflow-hidden"
                                >
                                  <Beaker className="text-slate-500 group-hover:text-blue-400 mb-2 transition-colors" size={32} />
                                  <h3 className="font-bold text-slate-200 text-lg">Order Labs</h3>
                                  <p className="text-sm text-slate-500">Bloodwork, pathology...</p>
                                </button>
                                <button 
                                  onClick={() => setActionType('radiology')}
                                  className="p-6 rounded-xl border border-slate-700 bg-slate-800 hover:border-indigo-500/50 hover:shadow-lg transition-all group relative overflow-hidden"
                                >
                                  <Scan className="text-slate-500 group-hover:text-indigo-400 mb-2 transition-colors" size={32} />
                                  <h3 className="font-bold text-slate-200 text-lg">Order Imaging</h3>
                                  <p className="text-sm text-slate-500">X-Ray, CT, MRI...</p>
                                </button>
                                <button 
                                  onClick={() => setActionType('pharmacy')}
                                  className="p-6 rounded-xl border border-slate-700 bg-slate-800 hover:border-purple-500/50 hover:shadow-lg transition-all group relative overflow-hidden"
                                >
                                  <Pill className="text-slate-500 group-hover:text-purple-400 mb-2 transition-colors" size={32} />
                                  <h3 className="font-bold text-slate-200 text-lg">Order Meds</h3>
                                  <p className="text-sm text-slate-500">Pharmacy dispatch...</p>
                                </button>
                                <button 
                                  onClick={() => setActionType('refer')}
                                  className="p-6 rounded-xl border border-slate-700 bg-slate-800 hover:border-amber-500/50 hover:shadow-lg transition-all group relative overflow-hidden"
                                >
                                  <ArrowRightCircle className="text-slate-500 group-hover:text-amber-400 mb-2 transition-colors" size={32} />
                                  <h3 className="font-bold text-slate-200 text-lg">Referral</h3>
                                  <p className="text-sm text-slate-500">Specialist consul...</p>
                                </button>
                                <button 
                                  onClick={() => setShowDischargeConfirm(true)}
                                  className="col-span-2 p-6 rounded-xl border border-slate-700 bg-slate-800 hover:border-green-500/50 hover:shadow-lg transition-all group"
                                >
                                  <CheckCircle2 className="text-slate-500 group-hover:text-green-500 mb-2 transition-colors" size={32} />
                                  <h3 className="font-bold text-slate-200 text-lg text-center">Finalize & Discharge</h3>
                                </button>
                              </div>
                            ) : (
                              <motion.div 
                                 initial={{ opacity: 0, x: 20 }}
                                 animate={{ opacity: 1, x: 0 }}
                                 className="bg-slate-900 p-6 rounded-xl border border-slate-700"
                              >
                                 <div className="flex items-center gap-2 mb-4">
                                   <button onClick={() => { setActionType(null); setShowCustomInput(false); }} className="text-slate-400 hover:text-white">
                                     <Undo2 size={16} />
                                   </button>
                                   <h3 className="font-bold text-white text-lg lowercase first-letter:uppercase">Select {actionType}</h3>
                                 </div>

                                 <div className="grid grid-cols-2 gap-3 mb-4">
                                  {(actionType === 'lab' ? LabOptions : actionType === 'radiology' ? RadiologyOptions : actionType === 'refer' ? DoctorReferrals : PharmOptions).map(opt => (
                                    <button
                                      key={opt}
                                      onClick={() => {
                                        let updates: any = {};
                                        let desc = "";
                                        if (actionType === 'lab') { updates.status = 'lab_ordered'; updates.labTest = opt; desc = `Ordered lab analysis: ${opt}.`; }
                                        if (actionType === 'radiology') { updates.status = 'radiology_ordered'; updates.radiologyTest = opt; desc = `Ordered imaging: ${opt}.`; }
                                        if (actionType === 'refer') { updates.status = 'referred'; updates.referredTo = opt; desc = `Initiated referral to ${opt}.`; }
                                        if (actionType === 'pharmacy') { updates.status = 'pharmacy_ordered'; updates.medication = opt; desc = `Prescribed medication: ${opt}.`; }
                                        updatePatientDetail(p.id, updates, desc);
                                      }}
                                      className="bg-slate-800 p-3 rounded-lg border border-slate-700 text-sm font-medium text-slate-300 hover:bg-teal-600 hover:text-white transition-all text-left"
                                    >
                                      {opt}
                                    </button>
                                  ))}
                                 </div>

                                 <div className="mt-4 pt-4 border-t border-slate-800">
                                    {!showCustomInput ? (
                                      <button onClick={() => setShowCustomInput(true)} className="text-sm font-bold text-slate-500 hover:text-teal-400">+ Add Custom</button>
                                    ) : (
                                      <div className="flex gap-2">
                                        <input 
                                          type="text" 
                                          placeholder="Type details..."
                                          className="flex-1 rounded-lg bg-slate-950 border-slate-700 text-slate-200 text-sm focus:border-teal-500"
                                          value={customInput}
                                          onChange={(e) => setCustomInput(e.target.value)}
                                        />
                                        <button 
                                          onClick={() => {
                                            if (!customInput) return;
                                            let updates: any = {};
                                            let desc = `Ordered custom ${actionType}: ${customInput}.`;
                                            if (actionType === 'lab') { updates.status = 'lab_ordered'; updates.labTest = customInput; }
                                            if (actionType === 'radiology') { updates.status = 'radiology_ordered'; updates.radiologyTest = customInput; }
                                            if (actionType === 'refer') { updates.status = 'referred'; updates.referredTo = customInput; }
                                            if (actionType === 'pharmacy') { updates.status = 'pharmacy_ordered'; updates.medication = customInput; }
                                            updatePatientDetail(p.id, updates, desc);
                                          }}
                                          className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-bold"
                                        >
                                          Save
                                        </button>
                                      </div>
                                    )}
                                 </div>
                              </motion.div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })()}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className="flex items-center gap-4">
                 <button onClick={() => setActiveTab('ongoing')} className={`text-lg font-bold ${activeTab === 'ongoing' ? 'text-white' : 'text-slate-500'}`}>Ongoing</button>
                 <span className="text-slate-700">|</span>
                 <button onClick={() => setActiveTab('followup')} className={`text-lg font-bold ${activeTab === 'followup' ? 'text-white' : 'text-slate-500'}`}>Follow-Up</button>
                 <span className="text-slate-700">|</span>
                 <button onClick={() => setActiveTab('completed')} className={`text-lg font-bold ${activeTab === 'completed' ? 'text-white' : 'text-slate-500'}`}>Completed</button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {loading ? (
                <div className="text-center py-20 text-slate-500">Loading patients...</div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {patients.filter(p => {
                    if (activeTab === 'ongoing') return !['completed', 'follow_up'].includes(p.status);
                    if (activeTab === 'followup') return p.status === 'follow_up';
                    if (activeTab === 'completed') return p.status === 'completed';
                    return false;
                  }).map(patient => (
                    <motion.div
                      key={patient.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      onClick={() => setSelectedPatientId(patient.id)}
                      className={`relative bg-slate-900/50 backdrop-blur-sm rounded-xl border p-5 cursor-pointer hover:border-slate-700 transition-all group ${
                        patient.priority === 'stat' ? 'border-l-4 border-l-red-500' : 
                        patient.priority === 'urgent' ? 'border-l-4 border-l-orange-500' : 'border-slate-800'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold">{patient.firstName[0]}</div>
                          <div>
                            <h3 className="font-bold text-white group-hover:text-teal-400">{patient.firstName} {patient.lastName}</h3>
                            <p className="text-xs text-slate-500">{patient.age} yrs • {patient.gender} • <span className="text-teal-400">{patient.condition}</span></p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${priorityColors[patient.priority]}`}>{patient.priority}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${statusColors[patient.status]}`}>{patient.status.replace('_', ' ')}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
