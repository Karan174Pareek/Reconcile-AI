import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileSpreadsheet,
  FileCode2,
  Filter,
  Layers,
  Scale,
  Receipt,
  Bot,
  ShieldCheck,
  ArrowRight,
  X,
  Info,
} from 'lucide-react';

const STAGES = [
  {
    id: 'ingestion',
    step: '01',
    name: 'Data Ingestion',
    category: 'Input Layer',
    icon: FileSpreadsheet,
    desc: 'Ingests Bank Statements & General Ledger CSVs.',
    status: 'ONLINE',
    detail: 'Accepts raw CSV statements with automatic header detection and strict size limits (up to 25MB).',
    inputSchema: '{ date, amount, utr_ref, narration, invoice_ref, payee }',
    outputSchema: 'In-Memory Stream Buffer',
  },
  {
    id: 'parsing',
    step: '02',
    name: 'Strict Parsing',
    category: 'Validation',
    icon: FileCode2,
    desc: 'PapaParse in-memory parser with strict Zod schema validation.',
    status: 'ACTIVE',
    detail: 'Parses raw buffers, validates line-by-line against Zod schemas, flags row-level errors with exact row numbers and fields.',
    inputSchema: 'Raw CSV Buffer',
    outputSchema: 'Validated BankRecord & LedgerRecord Documents',
  },
  {
    id: 'normalization',
    step: '03',
    name: 'Normalization',
    category: 'Cleaning',
    icon: Filter,
    desc: 'Standardizes dates, currencies, and strips corporate noise tokens.',
    status: 'ACTIVE',
    detail: 'Normalizes company suffixes (Pvt Ltd, LLC, Corp) and creates character 3-grams for fuzzy matching.',
    inputSchema: 'Raw entity strings & varied date formats',
    outputSchema: 'Normalized tokens & standardized ISO dates',
  },
  {
    id: 'level0',
    step: '04',
    name: 'Level 0 Match',
    category: 'Bank Match',
    icon: Layers,
    desc: 'Correlates bulk bank credits to payment gateway batch headers via UTR.',
    status: 'EXACT',
    detail: 'Matches nodal bank deposits to settlement batch headers using exact UTR reference number and net settlement amount.',
    inputSchema: 'Bank Credit Record (Amount, UTR)',
    outputSchema: 'Linked Settlement Batch Header (Status: L0_MATCHED)',
  },
  {
    id: 'level1',
    step: '05',
    name: 'Level 1 Integrity',
    category: 'Batch Check',
    icon: Scale,
    desc: 'Validates formula: Gross - MDR - GST === Net Payout.',
    status: 'BALANCED',
    detail: 'Explodes the settlement batch into individual orders, testing the balance equation to the penny and flagging imbalances.',
    inputSchema: 'Settlement Batch Header',
    outputSchema: 'Balanced Batch Flag or Imbalance Exception',
  },
  {
    id: 'level2',
    step: '06',
    name: 'Level 2 Unpack',
    category: 'Tax Isolation',
    icon: Receipt,
    desc: 'Matches order line items & isolates 18% GST Input Tax Credit.',
    status: 'ITC ELIGIBLE',
    detail: 'Unpacks individual customer orders against the ERP sales ledger. Automatically separates claimable 18% GST Input Tax Credit (ITC).',
    inputSchema: 'Gateway Line Items ⇄ ERP Orders',
    outputSchema: 'Reconciled Sales Journal & Claimable ITC Ledger',
  },
  {
    id: 'exceptions',
    step: '07',
    name: 'AI Triage',
    category: 'Reasoning',
    icon: Bot,
    desc: 'Claude 3.5 Sonnet diagnoses variances and drafts human actions.',
    status: '10-ITEM BATCH',
    detail: 'When deterministic matching fails, Claude classifies the variance (timing difference, gateway fee, refund) and drafts journal entries.',
    inputSchema: 'Unmatched Candidate Context (±10% amount, ±14 days)',
    outputSchema: 'Categorized Exception & HITL Draft Action Ticket',
  },
  {
    id: 'audit',
    step: '08',
    name: 'Audit Trail',
    category: 'Governance',
    icon: ShieldCheck,
    desc: 'Immutable append-only SHA-256 chained audit log.',
    status: 'IMMUTABLE',
    detail: 'Every pass execution, tool invocation, and human approval is chained to an SHA-256 hash ledger with update/delete pre-hooks.',
    inputSchema: 'Executed System/User Action',
    outputSchema: 'SHA-256 Chained Audit Event',
  },
];

