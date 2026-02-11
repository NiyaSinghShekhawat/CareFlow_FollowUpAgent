
import Link from 'next/link';
import { Activity, Beaker, Pill, ShieldAlert, User, Zap, Heart, Scan } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[100px]"></div>
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] bg-teal-500/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="max-w-6xl w-full text-center space-y-12 relative z-10">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400 text-xs font-medium mb-4">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            System Operational
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight">
            Care<span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500">Flow</span>
            <span className="text-slate-700">.</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Next-Gen Real-time Clinical Workflow Coordination
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mx-auto perspective-1000">
          {/* Doctor Card */}
          <Link href="/doctor" className="group">
            <div className="bg-slate-900/50 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-slate-800 hover:shadow-teal-500/20 hover:border-teal-500/50 transition-all duration-300 h-full flex flex-col items-center gap-6 group-hover:-translate-y-1">
              <div className="p-5 bg-slate-800 rounded-full text-teal-400 group-hover:bg-teal-500 group-hover:text-white transition-all shadow-lg shadow-black/20 group-hover:shadow-teal-500/30">
                <Activity size={36} />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-white group-hover:text-teal-400 transition-colors">Doctor</h3>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">Patient intake, triage, and real-time command center.</p>
              </div>
              <div className="mt-auto pt-4 w-full">
                <div className="w-full py-2 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-400 text-sm font-bold opacity-0 group-hover:opacity-100 transition-all">
                  Access Dashboard
                </div>
              </div>
            </div>
          </Link>

          {/* Nurse Card */}
          <Link href="/nurse" className="group">
            <div className="bg-slate-900/50 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-slate-800 hover:shadow-rose-500/20 hover:border-rose-500/50 transition-all duration-300 h-full flex flex-col items-center gap-6 group-hover:-translate-y-1">
              <div className="p-5 bg-slate-800 rounded-full text-rose-400 group-hover:bg-rose-500 group-hover:text-white transition-all shadow-lg shadow-black/20 group-hover:shadow-rose-500/30">
                <Heart size={36} />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-white group-hover:text-rose-400 transition-colors">Nurse</h3>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">Patient care monitoring and assigned tasks.</p>
              </div>
              <div className="mt-auto pt-4 w-full">
                <div className="w-full py-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm font-bold opacity-0 group-hover:opacity-100 transition-all">
                  Access Dashboard
                </div>
              </div>
            </div>
          </Link>

          {/* Lab Card */}
          <Link href="/lab" className="group">
            <div className="bg-slate-900/50 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-slate-800 hover:shadow-blue-500/20 hover:border-blue-500/50 transition-all duration-300 h-full flex flex-col items-center gap-6 group-hover:-translate-y-1">
              <div className="p-5 bg-slate-800 rounded-full text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all shadow-lg shadow-black/20 group-hover:shadow-blue-500/30">
                <Beaker size={36} />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">Laboratory</h3>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">Sample processing, test results, and analysis.</p>
              </div>
              <div className="mt-auto pt-4 w-full">
                <div className="w-full py-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm font-bold opacity-0 group-hover:opacity-100 transition-all">
                  Access Dashboard
                </div>
              </div>
            </div>
          </Link>

          {/* Radiology Card */}
          <Link href="/radiology" className="group">
            <div className="bg-slate-900/50 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-slate-800 hover:shadow-indigo-500/20 hover:border-indigo-500/50 transition-all duration-300 h-full flex flex-col items-center gap-6 group-hover:-translate-y-1">
              <div className="p-5 bg-slate-800 rounded-full text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all shadow-lg shadow-black/20 group-hover:shadow-indigo-500/30">
                <Scan size={36} />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors">Radiology</h3>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">Advanced imaging and diagnostic radiology.</p>
              </div>
              <div className="mt-auto pt-4 w-full">
                <div className="w-full py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-sm font-bold opacity-0 group-hover:opacity-100 transition-all">
                  Access Dashboard
                </div>
              </div>
            </div>
          </Link>

          {/* Pharmacy Card */}
          <Link href="/pharmacy" className="group">
            <div className="bg-slate-900/50 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-slate-800 hover:shadow-purple-500/20 hover:border-purple-500/50 transition-all duration-300 h-full flex flex-col items-center gap-6 group-hover:-translate-y-1">
              <div className="p-5 bg-slate-800 rounded-full text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-all shadow-lg shadow-black/20 group-hover:shadow-purple-500/30">
                <Pill size={36} />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-white group-hover:text-purple-400 transition-colors">Pharmacy</h3>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">Medication dispensing and fulfillment.</p>
              </div>
              <div className="mt-auto pt-4 w-full">
                <div className="w-full py-2 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400 text-sm font-bold opacity-0 group-hover:opacity-100 transition-all">
                  Access Dashboard
                </div>
              </div>
            </div>
          </Link>

          {/* Patient Portal Card */}
          <Link href="/patient" className="group">
            <div className="bg-slate-900/50 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-slate-800 hover:shadow-amber-500/20 hover:border-amber-500/50 transition-all duration-300 h-full flex flex-col items-center gap-6 group-hover:-translate-y-1">
              <div className="p-5 bg-slate-800 rounded-full text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition-all shadow-lg shadow-black/20 group-hover:shadow-amber-500/30">
                <User size={36} />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-white group-hover:text-amber-400 transition-colors">Patient Portal</h3>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">Personal care journey and results.</p>
              </div>
              <div className="mt-auto pt-4 w-full">
                <div className="w-full py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-bold opacity-0 group-hover:opacity-100 transition-all">
                  Login Access
                </div>
              </div>
            </div>
          </Link>
        </div>

        <div className="flex items-center justify-center gap-3 text-sm text-slate-500 pt-8">
          <ShieldAlert size={16} />
          <span className="font-mono">SECURE CONNECTION • DEMO BUILD v0.2.0</span>
        </div>
      </div>
    </div>
  );
}
