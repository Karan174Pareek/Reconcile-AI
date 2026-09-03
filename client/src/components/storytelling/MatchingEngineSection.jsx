import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  GitMerge,
  Layers,
  Scale,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  Info,
  Calculator,
} from 'lucide-react';

const ENGINE_LEVELS = [
  {
    id: 'l0',
    title: 'LEVEL 0 — NODAL DEPOSIT MATCH',
    badge: '100% Deterministic',
    purpose: 'Correlates bulk bank credits directly to payment gateway batch headers.',
    input: 'Bank Credit Record (UTR Reference, Net Settlement Amount, Date)',
    processing: 'Deterministic reference and net-amount lookup against Razorpay settlement batch headers.',
    output: 'Matched Settlement Batch Header (Status: L0_MATCHED)',
    fallbackReason: 'If UTR is missing or gateway batch cannot be found, record moves to Level 1 Batch Integrity check.',
    icon: Layers,
    color: 'blue',
  },
  {
    id: 'l1',
    title: 'LEVEL 1 — BATCH INTEGRITY & BALANCE',
    badge: 'Mathematical Balance',
    purpose: 'Validates that the sum of constituent customer orders equals the net deposit to the penny.',
    input: 'Gateway Batch Header & Linked Constituent Orders',
    processing: 'Balance formula: Gross Order Sum - 2% MDR Fee - 18% GST on MDR === Net Bank Deposit.',
    output: 'Balanced Batch Flag (or Batch Imbalance Exception)',
    fallbackReason: 'If the batch mathematical equation fails or orders are unrecorded, moves to Level 2 Line-Item Unpacking.',
    icon: Scale,
    color: 'cyan',
  },
  {
    id: 'l2',
    title: 'LEVEL 2 — LINE-ITEM ORDER UNPACKING',
    badge: 'Tax Credit Isolation',
    purpose: 'Matches individual order items against internal sales journals, isolating 18% GST Input Tax Credits.',
    input: 'Individual Order Line Items ⇄ Internal ERP Sales Invoices',
    processing: 'Exact & fuzzy order matching, separates the 18% GST component from the 2% MDR fee for review.',
    output: 'Reconciled Sales Invoice + GSTR-2B Claimable Tax Credit Entry',
    fallbackReason: 'If variance remains unexplained (refund, chargeback, or timing lag), escalated to Pass 3 Claude AI Reasoner.',
    icon: Receipt,
    color: 'emerald',
  },
];

