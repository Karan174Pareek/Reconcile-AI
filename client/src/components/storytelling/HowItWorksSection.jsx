import React, { useState } from 'react';
import {
  Layers,
  Scale,
  Receipt,
  Calculator,
  Info,
  CheckCircle2,
} from 'lucide-react';

const PIPELINE_LEVELS = [
  {
    id: 'l0',
    level: 'LEVEL 0',
    title: 'Bank Deposit Matching',
    badge: '100% Automatic',
    desc: 'Matches bulk bank payouts directly to payment gateway settlement batches using the bank reference (UTR) and net deposit amount.',
    input: 'Bank Credit Statement (UTR Reference & Net Amount)',
    output: 'Matched Gateway Settlement Batch Header',
    icon: Layers,
    color: 'blue',
  },
  {
    id: 'l1',
    level: 'LEVEL 1',
    title: 'Batch Math Verification',
    badge: 'Balanced Arithmetic',
    desc: 'Verifies the batch balance formula: Gross Customer Payments minus Payment Gateway Fees (MDR) minus Taxes must equal Net Payout to the penny.',
    input: 'Settlement Batch & Constituent Sales Orders',
    output: 'Verified Balanced Batch (or Imbalance Alert)',
    icon: Scale,
    color: 'cyan',
  },
  {
    id: 'l2',
    level: 'LEVEL 2',
    title: 'Order Unpacking & Tax Isolation',
    badge: 'Tax Credit Recovery',
    desc: 'Unpacks individual customer orders against internal sales ledgers and automatically isolates claimable 18% GST Input Tax Credits on gateway fees.',
    input: 'Gateway Order Line Items ⇄ Internal ERP Sales Invoices',
    output: 'Reconciled Journal Entry & Claimable GST Tax Credit',
    icon: Receipt,
    color: 'emerald',
  },
];

export default function HowItWorksSection() {
  const [selectedLevelId, setSelectedLevelId] = useState('l0');
  const [sliderAmount, setSliderAmount] = useState(25000);

  const selectedLevel = PIPELINE_LEVELS.find((l) => l.id === selectedLevelId) || PIPELINE_LEVELS[0];

  const mdrRate = 0.02;
  const gstRate = 0.18;
  const mdrFee = Math.round(sliderAmount * mdrRate * 100) / 100;
  const gstOnMdr = Math.round(mdrFee * gstRate * 100) / 100;
  const netSettlement = Math.round((sliderAmount - (mdrFee + gstOnMdr)) * 100) / 100;

  return (
    <section id="how-it-works" className="space-y-6">
      <div className="card-base p-6 sm:p-8 bg-white border border-gray-200 shadow-sm space-y-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-gray-200">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                02 • HOW IT WORKS
              </span>
              <span className="text-xs font-mono text-gray-500">3-LEVEL SETTLEMENT PIPELINE</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight mt-1">
              How ReconcileAI Processes & Reconciles Payments
            </h2>
          </div>

          <span className="text-xs font-mono text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 self-start sm:self-auto">
            Click any level to inspect details
          </span>
        </div>

        {/* 3 Pipeline Levels Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {PIPELINE_LEVELS.map((lvl) => {
            const Icon = lvl.icon;
            const isSelected = selectedLevelId === lvl.id;
            return (
              <button
                key={lvl.id}
                onClick={() => setSelectedLevelId(lvl.id)}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/30 shadow-xs'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="space-y-2.5 mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-blue-600 uppercase">
                      {lvl.level}
                    </span>
                    <span className="text-[9px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {lvl.badge}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 pt-0.5">
                    <div className={`p-1.5 rounded-lg border ${isSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <h4 className="text-xs font-bold text-gray-900 leading-tight">
                      {lvl.title}
                    </h4>
                  </div>

                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    {lvl.desc}
                  </p>
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] font-mono text-gray-400">
                  <span>Inspect Level</span>
                  <Info className="h-3 w-3 text-blue-500" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Level Inspector Box */}
        <div className="p-5 rounded-xl bg-gray-50 border border-blue-200 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-200 pb-3">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-blue-600 text-white">
                <selectedLevel.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono font-bold text-blue-700">{selectedLevel.level}</span>
                  <h4 className="text-sm font-bold text-gray-900">{selectedLevel.title}</h4>
                </div>
                <p className="text-xs text-gray-600 mt-0.5">{selectedLevel.desc}</p>
              </div>
            </div>

            <span className="text-xs font-mono text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 font-bold hidden sm:inline-block">
              {selectedLevel.badge}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3 rounded-lg bg-white border border-gray-200 space-y-1">
              <span className="text-[10px] text-gray-500 uppercase font-semibold block">Input Provided</span>
              <p className="text-gray-800 font-sans">{selectedLevel.input}</p>
            </div>
            <div className="p-3 rounded-lg bg-white border border-emerald-200 bg-emerald-50/30 space-y-1">
              <span className="text-[10px] text-emerald-700 uppercase font-semibold block">Automated Output</span>
              <p className="text-gray-800 font-sans">{selectedLevel.output}</p>
            </div>
          </div>
        </div>

        {/* 2% MDR & 18% GST Input Tax Credit Simulator */}
        <div className="p-5 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 pb-2">
            <div className="flex items-center space-x-2">
              <Calculator className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-bold text-gray-900 font-mono uppercase">
                Interactive Fee & Tax Calculator (2% MDR + 18% GST Credit)
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-blue-700">
              Gross Sales Volume: ₹{sliderAmount.toLocaleString('en-IN')}.00
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
              <span className="text-[10px] text-amber-700 block uppercase font-semibold">2. Gateway Fee (2%)</span>
              <span className="font-bold text-amber-800 mt-0.5 block">
                - ₹{mdrFee.toFixed(2)}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
              <span className="text-[10px] text-emerald-700 block uppercase font-semibold">3. Claimable GST (18%)</span>
              <span className="font-bold text-emerald-800 mt-0.5 block">
                ₹{gstOnMdr.toFixed(2)}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200">
              <span className="text-[10px] text-blue-700 block uppercase font-semibold">4. Net Bank Credit</span>
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
