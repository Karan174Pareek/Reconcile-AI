import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Monitor,
  Server,
  Layers,
  Bot,
  Database,
  ShieldCheck,
  Zap,
  ArrowDown,
  ArrowRight,
  CheckCircle2,
  Lock,
  Cpu,
} from 'lucide-react';

const ARCHITECTURE_NODES = [
  {
    id: 'client',
    title: 'Auditor Web Client',
    subtitle: 'React 18 • Vite • Tailwind • Socket.io',
    icon: Monitor,
    color: 'blue',
    tags: ['SPA', 'Optimistic UI', 'Real-Time Sync'],
    details: 'Single Page Application with live execution stepper, exception triage workstation, and HITL action approval desk.',
    telemetry: 'Latency: <15ms render time',
  },
  {
    id: 'api',
    title: 'API & Gateway Layer',
    subtitle: 'Vercel Serverless • Express REST • Multer',
    icon: Server,
    color: 'cyan',
    tags: ['Zod Validation', 'Rate Limiter', 'Streaming SSE'],
    details: 'Handles in-memory CSV uploads, Zod schema validation, WebSocket progress events, and REST endpoints.',
    telemetry: 'Throughput: Up to 25MB CSV streams',
  },
  {
    id: 'engine',
    title: '3-Tier Settlement Engine',
    subtitle: 'L0 Deposit ⇄ L1 Batch ⇄ L2 Order Unpacking',
    icon: Layers,
    color: 'emerald',
    tags: ['Deterministic Match', 'MDR Fee 2%', '18% GST ITC'],
    details: 'Performs multi-level reconciliation: Level 0 UTR deposit match, Level 1 batch mathematical integrity check, Level 2 order line-item unpacking.',
    telemetry: 'Performance: ~500 records in <2.4s',
  },
  {
    id: 'ai',
    title: 'Claude 3.5 Sonnet Reasoner',
    subtitle: 'Anthropic Contextual AI Engine',
    icon: Bot,
    color: 'amber',
    tags: ['Batch Reasoning (10)', 'Tool Calling', 'Zod Output'],
    details: 'Diagnoses complex timing lags, unrecorded deposits, and gateway fees with strict JSON output schemas.',
    telemetry: 'Reliability: Auto-corrective prompt retry',
  },
  {
    id: 'db',
    title: 'MongoDB Atlas & Audit Ledger',
    subtitle: 'Mongoose ODM • Cryptographic SHA-256',
    icon: Database,
    color: 'purple',
    tags: ['Immutable Log', 'Hash Chaining', 'Pre-Hooks'],
    details: 'Houses runs, batches, line items, matches, and exceptions with an immutable SHA-256 chained event log.',
    telemetry: 'Security: Tamper-evident ledger',
  },
];

export default function SystemArchitectureDiagram() {
  const [selectedNodeId, setSelectedNodeId] = useState('engine');

  const selectedNode = ARCHITECTURE_NODES.find((n) => n.id === selectedNodeId) || ARCHITECTURE_NODES[2];

  return (
    <section id="architecture" className="space-y-6">
      <div className="card-base p-6 sm:p-8 bg-white border border-slate-200 shadow-sm space-y-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                09 • SYSTEM ARCHITECTURE
              </span>
              <span className="text-xs font-mono text-slate-500">FULL-STACK TOPOLOGY GRAPH</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1">
              End-to-End System Components & Communication
            </h2>
          </div>

          <span className="text-xs font-mono text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 self-start sm:self-auto">
            Click any layer to inspect subsystem specifications
          </span>
        </div>

        {/* Architecture Node Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {ARCHITECTURE_NODES.map((node) => {
            const Icon = node.icon;
            const isSelected = selectedNodeId === node.id;
            return (
              <button
                key={node.id}
                onClick={() => setSelectedNodeId(node.id)}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-[#0B72E7] bg-blue-50/70 ring-2 ring-[#0B72E7]/25 shadow-xs text-slate-900'
                    : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-100/70 text-slate-700'
                }`}
              >
                <div className="space-y-2.5 mb-3">
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-lg border ${isSelected ? 'bg-[#0B72E7] text-white border-[#0B72E7] shadow-2xs' : 'bg-white border-slate-200 text-slate-700 shadow-2xs'}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400">LAYER</span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-900 leading-tight">{node.title}</h4>
                    <p className={`text-[11px] mt-0.5 line-clamp-1 font-medium ${isSelected ? 'text-blue-700' : 'text-slate-500'}`}>
                      {node.subtitle}
                    </p>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-slate-200/80 flex flex-wrap gap-1">
                  {node.tags.slice(0, 2).map((tag, i) => (
                    <span
                      key={i}
                      className={`text-[9px] font-mono font-semibold px-2 py-0.5 rounded-full border ${
                        isSelected
                          ? 'bg-blue-100 text-blue-800 border-blue-200'
                          : 'bg-slate-200/70 text-slate-700 border-slate-300/60'
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Layer Inspection Box */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedNode.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="p-5 rounded-xl bg-[#02042B] text-white border border-slate-800 space-y-4 shadow-md"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-lg bg-[#0B72E7] text-white shadow-xs">
                  <selectedNode.icon className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{selectedNode.title}</h4>
                  <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{selectedNode.details}</p>
                </div>
              </div>

              <div className="text-xs font-mono text-cyan-300 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700 font-semibold self-start sm:self-auto shrink-0">
                {selectedNode.telemetry}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <span className="text-slate-400 uppercase font-semibold mr-1">Stack Modules:</span>
              {selectedNode.tags.map((t, i) => (
                <span key={i} className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-100 font-medium">
                  {t}
                </span>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
