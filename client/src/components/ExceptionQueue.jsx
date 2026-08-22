import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Link as LinkIcon,
  Filter,
  Sparkles,
  Search,
  Check,
  X,
  Loader2,
  HelpCircle,
  FileSpreadsheet,
  Layers,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import SettlementDetailModal from './SettlementDetailModal';

const API_BASE = import.meta.env.VITE_SERVER_URL
  ? `${import.meta.env.VITE_SERVER_URL}/api`
  : 'http://localhost:5000/api';

const CATEGORY_COLORS = {
  mdr_fee: 'bg-teal-950/70 text-teal-400 border-teal-500/30',
  gst_on_mdr: 'bg-teal-950/70 text-teal-400 border-teal-500/30',
  refund_deduction: 'bg-coral-950/70 text-coral-400 border-coral-500/30',
  batch_imbalance: 'bg-coral-950/90 text-coral-300 border-coral-500/50 shadow-glow-coral font-bold',
  unrecorded: 'bg-amber-950/70 text-amber-400 border-amber-500/30',
  partial_settlement: 'bg-amber-950/70 text-amber-400 border-amber-500/30',
  rounding: 'bg-white/5 text-text-secondary border-white/10',
  duplicate: 'bg-amber-950/70 text-amber-400 border-amber-500/30',
  timing_lag: 'bg-teal-950/70 text-teal-400 border-teal-500/30',
  unknown: 'bg-white/5 text-text-secondary border-white/10',
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

  // Manual Mapping Modal State
  const [selectedExceptionForMap, setSelectedExceptionForMap] = useState(null);
  const [manualLedgerId, setManualLedgerId] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

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
    try {
      setResolvingId(exceptionId);
      await axios.post(`${API_BASE}/exceptions/${exceptionId}/resolve`, {
        decision,
        ...customData,
      });

      setExceptions((prev) =>
        prev.map((e) =>
          e.id === exceptionId || e.bank_record_id === exceptionId || e.payment_id === exceptionId
            ? { ...e, human_decision: decision, ...customData }
            : e
        )
      );

      if (onExceptionResolved) onExceptionResolved();
    } catch (err) {
      console.error('[ExceptionQueue] Resolve error:', err);
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
    'all',
    'batch_imbalance',
    'mdr_fee',
    'gst_on_mdr',
    'refund_deduction',
    'partial_settlement',
    'unrecorded',
    'unknown',
  ];

  return (
    <div className="space-y-4">
      {/* Search & Category Filter Bar */}
      <div className="glass-panel rounded-2xl p-4 shadow-glass flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search by order ID, settlement batch, UTR, or AI rationale..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-teal-500/50 transition-colors font-mono"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono whitespace-nowrap border transition-all cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-teal-500 text-navy-950 font-semibold border-teal-400 shadow-glow-teal'
                  : 'glass-ghost-btn hover:text-text-primary'
              }`}
            >
              {cat.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Exception Batches List */}
      {loading ? (
        <div className="glass-panel rounded-2xl p-12 text-center text-text-muted font-mono text-xs animate-pulse">
          Loading and grouping settlement exceptions...
        </div>
      ) : Object.keys(groupedBySettlement).length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center text-text-secondary font-mono text-xs">
          No exceptions found matching current filter criteria.
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
                transition={{ delay: groupIdx * 0.05 }}
                className={`glass-panel rounded-2xl p-5 shadow-glass border transition-all ${
                  hasImbalance
                    ? 'border-coral-500/40 bg-coral-950/[0.05]'
                    : 'border-white/10'
                }`}
              >
                {/* Batch Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-white/10">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`p-2 rounded-xl border text-xs ${
                        hasImbalance
                          ? 'bg-coral-950/70 border-coral-500/40 text-coral-400'
                          : 'bg-teal-950/70 border-teal-500/30 text-teal-400'
                      }`}
                    >
                      <Layers className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-text-primary font-mono tracking-tight">
                          {settlementKey}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                            hasImbalance
                              ? 'bg-coral-950/70 text-coral-400 border-coral-500/30'
                              : 'bg-teal-950/60 text-teal-400 border-teal-500/30'
                          }`}
                        >
                          {hasImbalance ? 'Batch Imbalanced' : 'Settlement Batch'}
                        </span>
                      </div>
                      <p className="text-[11px] text-text-secondary font-mono mt-0.5">
                        {batchExps.length} exception(s) requiring review in this settlement batch
                      </p>
                    </div>
                  </div>

                  {settlementKey.startsWith('setl_') && (
                    <button
                      onClick={() => setSelectedSettlementId(settlementKey)}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg glass-ghost-btn text-teal-400 hover:text-teal-300 text-xs font-mono transition-all cursor-pointer"
                    >
                      <span>Inspect Worksheet</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Exception Cards in this batch */}
                <div className="mt-4 space-y-3">
                  {batchExps.map((exp) => {
                    const expId = exp.id || exp._id?.toString() || exp.payment_id || exp.bank_record_id;
                    const isResolving = resolvingId === expId;

                    return (
                      <div
                        key={expId}
                        className="rounded-xl bg-white/[0.02] border border-white/10 p-4 transition-all hover:border-white/20"
                      >
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                          <div className="space-y-1.5 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full border ${
                                  CATEGORY_COLORS[exp.category] || CATEGORY_COLORS.unknown
                                }`}
                              >
                                {exp.category.replace(/_/g, ' ')}
                              </span>

                              {exp.order_id && (
                                <span className="text-[11px] font-mono text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                                  Order: {exp.order_id}
                                </span>
                              )}

                              {exp.payment_id && (
                                <span className="text-[11px] font-mono text-text-secondary bg-white/5 px-2 py-0.5 rounded border border-white/10">
                                  Payment: {exp.payment_id}
                                </span>
                              )}

                              <span className="text-[10px] font-mono text-text-muted">
                                Confidence: {(exp.confidence * 100).toFixed(0)}%
                              </span>
                            </div>

                            {/* Forensic Rationale */}
                            <p className="text-xs text-text-primary leading-relaxed mt-1">
                              {exp.ai_rationale}
                            </p>

                            {/* Financial breakdown */}
                            {(exp.expected_amount > 0 || exp.settled_amount > 0) && (
                              <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] font-mono text-text-secondary">
                                <span>Expected: ₹{Number(exp.expected_amount).toFixed(2)}</span>
                                <span>•</span>
                                <span>Settled: ₹{Number(exp.settled_amount).toFixed(2)}</span>
                                <span>•</span>
                                <span className="text-coral-400 font-semibold">
                                  Variance: ₹{Number(exp.variance_amount || 0).toFixed(2)}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Decision Action Buttons */}
                          <div className="flex items-center gap-2 self-end md:self-start">
                            {exp.human_decision === 'pending' ? (
                              <>
                                <button
                                  onClick={() => handleResolve(expId, 'accepted')}
                                  disabled={isResolving}
                                  className="px-3 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/30 text-xs font-mono font-medium transition-all flex items-center space-x-1 cursor-pointer"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  <span>Accept Diagnosis</span>
                                </button>
                                <button
                                  onClick={() => handleResolve(expId, 'rejected')}
                                  disabled={isResolving}
                                  className="px-3 py-1.5 rounded-lg bg-coral-500/10 hover:bg-coral-500/20 text-coral-400 border border-coral-500/30 text-xs font-mono font-medium transition-all flex items-center space-x-1 cursor-pointer"
                                >
                                  <X className="h-3.5 w-3.5" />
                                  <span>Reject</span>
                                </button>
                              </>
                            ) : (
                              <span className="text-[11px] font-mono uppercase px-2.5 py-1 rounded bg-white/5 border border-white/10 text-text-secondary">
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
