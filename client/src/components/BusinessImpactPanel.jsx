import React from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Clock,
  ShieldCheck,
  Building2,
  FileSpreadsheet,
  Award,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_SERVER_URL
  ? `${import.meta.env.VITE_SERVER_URL}/api`
  : '/api';

export default function BusinessImpactPanel({ run, onExportCsv, onDownloadCertificate }) {
  if (!run) return null;

  const totalRecords = Number.isFinite(Number(run.total_records)) ? Number(run.total_records) : 0;
  const unresolved = Number.isFinite(Number(run.unresolved)) ? Number(run.unresolved) : 0;
  const autoMatched = Math.max(0, totalRecords - unresolved);
  const gstItc = Number.isFinite(Number(run.total_gst_itc)) ? Number(run.total_gst_itc) : 0;
  const totalSettlementVal = Number.isFinite(Number(run.total_settlement_value)) ? Number(run.total_settlement_value) : 0;
  const estimatedManualHours = Number.isFinite(Number(run.estimated_manual_hours))
    ? Number(run.estimated_manual_hours)
    : Math.round(((totalRecords * 2) / 60) * 10) / 10;
  const isComplete = run.status === 'complete';

  const handleCsvDownload = () => {
    if (onExportCsv) {
      onExportCsv();
    } else if (run.run_id) {
      window.open(`${API_BASE}/runs/${run.run_id}/export/journal-csv`, '_blank');
    }
  };

  const handleCertDownload = () => {
    if (onDownloadCertificate) {
      onDownloadCertificate();
    } else if (run.run_id) {
      window.open(`${API_BASE}/runs/${run.run_id}/export/audit-certificate`, '_blank');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="card-base bg-white border border-slate-200/90 shadow-2xs p-4 sm:p-5 space-y-4"
    >
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
              FINANCIAL CONTROLLER SUMMARY
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              Run: {run.run_id || 'N/A'}
            </span>
          </div>
          <h3 className="text-base font-extrabold text-[#0C2340] tracking-tight mt-1">
            Business Impact & Tax Value Summary
          </h3>
        </div>

        {/* Action Controls for Complete Run */}
        {isComplete && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleCsvDownload}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-[#0B72E7] hover:bg-[#0858B4] active:scale-[0.98] text-white text-xs font-semibold transition-all cursor-pointer shadow-xs"
              title="Download accounting journal entries CSV for ERP posting"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Export Journal (CSV)</span>
            </button>
            <button
              onClick={handleCertDownload}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white text-xs font-semibold transition-all cursor-pointer shadow-xs"
              title="Download Close & Audit Certificate Markdown summary"
            >
              <Award className="h-3.5 w-3.5 text-amber-400" />
              <span>Audit Certificate (MD)</span>
            </button>
          </div>
        )}
      </div>

      {/* 4 Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* Card 1: GST Input Tax Credit */}
        <div className="p-3.5 rounded-lg bg-emerald-50/60 border border-emerald-200/80 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 font-mono">
              GST ON MDR (18%)
            </span>
            <div className="p-1 rounded bg-emerald-100 text-emerald-700">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono text-emerald-900 tracking-tight">
            ₹{gstItc.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-emerald-700 font-sans leading-tight">
            Tax component identified on 2% MDR gateway fees; claimability depends on tax reconciliation.
          </p>
        </div>

        {/* Card 2: Honest Manual Time Saved */}
        <div className="p-3.5 rounded-lg bg-blue-50/60 border border-blue-200/80 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 font-mono">
              ESTIMATED TIME SAVED
            </span>
            <div className="p-1 rounded bg-blue-100 text-blue-700">
              <Clock className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono text-blue-900 tracking-tight">
            ~{estimatedManualHours} Hours
          </div>
          <p className="text-[11px] text-blue-700 font-sans leading-tight">
            Manual review estimate (assuming 2 min/txn) vs &lt; 2.8s automated execution.
          </p>
        </div>

        {/* Card 3: Exceptions Caught vs Pending Review */}
        <div className="p-3.5 rounded-lg bg-amber-50/60 border border-amber-200/80 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 font-mono">
              EXCEPTIONS ISOLATED
            </span>
            <div className="p-1 rounded bg-amber-100 text-amber-700">
              <ShieldCheck className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono text-amber-900 tracking-tight flex items-baseline space-x-1">
            <span>{autoMatched} Cleared</span>
            <span className="text-xs text-amber-700 font-medium">/ {unresolved} Pending</span>
          </div>
          <p className="text-[11px] text-amber-800 font-sans leading-tight">
            {autoMatched} auto-resolved without ledger errors; {unresolved} isolated in HITL queue.
          </p>
        </div>

        {/* Card 4: Total Settlement Volume Processed */}
        <div className="p-3.5 rounded-lg bg-slate-100/70 border border-slate-200 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 font-mono">
              SETTLEMENT VOLUME
            </span>
            <div className="p-1 rounded bg-slate-200 text-slate-700">
              <Building2 className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 tracking-tight">
            ₹{(totalSettlementVal / 100000).toFixed(2)} Lakhs
          </div>
          <p className="text-[11px] text-slate-600 font-sans leading-tight">
            ₹{totalSettlementVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })} net payout volume processed.
          </p>
        </div>

      </div>
    </motion.div>
  );
}
