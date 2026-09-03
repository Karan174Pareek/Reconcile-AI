import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  CheckCircle2,
  Sparkles,
  Bot,
  Filter,
  ArrowRight,
  ShieldCheck,
  Zap,
  Info,
} from 'lucide-react';

const PASSES = [
  {
    id: 'pass1',
    num: 'PASS 1',
    title: 'EXACT DETERMINISTIC MATCH',
    strategy: 'Exact Reference & Exact Amount (100% Confidence)',
    icon: CheckCircle2,
    color: 'emerald',
    desc: 'Matches records with identical normalized references and exact penny-matched amounts.',
    guarantee: 'Zero false positives, automated ledger clearance.',
    speed: '<1ms per record',
    criteria: 'Normalized UTR/Ref Match === TRUE && |AmountDiff| === 0.00',
  },
  {
    id: 'pass2',
    num: 'PASS 2',
    title: 'NORMALIZED FUZZY MATCH',
    strategy: 'Levenshtein & 3-Gram Similarity (≥ 0.85)',
    icon: Filter,
    color: 'blue',
    desc: 'Catches typos, formatting variations, and corporate suffixes within ±1.00 amount and ±3 days date tolerance.',
    guarantee: 'High-confidence matches with audit trail explanation.',
    speed: '~15ms per candidate',
    criteria: 'Similarity ≥ 0.85 && |AmountDiff| ≤ 1.00 && |DateDiff| ≤ 3 days',
  },
  {
    id: 'pass3',
    num: 'PASS 3',
    title: 'CLAUDE 3.5 SONNET BATCH REASONER',
    strategy: 'AI Forensic Contextual Analysis (10-Item Batches)',
    icon: Bot,
    color: 'amber',
    desc: 'Evaluates unexplained variances, categorizes fees (2% MDR, 18% GST), refunds, and timing lags with strict Zod validation.',
    guarantee: 'Generates plain-English forensic rationale and HITL draft actions.',
    speed: '~1.8s per 10-item batch',
    criteria: 'Unmatched Candidate Context (±10% amount, ±14 days window)',
  },
  {
    id: 'final',
    num: 'FINAL',
    title: 'IMMUTABLE POSTING & REVIEW',
    strategy: 'Append-Only Ledger & Auditor Approval Gate',
    icon: ShieldCheck,
    color: 'purple',
    desc: 'Reconciled matches are recorded in an append-only audit trail; unresolved items await human auditor approval.',
    guarantee: 'Auditor defense & tamper-resistant record keeping.',
    speed: 'Instantaneous persistence',
    criteria: '100% of transactions accounted for with mathematical integrity',
  },
];

export default function MultiPassTimeline() {
  const [selectedPassId, setSelectedPassId] = useState('pass1');

  const selectedPass = PASSES.find((p) => p.id === selectedPassId) || PASSES[0];

  return (
    <section id="multi-pass" className="space-y-6">
      <div className="card-base p-6 sm:p-8 bg-white border border-gray-200 shadow-sm space-y-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-gray-200">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                05 • MULTI-PASS PROCESSING
              </span>
              <span className="text-xs font-mono text-gray-500">3-TIER HEURISTIC CASCADE</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight mt-1">
              Multi-Pass Heuristic Timeline & Scoring Logic
            </h2>
          </div>

          <span className="text-xs font-mono text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 self-start sm:self-auto">
            Click pass to inspect matching criteria
          </span>
        </div>

        {/* Horizontal Timeline Ribbon */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PASSES.map((pass, idx) => {
            const Icon = pass.icon;
            const isSelected = selectedPassId === pass.id;
            return (
              <button
                key={pass.id}
                onClick={() => setSelectedPassId(pass.id)}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50/60 ring-2 ring-indigo-500/30 shadow-xs'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-indigo-600">
                      {pass.num}
                    </span>
                    <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                      {pass.speed}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 pt-1">
                    <div className={`p-1.5 rounded-lg border ${isSelected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <h4 className="text-xs font-bold text-gray-900 leading-tight">
                      {pass.title}
                    </h4>
                  </div>

                  <p className="text-[11px] text-gray-600 leading-relaxed line-clamp-2">
                    {pass.desc}
                  </p>
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] font-mono text-gray-400">
                  <span>Inspection</span>
                  <Info className="h-3 w-3 text-indigo-500" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Pass Deep Inspection Box */}
        <div className="p-5 rounded-xl bg-gray-50 border border-indigo-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-3">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-indigo-600 text-white">
                <selectedPass.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono font-bold text-indigo-700">{selectedPass.num}</span>
                  <span className="text-sm font-bold text-gray-900">{selectedPass.title}</span>
                </div>
                <p className="text-xs text-gray-600 mt-0.5">{selectedPass.strategy}</p>
              </div>
            </div>

            <span className="text-xs font-mono text-indigo-700 bg-white px-3 py-1.5 rounded-lg border border-indigo-200 font-bold self-start sm:self-auto">
              Execution Speed: {selectedPass.speed}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3 rounded-lg bg-white border border-gray-200 space-y-1">
              <span className="text-[10px] text-gray-500 uppercase font-semibold block">Algorithmic Criteria</span>
              <p className="text-gray-800">{selectedPass.criteria}</p>
            </div>
            <div className="p-3 rounded-lg bg-white border border-indigo-200 bg-indigo-50/30 space-y-1">
              <span className="text-[10px] text-indigo-700 uppercase font-semibold block">Audit Guarantee</span>
              <p className="text-gray-800">{selectedPass.guarantee}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
