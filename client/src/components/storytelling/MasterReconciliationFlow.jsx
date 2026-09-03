import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileSpreadsheet,
  FileCode2,
  Filter,
  Cpu,
  Scale,
  CheckCircle2,
  ArrowRight,
  Info,
  X,
} from 'lucide-react';

const MASTER_NODES = [
  {
    id: 'bank-input',
    num: '01',
    name: 'Bank & Ledger Input',
    stage: 'Ingestion',
    icon: FileSpreadsheet,
    desc: 'Bank Statement CSV (UTR, Credits) & ERP Sales Journal.',
    detail: 'Accepts raw CSV statements with automatic header detection and strict size limits (up to 25MB).',
    sample: 'Bank Statement: UTR99881122 | ₹488,200.00\nERP Sales: INV-9901..9950 | ₹500,000.00',
  },
  {
    id: 'parsing-layer',
    num: '02',
    name: 'Papa Parse & Types',
    stage: 'Validation',
    icon: FileCode2,
    desc: 'In-memory parsing and strict Zod schema type coercion.',
    detail: 'Parses raw buffers, validates line-by-line against Zod schemas, and flags row-level errors with row numbers.',
    sample: 'Coerces string numbers to floats, standardizes dates to UTC ISO-8601.',
  },
  {
    id: 'normalization-engine',
    num: '03',
    name: 'Normalization',
    stage: 'Cleaning',
    icon: Filter,
    desc: 'Strips noise tokens (Pvt Ltd, LLC) & generates 3-grams.',
    detail: 'Prepares candidate reference strings and amounts for exact hash lookups and fuzzy Levenshtein comparisons.',
    sample: 'Token: "CMS/RAZORPAY/SETTLEMENT_9921" → Clean Ref: "SETTLEMENT_9921"',
  },
  {
    id: 'match-core',
    num: '04',
    name: '3-Tier Matching',
    stage: 'Engine',
    icon: Cpu,
    desc: 'L0 Nodal Match ⇄ L1 Batch Integrity ⇄ L2 Order Unpack.',
    detail: 'Correlates bulk bank credits to payment gateway batch headers and unpacks constituent customer orders.',
    sample: 'L0: Exact UTR Match (100%)\nL1: Gross - MDR - GST = Net (Balanced)\nL2: 18% GST ITC Isolated',
  },
  {
    id: 'validation-layer',
    num: '05',
    name: 'Balance Validation',
    stage: 'Integrity',
    icon: Scale,
    desc: 'Penny-precision check & tolerance window gating.',
    detail: 'Verifies exact amount equality and ensures fuzzy candidate differences fall within ±1.00 and ±3 days.',
    sample: 'Gross ₹500k - MDR ₹10k - GST ₹1.8k === Net ₹488.2k [TRUE]',
  },
  {
    id: 'decision-fork',
    num: '06',
    name: 'Final Outcome',
    stage: 'Resolution',
    icon: CheckCircle2,
    desc: 'Auto-clears 90% matches; flags 10% variances for HITL.',
    detail: 'Fully reconciled records are posted to the ledger; unresolved variances trigger Claude AI diagnosis and draft actions.',
    sample: 'Matched Records: Posted to Append-Only Audit Log\nExceptions: Sent to HITL Review Desk',
  },
];

export default function MasterReconciliationFlow() {
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoveredNodeId, setHoveredNodeId] = useState(null);

  return (
    <section id="master-flow" className="space-y-6">
      <div className="card-base p-6 sm:p-8 bg-white border border-gray-200 shadow-sm space-y-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-gray-200">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                03 • MASTER RECONCILIATION FLOW
              </span>
              <span className="text-xs font-mono text-gray-500">COMPLETE LIFECYCLE CENTERPIECE</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight mt-1">
              End-to-End Autonomous Reconciliation Flow
            </h2>
          </div>

          <span className="text-xs font-mono text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 self-start sm:self-auto">
            Interactive Flowchart • Click node to inspect
          </span>
        </div>

        {/* Large Flowchart Canvas */}
        <div className="overflow-x-auto pb-4 custom-scrollbar">
          <div className="min-w-[1100px] flex items-stretch gap-2.5 py-2">
            {MASTER_NODES.map((node, idx) => {
              const Icon = node.icon;
              const isSelected = selectedNode?.id === node.id;
              const isHovered = hoveredNodeId === node.id;
              const isNextHovered = hoveredNodeId === MASTER_NODES[idx + 1]?.id;

              return (
                <React.Fragment key={node.id}>
                  {/* Master Node */}
                  <div
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    onClick={() => setSelectedNode(node)}
                    className={`flex-1 min-w-[160px] p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/70 ring-2 ring-blue-500/30 shadow-sm'
                        : isHovered
                        ? 'border-blue-300 bg-blue-50/40 shadow-xs'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-xs'
                    }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-blue-600">
                          [{node.num}]
                        </span>
                        <span className="text-[9px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200">
                          {node.stage}
                        </span>
                      </div>

                      <div className="pt-1">
                        <div className="inline-flex p-2 rounded-lg border mb-2 bg-gray-50 border-gray-200 text-gray-800">
                          <Icon className="h-4 w-4" />
                        </div>
                        <h4 className="text-xs font-bold text-gray-900 leading-snug">
                          {node.name}
                        </h4>
                      </div>

                      <p className="text-[11px] text-gray-600 leading-relaxed">
                        {node.desc}
                      </p>
                    </div>

                    <div className="mt-4 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[10px] font-mono text-gray-400">
                      <span>Inspect Details</span>
                      <Info className="h-3.5 w-3.5 text-blue-500" />
                    </div>
                  </div>

                  {/* Connecting Directional Arrow */}
                  {idx < MASTER_NODES.length - 1 && (
                    <div className="flex items-center justify-center px-1 text-gray-300">
                      <ArrowRight
                        className={`h-4 w-4 transition-colors ${
                          isHovered || isNextHovered
                            ? 'text-blue-600 stroke-[2.5] animate-pulse'
                            : 'text-gray-300'
                        }`}
                      />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Selected Master Node Detail Box */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-5 rounded-xl bg-gray-50 border border-blue-200 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-blue-600 text-white">
                    <selectedNode.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono font-bold text-blue-700">STAGE {selectedNode.num}</span>
                      <span className="text-sm font-bold text-gray-900">{selectedNode.name}</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5">{selectedNode.detail}</p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedNode(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-3 rounded-lg bg-white border border-gray-200 text-xs font-mono">
                <span className="text-[10px] text-gray-500 uppercase font-semibold block mb-1">
                  Representative Pipeline Transformation
                </span>
                <pre className="text-gray-800 whitespace-pre leading-relaxed">
                  {selectedNode.sample}
                </pre>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
