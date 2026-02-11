"use client";

import { useState, useEffect } from "react";
import { 
  collection, 
  query, 
  where,
  onSnapshot,
  updateDoc,
  doc,
  Timestamp,
  orderBy
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Patient } from "@/types";
import { 
  Beaker, 
  Search, 
  Activity, 
  AlertCircle, 
  Clock,
  FlaskConical,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  ClipboardList
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function LaboratoryDashboard() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Real-time subscription for lab requests
  useEffect(() => {
    const q = query(
      collection(db, "patients"),
      where("status", "==", "lab_ordered")
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
  }, []);

  const priorityColors = {
    normal: "bg-slate-800 text-slate-400 border-slate-700",
    urgent: "bg-orange-900/30 text-orange-400 border-orange-500/30",
    stat: "bg-red-600 text-white animate-pulse shadow-red-900/50 shadow-lg"
  };

  const updateLabStatus = async (id: string, newStatus: Patient['labStatus']) => {
    try {
      await updateDoc(doc(db, "patients", id), { 
        labStatus: newStatus,
        updatedAt: Timestamp.now()
      });
    } catch (err) {
      console.error("Failed to update lab status:", err);
    }
  };

  const filteredPatients = patients.filter(p => 
    `${p.firstName} ${p.lastName} ${p.patientCode}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans pb-20 relative overflow-x-hidden">
      {/* Background glow effects */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[10%] right-[20%] w-[30%] h-[30%] bg-blue-900/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[20%] left-[10%] w-[25%] h-[25%] bg-teal-900/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <h1 className="text-4xl font-bold text-white tracking-tight flex items-center gap-3">
              <div className="p-3 bg-slate-900 rounded-2xl shadow-lg border border-slate-800 text-blue-400">
                <Beaker size={32} />
              </div>
              <div>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-500">Laboratory</span> Analysis
              </div>
            </h1>
            <p className="text-slate-400 mt-2 font-medium italic">Pending Diagnostic Requests</p>
          </div>
          
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
            <input 
              type="text" 
              placeholder="Search by Patient ID or Name..."
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/50 backdrop-blur-md border border-slate-800 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900/50 backdrop-blur-md rounded-xl p-4 border border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Requests</p>
                <p className="text-2xl font-bold text-white mt-1">{patients.length}</p>
              </div>
              <FlaskConical className="text-blue-500" size={32} />
            </div>
          </div>
          
          <div className="bg-slate-900/50 backdrop-blur-md rounded-xl p-4 border border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Critical-STAT</p>
                <p className="text-2xl font-bold text-red-500 mt-1">{patients.filter(p => p.priority === 'stat').length}</p>
              </div>
              <AlertCircle className="text-red-500" size={32} />
            </div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-md rounded-xl p-4 border border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Average Wait</p>
                <p className="text-2xl font-bold text-teal-400 mt-1">14m</p>
              </div>
              <Clock className="text-teal-500" size={32} />
            </div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-md rounded-xl p-4 border border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Processed Today</p>
                <p className="text-2xl font-bold text-indigo-400 mt-1">42</p>
              </div>
              <CheckCircle2 className="text-indigo-500" size={32} />
            </div>
          </div>
        </div>

        {/* Request List */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ClipboardList size={20} className="text-blue-400" />
            Incoming Lab Orders
          </h2>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
               <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
               <p>Connecting to hospital network...</p>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="bg-slate-900/30 backdrop-blur-sm rounded-2xl border border-slate-800 border-dashed p-16 text-center">
              <Beaker size={48} className="mx-auto mb-4 text-slate-700" />
              <p className="text-slate-500 font-medium text-lg">No pending laboratory requests matching your search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredPatients.map((patient) => (
                  <motion.div
                    key={patient.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`bg-slate-900/50 backdrop-blur-md rounded-2xl border p-6 transition-all border-slate-800 hover:border-slate-700 group relative ${
                      patient.priority === 'stat' ? 'shadow-lg shadow-red-900/10 border-l-4 border-l-red-500' : 
                      patient.priority === 'urgent' ? 'border-l-4 border-l-orange-500' : ''
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row justify-between gap-6">
                      <div className="flex items-start gap-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl shadow-inner ${
                          patient.priority === 'stat' ? 'bg-red-500/20 text-red-500' : 'bg-slate-800 text-slate-500'
                        }`}>
                          {patient.firstName[0]}{patient.lastName[0]}
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight">
                              {patient.firstName} {patient.lastName}
                            </h3>
                            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-xs font-mono text-slate-500">
                              {patient.patientCode}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                            <span>{patient.age} yrs</span>
                            <span>•</span>
                            <span>{patient.gender}</span>
                            <span>•</span>
                            <span className="font-semibold text-slate-400 uppercase tracking-tighter">{patient.condition}</span>
                          </div>
                          
                          <div className="mt-4 inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 px-4 py-2 rounded-xl">
                            <FlaskConical size={18} className="text-blue-400 animate-pulse" />
                            <span className="text-blue-300 font-bold tracking-wide uppercase">{patient.labTest}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col lg:flex-row justify-between lg:justify-center items-center lg:items-end gap-6 min-w-[200px]">
                        <div className="flex flex-col items-end gap-2">
                          <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border ${priorityColors[patient.priority]}`}>
                            {patient.priority}
                          </span>
                          <div className="flex gap-1">
                            {(['pending', 'processing', 'completed'] as const).map((s) => (
                              <button
                                key={s}
                                onClick={() => updateLabStatus(patient.id, s)}
                                className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-all ${
                                  patient.labStatus === s 
                                  ? 'bg-blue-600 text-white shadow-md' 
                                  : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                                }`}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end">
                           <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                             <Clock size={16} />
                             Ordered {new Date(patient.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                           </div>
                           <div className="text-[10px] text-slate-600 font-bold uppercase mt-1 tracking-widest leading-none">
                              {new Date(patient.createdAt.seconds * 1000).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                           </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Background decoration */}
                    <Activity className="absolute bottom-4 right-4 text-slate-800/20 pointer-events-none group-hover:text-blue-500/5 transition-colors" size={100} />
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
