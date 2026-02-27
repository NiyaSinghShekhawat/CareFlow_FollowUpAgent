
"use client";

import { useState, useEffect } from "react";
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  updateDoc,
  doc 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Patient } from "@/types";
import { 
  User, 
  Search, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Beaker, 
  Pill, 
  Stethoscope, 
  ArrowRight,
  ArrowRightCircle,
  ShieldCheck,
  Calendar,
  Scan,
  ActivitySquare,
  ClipboardList,
  Phone,
  Save,
  Mail
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { usePatientActions } from "@/hooks/useRealtime";

export default function PatientDashboard() {
  // Login State
  const [patientIdInput, setPatientIdInput] = useState("PT-");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentPatient, setCurrentPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const reduceMotion = useReducedMotion();
  const { actions: patientActions } = usePatientActions(currentPatient?.id || "");

  // Clear contact inputs as they are now handled by Doctor Intake


  // Real-time Subscription for Logged-in Patient
  useEffect(() => {
    if (!isLoggedIn || !currentPatient) return;

    const q = query(
      collection(db, "patients"),
      where("patientCode", "==", currentPatient.patientCode)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data() as Patient;
        // Merge ID
        setCurrentPatient({ ...data, id: snapshot.docs[0].id });
      }
    });

    return () => unsubscribe();
  }, [isLoggedIn, currentPatient?.patientCode]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const q = query(
        collection(db, "patients"), 
        where("patientCode", "==", patientIdInput.trim().toUpperCase())
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data() as Patient;
          setCurrentPatient({ ...data, id: snapshot.docs[0].id });
          setIsLoggedIn(true);
          setLoading(false);
        } else {
          setError("Patient ID not found. Please check and try again.");
          setLoading(false);
        }
        unsubscribe(); 
      });

    } catch (err) {
      console.error(err);
      setError("System error. Try again.");
      setLoading(false);
    }
  };

  const checkIsOverdue = (timestamp: any) => {
    if (!timestamp) return false;
    const now = new global.Date(); 
    const created = new global.Date(timestamp.seconds * 1000);
    const diffHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    return diffHours > 24;
  };

  const TaskItem = ({ 
    title, 
    status, 
    icon: Icon, 
    details, 
    timestamp, 
    isCompleted = false,
    staggerIndex = 0
  }: { 
    title: string, 
    status: string, 
    icon: any, 
    details?: string, 
    timestamp?: any, 
    isCompleted?: boolean,
    staggerIndex?: number
  }) => {
    
    const isOverdue = !isCompleted && checkIsOverdue(timestamp);

    return (
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut", delay: staggerIndex * 0.08 }}
        className={`relative bg-slate-900/50 backdrop-blur-md rounded-2xl p-5 sm:p-6 border transition-all duration-300 ease-out motion-reduce:transition-none hover:shadow-xl hover:shadow-slate-900/30 ${
          isCompleted ? 'border-teal-500/30 bg-teal-900/10 hover:border-teal-500/50' : 
          isOverdue ? 'border-amber-500/50 bg-amber-900/10 shadow-lg shadow-amber-900/20 hover:border-amber-400/60' : 'border-slate-800 hover:border-slate-600'
        }`}
      >
        
        {isOverdue && (
          <div className="absolute -top-3 -right-2 bg-amber-500 text-amber-950 text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-amber-500/20 flex items-center gap-1 animate-bounce">
            <AlertTriangle size={12} />
            OVERDUE (&gt;24h)
          </div>
        )}

        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-full ${
            isCompleted ? 'bg-teal-500/20 text-teal-400' : 
            isOverdue ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-500'
          }`}>
            <Icon size={24} />
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <h3 className={`font-bold text-lg ${isCompleted ? 'text-teal-400' : 'text-slate-200'}`}>
                {title}
              </h3>
              {isCompleted && <CheckCircle2 className="text-teal-500" size={20} />}
            </div>
            
            <p className="text-slate-400 text-sm mt-1">{details || "Pending clinical updates..."}</p>
            
            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs font-medium">
              <span className={`px-2.5 py-1 rounded-md border tracking-wider uppercase ${
                isCompleted ? 'bg-teal-900/30 border-teal-500/30 text-teal-400' : 
                status === 'processing' ? 'bg-blue-900/30 border-blue-500/30 text-blue-400' :
                isOverdue ? 'bg-amber-900/30 border-amber-500/30 text-amber-400' : 'bg-slate-800 border-slate-700 text-slate-500'
              }`}>
                 {status}
              </span>
              {timestamp && (
                <span className="flex items-center gap-1 text-slate-400">
                  <Clock size={12} />
                  {new Date(timestamp.seconds * 1000).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  if (!isLoggedIn || !currentPatient) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 sm:p-8 relative overflow-hidden">
        
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[30%] left-[10%] w-[40%] h-[40%] bg-teal-900/10 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-[20%] right-[10%] w-[30%] h-[30%] bg-amber-900/5 rounded-full blur-[100px]"></div>
        </div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, scale: 0.95 }}
          animate={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-xl bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-16 border border-slate-800/50 relative z-10 text-center"
        >
          <div className="mb-12">
            <div className="w-24 h-24 bg-gradient-to-tr from-teal-500 to-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-8 text-white shadow-2xl shadow-teal-500/20 transform rotate-3 hover:rotate-6 transition-all duration-500">
              <User size={48} />
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight mb-4">Patient Portal</h1>
            <p className="text-lg text-slate-400 font-medium tracking-wide text-center">Access your real-time tracking dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-8 text-left">
            <div className="space-y-3">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-[0.2em] ml-1 text-left">Patient ID</label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="e.g. PT-0001"
                  className="w-full pl-6 pr-4 py-4.5 rounded-2xl bg-slate-950 border border-slate-800 text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all uppercase font-mono tracking-widest placeholder:text-slate-700 text-lg shadow-inner"
                  value={patientIdInput}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    if (!val.startsWith("PT-")) {
                      setPatientIdInput("PT-");
                    } else {
                      setPatientIdInput(val);
                    }
                  }}
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-900/20 border border-red-500/30 text-red-400 text-sm rounded-xl flex items-center gap-3 animate-shake">
                <AlertTriangle size={20} />
                <span className="font-semibold">{error}</span>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-teal-600 hover:bg-teal-500 text-white font-black py-4.5 rounded-2xl transition-all duration-300 shadow-xl shadow-teal-900/20 hover:shadow-teal-500/30 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98] text-lg tracking-wide group"
            >
              {loading ? "Verifying..." : (
                <>
                  Access Dashboard
                  <ArrowRightCircle size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-12 pt-8 border-t border-slate-800 text-xs font-bold text-slate-600 tracking-[0.3em] uppercase">
            Personal Care Access • v1.4.0
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans pb-20 relative overflow-x-hidden">
      
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[10%] left-[20%] w-[30%] h-[30%] bg-teal-900/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[20%] right-[10%] w-[25%] h-[25%] bg-blue-900/10 rounded-full blur-[100px]"></div>
      </div>

      <header className="bg-slate-900/50 backdrop-blur-md border-b border-slate-800 sticky top-0 z-20 relative">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-gradient-to-tr from-teal-500 to-emerald-500 text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-lg shadow-teal-500/20">
               {currentPatient.firstName[0]}{currentPatient.lastName[0]}
             </div>
             <div>
               <h1 className="font-bold text-white text-lg leading-tight">{currentPatient.firstName} {currentPatient.lastName}</h1>
               <p className="text-xs text-slate-400 font-mono bg-slate-800 px-1.5 py-0.5 rounded w-fit mt-1 border border-slate-700">ID: {currentPatient.patientCode}</p>
             </div>
          </div>
          <button 
            onClick={() => { setIsLoggedIn(false); setPatientIdInput("PT-"); setCurrentPatient(null); }}
            className="text-sm font-bold text-slate-500 hover:text-white transition-colors duration-200 motion-reduce:transition-none bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg"
          >
            Log Out
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 space-y-12 relative z-10">
        
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="bg-gradient-to-r from-teal-600 to-emerald-600 rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden"
        >
          <div className="relative z-10">
            <h2 className="text-3xl font-bold mb-2 tracking-tight">My Care Journey</h2>
            <p className="text-teal-100 mb-8 max-w-sm font-medium">Track your tests, consultations, and prescriptions.</p>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-xl p-3 w-fit border border-white/20">
                <ShieldCheck size={20} className="text-teal-200" />
                <span className="font-bold text-sm tracking-wide">Valid ID: {currentPatient.patientCode}</span>
              </div>
              
              {currentPatient.assignedNurse && (
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-xl p-3 w-fit border border-white/20">
                  <User size={20} className="text-white" />
                  <span className="font-bold text-sm tracking-wide text-white">Nurse: {currentPatient.assignedNurse}</span>
                </div>
              )}
            </div>

            {/* Read-only Contact Details Section */}
            <div className="mt-8 pt-8 border-t border-white/10 relative z-20">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentPatient.phoneNumber && (
                  <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20">
                    <Phone size={18} className="text-teal-200" />
                    <div>
                      <p className="text-[10px] font-black text-teal-100 uppercase tracking-wider">SMS Alert Number</p>
                      <p className="font-bold text-sm text-white font-mono">{currentPatient.phoneNumber}</p>
                    </div>
                  </div>
                )}
                {currentPatient.email && (
                  <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20">
                    <Mail size={18} className="text-teal-200" />
                    <div>
                      <p className="text-[10px] font-black text-teal-100 uppercase tracking-wider">Registration Email</p>
                      <p className="font-bold text-sm text-white">{currentPatient.email}</p>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-teal-100/70 font-medium mt-4">
                Care alerts and digital reports are sent to the contact information provided during intake. 
                Contact medical staff to update these details.
              </p>
            </div>
          </div>
          <User className="absolute -bottom-8 -right-8 text-white/10" size={200} />
        </motion.div>

        {(currentPatient.pastMedications || currentPatient.pastAllergies) && (
          <div className="bg-gradient-to-br from-amber-900/30 to-orange-900/30 backdrop-blur-md rounded-2xl p-6 border-2 border-amber-500/50 shadow-lg shadow-amber-900/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <AlertTriangle className="text-amber-400" size={24} />
              </div>
              <h3 className="text-xl font-bold text-amber-300">Important Medical History</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentPatient.pastMedications && (
                <div className="bg-slate-950/50 rounded-xl p-4 border border-amber-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Pill className="text-amber-400" size={16} />
                    <h4 className="text-sm font-bold text-amber-400 uppercase tracking-wider">Past Medications</h4>
                  </div>
                  <p className="text-slate-200 text-sm leading-relaxed">{currentPatient.pastMedications}</p>
                </div>
              )}
              
              {currentPatient.pastAllergies && (
                <div className="bg-slate-950/50 rounded-xl p-4 border border-red-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="text-red-400" size={16} />
                    <h4 className="text-sm font-bold text-red-400 uppercase tracking-wider">Known Allergies</h4>
                  </div>
                  <p className="text-slate-200 text-sm leading-relaxed font-medium">{currentPatient.pastAllergies}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div>
          <h3 className="text-white font-bold text-xl mb-6 flex items-center gap-2">
            <Clock size={24} className="text-teal-400" />
            Active Tasks
          </h3>
          
          <div className="space-y-4">
            <TaskItem 
              title="Doctor Consultation" 
              icon={Stethoscope}
              status={currentPatient.consultancyStatus || (currentPatient.status === 'waiting' ? 'pending' : 'completed')}
              details={currentPatient.condition ? `Condition: ${currentPatient.condition}` : "Waiting for triage..."}
              timestamp={currentPatient.createdAt}
              isCompleted={currentPatient.consultancyStatus === 'completed' || currentPatient.status !== 'waiting'}
              staggerIndex={0}
            />

            {(currentPatient.labTest || currentPatient.status === 'lab_ordered') && (
              <TaskItem 
                title="Laboratory Analysis"
                icon={Beaker}
                status={currentPatient.labStatus || 'pending'}
                details={currentPatient.labTest || "Lab work requested"}
                timestamp={currentPatient.updatedAt}
                isCompleted={currentPatient.labStatus === 'completed'}
                staggerIndex={1}
              />
            )}

            {(currentPatient.radiologyTest || currentPatient.status === 'radiology_ordered') && (
              <TaskItem 
                title="Radiology & Imaging"
                icon={Scan}
                status={currentPatient.radiologyStatus || 'pending'}
                details={currentPatient.radiologyTest || "Scanning requested"}
                timestamp={currentPatient.updatedAt}
                isCompleted={currentPatient.radiologyStatus === 'completed'}
                staggerIndex={2}
              />
            )}

             {(currentPatient.medication || currentPatient.status === 'pharmacy_ordered') && (
              <TaskItem 
                title="Pharmacy & Medication"
                icon={Pill}
                status={currentPatient.pharmacyStatus || 'pending'}
                details={currentPatient.medication || "Prescription processing"}
                timestamp={currentPatient.updatedAt}
                isCompleted={currentPatient.pharmacyStatus === 'completed'}
                staggerIndex={3}
              />
            )}

            {(currentPatient.referredTo || currentPatient.status === 'referred') && (
               <TaskItem 
               title="Specialist Referral"
               icon={ArrowRight}
               status={currentPatient.status === 'referred' ? 'Referral Sent' : 'Completed'}
               details={currentPatient.referredTo || "Referral processing"}
               timestamp={currentPatient.updatedAt}
               isCompleted={currentPatient.status === 'completed'}
               staggerIndex={4}
             />
            )}

            {currentPatient.status === 'completed' && (
               <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center text-green-800">
                  <CheckCircle2 size={48} className="mx-auto mb-2 text-green-600" />
                  <h3 className="font-bold text-xl">All Tasks Completed</h3>
                  <p>You have been discharged. Take care!</p>
               </div>
            )}
            
            {currentPatient.status === 'waiting' && !currentPatient.labTest && !currentPatient.medication && !currentPatient.referredTo && (
              <div className="text-center text-slate-400 py-8">
                <p>Waiting for doctor's assessment...</p>
              </div>
            )}

          </div>
        </div>

        {currentPatient.status === 'follow_up' && currentPatient.followUpDate && (
          <motion.section
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="relative bg-gradient-to-br from-pink-900/30 to-purple-900/30 backdrop-blur-md rounded-2xl p-6 sm:p-8 border-2 border-pink-500/50 shadow-lg shadow-pink-900/20"
          >
            <div className="absolute -top-3 -right-2 bg-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-pink-500/20 flex items-center gap-1">
              <Calendar size={12} />
              SCHEDULED
            </div>
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-pink-500/20 text-pink-400">
                <Calendar size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-pink-300">Follow-Up Appointment</h3>
                <p className="text-pink-200/80 text-sm mt-1">You have been scheduled for a follow-up visit.</p>
                <div className="mt-4 bg-slate-950/50 rounded-xl p-4 border border-pink-500/30">
                  <div className="flex items-center gap-3">
                    <Calendar className="text-pink-400" size={20} />
                    <div>
                      <p className="text-xs text-pink-400 font-bold uppercase tracking-wider">Appointment Date</p>
                      <p className="text-white font-bold text-xl mt-1">
                        {new Date(currentPatient.followUpDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-md border bg-pink-900/30 border-pink-500/30 text-pink-400 font-medium">Follow-Up Required</span>
                  <span className="flex items-center gap-1 text-slate-400"><Clock size={12} /> Scheduled by doctor</span>
                </div>
              </div>
            </div>
          </motion.section>
        )}

        <motion.section
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="bg-slate-900/60 backdrop-blur-md rounded-2xl border-l-4 border-teal-500/80 border border-slate-800 shadow-lg shadow-slate-900/50 p-6 sm:p-8"
        >
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-white font-bold text-xl flex items-center gap-2">
                  <ClipboardList size={22} className="text-teal-400" />
                  Treatment History
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/40 rounded-full px-2 py-0.5">
                  Timeline
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-2">
                Past treatments and orders for your care journey.
              </p>
            </div>
            <div className="shrink-0 text-xs font-bold text-slate-400 bg-slate-950/80 border border-slate-700 rounded-lg px-3 py-2">
              {patientActions.length} event{patientActions.length !== 1 ? 's' : ''}
            </div>
          </div>

          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {patientActions.length === 0 ? (
                <motion.div
                  initial={reduceMotion ? false : { opacity: 0 }}
                  animate={reduceMotion ? undefined : { opacity: 1 }}
                  className="rounded-xl border border-dashed border-slate-800 bg-slate-950/40 p-6 text-center"
                >
                  <ActivitySquare className="mx-auto text-slate-700 mb-3" size={36} />
                  <p className="text-slate-400 text-sm font-medium">No treatment history found yet.</p>
                  <p className="text-slate-600 text-xs mt-1">New events will appear here automatically.</p>
                </motion.div>
              ) : (
                patientActions.map((a, idx) => {
                  const priority = (a as any).priority as string | undefined;
                  const status = (a as any).status as string | undefined;
                  const createdAt = (a as any).createdAt as any | undefined;

                  const priorityPill =
                    priority === "STAT"
                      ? "bg-red-600 text-white border-red-500/50"
                      : priority === "URGENT"
                        ? "bg-orange-900/30 text-orange-400 border-orange-500/30"
                        : "bg-slate-800 text-slate-400 border-slate-700";

                  const statusPill =
                    status === "Completed"
                      ? "bg-green-900/30 text-green-400 border-green-500/30"
                      : status === "Processing"
                        ? "bg-blue-900/30 text-blue-400 border-blue-500/30"
                        : status === "Ready"
                          ? "bg-teal-900/30 text-teal-400 border-teal-500/30"
                          : "bg-slate-800 text-slate-400 border-slate-700";

                  const dateLabel =
                    createdAt?.seconds
                      ? new Date(createdAt.seconds * 1000).toLocaleString()
                      : "—";

                  const isNew = createdAt?.seconds 
                    ? (Date.now() / 1000 - createdAt.seconds < 900) 
                    : false;

                  return (
                    <motion.div
                      key={(a as any).id || `${idx}`}
                      layout
                      initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
                      animate={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
                      exit={reduceMotion ? undefined : { opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className={cn(
                        "relative overflow-hidden rounded-2xl border transition-all duration-300 group",
                        isNew 
                          ? "bg-teal-500/10 border-teal-500/50 shadow-lg shadow-teal-500/10" 
                          : "bg-slate-900/40 border-slate-800 hover:border-slate-700"
                      )}
                    >
                      {isNew && (
                        <div className="absolute top-0 right-0">
                          <div className="bg-teal-500 text-slate-950 text-[10px] font-black px-3 py-1 rounded-bl-xl shadow-lg animate-pulse tracking-widest uppercase">
                            Recent Activity
                          </div>
                        </div>
                      )}

                      <div className="relative flex p-5 sm:p-6 gap-6">
                        <div className="shrink-0 flex flex-col items-center">
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl transition-all group-hover:scale-110",
                            isNew ? "bg-teal-500 text-white shadow-teal-500/20" : "bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-teal-400"
                          )}>
                             {(a as any).type?.toLowerCase().includes('lab') ? <Beaker size={24} /> : 
                             (a as any).type?.toLowerCase().includes('radiology') ? <Scan size={24} /> :
                             (a as any).type?.toLowerCase().includes('pharmacy') ? <Pill size={24} /> :
                             <ActivitySquare size={24} />}
                          </div>
                        </div>

                        <div className="min-w-0 flex-1 py-1">
                          <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
                            <div className="space-y-1">
                              <h4 className={cn(
                                "font-bold text-lg tracking-tight transition-colors",
                                isNew ? "text-white" : "text-slate-200 group-hover:text-white"
                              )}>
                                {(a as any).type || "Treatment Progress"}
                              </h4>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-slate-500">
                                <span className="flex items-center gap-1.5">
                                  <Clock size={14} className="text-slate-600" />
                                  {dateLabel}
                                </span>
                                {(a as any).department && (
                                  <span className="flex items-center gap-1.5 uppercase tracking-wider text-teal-500/70 text-[10px]">
                                    <span className="w-1 h-1 rounded-full bg-teal-500/40" />
                                    {(a as any).department}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {priority && priority !== "normal" && (
                                <span className={cn(
                                  "text-[10px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-lg border",
                                  priorityPill
                                )}>
                                  {priority}
                                </span>
                              )}
                              <span className={cn(
                                "text-[10px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-lg border",
                                statusPill
                              )}>
                                {status || "Logged"}
                              </span>
                            </div>
                          </div>

                          {(a as any).description && (
                            <div className="bg-slate-950/40 rounded-xl p-4 border border-slate-800/50 group-hover:border-slate-700/50 transition-colors">
                              <p className="text-sm text-slate-400 leading-relaxed font-normal italic">
                                "{(a as any).description}"
                              </p>
                            </div>
                          )}

                          {(a as any).createdBy && (
                            <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                              <User size={12} />
                              Updated By: {(a as any).createdBy}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </motion.section>

      </main>
    </div>
  );
}
