import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  Check,
  X,
  Loader2,
  Layers,
  ExternalLink,
  HelpCircle,
  Filter,
} from 'lucide-react';
import SettlementDetailModal from './SettlementDetailModal.jsx';

const API_BASE = import.meta.env.VITE_SERVER_URL
  ? `${import.meta.env.VITE_SERVER_URL}/api`
  : '/api';

const CATEGORY_META = {
  mdr_fee: {
    label: 'Gateway Fee (MDR ~2%)',
    style: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  gst_on_mdr: {
    label: 'GST on Gateway Fee (18% Tax Credit)',
    style: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  refund_deduction: {
    label: 'Customer Refund Deducted',
    style: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  batch_imbalance: {
    label: 'Settlement Batch Mismatch',
    style: 'bg-red-100 text-red-800 border-red-300 font-bold',
  },
  unrecorded: {
    label: 'Unrecorded Bank Deposit',
    style: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  partial_settlement: {
    label: 'Partial Settlement',
    style: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  rounding: {
    label: 'Rounding Difference (<₹1.00)',
    style: 'bg-gray-100 text-gray-700 border-gray-200',
  },
  duplicate: {
    label: 'Duplicate Transaction Flag',
    style: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  timing_lag: {
    label: 'Timing Lag (T+2 Settlement)',
    style: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  unknown: {
    label: 'Unclassified Variance',
    style: 'bg-gray-100 text-gray-700 border-gray-200',
  },
};

export default function ExceptionQueue({ runId, onExceptionResolved }) {
  const [exceptions, setExceptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [decisionFilter, setDecisionFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [resolvingId, setResolvingId] = useState(null);

  // Settlement Detail Modal State
  const [selectedSettlementId, setSelectedSettlementId] = useState(null);

  const fetchExceptions = async () => {
    if (!runId) return;
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/runs/${runId}/exceptions`, {
        params: {
          category: categoryFilter,
          decision: decisionFilter,
        },
      });
      setExceptions(res.data.data || []);
    } catch (err) {
      console.error('[ExceptionQueue] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExceptions();
  }, [runId, categoryFilter, decisionFilter]);

  const handleResolve = async (exceptionId, decision, customData = {}) => {
    // Optimistic UI state update immediately (0ms latency)
    setExceptions((prev) =>
      prev.map((e) => {
        const isTarget =
          (e._id && String(e._id) === String(exceptionId)) ||
          (e.id && String(e.id) === String(exceptionId)) ||
          (e.bank_record_id && String(e.bank_record_id) === String(exceptionId)) ||
          (e.payment_id && String(e.payment_id) === String(exceptionId)) ||
          (e.order_id && String(e.order_id) === String(exceptionId));
        return isTarget
          ? { ...e, human_decision: decision, ...customData }
          : e;
      })
    );

    try {
      setResolvingId(exceptionId);
      await axios.post(`${API_BASE}/exceptions/${exceptionId}/resolve`, {
        decision,
        ...customData,
      });

      if (onExceptionResolved) onExceptionResolved();
    } catch (err) {
      console.warn('[ExceptionQueue] Resolve background sync note:', err.message);
    } finally {
      setResolvingId(null);
    }
  };

  const filteredExceptions = exceptions.filter((exp) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const rationale = (exp.ai_rationale || '').toLowerCase();
    const cat = (exp.category || '').toLowerCase();
    const setl = (exp.settlement_id || '').toLowerCase();
    const order = (exp.order_id || '').toLowerCase();
    const pId = (exp.payment_id || '').toLowerCase();
    const bankId = (exp.bank_record_id || '').toLowerCase();
    return (
      rationale.includes(query) ||
      cat.includes(query) ||
      setl.includes(query) ||
      order.includes(query) ||
      pId.includes(query) ||
      bankId.includes(query)
    );
  });

  // Group exceptions by settlement_id
  const groupedBySettlement = filteredExceptions.reduce((acc, exp) => {
    const key = exp.settlement_id || 'General Bank Exceptions';
    if (!acc[key]) acc[key] = [];
    acc[key].push(exp);
    return acc;
  }, {});

  const categories = [
    { id: 'all', label: 'All Exceptions' },
    { id: 'batch_imbalance', label: 'Batch Mismatches' },
    { id: 'mdr_fee', label: 'Gateway Fees' },
    { id: 'gst_on_mdr', label: 'Tax Credits (GST)' },
    { id: 'refund_deduction', label: 'Refunds' },
    { id: 'unrecorded', label: 'Unrecorded' },
  ];

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Screen Title & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
        <div>
          <h2 className="text-lg font-bold text-gray-900 tracking-tight">Exception & Variance Queue</h2>
          <p className="text-xs text-gray-500">
            Review transactions where bank records differ from internal ledger entries. Accept suggested explanations or reject them.
          </p>
        </div>
        <span className="text-xs font-mono text-gray-500 self-start sm:self-auto bg-gray-100 px-2.5 py-1 rounded-md border border-gray-200">
          {filteredExceptions.length} exception records
        </span>
      </div>

      {/* Filter and Search Bar */}
      <div className="card-base p-4 bg-white border border-gray-200 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shadow-sm">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by order ID, settlement batch, UTR, or diagnosis..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-mono"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                categoryFilter === cat.id
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Exception Batches List */}
      {loading ? (
        <div className="card-base p-12 text-center text-gray-500 text-xs animate-pulse bg-white border border-gray-200">
          Loading exception records and grouping settlement worksheets...
        </div>
      ) : Object.keys(groupedBySettlement).length === 0 ? (
        <div className="card-base p-12 text-center text-gray-500 text-xs bg-white border border-gray-200 space-y-2">
          <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
          <p className="font-semibold text-gray-900">No exceptions found</p>
          <p className="text-gray-500 max-w-sm mx-auto">
            All records in the current filter criteria have been matched or approved.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedBySettlement).map(([settlementKey, batchExps], groupIdx) => {
            const hasImbalance = batchExps.some((e) => e.category === 'batch_imbalance');

            return (
              <motion.div
                key={settlementKey}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: groupIdx * 0.04 }}
                className={`card-base p-5 bg-white border shadow-sm transition-all ${
                  hasImbalance ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-200'
                }`}
              >
                {/* Batch Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`p-2 rounded-lg border ${
                        hasImbalance
                          ? 'bg-rose-50 border-rose-200 text-rose-700'
                          : 'bg-blue-50 border-blue-200 text-blue-700'
                      }`}
                    >
                      <Layers className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-gray-900 font-mono">
                          {settlementKey}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                            hasImbalance
                              ? 'bg-rose-50 text-rose-700 border-rose-200 font-semibold'
                              : 'bg-gray-100 text-gray-700 border-gray-200'
                          }`}
                        >
                          {hasImbalance ? 'Batch Total Mismatch' : 'Settlement Batch'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {batchExps.length} exception(s) requiring review in this settlement payout
                      </p>
                    </div>
                  </div>

                  {settlementKey.startsWith('setl_') && (
                    <button
                      onClick={() => setSelectedSettlementId(settlementKey)}
                      className="btn-secondary text-xs py-1.5 px-3 self-start sm:self-auto"
                    >
                      <span>Inspect Payout Worksheet</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Exception Cards in this batch */}
                <div className="mt-4 space-y-3">
                  {batchExps.map((exp) => {
                    const expId = exp.id || exp._id?.toString() || exp.payment_id || exp.bank_record_id;
                    const isResolving = resolvingId === expId;
                    const meta = CATEGORY_META[exp.category] || CATEGORY_META.unknown;
                    const confidencePercent = Math.round((exp.confidence || 0.85) * 100);

                    return (
                      <div
                        key={expId}
                        className="rounded-lg bg-white border border-slate-200/80 p-3.5 sm:p-4 shadow-2xs hover:border-slate-300 transition-all space-y-3"
                      >
                        {/* Header: Category Badge + References + High Contrast Confidence Pill */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${meta.style}`}
                            >
                              {meta.label}
                            </span>

                            {exp.order_id && (
                              <span className="text-[11px] font-mono text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 font-medium">
                                ORDER: {exp.order_id}
                              </span>
                            )}

                            {exp.payment_id && (
                              <span className="text-[11px] font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                                PAY: {exp.payment_id}
                              </span>
                            )}
                          </div>

                          {/* High Contrast Confidence Pill */}
                          <div className="flex items-center space-x-1.5 bg-slate-100/80 border border-slate-200 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold text-slate-700">
                            <div className="w-10 h-1.5 bg-slate-200 rounded-full overflow-hidden shrink-0">
                              <div
                                className={`h-full ${confidencePercent >= 90 ? 'bg-emerald-500' : confidencePercent >= 75 ? 'bg-blue-500' : 'bg-amber-500'}`}
                                style={{ width: `${confidencePercent}%` }}
                              />
                            </div>
                            <span>{confidencePercent}% CONFIDENCE</span>
                          </div>
                        </div>

                        {/* 3-Column Split Amounts View */}
                        <div className="grid grid-cols-3 gap-2 bg-slate-50/80 border border-slate-200/80 rounded-md p-2.5 text-xs font-mono">
                          <div>
                            <span className="text-[10px] text-slate-500 block uppercase font-sans font-semibold">EXPECTED GROSS</span>
                            <span className="text-slate-900 font-bold">₹{Number(exp.expected_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block uppercase font-sans font-semibold">SETTLED NET</span>
                            <span className="text-slate-900 font-bold">₹{Number(exp.settled_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block uppercase font-sans font-semibold">VARIANCE</span>
                            <span className={`font-bold ${Number(exp.variance_amount || 0) > 0 ? 'text-rose-700' : 'text-slate-700'}`}>
                              ₹{Number(exp.variance_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>

                        {/* AI Rationale Diagnosis Box */}
                        <div className="bg-slate-50 border border-slate-200/80 rounded p-2.5 text-xs text-slate-700 font-sans leading-relaxed">
                          <span className="font-bold text-slate-900 text-[10px] uppercase font-mono block mb-0.5">AI DIAGNOSIS:</span>
                          {exp.ai_rationale}
                        </div>

                        {/* Action Toolbar */}
                        <div className="flex items-center justify-between pt-1">
                          <div className="text-[10px] text-slate-500 font-mono">
                            Category: <span className="font-semibold text-slate-700">{exp.category}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            {exp.human_decision === 'pending' ? (
                              <>
                                <button
                                  onClick={() => handleResolve(expId, 'accepted')}
                                  disabled={isResolving}
                                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-[#0B72E7] hover:bg-[#0858B4] active:scale-[0.98] text-white text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 shadow-xs"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  <span>Accept AI Match</span>
                                </button>
                                <button
                                  onClick={() => handleResolve(expId, 'rejected')}
                                  disabled={isResolving}
                                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 active:scale-[0.98] text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
                                >
                                  <X className="h-3.5 w-3.5" />
                                  <span>Reject</span>
                                </button>
                              </>
                            ) : (
                              <span
                                className={`text-[10px] font-mono font-semibold uppercase px-2.5 py-1 rounded border ${
                                  exp.human_decision === 'accepted'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                }`}
                              >
                                {exp.human_decision}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Interactive Settlement Detail Worksheet Modal */}
      <SettlementDetailModal
        isOpen={!!selectedSettlementId}
        onClose={() => setSelectedSettlementId(null)}
        runId={runId}
        settlementId={selectedSettlementId}
      />
    </div>
  );
}
