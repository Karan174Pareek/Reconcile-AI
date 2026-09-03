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
  : '/api';

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
      }, 1200);
    } catch (err) {
      console.error('[Upload Error]:', err);
      const resError = err.response?.data?.error;
      setErrorDetails({
        message: resError?.message || 'Failed to upload and validate CSV files',
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
      const recordCount = res.data.stats?.total_order_line_items ?? res.data.stats?.total_records ?? res.data.stats?.bank_credits ?? 0;
      setSuccessMessage(`Synthetic seed generated for run ${res.data.run_id} (${recordCount} records)!`);
      if (onRunCreated) {
        onRunCreated(res.data.run_id);
      }
      setTimeout(() => {
        onClose();
      }, 1200);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-[2px] animate-fadeIn">
      <div className="bg-white border border-gray-200 rounded-xl max-w-2xl w-full shadow-modal overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Initialize Reconciliation Run</h3>
            <p className="text-xs text-gray-500">Upload CSV files or generate a 500-record benchmark batch</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Success Banner */}
          {successMessage && (
            <div className="flex items-center space-x-2.5 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Error Banner */}
          {errorDetails && (
            <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-2">
              <div className="flex items-center space-x-2 font-semibold">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{errorDetails.message}</span>
              </div>
              {errorDetails.details && (
                <div className="max-h-36 overflow-y-auto font-mono text-[11px] bg-white p-2.5 rounded border border-rose-200 space-y-1 text-rose-900">
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
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center space-x-2">
                <Zap className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-semibold text-gray-900">One-Click Benchmark Dataset</span>
              </div>
              <p className="text-xs text-gray-600">
                Instantly loads 500 paired B2B transactions with realistic exact matches, timing lag, duplicates, and refunds.
              </p>
            </div>
            <button
              onClick={handleGenerateSeed}
              disabled={isGeneratingSeed || isUploading}
              className="btn-primary text-xs py-2 px-3.5 whitespace-nowrap self-start sm:self-auto shadow-sm"
            >
              {isGeneratingSeed ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <span>Load Benchmark Data</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-gray-200 w-full" />
            <span className="bg-white px-3 text-xs font-semibold text-gray-400 uppercase">Or upload CSVs</span>
          </div>

          {/* Upload Form */}
          <form onSubmit={handleFileUpload} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Bank CSV Box */}
              <div className="border-2 border-dashed border-gray-200 hover:border-blue-500 hover:bg-blue-50/30 rounded-xl p-4 text-center transition-colors bg-gray-50/50">
                <input
                  type="file"
                  id="bank-file"
                  accept=".csv"
                  onChange={(e) => setBankFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <label htmlFor="bank-file" className="cursor-pointer block space-y-2">
                  <div className="h-10 w-10 mx-auto rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 shadow-sm">
                    <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-900">
                      {bankFile ? bankFile.name : 'Bank Statement CSV'}
                    </p>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">Required: date, amount, utr_ref, narration</p>
                  </div>
                </label>
              </div>

              {/* Ledger CSV Box */}
              <div className="border-2 border-dashed border-gray-200 hover:border-blue-500 hover:bg-blue-50/30 rounded-xl p-4 text-center transition-colors bg-gray-50/50">
                <input
                  type="file"
                  id="ledger-file"
                  accept=".csv"
                  onChange={(e) => setLedgerFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <label htmlFor="ledger-file" className="cursor-pointer block space-y-2">
                  <div className="h-10 w-10 mx-auto rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 shadow-sm">
                    <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-900">
                      {ledgerFile ? ledgerFile.name : 'Internal Ledger CSV'}
                    </p>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">Required: date, amount, invoice_ref, payee</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isUploading || isGeneratingSeed || !bankFile || !ledgerFile}
                className="btn-primary text-xs py-2 px-4 shadow-sm"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
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
