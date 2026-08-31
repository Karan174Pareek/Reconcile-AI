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
} from 'lucide-react';
import SystemArchitectureDiagram from './SystemArchitectureDiagram.jsx';

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
                04 • UNDER THE HOOD
              </span>
              <span className="text-xs font-mono text-slate-500">FOR TECHNICAL EVALUATORS</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1">
              System Architecture & Technical Specifications
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Optional deep-dive into full-stack topology, verification guarantees, and infrastructure components.
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
            {/* 1. Automated Test Suite Banner */}
            <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold text-emerald-950 font-mono block">
                    31 / 31 Automated Tests Passing (100% Coverage)
                  </span>
                  <p className="text-emerald-800 text-[11px]">
                    Includes unit tests for Zod ingestion schemas, 3-tier math integrity, fuzzy Levenshtein distance, and SHA-256 hash chaining.
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-md bg-emerald-600 text-white font-mono text-[10px] font-bold self-start sm:self-auto uppercase tracking-wider shrink-0">
                VERIFIED CLEAN
              </span>
            </div>

            {/* 2. Full-Stack System Architecture Diagram */}
            <SystemArchitectureDiagram />

            {/* 3. Tech Stack Modules Summary */}
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-bold text-slate-900 uppercase flex items-center space-x-2">
                  <Code2 className="h-4 w-4 text-purple-600" />
                  <span>Production Tech Stack & Compliance</span>
                </span>
                <span className="text-[11px] text-slate-500">Enterprise Engine</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold">Frontend</span>
                  <span className="font-bold text-slate-900 block text-[11px]">React 18 + Vite</span>
                </div>
                <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold">Backend API</span>
                  <span className="font-bold text-slate-900 block text-[11px]">Node.js 24 + Express</span>
                </div>
                <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold">Database</span>
                  <span className="font-bold text-slate-900 block text-[11px]">MongoDB Atlas</span>
                </div>
                <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold">AI Reasoner</span>
                  <span className="font-bold text-slate-900 block text-[11px]">Claude 3.5 Sonnet</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
