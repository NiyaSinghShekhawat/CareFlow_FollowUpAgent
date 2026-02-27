"use client";
import { useEffect, useState } from "react";
import {
  collection, onSnapshot, query,
  where, orderBy, doc, getDoc
} from "firebase/firestore";
import { db } from "@/lib/db"; // Assuming lib/db.ts exports Firestore instance

// ─── Types ─────────────────────────────────────────────────────
interface CheckinResponse {
  id: string;
  patientName: string;
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
  lastStatus: string;
  parameters: any[];
  status: string;
}

// ─── Condition Category Badge ───────────────────────────────────
function ConditionBadge({
  category
}: {
  category: "normal" | "note" | "critical"
}) {
  const config = {
    normal: {
      bg: "bg-green-100", text: "text-green-700",
      border: "border-green-300", icon: "✅", label: "NORMAL"
    },
    note: {
      bg: "bg-yellow-100", text: "text-yellow-700",
      border: "border-yellow-300", icon: "⚠️", label: "NOTE"
    },
    critical: {
      bg: "bg-red-100", text: "text-red-700",
      border: "border-red-300", icon: "🚨", label: "CRITICAL"
    }
  };
  const c = config[category] || config.normal;

  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 
      rounded-full text-sm font-bold border
      ${c.bg} ${c.text} ${c.border}`}>
      {c.icon} {c.label}
    </span>
  );
}

// ─── Status Indicator ───────────────────────────────────────────
function StatusBadge({
  status
}: {
  status: "improving" | "stable" | "deteriorating"
}) {
  const config = {
    improving: {
      bg: "bg-green-50", text: "text-green-600",
      icon: "↑", label: "Improving"
    },
    stable: {
      bg: "bg-gray-50", text: "text-gray-500",
      icon: "→", label: "Stable"
    },
    deteriorating: {
      bg: "bg-red-50", text: "text-red-600",
      icon: "↓", label: "Deteriorating"
    }
  };
  const c = config[status] || config.stable;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 
      rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
      {c.icon} {c.label}
    </span>
  );
}

// ─── Single Patient Check-in Card ──────────────────────────────
function CheckinCard({
  checkin,
  parameters
}: {
  checkin: CheckinResponse,
  parameters: any[]
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`border rounded-xl overflow-hidden mb-4
      ${checkin.conditionCategory === "critical"
        ? "border-red-300 shadow-red-100 shadow-md"
        : checkin.conditionCategory === "note"
        ? "border-yellow-300"
        : "border-gray-200"}`}>

      {/* Card Header */}
      <div className={`flex items-center justify-between p-4
        ${checkin.conditionCategory === "critical"
          ? "bg-red-50"
          : checkin.conditionCategory === "note"
          ? "bg-yellow-50"
          : "bg-gray-50"}`}>

        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-gray-600">
            Day {checkin.dayNumber}
          </span>
          <ConditionBadge category={checkin.conditionCategory} />
          {checkin.alertTriggered && (
            <span className="text-xs bg-red-600 text-white 
                             px-2 py-0.5 rounded-full">
              🔔 Doctor Alerted
            </span>
          )}
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-blue-600 hover:underline">
          {expanded ? "▲ Hide" : "▼ View Details"}
        </button>
      </div>

      {/* Parameters Table — Always Visible */}
      <div className="p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 text-xs 
                           border-b pb-2">
              <th className="pb-2 w-1/3">Parameter</th>
              <th className="pb-2 w-1/4">Today's Answer</th>
              <th className="pb-2 w-1/4">Status</th>
              <th className="pb-2 w-1/4">Threshold</th>
            </tr>
          </thead>
          <tbody>
            {parameters.map((param, i) => {
              const name = param.name;
              const answer = checkin.ratings?.[name];
              const paramStatus = checkin.statusPerParameter?.[name];
              const isAlarmed = checkin.alertedParameters?.includes(name);

              const formattedAnswer = () => {
                if (answer === null || answer === undefined)
                  return "—";
                if (param.questionType === "rate")
                  return `${answer}/5`;
                if (param.questionType === "yesno")
                  return answer.toString().toUpperCase();
                if (param.questionType === "value")
                  return `${answer} ${param.unit || ""}`;
                return answer;
              };

              const formattedThreshold = () => {
                if (param.questionType === "rate")
                  return `Alarm ≥ ${param.alarmingRate}/5`;
                if (param.questionType === "yesno")
                  return `Alarm if "${param.alarmingAnswer}"`;
                if (param.questionType === "value")
                  return `${param.alarmingValueMin}–${param.alarmingValueMax} ${param.unit}`;
                return "—";
              };

              return (
                <tr key={i}
                  className={`border-b last:border-0
                    ${isAlarmed ? "bg-red-50" : ""}`}>

                  <td className="py-3 font-medium text-gray-700">
                    {isAlarmed && (
                      <span className="text-red-500 mr-1">⚠️</span>
                    )}
                    {name}
                  </td>

                  <td className="py-3">
                    <span className={`font-bold text-base
                      ${isAlarmed
                        ? "text-red-600"
                        : "text-gray-800"}`}>
                      {formattedAnswer()}
                    </span>
                  </td>

                  <td className="py-3">
                    {paramStatus ? (
                      <StatusBadge status={paramStatus} />
                    ) : (
                      <span className="text-xs text-gray-400">
                        No prior data
                      </span>
                    )}
                  </td>

                  <td className="py-3 text-xs text-gray-400">
                    {formattedThreshold()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Subjective Response */}
        <div className="mt-4 bg-blue-50 rounded-lg p-3">
          <p className="text-xs text-blue-500 font-semibold mb-1">
            💬 Patient's Own Words
          </p>
          <p className="text-sm text-gray-700 italic">
            "{checkin.subjective || "No subjective response"}"
          </p>
        </div>

        {/* Expanded — Doctor Summary */}
        {expanded && (
          <div className="mt-3 bg-gray-50 rounded-lg p-3 
                          border border-gray-200">
            <p className="text-xs text-gray-500 font-semibold mb-1">
              🩺 Gemini Clinical Summary
            </p>
            <p className="text-sm text-gray-600">
              {checkin.doctorSummary}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Patient Follow-up Detail View ─────────────────────────────
function PatientFollowupView({
  patient,
  onBack
}: {
  patient: FollowupPatient,
  onBack: () => void
}) {
  const [checkins, setCheckins] = useState<CheckinResponse[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, "patient_responses"),
      where("patientDocId", "==", patient.id),
      orderBy("timestamp", "desc")
    );

    const unsub = onSnapshot(q, snap => {
      setCheckins(snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      } as unknown as CheckinResponse)));
    });

    return () => unsub();
  }, [patient.id]);

  const latestCheckin = checkins[0];
  const criticalCount = checkins.filter(
    c => c.conditionCategory === "critical"
  ).length;
  const noteCount = checkins.filter(
    c => c.conditionCategory === "note"
  ).length;

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-4 text-blue-600 hover:underline text-sm font-medium">
        ← Back to All Patients
      </button>

      <div className="bg-white rounded-xl border p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {patient.patientName}
            </h2>
            <p className="text-gray-500 mt-1">
              🔬 {patient.surgeryType} &nbsp;|&nbsp;
              📅 Day {patient.currentDay} of {patient.followupDays}
            </p>
          </div>

          {latestCheckin && (
            <div className="text-right">
              <p className="text-xs text-gray-400 mb-1">
                Latest Condition
              </p>
              <ConditionBadge
                category={latestCheckin.conditionCategory}
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-gray-800">
              {checkins.length}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Check-ins
            </p>
          </div>
          <div className="bg-red-50 rounded-xl p-4 text-center border border-red-100">
            <p className="text-2xl font-bold text-red-600">
              {criticalCount}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Critical Days
            </p>
          </div>
          <div className="bg-yellow-50 rounded-xl p-4 text-center border border-yellow-100">
            <p className="text-2xl font-bold text-yellow-600">
              {noteCount}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Note Days
            </p>
          </div>
        </div>
      </div>

      <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
        Daily Check-in History
      </h3>

      {checkins.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-400">
          No check-ins recorded yet.
        </div>
      ) : (
        checkins.map(checkin => (
          <CheckinCard
            key={checkin.id}
            checkin={checkin}
            parameters={patient.parameters}
          />
        ))
      )}
    </div>
  );
}

import CriticalAlertBanner from "@/components/followup/CriticalAlertBanner";

// ─── Main Page ──────────────────────────────────────────────────
export default function FollowupDashboard() {
  const [patients, setPatients] = useState<FollowupPatient[]>([]);
  const [filter, setFilter] = useState<"all" | "active" | "completed">("active");

  useEffect(() => {
    const q = filter === "all"
      ? query(collection(db, "followup_patients"))
      : query(
          collection(db, "followup_patients"),
          where("status", "==", filter)
        );

    const unsub = onSnapshot(q, snap => {
      const docs = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      } as FollowupPatient));

      // ─── PRIORITY SORTING ───────────────────────────────────
      // 1. Critical
      // 2. Note
      // 3. Normal
      docs.sort((a, b) => {
        const priorityScore: any = { critical: 3, note: 2, normal: 1 };
        const scoreA = priorityScore[a.lastStatus] || 0;
        const scoreB = priorityScore[b.lastStatus] || 0;
        return scoreB - scoreA;
      });

      setPatients(docs);
    });

    return () => unsub();
  }, [filter]);

  return (
    <div className="p-8 max-w-6xl mx-auto min-h-screen bg-gray-50">
      <CriticalAlertBanner />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            Follow-up Dashboard
          </h1>
          <p className="text-gray-500 font-medium mt-1">Monitor patient recovery metrics in real-time.</p>
        </div>

        <div className="flex bg-white rounded-2xl border-2 border-gray-100 p-1 shadow-sm">
          {(["active","completed","all"] as const).map(f => (
            <button key={f}
              onClick={() => setFilter(f)}
              className={`px-6 py-2 rounded-xl text-sm font-black tracking-tight transition-all
                ${filter === f
                  ? "bg-blue-600 text-white shadow-md shadow-blue-100"
                  : "text-gray-500 hover:bg-gray-50"}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {patients.map(patient => (
          <Link key={patient.id} href={`/doctor/followup/${patient.id}`}>
            <PatientRow
              patient={patient}
            />
          </Link>
        ))}
        {patients.length === 0 && (
          <div className="text-center py-24 bg-white rounded-3xl border-4 border-dashed border-gray-100 text-gray-300 font-black text-xl italic uppercase">
            No {filter} patients recorded.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Patient Row in List ────────────────────────────────────────
function PatientRow({
  patient
}: {
  patient: FollowupPatient
}) {
  const [latestCheckin, setLatestCheckin] =
    useState<CheckinResponse | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, "patient_responses"),
      where("patientDocId", "==", patient.id),
      orderBy("timestamp", "desc")
    );

    const unsub = onSnapshot(q, snap => {
      if (!snap.empty) {
        const data = snap.docs[0].data();
        setLatestCheckin({
          id: snap.docs[0].id,
          ...data
        } as unknown as CheckinResponse);
      }
    });

    return () => unsub();
  }, [patient.id]);

  return (
    <div
      onClick={onClick}
      className={`bg-white border rounded-xl p-6 cursor-pointer
        hover:shadow-md transition-all group
        ${latestCheckin?.conditionCategory === "critical"
          ? "border-red-300 hover:border-red-400 bg-red-50/10"
          : latestCheckin?.conditionCategory === "note"
          ? "border-yellow-300 hover:border-yellow-400 bg-yellow-50/10"
          : "border-gray-200 hover:border-blue-300"}`}>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-5">
          <div className={`w-14 h-14 rounded-full flex items-center 
            justify-center font-bold text-white text-xl shadow-sm
            ${latestCheckin?.conditionCategory === "critical"
              ? "bg-red-500"
              : latestCheckin?.conditionCategory === "note"
              ? "bg-yellow-500"
              : "bg-green-500"}`}>
            {patient.patientName.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-gray-800 text-xl group-hover:text-blue-600 transition-colors">
              {patient.patientName}
            </p>
            <p className="text-base text-gray-500">
              {patient.surgeryType} &nbsp;•&nbsp;
              Day {patient.currentDay || 0}/{patient.followupDays}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          {latestCheckin && (
            <div className="hidden lg:flex flex-col gap-1.5 min-w-[160px]">
              {patient.parameters?.slice(0, 3).map((param: any) => {
                const s = latestCheckin
                  .statusPerParameter?.[param.name];
                return (
                  <div key={param.name}
                    className="flex items-center gap-3 text-sm">
                    <span className="text-gray-400 w-24 truncate">
                      {param.name}
                    </span>
                    {s && <StatusBadge status={s} />}
                  </div>
                );
              })}
            </div>
          )}

          <div className="text-right flex flex-col items-end gap-2">
            {latestCheckin ? (
              <ConditionBadge
                category={latestCheckin.conditionCategory}
              />
            ) : (
              <span className="text-sm font-medium text-gray-400 italic">
                Awaiting check-in
              </span>
            )}
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {patient.status === "completed"
                ? "COMPLETED"
                : `${patient.followupDays - (patient.currentDay || 0)} days remaining`}
            </p>
          </div>

          <span className="text-gray-300 text-2xl group-hover:text-blue-400 transform group-hover:translate-x-1 transition-all">→</span>
        </div>
      </div>
    </div>
  );
}
