import React from 'react';
import {
  CheckCircle2,
  Clock,
  Loader2,
  Terminal,
  Play,
  Sparkles,
} from 'lucide-react';

export default function LiveProgressStepper({
  run,
  liveProgress,
  liveEvents = [],
  onExecuteFullPipeline,
  isExecuting,
}) {
  const status = run?.status || 'pending';
  const pass1Count = run?.pass1_matched || 0;
  const pass2Count = run?.pass2_matched || 0;
  const pass3Count = run?.pass3_matched || 0;

  // Determine stage states
  const isPass1Done = pass1Count > 0 || status === 'complete';
  const isPass2Done = pass2Count > 0 || (isPass1Done && status === 'complete');
  const isPass3Done = status === 'complete';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
      {/* Header & Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-semibold text-white">Reconciliation Pipeline Execution</h3>
            <span
              className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border ${
                status === 'complete'
                  ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400'
                  : status === 'running'
                  ? 'bg-blue-950/60 border-blue-800 text-blue-400 animate-pulse'
                  : 'bg-slate-800 border-slate-700 text-slate-300'
              }`}
            >
              {status}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time Socket.io streaming across Deterministic, Fuzzy, and Claude AI Reasoner passes
          </p>
        </div>

        <button
          onClick={onExecuteFullPipeline}
          disabled={isExecuting || status === 'running'}
          className="flex items-center justify-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-500 hover:to-emerald-500 text-white text-xs font-semibold shadow-lg shadow-brand-600/20 transition-all disabled:opacity-50"
        >
          {isExecuting || status === 'running' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Running Pipeline...</span>
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Execute All Passes (1 → 2 → 3)</span>
            </>
          )}
        </button>
      </div>

      {/* 3-Pass Stepper Visualizer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pass 1: Exact */}
        <div
          className={`p-4 rounded-xl border transition-all ${
            isPass1Done
              ? 'bg-emerald-950/20 border-emerald-800/60'
              : status === 'running'
              ? 'bg-slate-850 border-brand-500/50 ring-1 ring-brand-500/20'
              : 'bg-slate-850/50 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-emerald-400">
              Pass 1: Deterministic
            </span>
            {isPass1Done ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            ) : status === 'running' ? (
              <Loader2 className="h-4 w-4 text-brand-400 animate-spin" />
            ) : (
              <Clock className="h-4 w-4 text-slate-500" />
            )}
          </div>
          <h4 className="text-xs font-semibold text-slate-200 mt-1">Exact Key Match</h4>
          <p className="text-[11px] text-slate-400 mt-0.5">UTR / Invoice Ref equality & exact amounts</p>
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
            <span className="text-slate-400">Matches:</span>
            <span className="font-bold text-emerald-400">{pass1Count}</span>
          </div>
        </div>

        {/* Pass 2: Fuzzy */}
        <div
          className={`p-4 rounded-xl border transition-all ${
            isPass2Done
              ? 'bg-blue-950/20 border-blue-800/60'
              : status === 'running' && isPass1Done
              ? 'bg-slate-850 border-blue-500/50 ring-1 ring-blue-500/20'
              : 'bg-slate-850/50 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-blue-400">
              Pass 2: Heuristics
            </span>
            {isPass2Done ? (
              <CheckCircle2 className="h-4 w-4 text-blue-400" />
            ) : status === 'running' && isPass1Done ? (
              <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
            ) : (
              <Clock className="h-4 w-4 text-slate-500" />
            )}
          </div>
          <h4 className="text-xs font-semibold text-slate-200 mt-1">Fuzzy & Timing Lag</h4>
          <p className="text-[11px] text-slate-400 mt-0.5">3-gram similarity, +/- 3d window, +/- 1.00</p>
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
            <span className="text-slate-400">Matches:</span>
            <span className="font-bold text-blue-400">{pass2Count}</span>
          </div>
        </div>

        {/* Pass 3: Claude AI */}
        <div
          className={`p-4 rounded-xl border transition-all ${
            isPass3Done
              ? 'bg-purple-950/20 border-purple-800/60'
              : status === 'running' && isPass2Done
              ? 'bg-slate-850 border-purple-500/50 ring-1 ring-purple-500/20'
              : 'bg-slate-850/50 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-purple-400 flex items-center space-x-1">
              <Sparkles className="h-3 w-3" />
              <span>Pass 3: Claude AI</span>
            </span>
            {isPass3Done ? (
              <CheckCircle2 className="h-4 w-4 text-purple-400" />
            ) : status === 'running' && isPass2Done ? (
              <Loader2 className="h-4 w-4 text-purple-400 animate-spin" />
            ) : (
              <Clock className="h-4 w-4 text-slate-500" />
            )}
          </div>
          <h4 className="text-xs font-semibold text-slate-200 mt-1">Exception Reasoning</h4>
          <p className="text-[11px] text-slate-400 mt-0.5">Tier-3 diagnosis & remediation draft actions</p>
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
            <span className="text-slate-400">AI Matches:</span>
            <span className="font-bold text-purple-400">{pass3Count}</span>
          </div>
        </div>
      </div>

      {/* Real-time Socket Event Log Console */}
      <div className="rounded-xl bg-black/50 border border-slate-800/90 p-3.5 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <div className="flex items-center space-x-1.5">
            <Terminal className="h-3.5 w-3.5 text-brand-400" />
            <span>Live WebSocket Activity Stream</span>
          </div>
          {liveProgress?.percentage !== undefined && (
            <span className="text-brand-400 font-semibold">{liveProgress.percentage}% Complete</span>
          )}
        </div>

        <div className="max-h-28 overflow-y-auto font-mono text-[11px] space-y-1 text-slate-300">
          {liveEvents.length === 0 ? (
            <div className="text-slate-500 italic">Waiting for pipeline trigger or socket stream...</div>
          ) : (
            liveEvents.map((evt) => (
              <div key={evt.id} className="flex items-start space-x-2">
                <span className="text-slate-500 text-[10px] shrink-0">
                  {new Date(evt.timestamp).toLocaleTimeString()}
                </span>
                <span
                  className={
                    evt.type === 'error'
                      ? 'text-rose-400'
                      : evt.type === 'complete'
                      ? 'text-emerald-400 font-semibold'
                      : 'text-slate-300'
                  }
                >
                  {evt.message}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
