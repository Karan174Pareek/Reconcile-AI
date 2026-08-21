import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Layers, 
  Database, 
  ArrowRight, 
  FileSpreadsheet, 
  ShieldCheck, 
  Zap, 
  GitBranch
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Zap className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                ReconcileAI
              </span>
              <span className="ml-2 text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                v1.0-scaffold
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2 text-xs text-slate-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>API: localhost:5000</span>
            </div>
            <div className="text-xs bg-slate-800/70 border border-slate-700/60 px-3 py-1.5 rounded-lg text-slate-300">
              Role: <span className="text-emerald-400 font-medium">Analyst (Demo)</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {/* Hero / Pipeline Banner */}
        <div className="mb-8 p-8 rounded-2xl bg-gradient-to-b from-slate-900/80 to-slate-900/40 border border-slate-800 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="max-w-3xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Razorpay AI Buildathon 2026 — AI Finance Controller</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
              Autonomous 3-Pass Bank & Ledger Reconciliation
            </h1>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              Closed-loop reconciliation: deterministic exact matching, fuzzy discrepancy resolution, and Claude-powered exception reasoning with human-in-the-loop draft remediation.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-800/80">
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-xs font-medium text-slate-400">Pass 1 Target</div>
              <div className="text-2xl font-bold text-white mt-1">~65%</div>
              <div className="text-[11px] text-emerald-400 mt-0.5">Deterministic Exact Match</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-xs font-medium text-slate-400">Pass 2 Target</div>
              <div className="text-2xl font-bold text-white mt-1">~18%</div>
              <div className="text-[11px] text-blue-400 mt-0.5">Fuzzy & Date Window</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-xs font-medium text-slate-400">Pass 3 Target</div>
              <div className="text-2xl font-bold text-white mt-1">~10%</div>
              <div className="text-[11px] text-purple-400 mt-0.5">Claude Reasoner</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-xs font-medium text-slate-400">Genuine Exceptions</div>
              <div className="text-2xl font-bold text-white mt-1">~7%</div>
              <div className="text-[11px] text-amber-400 mt-0.5">Categorized Queue</div>
            </div>
          </div>
        </div>

        {/* Pipeline Architecture Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Mongoose Schemas</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                BankRecord, LedgerRecord, Match, Exception, DraftAction, AuditLog (immutable), Run, and User models initialized.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-emerald-400 font-mono">
              <span>8 collections ready</span>
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Synthetic Generator</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                CLI seed generator with 500 records: exact matches, timing lag, duplicates, bank fees, refunds, and unrecorded entries.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-blue-400 font-mono">
              <span>CLI & CSV ready</span>
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Security & Audit</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Strict input validation, bcrypt password hashing, append-only audit trail, and sandboxed draft action dispatcher.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-purple-400 font-mono">
              <span>Strict compliance</span>
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Quick Command Guide */}
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 font-mono text-xs text-slate-300">
          <div className="flex items-center space-x-2 text-slate-400 mb-3 uppercase tracking-wider font-semibold text-[11px]">
            <GitBranch className="w-4 h-4 text-emerald-400" />
            <span>Developer Seed Commands</span>
          </div>
          <div className="space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800/70 text-slate-300">
            <div><span className="text-emerald-400"># Direct Mongo seed (500 records):</span> npm run seed --prefix server</div>
            <div><span className="text-emerald-400"># Generate CSV exports:</span> node server/scripts/generateSeed.js --csv</div>
            <div><span className="text-emerald-400"># Start Express API:</span> npm run dev --prefix server</div>
            <div><span className="text-emerald-400"># Start React Vite Client:</span> npm run dev --prefix client</div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-6 text-center text-xs text-slate-500">
        ReconcileAI &bull; Razorpay AI Buildathon 2026 &bull; Track: AI Finance Controller
      </footer>
    </div>
  );
}
