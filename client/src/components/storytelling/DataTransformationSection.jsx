import React, { useState } from 'react';
import {
  Code2,
  FileSpreadsheet,
  Scale,
  ShieldCheck,
} from 'lucide-react';

const TRANSFORMATION_STEPS = [
  {
    step: '01',
    title: 'RAW INGESTED ROW',
    subtitle: 'Bank Statement CSV Row',
    icon: FileSpreadsheet,
  },
  {
    step: '02',
    title: 'NORMALIZED ENTITY',
    subtitle: 'Zod Parsed & Sanitized',
    icon: Code2,
  },
  {
    step: '03',
    title: 'CANDIDATE SEARCH WINDOW',
    subtitle: 'Narrowed Candidate Bounds',
    icon: Scale,
  },
  {
    step: '04',
    title: 'RECONCILED OUTPUT',
    subtitle: 'Tax Isolation & Append-Only Audit',
    icon: ShieldCheck,
  },
];

export default function DataTransformationSection() {
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  return (
    <section id="data-transformation" className="space-y-6">
      <div className="card-base p-6 sm:p-8 bg-white border border-gray-200 shadow-sm space-y-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-gray-200">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                06 • DATA TRANSFORMATION
              </span>
              <span className="text-xs font-mono text-gray-500">REAL RECORD PIPELINE LIFECYCLE</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight mt-1">
              How a Record Transforms Through the System
            </h2>
          </div>

          <span className="text-xs font-mono text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 self-start sm:self-auto">
            Click step to inspect data shape
          </span>
        </div>

        {/* Step Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {TRANSFORMATION_STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isActive = activeStepIndex === idx;
            return (
              <button
                key={step.step}
                onClick={() => setActiveStepIndex(idx)}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isActive
                    ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/30 shadow-xs'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-emerald-700">
                      STEP {step.step}
                    </span>
                    <div className={`h-2 w-2 rounded-full ${isActive ? 'bg-emerald-600' : 'bg-gray-300'}`} />
                  </div>

                  <div className="flex items-center space-x-2 pt-1">
                    <div className={`p-1.5 rounded-lg border ${isActive ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <h4 className="text-xs font-bold text-gray-900 leading-tight">
                      {step.title}
                    </h4>
                  </div>

                  <p className="text-[11px] text-gray-500 line-clamp-1">{step.subtitle}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
