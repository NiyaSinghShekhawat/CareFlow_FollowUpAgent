"use client";
import { useEffect, useState } from "react";
import { 
  collection, query, where, 
  onSnapshot, doc, updateDoc 
} from "firebase/firestore";
import { db } from "@/lib/db";
import { motion, AnimatePresence } from "framer-motion";

interface CriticalAlert {
  id: string;
  patientName: string;
  alertType: "critical" | "moderate";
  timestamp: any;
  resolved: boolean;
}

export default function CriticalAlertBanner() {
  const [alerts, setAlerts] = useState<CriticalAlert[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, "critical_alerts"),
      where("resolved", "==", false)
    );

    const unsub = onSnapshot(q, (snap) => {
      const activeAlerts = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as CriticalAlert[];
      
      // Sort: Critical at top
      activeAlerts.sort((a, b) => {
        if (a.alertType === "critical" && b.alertType !== "critical") return -1;
        if (a.alertType !== "critical" && b.alertType === "critical") return 1;
        return 0;
      });

      setAlerts(activeAlerts);
    });

    return () => unsub();
  }, []);

  const resolveAlert = async (id: string) => {
    try {
      await updateDoc(doc(db, "critical_alerts", id), {
        resolved: true,
      });
    } catch (err) {
      console.error("Failed to resolve alert:", err);
    }
  };

  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] w-full max-w-2xl px-4">
      <AnimatePresence>
        {alerts.map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className={`mb-3 p-4 rounded-2xl border-2 shadow-xl flex items-center justify-between
              ${alert.alertType === "critical" 
                ? "bg-red-600 border-red-400 text-white" 
                : "bg-orange-500 border-orange-300 text-white"}`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl animate-pulse">
                {alert.alertType === "critical" ? "🚨" : "⚠️"}
              </span>
              <div>
                <p className="font-bold text-lg leading-tight">
                  {alert.alertType === "critical" ? "CRITICAL ALERT" : "MODERATE ALERT"}
                </p>
                <p className="text-sm opacity-90">
                  {alert.patientName} reported {alert.alertType} condition today.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => resolveAlert(alert.id)}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-md px-4 py-2 rounded-xl text-sm font-bold transition-all"
              >
                Mark Resolved
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
