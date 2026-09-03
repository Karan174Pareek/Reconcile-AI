import React, { useState } from 'react';
import ExceptionQueue from '../ExceptionQueue.jsx';
import DraftActionsQueue from '../DraftActionsQueue.jsx';
import {
  AlertTriangle,
  Send,
  Bot,
  UserCheck,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Layers,
} from 'lucide-react';

export default function ExceptionReviewFlowSection({ runId, onRefresh }) {
  const [activeTab, setActiveTab] = useState('exceptions');

  return (
    <section id="exceptions" className="space-y-6">
      <div className="card-base p-6 sm:p-8 bg-white border border-gray-200 shadow-sm space-y-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-gray-200">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                07 • EXCEPTION TRIAGE & HITL REVIEW
              </span>
              <span className="text-xs font-mono text-gray-500">HUMAN-IN-THE-LOOP WORKBENCH</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight mt-1">
              Exception Lifecycle & Remediation Desk
            </h2>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-lg border border-gray-200 text-xs font-mono self-start sm:self-auto">
            <button
              onClick={() => setActiveTab('exceptions')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                activeTab === 'exceptions'
                  ? 'bg-white text-gray-900 font-semibold shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Exceptions Queue
            </button>
            <button
              onClick={() => setActiveTab('actions')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                activeTab === 'actions'
                  ? 'bg-white text-gray-900 font-semibold shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Draft Actions (HITL)
            </button>
          </div>
        </div>

        {/* Visual Lifecycle Stepper Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 font-mono text-xs">
          <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 flex items-center space-x-2">
            <span className="h-5 w-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-[10px] shrink-0">1</span>
            <div>
              <span className="font-bold text-gray-900 block">Variance Flagged</span>
              <span className="text-[10px] text-gray-500">MDR, GST, refund or timing lag</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 flex items-center space-x-2">
            <span className="h-5 w-5 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-[10px] shrink-0">2</span>
            <div>
              <span className="font-bold text-gray-900 block">Claude AI Diagnosis</span>
              <span className="text-[10px] text-gray-500">Forensic rationale generated</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 flex items-center space-x-2">
            <span className="h-5 w-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-[10px] shrink-0">3</span>
            <div>
              <span className="font-bold text-gray-900 block">Action Auto-Drafted</span>
              <span className="text-[10px] text-gray-500">Vendor email / adjusting entry</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center space-x-2">
            <span className="h-5 w-5 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center font-bold text-[10px] shrink-0">4</span>
            <div>
              <span className="font-bold text-emerald-900 block">Human Approval Gate</span>
              <span className="text-[10px] text-emerald-700">Auditor approves & records to audit log</span>
            </div>
          </div>
        </div>

        {/* Embedded Queue Component */}
        <div className="pt-2">
          {activeTab === 'exceptions' ? (
            <ExceptionQueue runId={runId} onExceptionResolved={onRefresh} />
          ) : (
            <DraftActionsQueue runId={runId} />
          )}
        </div>
      </div>
    </section>
  );
}
