
import { Action, ActionStatus } from "@/types";
import { Badge } from "@/components/ui/badge";
import { updateActionStatus } from "@/lib/db";
import { Clock, AlertCircle, CheckCircle, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ActionListProps {
  actions: Action[];
  title: string;
  emptyMessage?: string;
}

export function ActionList({ actions, title, emptyMessage = "No active tasks" }: ActionListProps) {
  
  const handleStatusUpdate = async (actionId: string, currentStatus: ActionStatus) => {
    const nextStatus: Record<string, ActionStatus> = {
      'Pending': 'In Progress',
      'In Progress': 'Completed',
      'Completed': 'Completed' // No-op
    };
    
    const newStatus = nextStatus[currentStatus];
    if (newStatus && newStatus !== currentStatus) {
      await updateActionStatus(actionId, newStatus);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          {title}
          <Badge variant="outline" className="ml-2 bg-white">{actions.length}</Badge>
        </h3>
      </div>
      
      <div className="divide-y divide-slate-100">
        <AnimatePresence mode="popLayout">
          {actions.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="p-8 text-center text-slate-400"
            >
              <p>{emptyMessage}</p>
            </motion.div>
          ) : (
            actions.map((action) => (
              <motion.div
                key={action.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className={`p-4 transition-colors hover:bg-slate-50 group border-l-4 ${
                  action.priority === 'STAT' ? 'border-l-red-500 bg-red-50/10' : 'border-l-transparent'
                }`}
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-slate-900">{action.patientName}</span>
                      {action.priority === 'STAT' && (
                        <Badge variant="destructive" className="animate-pulse">STAT</Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 mb-1">{action.description}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> 
                        {action.createdAt.toDate().toLocaleTimeString()}
                      </span>
                      <span>•</span>
                      <span>{action.createdBy}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={
                      action.status === 'Completed' ? 'success' : 
                      action.status === 'In Progress' ? 'clinical' : 'warning'
                    }>
                      {action.status}
                    </Badge>
                    
                    {action.status !== 'Completed' && (
                      <button
                        onClick={() => handleStatusUpdate(action.id, action.status)}
                        className="text-xs font-medium text-[var(--clinical-teal)] hover:text-[#06748e] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {action.status === 'Pending' ? 'Start Process' : 'Complete'} 
                        <ArrowRight size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
