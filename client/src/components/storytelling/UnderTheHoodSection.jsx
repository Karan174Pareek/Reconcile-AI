import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Cpu,
  CheckCircle2,
  ShieldCheck,
  Server,
  Database,
  Bot,
  Monitor,
  Code2,
  ArrowRight,
  Layers,
} from 'lucide-react';
import SystemArchitectureDiagram from './SystemArchitectureDiagram.jsx';

const TOPOLOGY_STEPS = [
  { step: '01', title: 'BANK / ERP CSV', desc: 'Raw Statements' },
  { step: '02', title: 'INGESTION + ZOD', desc: 'Schema Validation' },
  { step: '03', title: 'NORMALIZATION', desc: 'Token & Date Prep' },
  { step: '04', title: '3-TIER ENGINE', desc: 'L0 ⇄ L1 ⇄ L2 Match' },
  { step: '05', title: 'MULTI-PASS', desc: 'Exact & Fuzzy Cascade' },
  { step: '06', title: 'AI REASONING', desc: 'Claude Triage' },
  { step: '07', title: 'AUDIT LEDGER', desc: 'MongoDB Atlas' },
  { step: '08', title: 'AUDITOR REVIEW', desc: 'HITL Approval' },
];

export default function UnderTheHoodSection() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <section id="under-the-hood" className="space-y-6 pb-8">
      <div className="card-base p-6 sm:p-8 bg-white border border-slate-200 shadow-sm space-y-6">
        {/* Section Header & Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                05 • UNDER THE HOOD
              </span>
              <span className="text-xs font-mono text-slate-500">SYSTEM ARCHITECTURE & VERIFICATION</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1">
              System Architecture & Verification
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              For engineers, auditors, and technical evaluators who want full system visibility into how the application is engineered.
            </p>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-semibold flex items-center space-x-2 transition-all shadow-sm cursor-pointer self-start sm:self-auto shrink-0"
          >
            <Cpu className="h-4 w-4 text-purple-400" />
            <span>{isExpanded ? 'Hide Technical Details' : 'Show Technical Details'}</span>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </button>
        </div>

        {/* Collapsible Content Container */}
        {isExpanded && (
          <div className="space-y-6 pt-4 border-t border-slate-200 animate-fadeIn">
            {/* 1. Architecture Flow Topology */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-900 uppercase">
                  END-TO-END DATA & PIPELINE TOPOLOGY
                </span>
                <span className="text-[11px] font-mono text-slate-500">Data Lifecycle</span>
              </div>

              <div className="overflow-x-auto pb-2 custom-scrollbar">
                <div className="min-w-[840px] flex items-center justify-between gap-1.5 py-2 font-mono text-xs">
                  {TOPOLOGY_STEPS.map((node, idx) => (
                    <React.Fragment key={idx}>
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-center flex-1 min-w-[95px]">
                        <span className="text-[9px] text-purple-600 font-bold block">[{node.step}]</span>
                        <span className="font-bold text-slate-900 block text-[10px] mt-0.5">{node.title}</span>
                        <span className="text-[9px] text-slate-500 block mt-0.5 leading-tight">{node.desc}</span>
                      </div>

                      {idx < TOPOLOGY_STEPS.length - 1 && (
                        <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. Automated Test Suite Banner */}
            <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold text-emerald-950 font-mono block">
                    31 / 31 TESTS PASSING — VERIFIED CLEAN
                  </span>
                  <p className="text-emerald-800 text-[11px]">
                    Automated verification covers Zod ingestion schemas, 3-tier mathematical integrity, exact/fuzzy matching, Levenshtein similarity, and SHA-256 hash chaining.
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-md bg-emerald-600 text-white font-mono text-[10px] font-bold self-start sm:self-auto uppercase tracking-wider shrink-0">
                100% PASS RATE
              </span>
            </div>

            {/* 3. Full-Stack System Architecture Diagram */}
            <SystemArchitectureDiagram />


          </div>
        )}
      </div>
    </section>
  );
}
