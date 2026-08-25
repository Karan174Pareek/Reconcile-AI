import React, { useState } from 'react';
import axios from 'axios';
import {
  FileSpreadsheet,
  Zap,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Send,
  FileCheck2,
  Sparkles,
  Loader2,
  HelpCircle,
  Clock,
  Layers,
  ChevronRight,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_SERVER_URL
  ? `${import.meta.env.VITE_SERVER_URL}/api`
  : '/api';

export default function HomeLandingView({
  runs = [],
  activeRunId,
  onSelectRun,
  onOpenUpload,
  onOpenExplainer,
  onNavigateTab,
  onRunCreated,
}) {
  const [isGeneratingSeed, setIsGeneratingSeed] = useState(false);
  const [seedError, setSeedError] = useState(null);

  const activeRun = runs.find((r) => r.run_id === activeRunId) || runs[0];

  const handleGenerateSeed = async () => {
    setIsGeneratingSeed(true);
    setSeedError(null);

    try {
      const res = await axios.post(`${API_BASE}/runs/generate-seed`, { count: 500 });
      if (onRunCreated) {
        onRunCreated(res.data.run_id);
      }
      if (onNavigateTab) {
        onNavigateTab('dashboard');
      }
    } catch (err) {
      console.error('[HomeLanding] Seed Generation error:', err);
      setSeedError(err.response?.data?.error?.message || 'Failed to generate benchmark dataset');
    } finally {
      setIsGeneratingSeed(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner / Hero Explainer */}
      <div className="card-base p-6 sm:p-8 bg-white border border-gray-200">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            <span>Automated Reconciliation Controller</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight leading-tight">
            Match your bank statements against your internal records in seconds.
          </h1>

          <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
            Manual bank reconciliation is slow and error-prone. ReconcileAI automatically clears the easy <strong>90%</strong> of standard transactions and clearly flags the hard <strong>10%</strong> (payment gateway fees, GST credits, timing differences, and refunds) for a human auditor to review.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={handleGenerateSeed}
              disabled={isGeneratingSeed}
              className="btn-primary px-5 py-2.5 text-sm"
            >
              {isGeneratingSeed ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Loading Benchmark Data...</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 fill-current text-white" />
                  <span>Try with Sample Data (500 records)</span>
                </>
              )}
            </button>

            <button
              onClick={onOpenUpload}
              className="btn-secondary px-5 py-2.5 text-sm"
            >
              <FileSpreadsheet className="h-4 w-4 text-gray-500" />
              <span>Upload CSV Files</span>
            </button>

            <button
              onClick={onOpenExplainer}
              className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-lg text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <HelpCircle className="h-4 w-4 text-gray-400" />
              <span>How it works</span>
            </button>
          </div>

          {seedError && (
            <p className="text-xs text-red-600 font-mono bg-red-50 p-2.5 rounded-lg border border-red-200">
              {seedError}
            </p>
          )}
        </div>
      </div>

      {/* 3 Step Process Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-900">
            How to use ReconcileAI in 3 Steps
          </h2>
          <span className="text-xs text-gray-500">Zero spreadsheet macros required</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Step 1 */}
          <div className="card-base p-5 bg-white space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="h-8 w-8 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 font-bold text-sm flex items-center justify-center">
                1
              </div>
              <h3 className="text-sm font-semibold text-gray-900">Upload or Try Sample Data</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Provide your bank statement CSV and internal accounting ledger CSV, or click the sample data button to load 500 test transactions instantly.
              </p>
            </div>
            <button
              onClick={onOpenUpload}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center space-x-1 pt-2"
            >
              <span>Upload Statements</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Step 2 */}
          <div className="card-base p-5 bg-white space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="h-8 w-8 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 font-bold text-sm flex items-center justify-center">
                2
              </div>
              <h3 className="text-sm font-semibold text-gray-900">Automatic 3-Tier Match</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                ReconcileAI matches bank credits by UTR reference, cryptographically checks batch totals, unpacks individual orders, and calculates 2% MDR & 18% GST tax credits.
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('dashboard')}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center space-x-1 pt-2"
            >
              <span>View Live Engine</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Step 3 */}
          <div className="card-base p-5 bg-white space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="h-8 w-8 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 font-bold text-sm flex items-center justify-center">
                3
              </div>
              <h3 className="text-sm font-semibold text-gray-900">Review & Approve Actions</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Review any flagged exceptions with clear plain-language rationale. Approve AI-suggested vendor emails or journal corrections before anything is booked.
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('exceptions')}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center space-x-1 pt-2"
            >
              <span>Explore Exception Queue</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Active Run Quick Status (If Runs Exist) */}
      {runs.length > 0 && activeRun && (
        <div className="card-base p-5 bg-white border border-gray-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-200">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Active Reconciliation Run</span>
                <span className="badge-blue text-[11px] font-mono">{activeRun.run_id}</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Loaded with {activeRun.total_records || 0} transaction records • Status: {activeRun.status}
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => onNavigateTab('dashboard')}
                className="btn-primary text-xs py-1.5 px-3"
              >
                <span>Go to Dashboard</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
              <span className="text-[11px] text-gray-500 block font-medium">Total Ingested</span>
              <span className="text-lg font-bold font-mono text-gray-900">{activeRun.total_records || 0}</span>
            </div>
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
              <span className="text-[11px] text-emerald-800 block font-medium">Auto-Matched</span>
              <span className="text-lg font-bold font-mono text-emerald-700">{activeRun.pass1_matched || 0}</span>
            </div>
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
              <span className="text-[11px] text-amber-800 block font-medium">Needs Review</span>
              <span className="text-lg font-bold font-mono text-amber-700">{activeRun.unresolved || 0}</span>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
              <span className="text-[11px] text-blue-800 block font-medium">Match Rate</span>
              <span className="text-lg font-bold font-mono text-blue-700">{Number(activeRun.match_rate || 0).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Feature Pillars */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-gray-600">
        <div className="flex items-start space-x-3 p-4 rounded-xl card-base bg-white">
          <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
          <div className="space-y-1">
            <span className="font-semibold text-gray-900 block">Complete Audit Defense</span>
            <span>Every single pass, AI tool call, and human approval is cryptographically logged in the immutable Audit Trail.</span>
          </div>
        </div>

        <div className="flex items-start space-x-3 p-4 rounded-xl card-base bg-white">
          <Zap className="h-5 w-5 text-blue-600 shrink-0" />
          <div className="space-y-1">
            <span className="font-semibold text-gray-900 block">Automated Tax & MDR Breakdown</span>
            <span>Unpacks payment gateway deductions and isolates 18% GST Input Tax Credits (ITC) for your accounting team.</span>
          </div>
        </div>

        <div className="flex items-start space-x-3 p-4 rounded-xl card-base bg-white">
          <Send className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="space-y-1">
            <span className="font-semibold text-gray-900 block">Human-in-the-Loop Safeguards</span>
            <span>AI drafts remediation emails and adjusting journal entries, but nothing is executed without your direct approval.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
