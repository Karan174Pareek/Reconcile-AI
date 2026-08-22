import React from 'react';
import { motion } from 'framer-motion';
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
    <div className="glass-panel rounded-2xl p-5 shadow-glass space-y-5">
      {/* Header & Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-white/10">
        <div>
          <div className="flex items-center space-x-2.5">
            <h3 className="text-sm font-semibold text-text-primary tracking-tight">Reconciliation Pipeline Execution</h3>
            <span
              className={`text-[10px] font-mono font-semibold uppercase px-2.5 py-0.5 rounded-full border ${
                status === 'complete'
                  ? 'bg-teal-950/60 border-teal-500/30 text-teal-400'
                  : status === 'running'
                  ? 'bg-amber-950/60 border-amber-500/30 text-amber-400 animate-pulse'
                  : 'bg-white/5 border-white/10 text-text-secondary'
              }`}
            >
              {status}
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            Real-time Socket.io streaming across Deterministic, Fuzzy, and Claude AI Reasoner passes
          </p>
        </div>

        <button
          onClick={onExecuteFullPipeline}
          disabled={isExecuting || status === 'running'}
          className="flex items-center justify-center space-x-2 px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-navy-950 text-xs font-semibold shadow-glow-teal transition-all active:scale-98 disabled:opacity-50"
        >
          {isExecuting || status === 'running' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-navy-950" />
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

      {/* 3-Pass Stepper Visualizer with Fluid Transitions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Pass 1: Exact */}
        <motion.div
          animate={{
            borderColor: isPass1Done ? 'rgba(45, 212, 168, 0.4)' : status === 'running' ? 'rgba(232, 169, 74, 0.4)' : 'rgba(255, 255, 255, 0.08)',
            backgroundColor: isPass1Done ? 'rgba(45, 212, 168, 0.04)' : 'rgba(255, 255, 255, 0.02)',
          }}
          transition={{ duration: 0.4 }}
          className="p-4 rounded-xl border relative overflow-hidden backdrop-blur-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-teal-400">
              Pass 1: Deterministic
            </span>
            {isPass1Done ? (
              <CheckCircle2 className="h-4 w-4 text-teal-400" />
            ) : status === 'running' ? (
              <Loader2 className="h-4 w-4 text-teal-400 animate-spin" />
            ) : (
              <Clock className="h-4 w-4 text-text-muted" />
            )}
          </div>
          <h4 className="text-xs font-semibold text-text-primary mt-1.5">Exact Key Match</h4>
          <p className="text-[11px] text-text-secondary mt-0.5">UTR / Invoice Ref equality & exact amounts</p>
          <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-mono">
            <span className="text-text-secondary">Matches:</span>
            <span className="font-bold text-teal-400">{pass1Count}</span>
          </div>
        </motion.div>

        {/* Pass 2: Fuzzy */}
        <motion.div
          animate={{
            borderColor: isPass2Done ? 'rgba(45, 212, 168, 0.4)' : status === 'running' && isPass1Done ? 'rgba(232, 169, 74, 0.4)' : 'rgba(255, 255, 255, 0.08)',
            backgroundColor: isPass2Done ? 'rgba(45, 212, 168, 0.04)' : 'rgba(255, 255, 255, 0.02)',
          }}
          transition={{ duration: 0.4 }}
          className="p-4 rounded-xl border relative overflow-hidden backdrop-blur-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-teal-400">
              Pass 2: Heuristics
            </span>
            {isPass2Done ? (
              <CheckCircle2 className="h-4 w-4 text-teal-400" />
            ) : status === 'running' && isPass1Done ? (
              <Loader2 className="h-4 w-4 text-amber-400 animate-spin" />
            ) : (
              <Clock className="h-4 w-4 text-text-muted" />
            )}
          </div>
          <h4 className="text-xs font-semibold text-text-primary mt-1.5">Fuzzy & Timing Lag</h4>
          <p className="text-[11px] text-text-secondary mt-0.5">3-gram similarity, +/- 3d window, +/- 1.00</p>
          <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-mono">
            <span className="text-text-secondary">Matches:</span>
            <span className="font-bold text-teal-400">{pass2Count}</span>
          </div>
        </motion.div>

        {/* Pass 3: Claude AI */}
        <motion.div
          animate={{
            borderColor: isPass3Done ? 'rgba(232, 169, 74, 0.4)' : status === 'running' && isPass2Done ? 'rgba(232, 169, 74, 0.4)' : 'rgba(255, 255, 255, 0.08)',
            backgroundColor: isPass3Done ? 'rgba(232, 169, 74, 0.04)' : 'rgba(255, 255, 255, 0.02)',
          }}
          transition={{ duration: 0.4 }}
          className="p-4 rounded-xl border relative overflow-hidden backdrop-blur-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-amber-400 flex items-center space-x-1">
              <Sparkles className="h-3 w-3" />
              <span>Pass 3: Claude AI</span>
            </span>
            {isPass3Done ? (
              <CheckCircle2 className="h-4 w-4 text-amber-400" />
            ) : status === 'running' && isPass2Done ? (
              <Loader2 className="h-4 w-4 text-amber-400 animate-spin" />
            ) : (
              <Clock className="h-4 w-4 text-text-muted" />
            )}
          </div>
          <h4 className="text-xs font-semibold text-text-primary mt-1.5">Exception Reasoning</h4>
          <p className="text-[11px] text-text-secondary mt-0.5">Tier-3 diagnosis & remediation draft actions</p>
          <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-mono">
            <span className="text-text-secondary">AI Matches:</span>
            <span className="font-bold text-amber-400">{pass3Count}</span>
          </div>
        </motion.div>
      </div>

      {/* Real-time Socket Event Log Console */}
      <div className="rounded-xl bg-navy-950/90 border border-white/10 p-3.5 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-text-secondary font-mono">
          <div className="flex items-center space-x-1.5">
            <Terminal className="h-3.5 w-3.5 text-teal-400" />
            <span>Live WebSocket Activity Stream</span>
          </div>
          {liveProgress?.percentage !== undefined && (
            <span className="text-teal-400 font-semibold">{liveProgress.percentage}% Complete</span>
          )}
        </div>

        <div className="max-h-28 overflow-y-auto font-mono text-[11px] space-y-1 text-text-primary/90">
          {liveEvents.length === 0 ? (
            <div className="text-text-muted italic">Waiting for pipeline trigger or socket stream...</div>
          ) : (
            liveEvents.map((evt) => (
              <div key={evt.id} className="flex items-start space-x-2">
                <span className="text-text-muted text-[10px] shrink-0">
                  {new Date(evt.timestamp).toLocaleTimeString()}
                </span>
                <span
                  className={
                    evt.type === 'error'
                      ? 'text-coral-400 font-medium'
                      : evt.type === 'complete'
                      ? 'text-teal-400 font-semibold'
                      : 'text-text-secondary'
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
