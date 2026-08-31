import React, { useState } from 'react';
import {
  GitMerge,
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Bot,
  UserCheck,
  Lock,
  ArrowRight,
  ArrowDown,
  Layers,
  Sparkles,
  FileCode2,
} from 'lucide-react';

const ESCALATION_STAGES = [
  {
    id: 'pass1',
    pass: 'PASS 1',
    name: 'EXACT DETERMINISTIC MATCH',
    badge: '100% CONFIDENCE',
    badgeColor: 'emerald',
    result: 'Automatic Clearance',
    resultDesc: 'Cleared instantly without human or AI overhead.',
    caseText: 'Exact UTR / settlement reference & exact amount match.',
    icon: CheckCircle2,
    details: [
      'Normalized reference match',
      'Exact net amount match',
      'Valid date window alignment',
    ],
  },
  {
    id: 'pass2',
    pass: 'PASS 2',
    name: 'CONTROLLED FUZZY MATCH',
    badge: 'HEURISTIC EVALUATION',
    badgeColor: 'blue',
    result: 'Candidate Match or Escalation',
    resultDesc: 'Flagged for review if confidence bounds are not met.',
    caseText: 'Reference formatting noise, vendor alias variations, timing lags.',
    icon: GitMerge,
    details: [
      'Levenshtein text similarity',
      'Merchant name normalization',
      'Amount tolerance (±₹1.00)',
      'Date tolerance (±3 days)',
    ],
  },
  {
    id: 'pass3',
    pass: 'PASS 3',
    name: 'AI EXCEPTION REASONING',
    badge: 'CLAUDE 3.5 SONNET',
    badgeColor: 'amber',
    result: 'Structured Diagnosis & Ticket',
    resultDesc: 'Diagnoses root cause & drafts HITL correction entries.',
    caseText: 'Unrecorded deposits, gateway MDR variances, refund deductions.',
    icon: Bot,
    details: [
      'MDR fee rate discrepancies',
      'GST Input Tax Credit isolation',
      'Refund & chargeback deductions',
      'Structured JSON schema validation',
    ],
  },
  {
    id: 'hitl',
    pass: 'FINAL GATE',
    name: 'HUMAN-IN-THE-LOOP (HITL)',
    badge: 'NO UNCERTAIN POSTING',
    badgeColor: 'purple',
    result: 'Auditor Approval Required',
    resultDesc: 'Nothing posts to the ledger without human sign-off.',
    caseText: 'Isolated in approval queue for one-click audit confirmation.',
    icon: UserCheck,
    details: [
      'Auditor review workstation',
      'Editable email & entry drafts',
      'Idempotent approval execution',
      'SHA-256 chained audit record',
    ],
  },
];

const EVENT_CHAIN_NODES = [
  { step: '01', title: 'INGEST', desc: 'Raw CSV Statements' },
  { step: '02', title: 'NORMALIZE', desc: 'Clean Tokens & Dates' },
  { step: '03', title: 'MATCH', desc: 'Level 0-2 Engine' },
  { step: '04', title: 'VERIFY', desc: 'Batch Math Integrity' },
  { step: '05', title: 'AI DIAGNOSIS', desc: 'Claude Exception Triage' },
  { step: '06', title: 'HUMAN APPROVAL', desc: 'HITL Sign-off Desk' },
  { step: '07', title: 'FINAL OUTCOME', desc: 'SHA-256 Ledger Post' },
];

