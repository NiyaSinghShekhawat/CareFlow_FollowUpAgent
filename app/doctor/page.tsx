
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
  Scan
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function DoctorDashboard() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [criticalBanner, setCriticalBanner] = useState(false);
  
  // Login State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [doctorIdInput, setDoctorIdInput] = useState("");
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
  const [showFollowUpInput, setShowFollowUpInput] = useState(false);

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
    pastAllergies: ""
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

    // Simulate API delay
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
      
      // Fix index error by sorting client-side
      patientData.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
      
      setPatients(patientData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentDoctorId]);

  // Rescue Orphaned Patients (PT-0001, PT-0002, PT-0003)
  useEffect(() => {
    if (!currentDoctorId || loading) return;

    const claimPatients = async () => {
      const taskMap: Record<string, string[]> = {
        'DOC-0001': ['PT-0001', 'PT-0002'],
        'DOC-0002': ['PT-0003']
      };

      const codesToClaim = taskMap[currentDoctorId] || [];
      if (codesToClaim.length === 0) return;

      for (const code of codesToClaim) {
        try {
          // Check both exact and case-insensitive check by fetching by code
          const q = query(
            collection(db, "patients"), 
            where("patientCode", "==", code)
          );
          
          const snap = await getDocs(q);
          
          for (const patientDoc of snap.docs) {
            const data = patientDoc.data();
            // If patient is not assigned or incorrectly assigned, update it
            if (data.assignedDoctorId !== currentDoctorId) {
              await updateDoc(doc(db, "patients", patientDoc.id), {
                assignedDoctorId: currentDoctorId
              });
              console.log(`Auto-assigned ${code} to doctor ${currentDoctorId}`);
            }
          }
        } catch (err) {
          console.error(`Failed to auto-claim ${code}:`, err);
        }
      }
    };

    claimPatients();
  }, [currentDoctorId, loading]);

  // 2. Patient Creation
  const handleCreatePatient = async (e: FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const timestamp = Date.now().toString().slice(-4);
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const patientCode = `PT-${timestamp}-${random}`;

      await addDoc(collection(db, "patients"), {
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
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      setFormData({
        firstName: "",
        lastName: "",
        age: "",
        gender: "Male",
        condition: "",
        priority: "normal",
        pastMedications: "",
        pastAllergies: ""
      });
      playSound('click');
    } catch (error) {
      console.error("Error creating patient:", error);
    } finally {
      setFormLoading(false);
    }
  };

  // 3. Actions Updates
  const updatePatientDetail = async (id: string, updates: Partial<Patient>) => {
    try {
      const ref = doc(db, "patients", id);
      await updateDoc(ref, {
        ...updates,
        updatedAt: Timestamp.now()
      });
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
    setShowFollowUpInput(false);
    setFollowUpDate("");
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
        {/* Background glow effects */}
        <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[20%] right-[30%] w-[40%] h-[40%] bg-teal-900/10 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-[10%] left-[20%] w-[30%] h-[30%] bg-blue-900/10 rounded-full blur-[100px]"></div>
        </div>

        <div className="w-full max-w-md bg-slate-900/50 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-slate-800 relative z-10 text-center">
          <div className="mb-8">
            <div className="w-20 h-20 bg-gradient-to-tr from-teal-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white shadow-lg shadow-teal-500/20 transform rotate-3 hover:rotate-6 transition-all">
              <Stethoscope size={40} />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Doctor Portal</h1>
            <p className="text-slate-400 mt-2">Secure access for medical staff only</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-left">Doctor ID</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                <input 
                  type="text" 
                  placeholder="e.g. DOC-0001"
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all uppercase font-mono tracking-wide placeholder:text-slate-700"
                  value={doctorIdInput}
                  onChange={(e) => setDoctorIdInput(e.target.value)}
                />
              </div>
            </div>

            {loginError && (
              <div className="p-3 bg-red-900/20 border border-red-500/30 text-red-400 text-sm rounded-lg flex items-center gap-2 animate-shake">
                <AlertTriangle size={16} />
                {loginError}
              </div>
            )}

            <button 
              type="submit" 
              disabled={formLoading}
              className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-teal-900/20 hover:shadow-teal-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]"
            >
              {formLoading ? "Verifying..." : "Access Dashboard"}
            </button>
          </form> 
          
          <div className="mt-8 pt-6 border-t border-slate-800 text-xs text-slate-500">
            Authorized Personnel Only • v2.0.4
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans pb-20 relative overflow-x-hidden">
      
      {/* Background glow effects */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[10%] left-[20%] w-[30%] h-[30%] bg-teal-900/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[20%] right-[10%] w-[25%] h-[25%] bg-blue-900/10 rounded-full blur-[100px]"></div>
      </div>
      
      {/* Critical Alert Banner */}
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
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
            onClick={() => { setIsLoggedIn(false); setDoctorIdInput(""); }}
            className="ml-4 text-xs font-bold text-slate-500 hover:text-white transition-colors bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-800"
          >
            Log Out
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left: Patient Intake Form */}
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

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Past Medications</label>
                  <textarea 
                    rows={2}
                    placeholder="e.g. Aspirin 100mg daily, Metformin 500mg"
                    className="w-full rounded-lg bg-slate-950 border-slate-800 text-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all p-2.5 text-sm placeholder:text-slate-600 resize-none"
                    value={formData.pastMedications}
                    onChange={e => setFormData({...formData, pastMedications: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Past Allergies</label>
                  <textarea 
                    rows={2}
                    placeholder="e.g. Penicillin, Peanuts, Latex"
                    className="w-full rounded-lg bg-slate-950 border-slate-800 text-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all p-2.5 text-sm placeholder:text-slate-600 resize-none"
                    value={formData.pastAllergies}
                    onChange={e => setFormData({...formData, pastAllergies: e.target.value})}
                  />
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

          {/* Right: Live Patient Feed */}
          <div className="lg:col-span-2 space-y-6 relative">
            
            {/* Expanded Patient Modal / Overlay */}
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
                        <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                          <div>
                            <h2 className="text-3xl font-bold text-white tracking-tight">{p.firstName} {p.lastName}</h2>
                            <p className="text-slate-400 text-sm font-mono mt-1 bg-slate-800 px-2 py-1 rounded w-fit">ID: {p.patientCode}</p>
                          </div>
                          <button 
                            onClick={closeModal}
                            className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
                          >
                            <X size={28} />
                          </button>
                        </div>

                        {/* Discharge / Follow Up Options Modal */}
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
                                    onClick={() => updatePatientDetail(p.id, { status: 'completed', consultancyStatus: 'completed' })}
                                    className="p-4 rounded-lg bg-green-600 hover:bg-green-500 text-white font-bold flex items-center justify-between group transition-all"
                                  >
                                    <span>Discharge Only</span>
                                    <CheckCircle2 className="opacity-50 group-hover:opacity-100 transition-opacity" />
                                  </button>
                                  
                                  <button 
                                    onClick={() => setShowFollowUpInput(true)}
                                    className="p-4 rounded-lg bg-pink-600 hover:bg-pink-500 text-white font-bold flex items-center justify-between group transition-all"
                                  >
                                    <span>Follow-Up Required</span>
                                    <Calendar className="opacity-50 group-hover:opacity-100 transition-opacity" />
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
                                  <div className="flex gap-3">
                                    <button 
                                      onClick={() => setShowFollowUpInput(false)}
                                      className="flex-1 py-3 items-center justify-center rounded-lg bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition-all"
                                    >
                                      Back
                                    </button>
                                    <button 
                                      onClick={() => {
                                        if (!followUpDate) return;
                                        updatePatientDetail(p.id, { 
                                          status: 'follow_up', 
                                          followUpDate: followUpDate,
                                          consultancyStatus: 'completed'
                                        });
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
                            {/* Context Summary */}
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

                            {(p.labTest || p.radiologyTest || p.referredTo) && (
                              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Pending / Ordered Details</p>
                                <p className="font-semibold text-teal-400 text-sm">
                                  {[p.labTest, p.radiologyTest, p.referredTo].filter(Boolean).join(', ')}
                                </p>
                              </div>
                            )}

                            {/* Status Update Control for Doctor */}
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
                                        onClick={() => updatePatientDetail(p.id, { consultancyStatus: s })}
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
                            </div>

                            {/* Action Selection Grid */}
                            {!actionType ? (
                              <div className="grid grid-cols-2 gap-4">
                                <button 
                                  onClick={() => {
                                    if (p.status === 'lab_ordered') {
                                       updatePatientDetail(p.id, { status: 'waiting', labTest: "" });
                                    } else {
                                       setActionType('lab');
                                    }
                                  }}
                                  className={`p-6 rounded-xl border text-left transition-all group relative overflow-hidden ${
                                    p.status === 'lab_ordered' 
                                      ? 'bg-blue-900/20 border-blue-500/50 hover:border-blue-400' 
                                      : 'bg-slate-800 border-slate-700 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-2 relative z-10">
                                    <Beaker className={p.status === 'lab_ordered' ? "text-blue-400" : "text-slate-500 group-hover:text-blue-400 transition-colors"} size={32} />
                                    {p.status === 'lab_ordered' && <Undo2 className="text-blue-400 hover:text-blue-600" size={20} />}
                                  </div>
                                  <h3 className="font-bold text-slate-200 text-lg relative z-10">Lab Request</h3>
                                  <p className="text-sm text-slate-500 mt-1 relative z-10 group-hover:text-slate-400 transition-colors">
                                    {p.status === 'lab_ordered' ? `Ordered: ${p.labTest}` : 'Order bloodwork, X-rays, scans...'}
                                  </p>
                                  <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <Beaker size={100} />
                                  </div>
                                </button>

                                <button 
                                  onClick={() => {
                                    if (p.status === 'referred') {
                                       updatePatientDetail(p.id, { status: 'waiting', referredTo: "" });
                                    } else {
                                       setActionType('refer');
                                    }
                                  }}
                                  className={`p-6 rounded-xl border text-left transition-all group relative overflow-hidden ${
                                    p.status === 'referred' 
                                      ? 'bg-amber-900/20 border-amber-500/50 hover:border-amber-400' 
                                      : 'bg-slate-800 border-slate-700 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-2 relative z-10">
                                    <ArrowRightCircle className={p.status === 'referred' ? "text-amber-400" : "text-slate-500 group-hover:text-amber-400 transition-colors"} size={32} />
                                    {p.status === 'referred' && <Undo2 className="text-amber-400 hover:text-amber-300" size={20} />}
                                  </div>
                                  <h3 className="font-bold text-slate-200 text-lg relative z-10">Specialist Referral</h3>
                                  <p className="text-sm text-slate-500 mt-1 relative z-10 group-hover:text-slate-400 transition-colors">
                                    {p.status === 'referred' ? `Ref to: ${p.referredTo}` : 'Cardiology, Neuro, Surgery...'}
                                  </p>
                                  <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <ArrowRightCircle size={100} />
                                  </div>
                                </button>

                                <button 
                                  onClick={() => {
                                     if (p.status === 'pharmacy_ordered') {
                                       updatePatientDetail(p.id, { status: 'waiting', medication: "" });
                                     } else {
                                       setActionType('pharmacy');
                                     }
                                  }}
                                  className={`p-6 rounded-xl border text-left transition-all group relative overflow-hidden ${
                                    p.status === 'pharmacy_ordered'
                                      ? 'bg-purple-900/20 border-purple-500/50 hover:border-purple-400'
                                      : 'bg-slate-800 border-slate-700 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-2 relative z-10">
                                    <Pill className={p.status === 'pharmacy_ordered' ? "text-purple-400" : "text-slate-500 group-hover:text-purple-400 transition-colors"} size={32} />
                                    {p.status === 'pharmacy_ordered' && <Undo2 className="text-purple-400 hover:text-purple-300" size={20} />}
                                  </div>
                                  <h3 className="font-bold text-slate-200 text-lg relative z-10">Pharmacy</h3>
                                  <p className="text-sm text-slate-500 mt-1 relative z-10 group-hover:text-slate-400 transition-colors">Dispense medication...</p>
                                  <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <Pill size={100} />
                                  </div>
                                </button>

                                <button 
                                  onClick={() => {
                                    if (p.status === 'radiology_ordered') {
                                       updatePatientDetail(p.id, { status: 'waiting', radiologyTest: "" });
                                    } else {
                                       setActionType('radiology');
                                    }
                                  }}
                                  className={`p-6 rounded-xl border text-left transition-all group relative overflow-hidden ${
                                    p.status === 'radiology_ordered' 
                                      ? 'bg-indigo-900/20 border-indigo-500/50 hover:border-indigo-400' 
                                      : 'bg-slate-800 border-slate-700 hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/10'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-2 relative z-10">
                                    <Scan className={p.status === 'radiology_ordered' ? "text-indigo-400" : "text-slate-500 group-hover:text-indigo-400 transition-colors"} size={32} />
                                    {p.status === 'radiology_ordered' && <Undo2 className="text-indigo-400 hover:text-indigo-600" size={20} />}
                                  </div>
                                  <h3 className="font-bold text-slate-200 text-lg relative z-10">Radiology</h3>
                                  <p className="text-sm text-slate-500 mt-1 relative z-10 group-hover:text-slate-400 transition-colors">
                                    {p.status === 'radiology_ordered' ? `Ordered: ${p.radiologyTest}` : 'X-Ray, CT, MRI, Ultrasound...'}
                                  </p>
                                  <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <Scan size={100} />
                                  </div>
                                </button>

                                <button 
                                  onClick={() => setShowDischargeConfirm(true)}
                                  className="p-6 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-800/80 hover:border-green-500/50 hover:shadow-lg hover:shadow-green-500/10 text-left transition-all group relative overflow-hidden"
                                >
                                  <div className="relative z-10">
                                    <CheckCircle2 className="text-slate-500 group-hover:text-green-500 mb-2 transition-colors" size={32} />
                                    <h3 className="font-bold text-slate-200 text-lg">Discharge / Complete</h3>
                                    <p className="text-sm text-slate-500 mt-1 group-hover:text-slate-400 transition-colors">Close case file.</p>
                                  </div>
                                  <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <CheckCircle2 size={100} />
                                  </div>
                                </button>

                                <button 
                                  onClick={() => setActionType('nurse')}
                                  className={`p-6 rounded-xl border text-left transition-all group relative overflow-hidden ${
                                    p.assignedNurse 
                                      ? 'bg-rose-900/20 border-rose-500/50 hover:border-rose-400' 
                                      : 'bg-slate-800 border-slate-700 hover:border-rose-500/50 hover:shadow-lg hover:shadow-rose-500/10'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-2 relative z-10">
                                    <User className={p.assignedNurse ? "text-rose-400" : "text-slate-500 group-hover:text-rose-400 transition-colors"} size={32} />
                                    {p.assignedNurse && <CheckCircle2 className="text-rose-400" size={20} />}
                                  </div>
                                  <h3 className="font-bold text-slate-200 text-lg relative z-10">Assign Nurse</h3>
                                  <p className="text-sm text-slate-500 mt-1 relative z-10 group-hover:text-slate-400 transition-colors">
                                    {p.assignedNurse ? `Assigned: ${p.assignedNurse}` : 'Assign care nurse...'}
                                  </p>
                                  <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <User size={100} />
                                  </div>
                                </button>
                              </div>
                            ) : (
                              // Specific Action Sub-menus
                              <motion.div 
                                 initial={{ opacity: 0, x: 20 }}
                                 animate={{ opacity: 1, x: 0 }}
                                 className="bg-slate-900 p-6 rounded-xl border border-slate-700"
                              >
                                 <div className="flex items-center gap-2 mb-4">
                                   <button onClick={() => { setActionType(null); setShowCustomInput(false); }} className="text-slate-400 hover:text-white transition-colors">
                                     <Undo2 size={16} />
                                   </button>
                                   <h3 className="font-bold text-white text-lg">
                                    Select {actionType === 'lab' ? 'Lab Test' : actionType === 'refer' ? 'Department' : actionType === 'nurse' ? 'Nurse' : actionType === 'radiology' ? 'Imaging' : 'Medication'}
                                  </h3>
                                </div>

                                   {/* Predefined Options */}
                                 <div className="grid grid-cols-2 gap-3 mb-4">
                                  {actionType === 'nurse' ? (
                                    <>
                                      <button
                                        onClick={() => {
                                          updatePatientDetail(p.id, { assignedNurse: 'NU-0001' });
                                        }}
                                        className="bg-slate-800 p-4 rounded-lg border border-slate-700 text-sm font-medium text-slate-300 hover:bg-rose-600 hover:text-white hover:border-transparent transition-all shadow-sm hover:shadow-lg text-left"
                                      >
                                        <div className="flex items-center gap-2">
                                          <User size={16} className="text-rose-400" />
                                          <span>NU-0001</span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">Nurse Station A</p>
                                      </button>
                                      <button
                                        onClick={() => {
                                          updatePatientDetail(p.id, { assignedNurse: 'NU-0002' });
                                        }}
                                        className="bg-slate-800 p-4 rounded-lg border border-slate-700 text-sm font-medium text-slate-300 hover:bg-rose-600 hover:text-white hover:border-transparent transition-all shadow-sm hover:shadow-lg text-left"
                                      >
                                        <div className="flex items-center gap-2">
                                          <User size={16} className="text-rose-400" />
                                          <span>NU-0002</span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">Nurse Station B</p>
                                      </button>
                                      {p.assignedNurse && (
                                        <button
                                          onClick={() => {
                                            updatePatientDetail(p.id, { assignedNurse: "" });
                                          }}
                                          className="bg-red-900/20 p-4 rounded-lg border border-red-500/30 text-sm font-medium text-red-400 hover:bg-red-600 hover:text-white hover:border-transparent transition-all shadow-sm hover:shadow-lg text-left"
                                        >
                                          <div className="flex items-center gap-2">
                                            <X size={16} />
                                            <span>Remove Assignment</span>
                                          </div>
                                        </button>
                                      )}
                                    </>
                                  ) : (
                                    (actionType === 'lab' ? LabOptions : actionType === 'radiology' ? RadiologyOptions : actionType === 'refer' ? DoctorReferrals : PharmOptions).map(opt => (
                                      <button
                                        key={opt}
                                        onClick={() => {
                                          const updates: any = {};
                                           if (actionType === 'lab') { 
                                              updates.status = 'lab_ordered'; 
                                              updates.labTest = opt; 
                                              updates.labStatus = 'pending';
                                            }
                                            if (actionType === 'radiology') { 
                                              updates.status = 'radiology_ordered'; 
                                              updates.radiologyTest = opt; 
                                              updates.radiologyStatus = 'pending';
                                            }
                                            if (actionType === 'refer') { updates.status = 'referred'; updates.referredTo = opt; }
                                            if (actionType === 'pharmacy') { 
                                              updates.status = 'pharmacy_ordered'; 
                                              updates.medication = opt; 
                                              updates.pharmacyStatus = 'pending';
                                            }
                                          updatePatientDetail(p.id, updates);
                                        }}
                                        className={`bg-slate-800 p-3 rounded-lg border border-slate-700 text-sm font-medium text-slate-300 transition-all shadow-sm hover:shadow-lg text-left ${
                                          actionType === 'radiology' ? 'hover:bg-indigo-600 hover:text-white' : 'hover:bg-teal-600 hover:text-white'
                                        }`}
                                      >
                                        {opt}
                                      </button>
                                    ))
                                  )}
                                </div>

                                 {/* Custom Input */}
                                 <div className="mt-4 pt-4 border-t border-slate-800">
                                    {!showCustomInput ? (
                                      <button 
                                        onClick={() => setShowCustomInput(true)}
                                        className="text-sm font-bold text-slate-500 hover:text-teal-400 flex items-center gap-2 transition-colors"
                                      >
                                        + Add Custom / Other
                                      </button>
                                    ) : (
                                      <div className="flex gap-2">
                                        <input 
                                          autoFocus
                                          type="text" 
                                          placeholder={`Type custom ${actionType}...`}
                                          className="flex-1 rounded-lg bg-slate-950 border-slate-700 text-slate-200 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                                          value={customInput}
                                          onChange={(e) => setCustomInput(e.target.value)}
                                        />
                                        <button 
                                          onClick={() => {
                                            if (!customInput.trim()) return;
                                            const updates: any = {};
                                            if (actionType === 'lab') { 
                                              updates.status = 'lab_ordered'; 
                                              updates.labTest = customInput; 
                                              updates.labStatus = 'pending';
                                            }
                                            if (actionType === 'refer') { 
                                              updates.status = 'referred'; 
                                              updates.referredTo = customInput; 
                                            }
                                            if (actionType === 'pharmacy') { 
                                              updates.status = 'pharmacy_ordered'; 
                                              updates.medication = customInput; 
                                              updates.pharmacyStatus = 'pending';
                                            }
                                            if (actionType === 'radiology') {
                                              updates.status = 'radiology_ordered';
                                              updates.radiologyTest = customInput;
                                              updates.radiologyStatus = 'pending';
                                            }
                                            updatePatientDetail(p.id, updates);
                                          }}
                                          className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-teal-500 shadow-lg"
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
                 <button 
                   onClick={() => setActiveTab('ongoing')}
                   className={`text-lg font-bold flex items-center gap-2 transition-colors ${activeTab === 'ongoing' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                 >
                   <Activity size={20} className={activeTab === 'ongoing' ? 'text-teal-400' : ''} />
                   Ongoing ({patients.filter(p => !['completed', 'follow_up'].includes(p.status)).length})
                 </button>
                 <span className="text-slate-700">|</span>
                 <button 
                   onClick={() => setActiveTab('followup')}
                   className={`text-lg font-bold flex items-center gap-2 transition-colors ${activeTab === 'followup' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                 >
                   <Calendar size={20} className={activeTab === 'followup' ? 'text-pink-400' : ''} />
                   Follow-Up ({patients.filter(p => p.status === 'follow_up').length})
                 </button>
                 <span className="text-slate-700">|</span>
                 <button 
                   onClick={() => setActiveTab('completed')}
                   className={`text-lg font-bold flex items-center gap-2 transition-colors ${activeTab === 'completed' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                 >
                   <CheckCircle2 size={20} className={activeTab === 'completed' ? 'text-green-400' : ''} />
                   Completed ({patients.filter(p => p.status === 'completed').length})
                 </button>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
                 <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                 <p>Syncing database...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                <AnimatePresence mode="popLayout">
                  {patients
                    .filter(p => {
                      if (activeTab === 'ongoing') return !['completed', 'follow_up'].includes(p.status);
                      if (activeTab === 'followup') return p.status === 'follow_up';
                      if (activeTab === 'completed') return p.status === 'completed';
                      return false;
                    })
                    .map(patient => (
                    <motion.div
                      key={patient.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      onClick={() => { setSelectedPatientId(patient.id); setActionType(null); }}
                      className={`relative bg-slate-900/50 backdrop-blur-sm rounded-xl border p-5 shadow-lg transition-all hover:shadow-teal-500/10 cursor-pointer hover:border-slate-700/80 group ${
                        patient.status === 'follow_up' ? 'border-l-4 border-l-pink-500 border-slate-800' :
                        patient.priority === 'stat' ? 'border-l-4 border-l-red-500 border-slate-800' : 
                        patient.priority === 'urgent' ? 'border-l-4 border-l-orange-500 border-slate-800' : 'border-slate-800'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shadow-lg ${
                             patient.status === 'follow_up' ? 'bg-pink-900/20 text-pink-500' :
                             patient.priority === 'stat' ? 'bg-red-500/20 text-red-500' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {(patient.firstName || '?')[0]}{(patient.lastName || '?')[0]}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-bold text-white group-hover:text-teal-400 transition-colors">{patient.firstName} {patient.lastName}</h3>
                              <span className="text-xs font-mono text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">{patient.patientCode}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                              <span>{patient.age} yrs</span>
                              <span>•</span>
                              <span>{patient.gender}</span>
                              <span className="font-semibold text-teal-400/90 ml-2 bg-teal-400/5 px-2 py-0.5 rounded-md border border-teal-400/10">{patient.condition}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                           {patient.status === 'follow_up' ? (
                              <>
                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border border-pink-500/30 bg-pink-900/30 text-pink-400`}>
                                  Follow Up
                                </span>
                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                  <Calendar size={12} />
                                  {patient.followUpDate ? new Date(patient.followUpDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not set'}
                                </span>
                              </>
                           ) : (
                              <>
                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${priorityColors[patient.priority]}`}>
                                  {patient.priority}
                                </span>
                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${statusColors[patient.status]}`}>
                                  {patient.status.replace('_', ' ')}
                                </span>
                              </>
                           )}
                        </div>
                      </div>

                      {/* Detail Pills - Enhanced */}
                      {(patient.labTest || patient.radiologyTest || patient.referredTo || patient.assignedNurse || patient.pastMedications || patient.pastAllergies) && (
                         <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2">
                            {patient.assignedNurse && (
                              <div className="text-xs font-medium bg-rose-900/20 p-2 rounded border border-rose-500/30 flex items-center gap-2">
                                <User size={12} className="text-rose-400"/>
                                <span className="text-rose-300">Nurse: {patient.assignedNurse}</span>
                              </div>
                            )}
                            
                            {patient.labTest && (
                              <div className="text-xs font-medium bg-blue-900/20 p-2 rounded border border-blue-500/30 flex items-center gap-2">
                                <Beaker size={12} className="text-blue-400"/>
                                <span className="text-blue-300">Lab: {patient.labTest}</span>
                              </div>
                            )}

                            {patient.radiologyTest && (
                              <div className="text-xs font-medium bg-indigo-900/20 p-2 rounded border border-indigo-500/30 flex items-center gap-2">
                                <Scan size={12} className="text-indigo-400"/>
                                <span className="text-indigo-300">Imaging: {patient.radiologyTest}</span>
                              </div>
                            )}
                            
                            {patient.referredTo && (
                              <div className="text-xs font-medium bg-amber-900/20 p-2 rounded border border-amber-500/30 flex items-center gap-2">
                                <ArrowRightCircle size={12} className="text-amber-400"/>
                                <span className="text-amber-300">Ref: {patient.referredTo}</span>
                              </div>
                            )}
                            
                            {patient.pastMedications && (
                              <div className="text-xs font-medium bg-purple-900/20 p-2 rounded border border-purple-500/30 flex items-center gap-2 col-span-2 md:col-span-3">
                                <Pill size={12} className="text-purple-400"/>
                                <span className="text-purple-300 truncate">Meds: {patient.pastMedications}</span>
                              </div>
                            )}
                            
                            {patient.pastAllergies && (
                              <div className="text-xs font-medium bg-red-900/20 p-2 rounded border border-red-500/30 flex items-center gap-2 col-span-2 md:col-span-3">
                                <AlertTriangle size={12} className="text-red-400"/>
                                <span className="text-red-300 font-bold">⚠️ Allergies: {patient.pastAllergies}</span>
                              </div>
                            )}
                         </div>
                      )}
                      
                      <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-teal-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.div>
                  ))}
                  
                  {patients.filter(p => {
                      if (activeTab === 'ongoing') return !['completed', 'follow_up'].includes(p.status);
                      if (activeTab === 'followup') return p.status === 'follow_up';
                      if (activeTab === 'completed') return p.status === 'completed';
                      return false;
                    }).length === 0 && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-12 border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/30"
                    >
                      <User size={48} className="mx-auto text-slate-700 mb-4" />
                      <p className="text-slate-500 font-medium">No patients in this view.</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
