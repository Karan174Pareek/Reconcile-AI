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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-[2px]"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          className="relative w-full max-w-5xl bg-white rounded-xl shadow-modal border border-gray-200 overflow-hidden z-10 my-8 flex flex-col max-h-[88vh]"
        >
          {/* Header */}
          <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2.5">
                  <h3 className="text-base font-bold text-gray-900 tracking-tight font-mono">
                    {settlementId}
                  </h3>
                  <span
                    className={`text-[10px] font-mono font-semibold uppercase px-2.5 py-0.5 rounded-full border ${
                      isBalanced
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-rose-50 border-rose-200 text-rose-700 font-bold'
                    }`}
                  >
                    {isBalanced ? 'Integrity Balanced' : 'Batch Total Mismatch'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Razorpay Settlement Batch Reconciliation Worksheet & Line Items
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content Area */}
          <div className="p-5 space-y-5 overflow-y-auto flex-1">
            {loading ? (
              <div className="py-16 text-center text-gray-500 font-mono text-xs animate-pulse">
                Unpacking settlement line items and computing MDR variances...
              </div>
            ) : error ? (
              <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-mono">
                Error loading settlement: {error}
              </div>
            ) : settlement ? (
              <>
                {/* Bank Credit & Settlement Header */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-lg border border-gray-200 bg-white">
                    <span className="text-[10px] text-gray-500 font-mono uppercase">Bank NEFT Credit</span>
                    <div className="text-lg font-bold text-gray-900 font-mono mt-1">
                      ₹{Number(settlement.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1 font-mono truncate">
                      UTR: {settlement.utr}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg border border-gray-200 bg-white">
                    <span className="text-[10px] text-gray-500 font-mono uppercase">Gross Order Volume</span>
                    <div className="text-lg font-bold text-gray-900 font-mono mt-1">
                      ₹{Number(settlement.gross_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1 font-mono">
                      {settlement.item_count} constituent orders
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg border border-gray-200 bg-white">
                    <span className="text-[10px] text-gray-500 font-mono uppercase">MDR Deducted (~2%)</span>
                    <div className="text-lg font-bold text-amber-700 font-mono mt-1">
                      ₹{Number(settlement.fees).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1 font-mono">
                      Payment gateway fee
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg border border-gray-200 bg-white">
                    <span className="text-[10px] text-gray-500 font-mono uppercase">18% GST (Claimable ITC)</span>
                    <div className="text-lg font-bold text-emerald-700 font-mono mt-1">
                      ₹{Number(settlement.tax).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1 font-mono">
                      Input Tax Credit eligible
                    </div>
                  </div>
                </div>

                {/* Granular Line-Items Table */}
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  <div className="p-3.5 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                    <span className="text-xs font-semibold text-gray-900 uppercase tracking-wider">
                      Constituent Order Line Items ({lineItems.length})
                    </span>
                    <span className="text-xs text-gray-500 font-mono">
                      Settled on {new Date(settlement.settled_at).toLocaleDateString('en-IN')}
                    </span>
                  </div>

                  <div className="overflow-x-auto max-h-72 overflow-y-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-gray-100 text-gray-700 text-[10px] uppercase sticky top-0 border-b border-gray-200">
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
                      <tbody className="divide-y divide-gray-200 text-gray-700">
                        {lineItems.map((li, idx) => (
                          <tr key={idx} className="hover:bg-gray-50 transition-colors">
                            <td className="py-2 px-3.5 font-medium text-gray-900">{li.payment_id}</td>
                            <td className="py-2 px-3.5 text-blue-600">{li.order_id || 'N/A'}</td>
                            <td className="py-2 px-3.5 uppercase text-[10px]">
                              <span
                                className={`px-2 py-0.5 rounded ${
                                  li.type === 'refund'
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {li.type}
                              </span>
                            </td>
                            <td className="py-2 px-3.5 text-right font-medium text-gray-900">
                              ₹{Number(li.amount).toFixed(2)}
                            </td>
                            <td className="py-2 px-3.5 text-right text-amber-700">
                              ₹{Number(li.fee).toFixed(2)}
                            </td>
                            <td className="py-2 px-3.5 text-right text-emerald-700">
                              ₹{Number(li.tax).toFixed(2)}
                            </td>
                            <td className="py-2 px-3.5 text-right font-bold text-gray-900">
                              ₹{Number(li.net_amount).toFixed(2)}
                            </td>
                            <td className="py-2 px-3.5 text-center">
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded border ${
                                  li.variance_category === 'refund_deduction'
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : li.variance_category === 'mdr_fee'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : 'bg-gray-100 text-gray-600 border-gray-200'
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
          <div className="p-4 border-t border-gray-200 flex items-center justify-between bg-gray-50 text-xs text-gray-500">
            <span>ReconcileAI Settlement Unpacking Engine</span>
            <button
              onClick={onClose}
              className="btn-secondary text-xs py-1.5 px-3"
            >
              Close Worksheet
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