export default function HowItWorksFlowchart() {
  const [selectedStage, setSelectedStage] = useState(null);
  const [hoveredStageId, setHoveredStageId] = useState(null);

  return (
    <section id="how-it-works" className="space-y-6">
      <div className="card-base p-6 sm:p-8 bg-white border border-gray-200 shadow-sm space-y-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-gray-200">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                02 • PIPELINE FLOWCHART
              </span>
              <span className="text-xs font-mono text-gray-500">END-TO-END EXECUTION MAP</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight mt-1">
              How ReconcileAI Processes & Matches Transactions
            </h2>
          </div>

          <span className="text-xs font-mono text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 self-start sm:self-auto">
            Click any node for technical inspection
          </span>
        </div>

        {/* Interactive Horizontal Flowchart (Scrollable with ample breathing room) */}
        <div className="overflow-x-auto pb-4 custom-scrollbar">
          <div className="min-w-[1320px] flex items-stretch gap-2.5 py-2">
            {STAGES.map((stage, idx) => {
              const Icon = stage.icon;
              const isSelected = selectedStage?.id === stage.id;
              const isHovered = hoveredStageId === stage.id;
              const isNextHovered = hoveredStageId === STAGES[idx + 1]?.id;

              return (
                <React.Fragment key={stage.id}>
                  {/* Stage Node */}
                  <div
                    onMouseEnter={() => setHoveredStageId(stage.id)}
                    onMouseLeave={() => setHoveredStageId(null)}
                    onClick={() => setSelectedStage(stage)}
                    className={`flex-1 min-w-[155px] p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/70 ring-2 ring-blue-500/30 shadow-sm'
                        : isHovered
                        ? 'border-blue-300 bg-blue-50/30 shadow-xs'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-xs'
                    }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-blue-600">
                          [{stage.step}]
                        </span>
                        <span className="text-[9px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200">
                          {stage.status}
                        </span>
                      </div>

                      <div className="pt-1">
                        <div className="inline-flex p-2 rounded-lg border mb-2 bg-gray-50 border-gray-200 text-gray-800">
                          <Icon className="h-4 w-4" />
                        </div>
                        <h4 className="text-xs font-bold text-gray-900 leading-snug">
                          {stage.name}
                        </h4>
                      </div>

                      <p className="text-[11px] text-gray-600 leading-relaxed">
                        {stage.desc}
                      </p>
                    </div>

                    <div className="mt-4 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[10px] font-mono text-gray-400">
                      <span className="uppercase">{stage.category}</span>
                      <Info className="h-3.5 w-3.5 text-blue-500" />
                    </div>
                  </div>

                  {/* Connecting Arrow */}
                  {idx < STAGES.length - 1 && (
                    <div className="flex items-center justify-center px-0.5 text-gray-300">
                      <ArrowRight className={`h-4 w-4 transition-colors ${isHovered || isNextHovered ? 'text-blue-600 stroke-[2.5]' : ''}`} />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Selected Stage Detail Drawer / Panel */}
        <AnimatePresence>
          {selectedStage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-5 rounded-xl bg-gray-50 border border-blue-200 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-blue-600 text-white">
                    <selectedStage.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono font-bold text-blue-700">STAGE {selectedStage.step}</span>
                      <span className="text-sm font-bold text-gray-900">{selectedStage.name}</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5">{selectedStage.detail}</p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedStage(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded-lg bg-white border border-gray-200 space-y-1">
                  <span className="text-[10px] text-gray-500 uppercase font-semibold block">Input Schema Payload</span>
                  <p className="text-gray-800">{selectedStage.inputSchema}</p>
                </div>
                <div className="p-3 rounded-lg bg-white border border-gray-200 space-y-1">
                  <span className="text-[10px] text-emerald-700 uppercase font-semibold block">Guaranteed Output Artifact</span>
                  <p className="text-gray-800">{selectedStage.outputSchema}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
