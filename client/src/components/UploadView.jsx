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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-850/50">
          <div>
            <h3 className="text-base font-semibold text-white">Initialize Reconciliation Run</h3>
            <p className="text-xs text-slate-400">Upload CSV files or generate a synthetic benchmark batch</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Success Banner */}
          {successMessage && (
            <div className="flex items-center space-x-2.5 p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Error Banner */}
          {errorDetails && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs space-y-2">
              <div className="flex items-center space-x-2 font-medium">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{errorDetails.message}</span>
              </div>
              {errorDetails.details && (
                <div className="max-h-36 overflow-y-auto font-mono text-[11px] bg-black/40 p-2.5 rounded-lg space-y-1 text-rose-300/90">
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
          <div className="p-4 rounded-xl bg-slate-850 border border-slate-750 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center space-x-2">
                <Zap className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-semibold text-slate-200">One-Click Benchmark Dataset</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Populates 500 paired B2B transactions with realistic exact matches, timing lag, duplicates, and refunds.
              </p>
            </div>
            <button
              onClick={handleGenerateSeed}
              disabled={isGeneratingSeed || isUploading}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold shadow-md shadow-amber-500/20 transition-all disabled:opacity-50"
            >
              {isGeneratingSeed ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
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
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-slate-900 px-3 text-[11px] font-mono text-slate-500 uppercase">Or upload CSVs</span>
          </div>

          {/* Drag and Drop Form */}
          <form onSubmit={handleFileUpload} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Bank CSV Box */}
              <div className="border-2 border-dashed border-slate-750 hover:border-brand-500/50 rounded-xl p-4 text-center transition-colors bg-slate-850/40">
                <input
                  type="file"
                  id="bank-file"
                  accept=".csv"
                  onChange={(e) => setBankFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <label htmlFor="bank-file" className="cursor-pointer block space-y-2">
                  <div className="h-10 w-10 mx-auto rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                    <FileSpreadsheet className="h-5 w-5 text-brand-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-200">
                      {bankFile ? bankFile.name : 'Bank Statement CSV'}
                    </p>
                    <p className="text-[10px] text-slate-400">Required: date, amount, utr_ref, narration</p>
                  </div>
                </label>
              </div>

              {/* Ledger CSV Box */}
              <div className="border-2 border-dashed border-slate-750 hover:border-brand-500/50 rounded-xl p-4 text-center transition-colors bg-slate-850/40">
                <input
                  type="file"
                  id="ledger-file"
                  accept=".csv"
                  onChange={(e) => setLedgerFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <label htmlFor="ledger-file" className="cursor-pointer block space-y-2">
                  <div className="h-10 w-10 mx-auto rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                    <FileSpreadsheet className="h-5 w-5 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-200">
                      {ledgerFile ? ledgerFile.name : 'Internal Ledger CSV'}
                    </p>
                    <p className="text-[10px] text-slate-400">Required: date, amount, invoice_ref, payee</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isUploading || isGeneratingSeed || !bankFile || !ledgerFile}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-600/20 transition-all disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
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
