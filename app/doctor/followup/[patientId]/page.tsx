"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  collection, query, where, 
  onSnapshot, doc, getDoc, orderBy 
} from "firebase/firestore";
import { db } from "@/lib/db";
import Link from "next/link";

interface CheckinResponse {
  id: string;
  dayNumber: number;
  ratings: Record<string, any>;
  subjective: string;
  conditionCategory: "normal" | "note" | "critical";
  statusPerParameter: Record<string, "improving"|"stable"|"deteriorating">;
  alertTriggered: boolean;
  alertedParameters: string[];
  doctorSummary: string;
  timestamp: any;
}

interface FollowupPatient {
  id: string;
  patientName: string;
  surgeryType: string;
  followupDays: number;
  currentDay: number;
  parameters: any[];
}

export default function PatientDetailPage() {
  const { patientId } = useParams();
  const router = useRouter();
  const [patient, setPatient] = useState<FollowupPatient | null>(null);
  const [checkins, setCheckins] = useState<CheckinResponse[]>([]);

  useEffect(() => {
    if (!patientId) return;

    // 1. Fetch Patient Info
    const fetchPatient = async () => {
      const d = await getDoc(doc(db, "followup_patients", patientId as string));
      if (d.exists()) {
        setPatient({ id: d.id, ...d.data() } as FollowupPatient);
      }
    };
    fetchPatient();

    // 2. Stream Check-ins (Now from checkin_responses as per spec)
    const q = query(
      collection(db, "checkin_responses"),
      where("patientDocId", "==", patientId),
      orderBy("timestamp", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setCheckins(snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      } as unknown as CheckinResponse)));
    });

    return () => unsub();
  }, [patientId]);

  if (!patient) return <div className="p-8 text-center text-gray-500">Loading patient details...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto min-h-screen bg-gray-50">
      <Link href="/doctor/followup" className="text-blue-600 hover:underline mb-6 inline-block font-medium">
        ← Back to Dashboard
      </Link>

      {/* Header Card */}
      <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm mb-8">
        <h1 className="text-3xl font-black text-gray-900">{patient.patientName}</h1>
        <p className="text-gray-500 text-lg mt-1 font-medium">
          {patient.surgeryType} • Day {patient.currentDay} of {patient.followupDays}
        </p>

        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-center">
            <p className="text-sm text-blue-500 font-bold uppercase tracking-wider">Total Check-ins</p>
            <p className="text-3xl font-black text-blue-800">{checkins.length}</p>
          </div>
          <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-center">
            <p className="text-sm text-red-500 font-bold uppercase tracking-wider">Critical Days</p>
            <p className="text-3xl font-black text-red-800">
                {checkins.filter(c => c.conditionCategory === "critical").length}
            </p>
          </div>
          <div className="bg-green-50 border border-green-100 p-4 rounded-xl text-center">
            <p className="text-sm text-green-500 font-bold uppercase tracking-wider">Normal Days</p>
            <p className="text-3xl font-black text-green-800">
                {checkins.filter(c => c.conditionCategory === "normal").length}
            </p>
          </div>
        </div>
      </div>

      {/* History List */}
      <div className="space-y-6">
        {checkins.map((checkin) => (
          <div 
            key={checkin.id} 
            className={`bg-white rounded-2xl border-2 overflow-hidden shadow-sm transition-all
                ${checkin.conditionCategory === 'critical' ? 'border-red-200 shadow-red-50' : 
                  checkin.conditionCategory === 'note' ? 'border-yellow-200 shadow-yellow-50' : 
                  'border-gray-100'}`}
          >
            <div className={`p-4 flex items-center justify-between
                ${checkin.conditionCategory === 'critical' ? 'bg-red-50' : 
                  checkin.conditionCategory === 'note' ? 'bg-yellow-50' : 
                  'bg-gray-50'}`}>
              <div className="flex items-center gap-3">
                <span className="font-black text-gray-600">DAY {checkin.dayNumber}</span>
                <ConditionBadge category={checkin.conditionCategory} />
              </div>
              <span className="text-xs font-bold text-gray-400">
                {checkin.timestamp?.toDate().toLocaleDateString()} {checkin.timestamp?.toDate().toLocaleTimeString()}
              </span>
            </div>

            <div className="p-6">
              <table className="w-full text-sm mb-6">
                <thead>
                  <tr className="text-left text-gray-400 font-bold text-xs uppercase tracking-widest border-b border-gray-100">
                    <th className="pb-3 px-2">Parameter</th>
                    <th className="pb-3 px-2">Answer</th>
                    <th className="pb-3 px-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {patient.parameters.map((param) => (
                    <tr key={param.name}>
                        <td className="py-4 px-2 font-bold text-gray-700">{param.name}</td>
                        <td className="py-4 px-2">
                            <span className={`text-lg font-black ${checkin.alertedParameters?.includes(param.name) ? "text-red-600" : "text-gray-900"}`}>
                                {checkin.ratings[param.name] ?? "—"} {param.unit || ""}
                            </span>
                        </td>
                        <td className="py-4 px-2">
                            <StatusBadge status={checkin.statusPerParameter?.[param.name]} />
                        </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 mb-6">
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Patient Comments</p>
                <p className="text-gray-700 italic">"{checkin.subjective || "No additional comments provided."}"</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🤖</span>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Gemini Clinical Summary</p>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed">{checkin.doctorSummary}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConditionBadge({ category }: { category: string }) {
    const map: any = {
        critical: { bg: "bg-red-600", text: "text-white", label: "🚨 CRITICAL" },
        note: { bg: "bg-orange-500", text: "text-white", label: "⚠️ NOTE" },
        normal: { bg: "bg-green-600", text: "text-white", label: "✅ NORMAL" },
    };
    const c = map[category] || map.normal;
    return <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-tighter ${c.bg} ${c.text}`}>{c.label}</span>;
}

function StatusBadge({ status }: { status: string }) {
    if (!status) return <span className="text-gray-300 text-xs">—</span>;
    const map: any = {
        improving: { text: "text-green-600", bg: "bg-green-50", icon: "↑" },
        stable: { text: "text-gray-500", bg: "bg-gray-50", icon: "→" },
        deteriorating: { text: "text-red-600", bg: "bg-red-50", icon: "↓" },
    };
    const c = map[status] || map.stable;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-xs ${c.bg} ${c.text}`}>
            {c.icon} {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
}