export default function DecisionEngineSection() {
  const [selectedPassId, setSelectedPassId] = useState('pass1');

  const selectedPass = ESCALATION_STAGES.find((s) => s.id === selectedPassId) || ESCALATION_STAGES[0];

  return (
    <section id="decision-engine" className="space-y-6">
      <div className="card-base p-6 sm:p-8 bg-white border border-gray-200 shadow-sm space-y-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-gray-200">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                04 • DECISION ENGINE
              </span>
              <span className="text-xs font-mono text-gray-500">MULTI-PASS RECONCILIATION & EXCEPTION LOGIC</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight mt-1">
              How ReconcileAI Decides What Gets Cleared
            </h2>
            <p className="text-xs text-gray-600 mt-1 max-w-3xl leading-relaxed">
              Every transaction passes through a deterministic-to-AI escalation cascade. Simple matches are cleared automatically; uncertain cases are progressively analyzed rather than blindly posted.
            </p>
          </div>

          <span className="text-xs font-mono text-purple-700 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-200 font-bold self-start sm:self-auto shrink-0">
            Escalation Cascade
          </span>
        </div>

        {/* Escalation Cascade Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {ESCALATION_STAGES.map((stage, idx) => {
            const Icon = stage.icon;
            const isSelected = selectedPassId === stage.id;
            return (
              <div
                key={stage.id}
                onClick={() => setSelectedPassId(stage.id)}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden ${
                  isSelected
                    ? 'border-purple-500 bg-purple-50/50 ring-2 ring-purple-500/30 shadow-xs'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                {/* Visual connecting indicator for cascade */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-purple-700">
                      {stage.pass}
                    </span>
                    <span
                      className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${
                        stage.badgeColor === 'emerald'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : stage.badgeColor === 'blue'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : stage.badgeColor === 'amber'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-purple-50 text-purple-700 border-purple-200'
                      }`}
                    >
                      {stage.badge}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <div className={`p-1.5 rounded-lg border ${isSelected ? 'bg-purple-600 text-white border-purple-600' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <h4 className="text-xs font-bold text-gray-900 leading-tight">
                        {stage.name}
                      </h4>
                    </div>
                    <p className="text-[11px] text-gray-600 mt-2 leading-relaxed">
                      {stage.caseText}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-gray-500">Result:</span>
                  <span className="font-bold text-gray-900">{stage.result}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Pass Inspection Panel */}
        <div className="p-5 rounded-xl bg-gray-50 border border-purple-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-3">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-purple-600 text-white">
                <selectedPass.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono font-bold text-purple-700">{selectedPass.pass}</span>
                  <h4 className="text-sm font-bold text-gray-900">{selectedPass.name}</h4>
                </div>
                <p className="text-xs text-gray-600 mt-0.5">{selectedPass.resultDesc}</p>
              </div>
            </div>

            <div className="text-xs font-mono px-3 py-1.5 rounded-lg bg-white border border-purple-200 text-purple-800 font-bold self-start sm:self-auto">
              Result: {selectedPass.result}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs font-mono">
            {selectedPass.details.map((detail, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-white border border-gray-200 flex items-center space-x-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                <span className="text-gray-800 font-sans text-[11px]">{detail}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Human-in-the-Loop Safety Gate Callout */}
        <div className="p-5 rounded-xl bg-purple-50/60 border border-purple-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-purple-900 text-purple-100">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-purple-700">HUMAN-IN-THE-LOOP SAFETY GATE</span>
                <h4 className="text-sm font-bold text-gray-900">NO UNCERTAIN POSTING GUARANTEE</h4>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-purple-800 bg-white px-3 py-1.5 rounded-lg border border-purple-200 self-start sm:self-auto">
              Auditor Approval Required
            </span>
          </div>

          <p className="text-xs text-gray-700 leading-relaxed">
            Exceptions remain isolated until an auditor reviews the evidence and approves or rejects the proposed resolution. No AI output ever posts directly to financial books without human verification.
          </p>

          {/* HITL Flow Diagram */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs font-mono">
            <div className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-800 font-bold">
              AI PROPOSAL
            </div>
            <ArrowRight className="h-4 w-4 text-purple-400" />
            <div className="px-3 py-1.5 rounded-lg bg-purple-100 border border-purple-300 text-purple-900 font-bold">
              AUDITOR REVIEW
            </div>
            <ArrowRight className="h-4 w-4 text-purple-400" />
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1.5 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-900 font-bold">
                APPROVE → FINALIZE
              </span>
              <span className="text-gray-400">/</span>
              <span className="px-3 py-1.5 rounded-lg bg-rose-100 border border-rose-300 text-rose-900 font-bold">
                REJECT → UNRESOLVED
              </span>
            </div>
          </div>
        </div>

        {/* Reconciliation Event Chain */}
        <div className="space-y-4 pt-2 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                AUDIT EVENT CHAIN
              </span>
              <h3 className="text-base font-bold text-gray-900 mt-1">
                End-to-End Reconciliation Event Chain
              </h3>
            </div>
            <span className="text-xs font-mono text-gray-500">
              Cryptographically Linked Ledger Operations
            </span>
          </div>

          {/* Connected Event Nodes */}
          <div className="overflow-x-auto pb-2 custom-scrollbar">
            <div className="min-w-[780px] flex items-center justify-between gap-2 py-2 font-mono text-xs">
              {EVENT_CHAIN_NODES.map((node, idx) => (
                <React.Fragment key={idx}>
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-center flex-1 min-w-[100px]">
                    <span className="text-[9px] text-blue-600 font-bold block">[{node.step}]</span>
                    <span className="font-bold text-gray-900 block text-[11px] mt-0.5">{node.title}</span>
                    <span className="text-[9px] text-gray-500 block mt-0.5 leading-tight">{node.desc}</span>
                  </div>

                  {idx < EVENT_CHAIN_NODES.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-gray-400 shrink-0" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* SHA-256 Audit Trail Explainer */}
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 flex items-start space-x-3 text-xs">
            <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-gray-900 font-mono block">
                SHA-256 CHAINED AUDIT TRAIL
              </span>
              <p className="text-gray-600 mt-0.5 leading-relaxed">
                Every material reconciliation event is recorded as an append-only audit event, allowing the final outcome to be traced through the reconciliation process. Database pre-save hooks strictly prevent update and delete mutations on audit records.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
