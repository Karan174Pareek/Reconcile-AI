import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Layers,
  ShieldCheck,
  AlertTriangle,
  Receipt,
  FileCheck,
  ArrowRight,
  ExternalLink,
  Percent,
} from 'lucide-react';

export default function SettlementDetailModal({
  isOpen,
  onClose,
  runId,
  settlementId,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !settlementId || !runId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(`/api/runs/${runId}/settlements/${settlementId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (isMounted) {
          setData(json.data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, runId, settlementId]);

  if (!isOpen) return null;

  const settlement = data?.settlement;
  const lineItems = data?.line_items || [];
  const bankRecord = data?.bankRecord;

  const isBalanced = settlement?.integrity_status === 'balanced';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-navy-950/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-5xl glass-panel rounded-2xl shadow-glass border border-white/15 overflow-hidden z-10 my-8 flex flex-col max-h-[88vh]"
        >
          {/* Header */}
          <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2.5">
                  <h3 className="text-base font-bold text-text-primary tracking-tight font-mono">
                    {settlementId}
                  </h3>
                  <span
                    className={`text-[10px] font-mono font-semibold uppercase px-2.5 py-0.5 rounded-full border ${
                      isBalanced
                        ? 'bg-teal-950/60 border-teal-500/30 text-teal-400'
                        : 'bg-coral-950/60 border-coral-500/30 text-coral-400'
                    }`}
                  >
                    {isBalanced ? 'Integrity Balanced' : 'Batch Imbalance'}
                  </span>
                </div>
                <p className="text-xs text-text-secondary mt-0.5">
                  Razorpay Settlement Batch Reconciliation Worksheet & Unpacked Line Items
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content Area */}
          <div className="p-5 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
            {loading ? (
              <div className="py-16 text-center text-text-muted font-mono text-xs animate-pulse">
                Unpacking settlement line items and computing MDR variances...
              </div>
            ) : error ? (
              <div className="p-4 rounded-xl bg-coral-950/40 border border-coral-500/30 text-coral-400 text-xs font-mono">
                Error loading settlement: {error}
              </div>
            ) : settlement ? (
              <>
                {/* Bank Credit & Settlement Header */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="glass-panel-subtle rounded-xl p-3.5 border border-white/10">
                    <span className="text-[10px] text-text-muted font-mono uppercase">Bank NEFT Credit</span>
                    <div className="text-lg font-bold text-teal-400 font-mono mt-1">
                      ₹{Number(settlement.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] text-text-secondary mt-1 font-mono truncate">
                      UTR: {settlement.utr}
                    </div>
                  </div>

                  <div className="glass-panel-subtle rounded-xl p-3.5 border border-white/10">
                    <span className="text-[10px] text-text-muted font-mono uppercase">Gross Order Volume</span>
                    <div className="text-lg font-bold text-text-primary font-mono mt-1">
                      ₹{Number(settlement.gross_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] text-text-secondary mt-1 font-mono">
                      {settlement.item_count} constituent orders
                    </div>
                  </div>

                  <div className="glass-panel-subtle rounded-xl p-3.5 border border-white/10">
                    <span className="text-[10px] text-text-muted font-mono uppercase">MDR Deducted (~2%)</span>
                    <div className="text-lg font-bold text-amber-400 font-mono mt-1">
                      ₹{Number(settlement.fees).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] text-text-secondary mt-1 font-mono">
                      Payment gateway fee
                    </div>
                  </div>

                  <div className="glass-panel-subtle rounded-xl p-3.5 border border-white/10">
                    <span className="text-[10px] text-text-muted font-mono uppercase">18% GST (Claimable ITC)</span>
                    <div className="text-lg font-bold text-teal-400 font-mono mt-1">
                      ₹{Number(settlement.tax).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] text-text-secondary mt-1 font-mono">
                      Input Tax Credit eligible
                    </div>
                  </div>
                </div>

                {/* Granular Line-Items Table */}
                <div className="glass-panel rounded-xl border border-white/10 overflow-hidden">
                  <div className="p-3.5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                    <span className="text-xs font-semibold text-text-primary font-mono uppercase tracking-wider">
                      Constituent Order Line Items ({lineItems.length})
                    </span>
                    <span className="text-[11px] text-text-muted font-mono">
                      Settled on {new Date(settlement.settled_at).toLocaleDateString('en-IN')}
                    </span>
                  </div>

                  <div className="overflow-x-auto max-h-72 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-navy-950/80 text-text-muted text-[10px] uppercase sticky top-0 border-b border-white/10">
                        <tr>
                          <th className="py-2.5 px-3.5">Payment ID</th>
                          <th className="py-2.5 px-3.5">Order ID</th>
                          <th className="py-2.5 px-3.5">Type</th>
                          <th className="py-2.5 px-3.5 text-right">Gross Amount</th>
                          <th className="py-2.5 px-3.5 text-right">MDR (2%)</th>
                          <th className="py-2.5 px-3.5 text-right">GST (18%)</th>
                          <th className="py-2.5 px-3.5 text-right">Net Settled</th>
                          <th className="py-2.5 px-3.5 text-center">Variance Category</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-text-secondary">
                        {lineItems.map((li, idx) => (
                          <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-2 px-3.5 text-text-primary">{li.payment_id}</td>
                            <td className="py-2 px-3.5 text-teal-400">{li.order_id || 'N/A'}</td>
                            <td className="py-2 px-3.5 uppercase text-[10px]">
                              <span
                                className={`px-2 py-0.5 rounded ${
                                  li.type === 'refund'
                                    ? 'bg-coral-950/60 text-coral-400 border border-coral-500/30'
                                    : 'bg-white/5 text-text-secondary'
                                }`}
                              >
                                {li.type}
                              </span>
                            </td>
                            <td className="py-2 px-3.5 text-right font-semibold text-text-primary">
                              ₹{Number(li.amount).toFixed(2)}
                            </td>
                            <td className="py-2 px-3.5 text-right text-amber-400">
                              ₹{Number(li.fee).toFixed(2)}
                            </td>
                            <td className="py-2 px-3.5 text-right text-teal-400">
                              ₹{Number(li.tax).toFixed(2)}
                            </td>
                            <td className="py-2 px-3.5 text-right font-bold text-text-primary">
                              ₹{Number(li.net_amount).toFixed(2)}
                            </td>
                            <td className="py-2 px-3.5 text-center">
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded border ${
                                  li.variance_category === 'refund_deduction'
                                    ? 'bg-coral-950/60 text-coral-400 border-coral-500/30'
                                    : li.variance_category === 'mdr_fee'
                                    ? 'bg-teal-950/60 text-teal-400 border-teal-500/30'
                                    : 'bg-white/5 text-text-muted border-white/10'
                                }`}
                              >
                                {li.variance_category || 'none'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : null}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/10 flex items-center justify-between bg-white/[0.02] text-xs font-mono text-text-muted">
            <span>ReconcileAI 3-Level Razorpay Unpacking Engine</span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg glass-ghost-btn hover:text-text-primary cursor-pointer text-xs"
            >
              Close Worksheet
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