export default function MatchingEngineSection() {
  const [selectedLevelId, setSelectedLevelId] = useState('l0');
  const [sliderAmount, setSliderAmount] = useState(25000);

  const selectedLevel = ENGINE_LEVELS.find((l) => l.id === selectedLevelId) || ENGINE_LEVELS[0];

  const mdrRate = 0.02;
  const gstRate = 0.18;
  const mdrFee = Math.round(sliderAmount * mdrRate * 100) / 100;
  const gstOnMdr = Math.round(mdrFee * gstRate * 100) / 100;
  const netSettlement = Math.round((sliderAmount - (mdrFee + gstOnMdr)) * 100) / 100;

  return (
    <section id="matching-engine" className="space-y-6">
      <div className="card-base p-6 sm:p-8 bg-white border border-gray-200 shadow-sm space-y-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-gray-200">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                04 • 3-TIER MATCHING ENGINE
              </span>
              <span className="text-xs font-mono text-gray-500">LEVEL 0 ⇄ LEVEL 1 ⇄ LEVEL 2 DECISION TREE</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight mt-1">
              Multi-Level Deposit Decomposition & Decision Tree
            </h2>
          </div>

          <span className="text-xs font-mono text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 self-start sm:self-auto">
            Click any level to inspect its decision branch
          </span>
        </div>

        {/* Level Cards Decision Flow */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {ENGINE_LEVELS.map((level, idx) => {
            const Icon = level.icon;
            const isSelected = selectedLevelId === level.id;
            return (
              <button
                key={level.id}
                onClick={() => setSelectedLevelId(level.id)}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/30 shadow-xs'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-blue-600 uppercase">
                      {level.badge}
                    </span>
                    <div className={`h-2 w-2 rounded-full ${isSelected ? 'bg-blue-600' : 'bg-gray-300'}`} />
                  </div>

                  <div className="flex items-center space-x-2 pt-1">
                    <div className={`p-1.5 rounded-lg border ${isSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <h4 className="text-xs font-bold text-gray-900 leading-tight">
                      {level.title}
                    </h4>
                  </div>

                  <p className="text-[11px] text-gray-600 leading-relaxed line-clamp-2">
                    {level.purpose}
                  </p>
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] font-mono text-gray-400">
                  <span>Branch: Stage 0{idx + 1}</span>
                  <Info className="h-3 w-3 text-blue-500" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Level Decision Tree Inspector */}
        <div className="p-5 rounded-xl bg-gray-50 border border-blue-200 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-200 pb-3">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-blue-600 text-white">
                <selectedLevel.icon className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900">{selectedLevel.title}</h4>
                <p className="text-xs text-gray-600 mt-0.5">{selectedLevel.purpose}</p>
              </div>
            </div>

            <span className="text-xs font-mono text-blue-700 bg-white px-3 py-1.5 rounded-lg border border-blue-200 font-bold">
              {selectedLevel.badge}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3 rounded-lg bg-white border border-gray-200 space-y-1">
              <span className="text-[10px] text-gray-500 uppercase font-semibold block">Input Specification</span>
              <p className="text-gray-800">{selectedLevel.input}</p>
            </div>
            <div className="p-3 rounded-lg bg-white border border-gray-200 space-y-1">
              <span className="text-[10px] text-gray-500 uppercase font-semibold block">Core Processing Logic</span>
              <p className="text-gray-800">{selectedLevel.processing}</p>
            </div>
            <div className="p-3 rounded-lg bg-white border border-emerald-200 bg-emerald-50/30 space-y-1">
              <span className="text-[10px] text-emerald-700 uppercase font-semibold block">Success Output Artifact</span>
              <p className="text-gray-800">{selectedLevel.output}</p>
            </div>
            <div className="p-3 rounded-lg bg-white border border-amber-200 bg-amber-50/30 space-y-1">
              <span className="text-[10px] text-amber-700 uppercase font-semibold block">Next Level Escalation Trigger</span>
              <p className="text-gray-800">{selectedLevel.fallbackReason}</p>
            </div>
          </div>
        </div>

        {/* 2% MDR & 18% GST Input Tax Credit Simulator */}
        <div className="p-5 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 pb-2">
            <div className="flex items-center space-x-2">
              <Calculator className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-bold text-gray-900 font-mono uppercase">
                Mathematical Decomposition Simulator (2% MDR + 18% GST ITC)
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-blue-700">
              Gross Volume: ₹{sliderAmount.toLocaleString('en-IN')}.00
            </span>
          </div>

          <input
            type="range"
            min="1000"
            max="100000"
            step="1000"
            value={sliderAmount}
            onChange={(e) => setSliderAmount(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center font-mono text-xs">
            <div className="p-2.5 rounded-lg bg-white border border-gray-200">
              <span className="text-[10px] text-gray-500 block uppercase font-semibold">1. Gross Orders</span>
              <span className="font-bold text-gray-900 mt-0.5 block">
                ₹{sliderAmount.toLocaleString('en-IN')}.00
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
              <span className="text-[10px] text-amber-700 block uppercase font-semibold">2. MDR Fee (2%)</span>
              <span className="font-bold text-amber-800 mt-0.5 block">
                - ₹{mdrFee.toFixed(2)}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
              <span className="text-[10px] text-emerald-700 block uppercase font-semibold">3. GST ITC (18%)</span>
              <span className="font-bold text-emerald-800 mt-0.5 block">
                ₹{gstOnMdr.toFixed(2)}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200">
              <span className="text-[10px] text-blue-700 block uppercase font-semibold">4. Net Bank Deposit</span>
              <span className="font-bold text-blue-800 mt-0.5 block">
                ₹{netSettlement.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
