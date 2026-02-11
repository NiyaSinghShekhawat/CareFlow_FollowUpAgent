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
  UserPlus, 
  User, 
  Activity, 
  AlertCircle, 
  Beaker, 
  Pill, 
  ArrowRightCircle, 
  Clock,
  Stethoscope,
  Lock,
  AlertTriangle,
  Heart,
  ClipboardList
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function NurseDashboard() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Login State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [nurseIdInput, setNurseIdInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [currentNurseId, setCurrentNurseId] = useState("");
  const [verifying, setVerifying] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    setLoginError("");

    setTimeout(() => {
      const validIds = ["nu-0001", "nu-0002"];
      if (validIds.includes(nurseIdInput.toLowerCase())) {
        setIsLoggedIn(true);
        setCurrentNurseId(nurseIdInput.toUpperCase());
      } else {
        setLoginError("Invalid Nurse ID. Access Denied.");
      }
      setVerifying(false);
    }, 800);
  };

  // Real-time subscription for assigned patients
  useEffect(() => {
    if (!isLoggedIn || !currentNurseId) return;

    const q = query(
      collection(db, "patients"),
      where("assignedNurse", "==", currentNurseId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const patientData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Patient[];
      
      // Maintain consistent order via client-side sorting
      patientData.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
      
      setPatients(patientData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isLoggedIn, currentNurseId]);

  const statusColors = {
    waiting: "bg-slate-800 text-slate-400 border-slate-700",
    under_treatment: "bg-teal-900/30 text-teal-400 border-teal-500/30",
    lab_ordered: "bg-blue-900/30 text-blue-400 border-blue-500/30",
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

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Background glow effects */}
        <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[20%] right-[30%] w-[40%] h-[40%] bg-rose-900/10 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-[10%] left-[20%] w-[30%] h-[30%] bg-purple-900/10 rounded-full blur-[100px]"></div>
        </div>

        <div className="w-full max-w-md bg-slate-900/50 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-slate-800 relative z-10 text-center">
          <div className="mb-8">
            <div className="w-20 h-20 bg-gradient-to-tr from-rose-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white shadow-lg shadow-rose-500/20 transform rotate-3 hover:rotate-6 transition-all">
              <Heart size={40} />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Nurse Portal</h1>
            <p className="text-slate-400 mt-2">Patient Care & Monitoring Access</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-left">Nurse ID</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                <input 
                  type="text" 
                  placeholder="e.g. NU-0001"
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all uppercase font-mono tracking-wide placeholder:text-slate-700"
                  value={nurseIdInput}
                  onChange={(e) => setNurseIdInput(e.target.value)}
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
              disabled={verifying}
              className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-rose-900/20 hover:shadow-rose-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]"
            >
              {verifying ? "Verifying..." : "Access Dashboard"}
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
        <div className="absolute top-[10%] left-[20%] w-[30%] h-[30%] bg-rose-900/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[20%] right-[10%] w-[25%] h-[25%] bg-purple-900/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-bold text-white tracking-tight flex items-center gap-3">
              <div className="p-3 bg-slate-900 rounded-2xl shadow-lg border border-slate-800 text-rose-400">
                <Heart size={32} />
              </div>
              <div>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-rose-400 to-purple-500">Nurse</span> Dashboard
              </div>
            </h1>
            <p className="text-slate-400 mt-2 font-medium">Patient Care Station • {currentNurseId}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm font-bold text-rose-400 bg-slate-900/50 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-slate-800">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
              </span>
              System Live
            </div>
            <button 
              onClick={() => { setIsLoggedIn(false); setNurseIdInput(""); }}
              className="text-xs font-bold text-slate-500 hover:text-white transition-colors bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-800"
            >
              Log Out
            </button>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900/50 backdrop-blur-md rounded-xl p-4 border border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Patients</p>
                <p className="text-2xl font-bold text-white mt-1">{patients.length}</p>
              </div>
              <ClipboardList className="text-slate-600" size={32} />
            </div>
          </div>
          
          <div className="bg-slate-900/50 backdrop-blur-md rounded-xl p-4 border border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Critical</p>
                <p className="text-2xl font-bold text-red-400 mt-1">{patients.filter(p => p.priority === 'stat').length}</p>
              </div>
              <AlertCircle className="text-red-600" size={32} />
            </div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-md rounded-xl p-4 border border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lab Pending</p>
                <p className="text-2xl font-bold text-blue-400 mt-1">{patients.filter(p => p.status === 'lab_ordered').length}</p>
              </div>
              <Beaker className="text-blue-600" size={32} />
            </div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-md rounded-xl p-4 border border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pharmacy</p>
                <p className="text-2xl font-bold text-purple-400 mt-1">{patients.filter(p => p.status === 'pharmacy_ordered').length}</p>
              </div>
              <Pill className="text-purple-600" size={32} />
            </div>
          </div>
        </div>

        {/* Patient List */}
        <div>
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Activity size={20} className="text-rose-400" />
            Assigned Patients ({patients.length})
          </h2>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
               <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
               <p>Loading patients...</p>
            </div>
          ) : patients.length === 0 ? (
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-800 border-dashed p-10 text-center text-slate-500">
              <User size={48} className="mx-auto mb-4 opacity-20" />
              <p>No patients assigned to you yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              <AnimatePresence>
                {patients.map(patient => (
                  <motion.div
                    key={patient.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`relative bg-slate-900/50 backdrop-blur-sm rounded-xl border p-6 shadow-lg transition-all hover:shadow-rose-500/10 hover:border-slate-700/80 ${
                      patient.priority === 'stat' ? 'border-l-4 border-l-red-500 border-slate-800' : 
                      patient.priority === 'urgent' ? 'border-l-4 border-l-orange-500 border-slate-800' : 'border-slate-800'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold shadow-lg ${
                           patient.priority === 'stat' ? 'bg-red-500/20 text-red-500' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {(patient.firstName || '?')[0]}{(patient.lastName || '?')[0]}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-xl font-bold text-white">{patient.firstName} {patient.lastName}</h3>
                            <span className="text-xs font-mono text-slate-500 bg-slate-950 px-2 py-1 rounded border border-slate-800">{patient.patientCode}</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                            <span>{patient.age} yrs</span>
                            <span>•</span>
                            <span>{patient.gender}</span>
                            <span className="font-medium text-slate-400 ml-2">{patient.condition}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${priorityColors[patient.priority]}`}>
                          {patient.priority}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${statusColors[patient.status]}`}>
                          {patient.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    {/* Patient Details Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-800">
                      {patient.labTest && (
                        <div className="flex items-center gap-2 text-sm">
                          <Beaker size={16} className="text-blue-400" />
                          <div>
                            <p className="text-xs text-slate-500 font-bold uppercase">Lab Test</p>
                            <p className="text-slate-300 font-medium">{patient.labTest}</p>
                          </div>
                        </div>
                      )}
                      
                      {patient.medication && (
                        <div className="flex items-center gap-2 text-sm">
                          <Pill size={16} className="text-purple-400" />
                          <div>
                            <p className="text-xs text-slate-500 font-bold uppercase">Medication</p>
                            <p className="text-slate-300 font-medium">{patient.medication}</p>
                          </div>
                        </div>
                      )}

                      {patient.referredTo && (
                        <div className="flex items-center gap-2 text-sm">
                          <ArrowRightCircle size={16} className="text-amber-400" />
                          <div>
                            <p className="text-xs text-slate-500 font-bold uppercase">Referred To</p>
                            <p className="text-slate-300 font-medium">{patient.referredTo}</p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-sm">
                        <Clock size={16} className="text-slate-500" />
                        <div>
                          <p className="text-xs text-slate-500 font-bold uppercase">Admitted</p>
                          <p className="text-slate-300 font-medium">
                            {new Date(patient.createdAt.seconds * 1000).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-rose-500/20 to-transparent" />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
