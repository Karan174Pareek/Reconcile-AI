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
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_SERVER_URL
  ? `${import.meta.env.VITE_SERVER_URL}/api`
  : 'http://localhost:5000/api';

const CATEGORY_COLORS = {
  duplicate: 'bg-amber-950/70 text-amber-400 border-amber-500/30',
  refund: 'bg-teal-950/70 text-teal-400 border-teal-500/30',
  bank_fee: 'bg-amber-950/70 text-amber-400 border-amber-500/30',
  timing_lag: 'bg-teal-950/70 text-teal-400 border-teal-500/30',
  unrecorded: 'bg-coral-950/70 text-coral-400 border-coral-500/30',
  unknown: 'bg-white/5 text-text-secondary border-white/10',
};

export default function ExceptionQueue({ runId, onExceptionResolved }) {
  const [exceptions, setExceptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [decisionFilter, setDecisionFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [resolvingId, setResolvingId] = useState(null);

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

      // Update local state
      setExceptions((prev) =>
        prev.map((e) =>
          e.id === exceptionId || e.bank_record_id === exceptionId
            ? { ...e, human_decision: decision, ...customData }
            : e
        )
      );

      if (onExceptionResolved) onExceptionResolved();
    } catch (err) {
      console.error('[Resolve Error]:', err);
      alert(err.response?.data?.error?.message || 'Failed to resolve exception');
    } finally {
      setResolvingId(null);
    }
  };

  const handleOpenManualModal = (exp) => {
    setSelectedExceptionForMap(exp);
    setManualLedgerId(exp.candidate_ledger_ids?.[0] || '');
    setManualNotes('');
  };

  const handleConfirmManualMap = async () => {
    if (!selectedExceptionForMap || !manualLedgerId) return;
    setIsSubmittingManual(true);
    await handleResolve(selectedExceptionForMap.id || selectedExceptionForMap.bank_record_id, 'manually_resolved', {
      manual_ledger_id: manualLedgerId,
      notes: manualNotes,
    });
    setIsSubmittingManual(false);
    setSelectedExceptionForMap(null);
  };

  // Filter exceptions by search
  const filteredExceptions = exceptions.filter((exp) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const bId = (exp.bank_record_id || '').toLowerCase();
    const narration = (exp.bank_record?.narration || '').toLowerCase();
    const cat = (exp.category || '').toLowerCase();
    return bId.includes(q) || narration.includes(q) || cat.includes(q);
  });

  return (
    <div className="glass-panel rounded-2xl shadow-glass overflow-hidden">
      {/* Header & Controls */}
      <div className="p-5 border-b border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2.5">
              <h3 className="text-base font-semibold text-text-primary tracking-tight">Exception Queue</h3>
              <span className="text-xs font-mono font-medium px-2.5 py-0.5 rounded-full bg-white/5 text-text-secondary border border-white/10">
                {filteredExceptions.length} items
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              Review and audit unresolvable transactions diagnosed by Claude AI reasoning
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-text-muted" />
            <input
              type="text"
              placeholder="Search by ID or narration..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 text-text-primary text-xs rounded-lg pl-9 pr-3 py-2 placeholder-text-muted font-mono focus:outline-none focus:ring-1 focus:ring-teal-500/50 focus:border-teal-500"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-medium text-text-secondary flex items-center space-x-1 mr-1">
            <Filter className="h-3 w-3 text-text-muted" />
            <span>Category:</span>
          </span>

          {['all', 'duplicate', 'bank_fee', 'timing_lag', 'unrecorded', 'refund', 'unknown'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium capitalize transition-all ${
                categoryFilter === cat
                  ? 'bg-teal-500 text-navy-950 font-semibold shadow-sm'
                  : 'bg-white/5 text-text-secondary hover:text-text-primary hover:bg-white/10 border border-white/5'
              }`}
            >
              {cat.replace('_', ' ')}
            </button>
          ))}

          <div className="h-4 w-px bg-white/10 mx-1 hidden sm:block" />

          <span className="text-[11px] font-medium text-text-secondary mr-1 hidden sm:inline">Status:</span>
          {['all', 'pending', 'accepted', 'rejected', 'manually_resolved'].map((dec) => (
            <button
              key={dec}
              onClick={() => setDecisionFilter(dec)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium capitalize transition-all ${
                decisionFilter === dec
                  ? 'bg-teal-500 text-navy-950 font-semibold shadow-sm'
                  : 'bg-white/5 text-text-secondary hover:text-text-primary hover:bg-white/10 border border-white/5'
              }`}
            >
              {dec.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Exception Table / List with Framer Motion Stagger */}
      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="h-6 w-6 text-teal-400 animate-spin" />
          <p className="text-xs text-text-secondary font-mono">Loading exceptions queue...</p>
        </div>
      ) : filteredExceptions.length === 0 ? (
        <div className="p-12 text-center space-y-2">
          <CheckCircle2 className="h-8 w-8 text-teal-400 mx-auto" />
          <h4 className="text-sm font-semibold text-text-primary">No Exceptions Found</h4>
          <p className="text-xs text-text-secondary">All transactions in this run have been matched or filter is empty.</p>
        </div>
      ) : (
        <div className="divide-y divide-white/5">
          <AnimatePresence>
            {filteredExceptions.map((exp, idx) => {
              const isResolving = resolvingId === exp.id || resolvingId === exp.bank_record_id;
              const bank = exp.bank_record;
              const candidates = exp.candidate_ledgers || [];
              const categoryBadge = CATEGORY_COLORS[exp.category] || CATEGORY_COLORS.unknown;
              const isPending = exp.human_decision === 'pending';

              return (
                <motion.div
                  key={exp._id || exp.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2, delay: idx * 0.03 }}
                  className="p-5 hover:bg-white/[0.02] transition-colors space-y-3.5"
                >
                  {/* Top Row: Category, Confidence, Decision Status, Bank ID */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-2.5">
                      <span className={`text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-md border capitalize ${categoryBadge}`}>
                        {exp.category?.replace('_', ' ')}
                      </span>
                      <span className="text-xs font-mono text-text-primary font-semibold">
                        {exp.bank_record_id}
                      </span>
                      {exp.confidence !== undefined && (
                        <span className="text-[11px] font-mono text-text-secondary bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                          {(exp.confidence * 100).toFixed(0)}% confidence
                        </span>
                      )}
                      {exp.ai_error && (
                        <span className="text-[10px] font-semibold font-mono bg-coral-950/80 text-coral-400 border border-coral-500/40 px-2 py-0.5 rounded-md">
                          AI RETRY FAILED
                        </span>
                      )}
                    </div>

                    {/* Decision Status Pill */}
                    <div>
                      {exp.human_decision === 'accepted' ? (
                        <span className="inline-flex items-center space-x-1 text-xs font-medium text-teal-400 bg-teal-950/60 border border-teal-500/30 px-2.5 py-1 rounded-lg">
                          <Check className="h-3 w-3" />
                          <span>Accepted</span>
                        </span>
                      ) : exp.human_decision === 'rejected' ? (
                        <span className="inline-flex items-center space-x-1 text-xs font-medium text-coral-400 bg-coral-950/60 border border-coral-500/30 px-2.5 py-1 rounded-lg">
                          <X className="h-3 w-3" />
                          <span>Rejected</span>
                        </span>
                      ) : exp.human_decision === 'manually_resolved' ? (
                        <span className="inline-flex items-center space-x-1 text-xs font-medium text-teal-400 bg-teal-950/60 border border-teal-500/30 px-2.5 py-1 rounded-lg font-mono">
                          <LinkIcon className="h-3 w-3" />
                          <span>Mapped to {exp.manual_ledger_id}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-xs font-medium text-amber-400 bg-amber-950/60 border border-amber-500/30 px-2.5 py-1 rounded-lg">
                          <HelpCircle className="h-3 w-3" />
                          <span>Pending Review</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bank Record and Candidate Comparison Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {/* Bank Record Box */}
                    <div className="glass-panel-subtle p-3.5 rounded-xl border border-white/5 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-text-secondary font-medium">Bank Transaction</span>
                        <span className="font-mono font-bold text-text-primary">
                          {bank ? `INR ${bank.amount?.toLocaleString()}` : 'N/A'}
                        </span>
                      </div>
                      <div className="text-xs text-text-primary/90 font-mono line-clamp-2">
                        {bank?.narration || 'No narration available'}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-text-muted pt-1 border-t border-white/5 font-mono">
                        <span>Date: {bank?.date ? new Date(bank.date).toLocaleDateString() : 'N/A'}</span>
                        <span>Ref: {bank?.utr_ref || 'N/A'}</span>
                      </div>
                    </div>

                    {/* Candidate Ledger Records Box */}
                    <div className="glass-panel-subtle p-3.5 rounded-xl border border-white/5 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-text-secondary font-medium">Candidate Ledger Records</span>
                        <span className="text-[11px] font-mono text-text-muted">
                          {candidates.length} candidate(s)
                        </span>
                      </div>
                      {candidates.length === 0 ? (
                        <div className="text-xs text-text-muted italic py-2">
                          No ledger entries within proximity window (unrecorded or fee)
                        </div>
                      ) : (
                        <div className="space-y-1 max-h-20 overflow-y-auto">
                          {candidates.map((cand) => (
                            <div
                              key={cand.id}
                              className="flex items-center justify-between text-[11px] bg-white/5 p-1.5 rounded-lg border border-white/5 font-mono"
                            >
                              <span className="text-text-secondary truncate max-w-[140px]">
                                {cand.payee || cand.invoice_ref}
                              </span>
                              <span className="font-semibold text-text-primary">
                                INR {cand.amount?.toLocaleString()}
                              </span>
                              <span className="text-text-muted text-[10px]">
                                {new Date(cand.date).toLocaleDateString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Claude AI Rationale Box */}
                  {exp.ai_rationale && (
                    <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-amber-500/[0.04] border border-amber-500/20 text-xs">
                      <Sparkles className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                      <div className="text-text-primary/90 space-y-0.5">
                        <span className="font-semibold text-amber-400 mr-1.5 font-mono">Claude AI Rationale:</span>
                        <span>{exp.ai_rationale}</span>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons for Pending Review */}
                  {isPending && (
                    <div className="flex items-center justify-end space-x-2.5 pt-1">
                      <button
                        onClick={() => handleResolve(exp.id || exp.bank_record_id, 'accepted')}
                        disabled={isResolving}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-navy-950 text-xs font-semibold shadow-glow-teal transition-all active:scale-98 disabled:opacity-50"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Accept AI Diagnosis</span>
                      </button>

                      <button
                        onClick={() => handleResolve(exp.id || exp.bank_record_id, 'rejected')}
                        disabled={isResolving}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-coral-950/60 text-text-secondary hover:text-coral-300 border border-white/10 hover:border-coral-500/40 text-xs font-semibold transition-all disabled:opacity-50"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>Reject</span>
                      </button>

                      <button
                        onClick={() => handleOpenManualModal(exp)}
                        disabled={isResolving}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-text-primary text-xs font-semibold transition-all active:scale-98 disabled:opacity-50"
                      >
                        <LinkIcon className="h-3.5 w-3.5 text-teal-400" />
                        <span>Manually Map...</span>
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Manual Resolution Modal */}
      {selectedExceptionForMap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md animate-fadeIn">
          <div className="glass-panel border border-white/15 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-glass">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h4 className="text-sm font-semibold text-text-primary">Manual Ledger Mapping</h4>
                <p className="text-xs text-text-secondary font-mono">
                  Bank Record: {selectedExceptionForMap.bank_record_id}
                </p>
              </div>
              <button
                onClick={() => setSelectedExceptionForMap(null)}
                className="p-1 rounded-lg text-text-muted hover:text-text-primary transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Candidate Quick Selection */}
              {selectedExceptionForMap.candidate_ledgers?.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text-secondary">Select Existing Candidate:</label>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {selectedExceptionForMap.candidate_ledgers.map((cand) => (
                      <button
                        key={cand.id}
                        type="button"
                        onClick={() => setManualLedgerId(cand.id)}
                        className={`w-full text-left p-2.5 rounded-lg border text-xs flex items-center justify-between transition-all ${
                          manualLedgerId === cand.id
                            ? 'bg-teal-500/10 border-teal-500/40 text-teal-300'
                            : 'bg-white/5 border-white/5 text-text-secondary hover:bg-white/10 hover:text-text-primary'
                        }`}
                      >
                        <span className="font-mono font-semibold">{cand.id}</span>
                        <span>{cand.payee}</span>
                        <span className="font-mono font-bold">INR {cand.amount}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Or Manual Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">Ledger Record ID:</label>
                <input
                  type="text"
                  placeholder="e.g. LED-12345"
                  value={manualLedgerId}
                  onChange={(e) => setManualLedgerId(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-text-primary text-xs rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-1 focus:ring-teal-500/50 focus:border-teal-500"
                />
              </div>

              {/* Auditor Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">Auditor Notes (Optional):</label>
                <textarea
                  placeholder="State reason for manual mapping override..."
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 text-text-primary text-xs rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-teal-500/50 focus:border-teal-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setSelectedExceptionForMap(null)}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold text-text-muted hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmManualMap}
                disabled={isSubmittingManual || !manualLedgerId}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-navy-950 text-xs font-semibold shadow-glow-teal transition-all active:scale-98 disabled:opacity-50"
              >
                {isSubmittingManual ? <Loader2 className="h-4 w-4 animate-spin text-navy-950" /> : <Check className="h-4 w-4" />}
                <span>Confirm Mapping</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
