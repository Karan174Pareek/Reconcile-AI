import React from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Clock,
  Loader2,
  Terminal,
  Play,
  Sparkles,
  ShieldCheck,
  Layers,
  ArrowRight,
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

  const level0Matched = run?.level0_matched ?? (pass1Count > 0 ? 1 : 0);
  const level0Total = run?.level0_total ?? (run?.total_records ? Math.ceil(run.total_records / 30) : 0);
  const level1Balanced = run?.level1_balanced ?? 0;
  const level1Flagged = run?.level1_flagged ?? 0;
  const level2Reconciled = (run?.level2_matched || pass1Count || 0) + pass3Count;

  const isLevel0Done = level0Matched > 0 || pass1Count > 0 || status === 'complete';
  const isLevel1Done = (level1Balanced > 0 || level1Flagged > 0 || pass1Count > 0) && isLevel0Done;
  const isLevel2Done = status === 'complete';

  const stages = [
    {
      level: 'Step 1',
      title: 'Match Bank Deposits',
      desc: 'Correlates nodal bank credits to Razorpay batch headers using UTR and net settlement amounts.',
      icon: Layers,
      isDone: isLevel0Done,
      isActive: (isExecuting || status === 'running') && !isLevel0Done,
      statsText: isLevel0Done
        ? level0Total > 0
          ? `${level0Matched} / ${level0Total} Matched (${Math.round((level0Matched / level0Total) * 100)}%)`
          : `${level0Matched} Matched`
        : 'Waiting to run',
    },
    {
      level: 'Step 2',
      title: 'Verify Batch Integrity',
      desc: 'Verifies the sum of individual order payments matches the bank credit within ₹0.05, flagging any imbalances.',
      icon: ShieldCheck,
      isDone: isLevel1Done,
      isActive: (isExecuting || status === 'running') && isLevel0Done && !isLevel1Done,
      statsText: isLevel1Done
        ? `${level1Balanced} Batches Balanced (${level1Flagged} Flagged)`
        : 'Waiting to run',
    },
    {
      level: 'Step 3',
      title: 'Unpack Orders & Tax Credits',
      desc: 'Matches individual order line items, isolates 2% gateway MDR fees, and computes 18% claimable GST Input Tax Credits.',
      icon: Sparkles,
      isDone: isLevel2Done,
      isActive: (isExecuting || status === 'running') && isLevel1Done && !isLevel2Done,
      statsText: isLevel2Done
        ? `${level2Reconciled} / ${run?.total_records || level2Reconciled} Orders Reconciled (${run?.match_rate || 0}%)`
        : 'Waiting to run',
    },
  ];

  return (
    <div className="card-base p-5 sm:p-6 bg-white border border-gray-200 space-y-5 shadow-sm">
      {/* Header & Primary Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <div className="flex items-center space-x-2.5">
            <h3 className="text-base font-semibold text-gray-900 tracking-tight">
              Automated 3-Tier Reconciliation Pipeline
            </h3>
            <span
              className={`text-[11px] font-mono font-semibold uppercase px-2.5 py-0.5 rounded-full border ${
                status === 'complete'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : status === 'running'
                  ? 'bg-amber-50 border-amber-200 text-amber-700 animate-pulse'
                  : 'bg-gray-100 border-gray-200 text-gray-600'
              }`}
            >
              {status}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Reconciles bank credits, verifies batch arithmetic, and unpacks individual order receipts automatically
          </p>
        </div>

        <button
          onClick={onExecuteFullPipeline}
          disabled={isExecuting || status === 'running'}
          className="btn-primary text-xs py-2 px-4 shadow-sm"
        >
          {isExecuting || status === 'running' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-white" />
              <span>Processing Reconciliation...</span>
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5 fill-current text-white" />
              <span>Run Full Reconciliation</span>
            </>
          )}
        </button>
      </div>

      {/* 3 Step Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {stages.map((stage, idx) => {
          const Icon = stage.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`rounded-xl p-4 border transition-all ${
                stage.isDone
                  ? 'bg-emerald-50/50 border-emerald-200'
                  : stage.isActive
                  ? 'bg-blue-50/60 border-blue-300 ring-2 ring-blue-100'
                  : 'bg-gray-50/50 border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-600">
                  {stage.level}
                </span>
                {stage.isDone ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : stage.isActive ? (
                  <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                ) : (
                  <Clock className="h-4 w-4 text-gray-400" />
                )}
              </div>

              <h4 className="text-xs font-semibold text-gray-900 mt-2">{stage.title}</h4>
              <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                {stage.desc}
              </p>

              <div className="mt-3 pt-2.5 border-t border-gray-200/80 flex items-center justify-between text-[11px]">
                <span className="text-gray-400">Status</span>
                <span className={stage.isDone ? 'text-emerald-700 font-semibold font-mono' : 'text-gray-600 font-mono'}>
                  {stage.statsText}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Real-time Activity Stream */}
      {liveEvents.length > 0 && (
        <div className="rounded-lg bg-gray-900 border border-gray-800 p-3.5 font-mono text-[11px] space-y-1.5 max-h-36 overflow-y-auto text-gray-300">
          <div className="flex items-center space-x-1.5 text-gray-400 pb-1.5 border-b border-gray-800 text-[10px] uppercase font-semibold">
            <Terminal className="h-3.5 w-3.5 text-blue-400" />
            <span>Live Engine Activity Log</span>
          </div>
          {liveEvents.slice(-6).map((ev, i) => (
            <div key={i} className="flex items-start space-x-2 text-gray-300 leading-snug">
              <span className="text-gray-500 text-[10px] shrink-0">[{new Date(ev.timestamp || Date.now()).toLocaleTimeString()}]</span>
              <span className="text-blue-400 font-bold shrink-0">»</span>
              <span className="text-gray-100">{ev.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
