import React, { useState } from 'react';
import axios from 'axios';
import {
  UploadCloud,
  FileSpreadsheet,
  Zap,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  ArrowRight,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_SERVER_URL
  ? `${import.meta.env.VITE_SERVER_URL}/api`
  : 'http://localhost:5000/api';

export default function UploadView({ isOpen, onClose, onRunCreated }) {
  const [bankFile, setBankFile] = useState(null);
  const [ledgerFile, setLedgerFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingSeed, setIsGeneratingSeed] = useState(false);
  const [errorDetails, setErrorDetails] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!bankFile || !ledgerFile) {
      setErrorDetails({ message: 'Please select both Bank Statement CSV and Internal Ledger CSV files.' });
      return;
    }

    setIsUploading(true);
    setErrorDetails(null);
    setSuccessMessage(null);

    const formData = new FormData();
    formData.append('bank_csv', bankFile);
    formData.append('ledger_csv', ledgerFile);

    try {
      const res = await axios.post(`${API_BASE}/runs/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSuccessMessage(`Run ${res.data.run_id} created with ${res.data.total_bank_records} bank rows.`);
      if (onRunCreated) {
        onRunCreated(res.data.run_id);
      }
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error('[Upload Error]:', err);
      const resError = err.response?.data?.error;
      setErrorDetails({
        message: resError?.message || 'Failed to upload and validate CSVs',
        details: resError?.details,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerateSeed = async () => {
    setIsGeneratingSeed(true);
    setErrorDetails(null);
    setSuccessMessage(null);

    try {
      const res = await axios.post(`${API_BASE}/runs/generate-seed`, { count: 500 });
      setSuccessMessage(`Synthetic seed generated for run ${res.data.run_id} (${res.data.stats.totalBankRecords} records)!`);
      if (onRunCreated) {
        onRunCreated(res.data.run_id);
      }
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error('[Seed Error]:', err);
      setErrorDetails({
        message: err.response?.data?.error?.message || 'Failed to generate synthetic seed',
      });
    } finally {
      setIsGeneratingSeed(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel border border-white/15 rounded-2xl max-w-2xl w-full shadow-glass overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div>
            <h3 className="text-base font-semibold text-text-primary">Initialize Reconciliation Run</h3>
            <p className="text-xs text-text-secondary">Upload CSV files or generate a synthetic benchmark batch</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Success Banner */}
          {successMessage && (
            <div className="flex items-center space-x-2.5 p-3.5 rounded-xl bg-teal-950/60 border border-teal-500/30 text-teal-300 text-xs font-mono">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Error Banner */}
          {errorDetails && (
            <div className="p-3.5 rounded-xl bg-coral-950/60 border border-coral-500/40 text-coral-300 text-xs space-y-2">
              <div className="flex items-center space-x-2 font-medium">
                <AlertCircle className="h-4 w-4 shrink-0 text-coral-400" />
                <span>{errorDetails.message}</span>
              </div>
              {errorDetails.details && (
                <div className="max-h-36 overflow-y-auto font-mono text-[11px] bg-black/40 p-2.5 rounded-lg space-y-1 text-coral-300/90">
                  {errorDetails.details.bank_errors?.map((be, i) => (
                    <div key={`be-${i}`}>
                      • Bank Row {be.row}: [{be.field}] {be.message} (received: "{String(be.received)}")
                    </div>
                  ))}
                  {errorDetails.details.ledger_errors?.map((le, i) => (
                    <div key={`le-${i}`}>
                      • Ledger Row {le.row}: [{le.field}] {le.message} (received: "{String(le.received)}")
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Seed Quick Option */}
          <div className="p-4 rounded-xl glass-panel-subtle border border-amber-500/20 bg-amber-500/[0.03] flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center space-x-2">
                <Zap className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-semibold text-text-primary">One-Click Benchmark Dataset</span>
              </div>
              <p className="text-[11px] text-text-secondary">
                Populates 500 paired B2B transactions with realistic exact matches, timing lag, duplicates, and refunds.
              </p>
            </div>
            <button
              onClick={handleGenerateSeed}
              disabled={isGeneratingSeed || isUploading}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-navy-950 text-xs font-semibold shadow-glow-amber transition-all active:scale-98 disabled:opacity-50"
            >
              {isGeneratingSeed ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-navy-950" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <span>Generate Seed</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-white/10 w-full" />
            <span className="bg-navy-950 px-3 text-[11px] font-mono text-text-muted uppercase">Or upload CSVs</span>
          </div>

          {/* Drag and Drop Form */}
          <form onSubmit={handleFileUpload} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Bank CSV Box */}
              <div className="border-2 border-dashed border-white/10 hover:border-teal-500/50 hover:bg-teal-500/[0.02] rounded-xl p-4 text-center transition-all bg-white/[0.02]">
                <input
                  type="file"
                  id="bank-file"
                  accept=".csv"
                  onChange={(e) => setBankFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <label htmlFor="bank-file" className="cursor-pointer block space-y-2">
                  <div className="h-10 w-10 mx-auto rounded-lg bg-white/5 flex items-center justify-center text-text-secondary">
                    <FileSpreadsheet className="h-5 w-5 text-teal-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-text-primary">
                      {bankFile ? bankFile.name : 'Bank Statement CSV'}
                    </p>
                    <p className="text-[10px] text-text-muted font-mono">Required: date, amount, utr_ref, narration</p>
                  </div>
                </label>
              </div>

              {/* Ledger CSV Box */}
              <div className="border-2 border-dashed border-white/10 hover:border-teal-500/50 hover:bg-teal-500/[0.02] rounded-xl p-4 text-center transition-all bg-white/[0.02]">
                <input
                  type="file"
                  id="ledger-file"
                  accept=".csv"
                  onChange={(e) => setLedgerFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <label htmlFor="ledger-file" className="cursor-pointer block space-y-2">
                  <div className="h-10 w-10 mx-auto rounded-lg bg-white/5 flex items-center justify-center text-text-secondary">
                    <FileSpreadsheet className="h-5 w-5 text-teal-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-text-primary">
                      {ledgerFile ? ledgerFile.name : 'Internal Ledger CSV'}
                    </p>
                    <p className="text-[10px] text-text-muted font-mono">Required: date, amount, invoice_ref, payee</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isUploading || isGeneratingSeed || !bankFile || !ledgerFile}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-navy-950 text-xs font-semibold shadow-glow-teal transition-all active:scale-98 disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-navy-950" />
                    <span>Validating & Parsing...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-4 w-4" />
                    <span>Upload & Start Run</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
