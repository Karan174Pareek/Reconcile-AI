import React from 'react';
import {
  FileSpreadsheet,
  Layers,
  Scale,
  Receipt,
  Percent,
  Bot,
  UserCheck,
  ShieldCheck,
  Database,
  ArrowDown,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

export default function SystemOverviewMapSection({ onOpenUpload, onNavigateTab }) {
  return (
    <section id="system-map" className="space-y-6 pb-12">
      <div className="card-base p-6 sm:p-10 bg-white border border-gray-200 shadow-sm space-y-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-gray-200">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                10 • FINAL SYSTEM MAP
              </span>
              <span className="text-xs font-mono text-gray-500">EXECUTIVE ARCHITECTURE BLUEPRINT</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight mt-1">
              ReconcileAI Unified Architecture & Execution Blueprint
            </h2>
          </div>

          <span className="text-xs font-mono text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 font-bold self-start sm:self-auto">
            Mathematically Verified
          </span>
        </div>

        {/* Unified 3-Tier Multi-Level Blueprint */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
          {/* Column 1: Ingestion & Bank Match */}
          <div className="p-5 rounded-xl border border-gray-200 bg-gray-50/60 space-y-4">
            <div className="flex items-center space-x-2 pb-2 border-b border-gray-200">
              <FileSpreadsheet className="h-4 w-4 text-blue-600" />
              <h3 className="font-bold text-gray-900">1. INGESTION & LEVEL 0</h3>
            </div>
            <div className="space-y-2 text-[11px] text-gray-600 leading-relaxed">
              <p>• Ingests raw Bank CSV statements & ERP Sales Ledger.</p>
              <p>• Correlates bulk bank credits to payment gateway batch headers via exact UTR.</p>
              <p className="text-emerald-700 font-semibold">• 100% Deterministic match to settlement batches.</p>
            </div>
          </div>

          {/* Column 2: Batch Explosion & Tax Isolation */}
          <div className="p-5 rounded-xl border border-blue-200 bg-blue-50/40 space-y-4">
            <div className="flex items-center space-x-2 pb-2 border-b border-blue-200">
              <Scale className="h-4 w-4 text-blue-700" />
              <h3 className="font-bold text-blue-950">2. LEVEL 1 & LEVEL 2 DECOMPOSITION</h3>
            </div>
            <div className="space-y-2 text-[11px] text-gray-700 leading-relaxed">
              <p>• Explodes batches into individual constituent orders.</p>
              <p>• Validates mathematical balance: Gross - MDR - GST = Net.</p>
              <p className="text-emerald-700 font-semibold">• Isolates 2% MDR fee & claims 18% GST Input Tax Credit.</p>
            </div>
          </div>

          {/* Column 3: AI Reasoning & Audit */}
          <div className="p-5 rounded-xl border border-purple-200 bg-purple-50/40 space-y-4">
            <div className="flex items-center space-x-2 pb-2 border-b border-purple-200">
              <ShieldCheck className="h-4 w-4 text-purple-700" />
              <h3 className="font-bold text-purple-950">3. PASS 3 AI & AUDIT DEFENSE</h3>
            </div>
            <div className="space-y-2 text-[11px] text-gray-700 leading-relaxed">
              <p>• Claude 3.5 Sonnet diagnoses complex exception variances.</p>
              <p>• Drafts vendor emails & adjusting entries for human approval.</p>
              <p className="text-purple-700 font-semibold">• Immutable append-only audit trail.</p>
            </div>
          </div>
        </div>

        {/* Footer Technical Guarantee */}
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-gray-600 font-mono">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>ReconcileAI Enterprise Engine • Node.js v24.x • MongoDB Atlas</span>
          </div>

          <div className="flex items-center space-x-4">
            <span>Pass 1: Exact Match</span>
            <span>•</span>
            <span>Pass 2: Fuzzy Heuristic</span>
            <span>•</span>
            <span className="text-blue-700 font-bold">Pass 3: Claude 3.5 Sonnet</span>
          </div>
        </div>
      </div>
    </section>
  );
}
