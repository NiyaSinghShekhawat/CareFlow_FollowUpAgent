
import { motion, AnimatePresence } from "framer-motion";
import { Patient, Action } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Activity, Clock, User, AlertCircle, Phone, Syringe } from "lucide-react";
import { addAction } from "@/lib/db";
import { useSoundAlert } from "@/hooks/useSoundAlert";

interface PatientCardProps {
  patient: Patient;
  activeActions?: Action[];
}

export function PatientCard({ patient, activeActions = [] }: PatientCardProps) {
  const isCritical = patient.status === 'Critical';
  const { playStatSound } = useSoundAlert();
  
  // Check if there are any active STAT actions
  const hasStatActions = activeActions.some(a => a.priority === 'STAT' && a.status !== 'Completed');

  const handleStatOrder = async () => {
    // 1. Play sound immediately
    playStatSound();
    
    // 2. Add STAT action
    await addAction({
      patientId: patient.id,
      patientName: patient.name,
      type: 'TROPONIN-T',
      department: 'Lab',
      description: 'Emergency Cardiac Enzymes',
      priority: 'STAT',
      createdBy: 'Dr. Smith'
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      layout
      className={`
        relative overflow-hidden rounded-xl border-2 transition-all duration-300 hover:shadow-lg
        ${isCritical ? 'bg-red-50/50 border-red-200 shadow-red-100' : 'bg-white border-slate-200'}
        ${hasStatActions ? 'ring-2 ring-red-400 ring-offset-2 animate-pulse-slow' : ''}
      `}
    >
      {/* Critical Overlay Flash */}
      {hasStatActions && (
         <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-500 via-red-300 to-red-500 animate-loading-bar" />
      )}

      <div className="p-5">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-full shadow-sm ${isCritical ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
              <User size={20} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 leading-tight">{patient.name}</h3>
              <p className="text-xs font-mono text-slate-500 bg-slate-100 px-1 rounded inline-block mt-0.5">
                {patient.mrn}
              </p>
            </div>
          </div>
          <Badge variant={isCritical ? 'destructive' : 'clinical'} className="uppercase tracking-wider font-bold">
            {patient.status}
          </Badge>
        </div>

        {/* Vitals Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6 bg-slate-50/50 p-3 rounded-lg border border-slate-100">
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Age/Sex</p>
            <p className="font-semibold text-slate-700">{patient.age} / M</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Loc</p>
            <p className="font-semibold text-slate-700">{patient.roomNumber}</p>
          </div>
          <div className="col-span-2 space-y-0.5 pt-2 border-t border-slate-200">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Diagnosis</p>
            <p className="font-medium text-slate-800 flex items-center gap-2">
              <Activity size={14} className="text-[var(--clinical-teal)]" />
              {patient.condition}
            </p>
          </div>
        </div>

        {/* Active Actions Stack */}
        <div className="space-y-2 mb-4">
          <AnimatePresence>
            {activeActions.slice(0, 3).map(action => (
              <motion.div 
                key={action.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`flex items-center justify-between text-xs p-2 rounded border ${
                   action.priority === 'STAT' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-slate-50 border-slate-100 text-slate-600'
                }`}
              >
                <span className="font-medium truncate max-w-[70%]">{action.type}</span>
                <Badge variant={action.priority === 'STAT' ? 'destructive' : 'outline'} className="text-[10px] scale-90 origin-right">
                  {action.status}
                </Badge>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 mt-auto">
           <button 
             className="col-span-1 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
           >
             <Phone size={14} /> Consult
           </button>
           <button 
             className="col-span-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2 rounded-lg transition-all shadow-sm shadow-red-200 flex items-center justify-center gap-2 active:scale-95"
             onClick={handleStatOrder}
           >
             <Syringe size={14} /> 
             STAT LAB
           </button>
        </div>
      </div>
    </motion.div>
  );
}
