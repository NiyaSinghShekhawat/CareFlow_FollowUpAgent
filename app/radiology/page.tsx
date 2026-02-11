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
import { Patient, Priority } from "@/types";
import { 
  Scan, 
  Search, 
  Activity, 
  AlertCircle, 
  Clock,
  Camera,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  ClipboardList,
  Monitor,
  Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function RadiologyDashboard() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Real-time subscription for radiology requests
  useEffect(() => {
    // Note: We'll do client-side sorting for the "Urgent at top" requirement
    const q = query(
      collection(db, "patients"),
      where("status", "==", "radiology_ordered")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const patientData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Patient[];
      
      setPatients(patientData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const priorityColors = {
    normal: "bg-slate-800 text-slate-400 border-slate-700",
    urgent: "bg-orange-500 text-white shadow-lg shadow-orange-900/40 border-orange-400 ring-2 ring-orange-500/20",
    stat: "bg-red-600 text-white animate-pulse shadow-red-900/60 shadow-xl border-red-400 ring-2 ring-red-500/20"
  };

  // Sort: STAT first, then URGENT, then NORMAL. Within those, by date (desc)
  const sortedPatients = [...patients].sort((a, b) => {
    const priorityMap: Record<Priority, number> = { stat: 0, urgent: 1, normal: 2 };
    if (priorityMap[a.priority] !== priorityMap[b.priority]) {
      return priorityMap[a.priority] - priorityMap[b.priority];
    }
    return b.createdAt.seconds - a.createdAt.seconds;
  });

  const updateRadiologyStatus = async (id: string, newStatus: Patient['radiologyStatus']) => {
    try {
      await updateDoc(doc(db, "patients", id), { 
        radiologyStatus: newStatus,
        updatedAt: Timestamp.now()
      });
    } catch (err) {
      console.error("Failed to update radiology status:", err);
    }
  };

  const filteredPatients = sortedPatients.filter(p => 
    `${p.firstName} ${p.lastName} ${p.patientCode}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans pb-20 relative overflow-x-hidden">
      {/* Background glow effects */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[10%] left-[25%] w-[40%] h-[40%] bg-indigo-900/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[10%] right-[10%] w-[35%] h-[35%] bg-blue-900/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <h1 className="text-4xl font-bold text-white tracking-tight flex items-center gap-3">
              <div className="p-3 bg-slate-900 rounded-2xl shadow-lg border border-slate-800 text-indigo-400 ring-1 ring-indigo-500/30">
                <Scan size={32} />
              </div>
              <div>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-blue-400 to-cyan-500">Radiology</span> Imaging
              </div>
            </h1>
            <p className="text-slate-400 mt-2 font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
              Real-time DICOM Acquisition Queue
            </p>
          </div>
          
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
            <input 
              type="text" 
              placeholder="Search Queue..."
              className="w-full pl-10 pr-4 py-3.5 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-2xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Diagnostic Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
          <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl p-5 border border-slate-800/50 hover:border-indigo-500/30 transition-colors">
            <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Queue Size</p>
            <div className="flex items-end justify-between">
              <p className="text-3xl font-bold text-white">{patients.length}</p>
              <Monitor className="text-indigo-500/50" size={24} />
            </div>
          </div>
          
          <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl p-5 border border-slate-800/50 hover:border-red-500/30 transition-colors group">
            <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-1 text-red-400/80">Immediate</p>
            <div className="flex items-end justify-between">
              <p className="text-3xl font-bold text-red-500">{patients.filter(p => p.priority === 'stat').length}</p>
              <Zap className="text-red-500 group-hover:scale-125 transition-transform" size={24} />
            </div>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl p-5 border border-slate-800/50 hover:border-orange-500/30 transition-colors">
            <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-1 text-orange-400/80">Urgent</p>
            <div className="flex items-end justify-between">
              <p className="text-3xl font-bold text-orange-500">{patients.filter(p => p.priority === 'urgent').length}</p>
              <AlertCircle className="text-orange-500" size={24} />
            </div>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl p-5 border border-slate-800/50 hover:border-teal-500/30 transition-colors">
            <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-1">System Load</p>
            <div className="flex items-end justify-between">
              <p className="text-3xl font-bold text-teal-400">Optimal</p>
              <CheckCircle2 className="text-teal-500" size={24} />
            </div>
          </div>
        </div>

        {/* Imaging Queue */}
        <div className="space-y-6">
          <div className="flex justify-between items-center px-2">
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
              <Monitor size={24} className="text-indigo-400" />
              Incoming Scanner Requests
            </h2>
            <div className="text-xs font-bold text-slate-500 uppercase flex gap-4">
               <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> STAT</span>
               <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500"></span> URGENT</span>
            </div>
          </div>

          {loading ? (
            <div className="py-32 flex flex-col items-center justify-center gap-6">
               <div className="relative">
                 <div className="w-16 h-16 border-4 border-indigo-500/20 rounded-full"></div>
                 <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin absolute top-0"></div>
               </div>
               <p className="font-mono text-indigo-400 animate-pulse tracking-widest uppercase text-sm">Initializing DICOM Interface...</p>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="bg-slate-900/20 backdrop-blur-md rounded-3xl border border-slate-800/50 border-dashed p-24 text-center">
              <Scan size={64} className="mx-auto mb-6 text-slate-800" />
              <p className="text-slate-500 text-xl font-medium">Imaging queue is currently empty.</p>
              <p className="text-slate-600 text-sm mt-1">All scan requests have been cleared.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredPatients.map((patient) => (
                  <motion.div
                    key={patient.id}
                    layout
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`bg-slate-900/40 backdrop-blur-xl rounded-3xl border p-8 shadow-2xl transition-all duration-500 group relative overflow-hidden ${
                      patient.priority === 'stat' ? 'border-red-500/30 bg-red-950/5' : 
                      patient.priority === 'urgent' ? 'border-orange-500/30 bg-orange-950/5' : 'border-slate-800/50 hover:border-indigo-500/40'
                    }`}
                  >
                    {/* Urgency Highlight Bar */}
                    <div className={`absolute top-0 left-0 w-2 h-full ${
                      patient.priority === 'stat' ? 'bg-red-600 shadow-[0_0_20px_rgba(220,38,38,0.5)]' : 
                      patient.priority === 'urgent' ? 'bg-orange-500' : 'bg-slate-800'
                    }`} />

                    <div className="flex flex-col xl:flex-row justify-between gap-8 items-start relative z-10">
                      
                      <div className="flex items-start gap-6">
                        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center font-black text-3xl shadow-2xl transform group-hover:rotate-3 transition-transform ${
                          patient.priority === 'stat' ? 'bg-red-500/20 text-red-500 ring-1 ring-red-500/50' : 
                          patient.priority === 'urgent' ? 'bg-orange-500/20 text-orange-500 ring-1 ring-orange-500/50' : 
                          'bg-slate-800 text-slate-600 ring-1 ring-slate-700'
                        }`}>
                          {patient.firstName[0]}{patient.lastName[0]}
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-3xl font-black text-white tracking-tighter uppercase group-hover:text-indigo-400 transition-colors">
                              {patient.firstName} {patient.lastName}
                            </h3>
                            <div className="flex gap-2">
                              <span className="px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono font-bold text-slate-400">
                                MD:{patient.patientCode}
                              </span>
                              <span className={`px-4 py-1 rounded-lg text-xs font-black uppercase tracking-[0.1em] ${priorityColors[patient.priority]}`}>
                                {patient.priority}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-6 text-sm text-slate-500 font-bold uppercase tracking-wide">
                            <span className="flex items-center gap-2"><Activity size={14} className="text-slate-600" /> {patient.age}Y · {patient.gender[0]}</span>
                            <span className="text-slate-800">|</span>
                            <span className="text-slate-400">{patient.condition}</span>
                          </div>

                          <div className="pt-4 flex flex-wrap gap-3">
                             <div className="bg-indigo-500/10 border-2 border-indigo-500/20 rounded-2xl p-4 pr-10 relative overflow-hidden group-hover:border-indigo-500/50 transition-colors">
                                <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Imaging Modality</div>
                                <div className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                                  <Camera size={20} className="text-indigo-400" />
                                  {patient.radiologyTest || "Standard Imaging"}
                                </div>
                                <Scan size={60} className="absolute -right-4 -bottom-4 text-indigo-500/10 group-hover:scale-110 transition-transform" />
                             </div>
                          </div>
                        </div>
                      </div>

                       <div className="flex flex-row xl:flex-col justify-between items-end gap-6 w-full xl:w-auto self-stretch">
                        <div className="text-right space-y-2">
                           <div className="flex flex-col">
                             <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">Requested At</span>
                             <span className="text-2xl font-black text-white tracking-tighter leading-none mt-1">
                               {new Date(patient.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                             </span>
                           </div>
                           
                           {/* Status Controls */}
                           <div className="flex gap-1 mt-2">
                             {(['pending', 'processing', 'completed'] as const).map((s) => (
                               <button
                                 key={s}
                                 onClick={() => updateRadiologyStatus(patient.id, s)}
                                 className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all border ${
                                   patient.radiologyStatus === s 
                                   ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-900/40' 
                                   : 'bg-slate-900 text-slate-500 border-slate-800 hover:bg-slate-800'
                                 }`}
                               >
                                 {s}
                               </button>
                             ))}
                           </div>

                           <div className="flex items-center justify-end gap-2 text-slate-500 font-bold text-xs mt-1">
                             <Calendar size={14} className="text-slate-600" />
                             {new Date(patient.createdAt.seconds * 1000).toLocaleDateString([], { month: 'long', day: 'numeric' })}
                           </div>
                        </div>

                        <div className="flex gap-2">
                          <button className="p-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl transition-all active:scale-95 border border-slate-700">
                             <Monitor size={20} />
                          </button>
                          <button className="flex-1 xl:flex-none px-10 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black uppercase tracking-widest text-sm rounded-2xl shadow-2xl shadow-indigo-900/40 border border-white/10 transition-all active:scale-95 flex items-center justify-center gap-2">
                             Full DICOM Access
                          </button>
                        </div>
                      </div>
                    </div>
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
