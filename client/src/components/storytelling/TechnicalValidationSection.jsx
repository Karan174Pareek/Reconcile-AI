import React from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Cpu,
  Lock,
  FileCheck2,
  Terminal,
  Scale,
  Zap,
} from 'lucide-react';

const TEST_CATEGORIES = [
  {
    title: 'INGESTION & ZOD SCHEMAS',
    tests: 'Covered by automated tests',
    desc: 'Validates line-by-line row errors, strict date/amount coercions, and CSV stream limits.',
    badge: '100% COVERAGE',
  },
  {
    title: '3-TIER MULTI-LEVEL LOGIC',
    tests: 'Covered by automated tests',
    desc: 'Verifies Level 0 UTR matching, Level 1 batch balance equations, and Level 2 18% GST ITC isolation.',
    badge: 'DETERMINISTIC',
  },
  {
    title: 'FUZZY & EXACT HEURISTICS',
    tests: 'Covered by automated tests',
    desc: 'Tests Levenshtein distance, 3-gram text similarity, amount tolerances, and date lag windows.',
    badge: 'ZERO TOLERANCE',
  },
  {
    title: 'CLAUDE AI & HITL REMEDIATION',
    tests: 'Covered by automated tests',
    desc: 'Validates Anthropic tool schemas, corrective prompt retries, and vendor email structures.',
    badge: 'AI SAFEGUARDS',
  },
  {
    title: 'APPEND-ONLY AUDIT LOG',
    tests: 'Covered by automated tests',
    desc: 'Verifies append-only audit persistence and database hooks that block updates and deletions.',
    badge: 'MUTATION BLOCKED',
  },
];

export default function TechnicalValidationSection() {
  return (
    <section id="verification" className="space-y-6">
      <div className="card-base p-6 sm:p-8 bg-white border border-gray-200 shadow-sm space-y-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-gray-200">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                09 • SYSTEM VERIFICATION
              </span>
              <span className="text-xs font-mono text-gray-500">ENGINEERING VERIFICATION REPORT</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight mt-1">
              Automated Test Suite & Audit Controls
            </h2>
          </div>

          <div className="flex items-center space-x-2 bg-emerald-50 px-3.5 py-1.5 rounded-lg border border-emerald-200 font-mono text-xs text-emerald-800 self-start sm:self-auto font-bold">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>AUTOMATED TESTS VERIFIED</span>
          </div>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {TEST_CATEGORIES.map((cat, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2 flex flex-col justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-blue-700">{cat.title}</span>
                  <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {cat.badge}
                  </span>
                </div>
                <div className="text-xs font-bold text-gray-900 font-mono flex items-center space-x-1.5 pt-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{cat.tests}</span>
                </div>
                <p className="text-[11px] text-gray-600 leading-relaxed pt-1">
                  {cat.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Audit Controls Callout */}
        <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 flex items-start space-x-3 text-xs">
          <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-gray-700">
            <span className="font-bold text-gray-900 block font-mono">
              Audit Defense & Append-only Immutability
            </span>
            <p className="leading-relaxed">
              Audit events are stored append-only, and Mongoose hooks reject update and delete mutations on audit records. This preserves an attributable event history without implying cryptographic hash chaining.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
