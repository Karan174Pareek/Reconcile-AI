import React, { useState } from 'react';
import axios from 'axios';
import {
  Sparkles,
  Zap,
  FileSpreadsheet,
  HelpCircle,
  ShieldCheck,
  Percent,
  Clock,
  Bot,
  Loader2,
  CheckCircle2,
  Radio,
  Layers,
  ArrowRight,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_SERVER_URL
  ? `${import.meta.env.VITE_SERVER_URL}/api`
  : '/api';

export default function HeroOverviewSection({
  activeRun,
  isConnected,
  onOpenUpload,
  onOpenExplainer,
  onRunCreated,
}) {
  const [isGeneratingSeed, setIsGeneratingSeed] = useState(false);
  const [seedError, setSeedError] = useState(null);

  const handleGenerateSeed = async () => {
    setIsGeneratingSeed(true);
    setSeedError(null);

    try {
      const res = await axios.post(`${API_BASE}/runs/generate-seed`, { count: 500 });
      if (onRunCreated) {
        onRunCreated(res.data.run_id);
      }
    } catch (err) {
      console.error('[HeroOverview] Seed error:', err);
      const rawMsg = err.response?.data?.error?.message || err.response?.data?.message || err.message || '';
      const isRawHttpError = !rawMsg || rawMsg.includes('Cannot POST') || rawMsg.includes('404') || rawMsg.includes('500') || rawMsg.includes('ECONNREFUSED');
      const msg = isRawHttpError ? 'Benchmark seed service temporarily unavailable. Please try again.' : rawMsg;
      setSeedError(msg);
    } finally {
      setIsGeneratingSeed(false);
    }
  };

  const handleColdReset = async () => {
    setIsGeneratingSeed(true);
    setSeedError(null);
    try {
      const res = await axios.post(`${API_BASE}/runs/cold-reset`, { held_out: false });
      if (onRunCreated) {
        onRunCreated(res.data.run_id);
      }
    } catch (err) {
      console.error('[HeroOverview] Cold Reset error:', err);
      const rawMsg = err.response?.data?.error?.message || err.response?.data?.message || err.message || '';
      const isRawHttpError = !rawMsg || rawMsg.includes('Cannot POST') || rawMsg.includes('404') || rawMsg.includes('500') || rawMsg.includes('ECONNREFUSED');
      const msg = isRawHttpError ? 'Reset & Cold Run service temporarily unavailable. Please try again.' : rawMsg;
      setSeedError(msg);
    } finally {
      setIsGeneratingSeed(false);
    }
  };

  return (
    <section id="overview" className="space-y-6 pt-2">
      {/* Hero Container */}
      <div className="card-base p-6 sm:p-10 bg-white border border-gray-200/90 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-50/60 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-50/40 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl space-y-5">
          {/* Section Tag */}
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-mono font-semibold shadow-xs">
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            <span>01 • AUTONOMOUS FINANCIAL RECONCILIATION PLATFORM</span>
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight">
            ReconcileAI
            <span className="block text-xl sm:text-2xl lg:text-3xl font-bold text-gray-600 mt-2">
              Autonomous Bank & Ledger Reconciliation Engine
            </span>
          </h1>

          {/* Value Proposition */}
          <p className="text-sm sm:text-base text-gray-700 leading-relaxed max-w-3xl">
            Manual bank reconciliation is slow and error-prone. ReconcileAI automatically clears the standard <strong>90%</strong> of high-volume transactions and cryptographically isolates the complex <strong>10%</strong> (MDR fees, GST Input Tax Credits, timing differences, and refunds) for human verification.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={handleGenerateSeed}
              disabled={isGeneratingSeed}
              className="btn-primary px-6 py-3 text-sm font-semibold shadow-sm"
            >
              {isGeneratingSeed ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Loading Benchmark Data (500 records)...</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 fill-current text-white" />
                  <span>Try with Benchmark Data (500 records)</span>
                </>
              )}
            </button>

            <button
              onClick={handleColdReset}
              disabled={isGeneratingSeed}
              className="px-4 py-3 text-sm font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors inline-flex items-center space-x-2 border border-slate-800 shadow-sm cursor-pointer disabled:opacity-50"
              title="Reset state and execute full reconciliation pipeline live from scratch"
            >
              <Radio className="h-4 w-4 text-emerald-400" />
              <span>Reset & Cold Run</span>
            </button>

            <button
              onClick={onOpenUpload}
              className="btn-secondary px-5 py-3 text-sm font-semibold"
            >
              <FileSpreadsheet className="h-4 w-4 text-blue-600" />
              <span>Upload CSV Statements</span>
            </button>

            <button
              onClick={onOpenExplainer}
              className="inline-flex items-center space-x-1.5 px-4 py-3 rounded-lg text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <HelpCircle className="h-4 w-4 text-gray-500" />
              <span>System Explainer</span>
            </button>
          </div>

          {seedError && (
            <div className="flex items-center justify-between text-xs text-rose-700 font-mono bg-rose-50 p-3 rounded-lg border border-rose-200">
              <span>{seedError}</span>
              <button
                onClick={() => setSeedError(null)}
                className="text-rose-500 hover:text-rose-800 font-bold ml-3 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Capabilities Badges */}
          <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-gray-200 text-xs font-mono text-gray-600">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>SHA-256 Chained Audit Trail</span>
            </div>
            <div className="flex items-center space-x-2">
              <Percent className="h-4 w-4 text-blue-600" />
              <span>18% GST ITC Decomposition</span>
            </div>
            <div className="flex items-center space-x-2">
              <Bot className="h-4 w-4 text-amber-600" />
              <span>Claude 3.5 Sonnet Reasoner</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-purple-600" />
              <span>Zero Spreadsheet Macros</span>
            </div>
          </div>
        </div>
      </div>

      {/* Real System Status Strip */}
      <div className="card-base p-4 sm:p-5 bg-white border border-gray-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-gray-100 border border-gray-200 text-gray-700">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono font-bold text-gray-900 uppercase">
                  SYSTEM STATUS STRIP
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full border flex items-center space-x-1 ${
                    isConnected
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  <span>{isConnected ? 'LIVE ENGINE CONNECTED' : 'STANDBY'}</span>
                </span>
              </div>
              <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                Active Session: {activeRun?.run_id || 'No active session loaded'}
              </p>
            </div>
          </div>

          {/* Real Metrics Counter Strip */}
          <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
            <div className="px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200">
              <span className="text-[10px] text-gray-500 block">TOTAL RECORDS</span>
              <span className="font-bold text-gray-900">{activeRun?.total_records || 0}</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800">
              <span className="text-[10px] text-emerald-600 block">AUTO MATCHED</span>
              <span className="font-bold">{activeRun?.pass1_matched || 0}</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
              <span className="text-[10px] text-amber-600 block">UNRESOLVED</span>
              <span className="font-bold">{activeRun?.unresolved || 0}</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-800">
              <span className="text-[10px] text-blue-600 block">MATCH RATE</span>
              <span className="font-bold">{Number(activeRun?.match_rate || 0).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
