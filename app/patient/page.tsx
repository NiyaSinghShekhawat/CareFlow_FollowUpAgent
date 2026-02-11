
"use client";

import { useState, useEffect } from "react";
import { 
  collection, 
  query, 
  where, 
  onSnapshot
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
  ShieldCheck,
  Calendar,
  Scan
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function PatientDashboard() {
  // Login State
  const [patientIdInput, setPatientIdInput] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentPatient, setCurrentPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      // One-time fetch to verify ID
      // roughly simulating a login
      // In real app, we'd use where('patientCode', '==', input)
      // But triggering the realtime listener below is better once we have the ID.
      
      // For this demo, let's just set the code and let the listener pick it up
      // But we need to verify it exists first to be nice.
      const q = query(
        collection(db, "patients"), 
        where("patientCode", "==", patientIdInput.trim().toUpperCase())
      );
      
      // We'll just subscribe directly. If empty, show error.
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
        unsubscribe(); // Unsubscribe this one-time check
      });

    } catch (err) {
      console.error(err);
      setError("System error. Try again.");
      setLoading(false);
    }
  };

  // Helper to check 24h limit
  const checkIsOverdue = (timestamp: any) => {
    if (!timestamp) return false;
    const now = new global.Date(); // Explicit global to avoid conflicts if any
    const created = new global.Date(timestamp.seconds * 1000);
    const diffHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    return diffHours > 24;
  };

  // Mock Date for demonstration (Simulate passed time if needed)
  // For now, we use strict logic. If user created patient yesterday, it will show.

  // Component for Task Item
  const TaskItem = ({ 
    title, 
    status, 
    icon: Icon, 
    details, 
    timestamp, 
    isCompleted = false 
  }: { 
    title: string, 
    status: string, 
    icon: any, 
    details?: string, 
    timestamp?: any, 
    isCompleted?: boolean 
  }) => {
    
    // Alert Condition: Not completed AND > 24 hours
    const isOverdue = !isCompleted && checkIsOverdue(timestamp);

    return (
      <div className={`relative bg-slate-900/50 backdrop-blur-md rounded-2xl p-6 border transition-all ${
        isCompleted ? 'border-teal-500/30 bg-teal-900/10' : 
        isOverdue ? 'border-amber-500/50 bg-amber-900/10 shadow-lg shadow-amber-900/20' : 'border-slate-800 hover:border-slate-700'
      }`}>
        
        {/* Yellow Alert Tab */}
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
            
            <div className="flex items-center gap-4 mt-3 text-xs font-medium">
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

            {/* 5. Follow-Up Appointment */}
            {currentPatient && currentPatient.status === 'follow_up' && currentPatient.followUpDate && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative bg-gradient-to-br from-pink-900/30 to-purple-900/30 backdrop-blur-md rounded-2xl p-6 border border-pink-500/50 shadow-lg shadow-pink-900/20"
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
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-lg text-pink-300">
                        Follow-Up Appointment
                      </h3>
                    </div>
                    
                    <p className="text-pink-200/80 text-sm mt-1">You have been scheduled for a follow-up visit.</p>
                    
                    <div className="mt-4 bg-slate-950/50 rounded-xl p-4 border border-pink-500/30">
                      <div className="flex items-center gap-3">
                        <Calendar className="text-pink-400" size={20} />
                        <div>
                          <p className="text-xs text-pink-400 font-bold uppercase tracking-wider">Appointment Date</p>
                          <p className="text-white font-bold text-xl mt-1">
                            {currentPatient && new Date(currentPatient.followUpDate).toLocaleDateString('en-US', { 
                              weekday: 'long',
                              month: 'long', 
                              day: 'numeric', 
                              year: 'numeric' 
                            })}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2 text-xs">
                      <span className="px-2.5 py-1 rounded-md border bg-pink-900/30 border-pink-500/30 text-pink-400 font-medium">
                        Follow-Up Required
                      </span>
                      <span className="flex items-center gap-1 text-slate-400">
                        <Clock size={12} />
                        Scheduled by doctor
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!isLoggedIn || !currentPatient) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        
        {/* Background glow effects */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[30%] left-[10%] w-[40%] h-[40%] bg-teal-900/10 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-[20%] right-[10%] w-[30%] h-[30%] bg-amber-900/5 rounded-full blur-[100px]"></div>
        </div>

        <div className="w-full max-w-md bg-slate-900/50 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-slate-800 relative z-10 text-center">
          <div className="mb-8">
            <div className="w-20 h-20 bg-gradient-to-tr from-teal-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white shadow-lg shadow-teal-500/20 transform rotate-3 hover:rotate-6 transition-all">
              <User size={40} />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Patient Portal</h1>
            <p className="text-slate-400 mt-2">Access your real-time tracking dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-left">Patient ID</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                <input 
                  type="text" 
                  placeholder="e.g. PT-0001"
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all uppercase font-mono tracking-wide placeholder:text-slate-700"
                  value={patientIdInput}
                  onChange={(e) => setPatientIdInput(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-900/20 border border-red-500/30 text-red-400 text-sm rounded-lg flex items-center gap-2">
                <AlertTriangle size={16} />
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-teal-900/20 hover:shadow-teal-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]"
            >
              {loading ? "Verifying..." : "Access Dashboard"}
            </button>
          </form>
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

      {/* Header */}
      <header className="bg-slate-900/50 backdrop-blur-md border-b border-slate-800 sticky top-0 z-20 relative">
        <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
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
            onClick={() => { setIsLoggedIn(false); setPatientIdInput(""); setCurrentPatient(null); }}
            className="text-sm font-bold text-slate-500 hover:text-white transition-colors bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg"
          >
            Log Out
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8 relative z-10">
        
        {/* Welcome / Status Summary */}
        <div className="bg-gradient-to-r from-teal-600 to-emerald-600 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
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
          </div>
          <User className="absolute -bottom-8 -right-8 text-white/10" size={200} />
        </div>

        {/* Medical History - Highlighted Box */}
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

        {/* TASKS */}
        <div>
          <h3 className="text-white font-bold text-xl mb-6 flex items-center gap-2">
            <Clock size={24} className="text-teal-400" />
            Active Tasks
          </h3>
          
          <div className="space-y-4">
            
            {/* 1. Doctor Consultation */}
            {/* Logic: Always present. Completed if status is 'referred' or 'completed' or 'lab_ordered' or 'pharmacy_ordered' ? 
                Actually, consultation is "Done" when the doctor sets a plan (Lab/Pharm/Refer/Complete).
                If status is 'waiting', it's pending.
            */}
            <TaskItem 
              title="Doctor Consultation" 
              icon={Stethoscope}
              status={currentPatient.consultancyStatus || (currentPatient.status === 'waiting' ? 'pending' : 'completed')}
              details={currentPatient.condition ? `Condition: ${currentPatient.condition}` : "Waiting for triage..."}
              timestamp={currentPatient.createdAt}
              isCompleted={currentPatient.consultancyStatus === 'completed' || currentPatient.status !== 'waiting'}
            />

            {/* 2. Lab Tests */}
            {(currentPatient.labTest || currentPatient.status === 'lab_ordered') && (
              <TaskItem 
                title="Laboratory Analysis"
                icon={Beaker}
                status={currentPatient.labStatus || 'pending'}
                details={currentPatient.labTest || "Lab work requested"}
                timestamp={currentPatient.updatedAt}
                isCompleted={currentPatient.labStatus === 'completed'} 
              />
            )}

            {/* 3. Radiology / Imaging */}
            {(currentPatient.radiologyTest || currentPatient.status === 'radiology_ordered') && (
              <TaskItem 
                title="Radiology & Imaging"
                icon={Scan}
                status={currentPatient.radiologyStatus || 'pending'}
                details={currentPatient.radiologyTest || "Scanning requested"}
                timestamp={currentPatient.updatedAt}
                isCompleted={currentPatient.radiologyStatus === 'completed'} 
              />
            )}

             {/* 4. Pharmacy */}
             {(currentPatient.medication || currentPatient.status === 'pharmacy_ordered') && (
              <TaskItem 
                title="Pharmacy & Medication"
                icon={Pill}
                status={currentPatient.pharmacyStatus || 'pending'}
                details={currentPatient.medication || "Prescription processing"}
                timestamp={currentPatient.updatedAt}
                isCompleted={currentPatient.pharmacyStatus === 'completed'} 
              />
            )}

            {/* 5. Specialist Referral */}
            {(currentPatient.referredTo || currentPatient.status === 'referred') && (
               <TaskItem 
               title="Specialist Referral"
               icon={ArrowRight}
               status={currentPatient.status === 'referred' ? 'Referral Sent' : 'Completed'}
               details={currentPatient.referredTo || "Referral processing"}
               timestamp={currentPatient.updatedAt}
               isCompleted={currentPatient.status === 'completed'}
             />
            )}

            {/* If Nothing Pending */}
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

      </main>
    </div>
  );
}
