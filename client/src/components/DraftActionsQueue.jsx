import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Send,
  FileCheck2,
  Mail,
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
  Check,
  X,
  Sparkles,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_SERVER_URL
  ? `${import.meta.env.VITE_SERVER_URL}/api`
  : 'http://localhost:5000/api';

export default function DraftActionsQueue({ runId }) {
  const [draftActions, setDraftActions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actioningId, setActioningId] = useState(null);

  const fetchDraftActions = async () => {
    if (!runId) return;
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/draft-actions/run/${runId}`);
      setDraftActions(res.data.data || []);
    } catch (err) {
      console.error('[DraftActionsQueue] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDraftActions();
  }, [runId]);

  const handleUpdateStatus = async (draftId, status) => {
    try {
      setActioningId(draftId);
      await axios.post(`${API_BASE}/draft-actions/${draftId}/status`, {
        status,
      });

      setDraftActions((prev) =>
        prev.map((d) => (d._id === draftId ? { ...d, status } : d))
      );
    } catch (err) {
      console.error('[Draft Action Error]:', err);
      alert('Failed to update draft action status');
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-semibold text-white">Remediation Draft Actions</h3>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {draftActions.length} drafts
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Auto-generated vendor communications and adjusting journal entries ready for human review
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="h-6 w-6 text-brand-400 animate-spin" />
          <p className="text-xs text-slate-400">Loading draft actions...</p>
        </div>
      ) : draftActions.length === 0 ? (
        <div className="p-12 text-center space-y-2">
          <Send className="h-8 w-8 text-slate-500 mx-auto" />
          <h4 className="text-sm font-semibold text-slate-200">No Draft Actions Pending</h4>
          <p className="text-xs text-slate-400">
            Unrecorded transactions or refunds identified in Pass 3 will appear here with auto-drafted actions.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-800">
          {draftActions.map((draft) => {
            const isEmail = draft.action_type === 'vendor_email';
            const content = draft.draft_content || {};
            const isPending = draft.status === 'pending_approval';
            const isActioning = actioningId === draft._id;

            return (
              <div key={draft._id} className="p-5 hover:bg-slate-850/40 transition-colors space-y-3">
                {/* Header info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-xs font-mono font-semibold px-2.5 py-1 rounded-lg border flex items-center space-x-1.5 ${
                        isEmail
                          ? 'bg-blue-950/60 text-blue-400 border-blue-800'
                          : 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                      }`}
                    >
                      {isEmail ? <Mail className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                      <span className="capitalize">{draft.action_type.replace('_', ' ')}</span>
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      Exception Ref: {draft.exception_id}
                    </span>
                    {draft.confidence && (
                      <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                        {(draft.confidence * 100).toFixed(0)}% AI confidence
                      </span>
                    )}
                  </div>

                  <div className="text-xs">
                    {draft.status === 'approved' ? (
                      <span className="inline-flex items-center space-x-1 text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2.5 py-1 rounded-lg font-medium">
                        <Check className="h-3 w-3" />
                        <span>Approved & Dispatched</span>
                      </span>
                    ) : draft.status === 'rejected' ? (
                      <span className="inline-flex items-center space-x-1 text-rose-400 bg-rose-950/60 border border-rose-800 px-2.5 py-1 rounded-lg font-medium">
                        <X className="h-3 w-3" />
                        <span>Rejected</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 text-amber-400 bg-amber-950/60 border border-amber-800 px-2.5 py-1 rounded-lg font-medium">
                        <span>Pending Approval</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Content Details */}
                <div className="bg-slate-850 p-4 rounded-xl border border-slate-750 space-y-2 text-xs">
                  {isEmail ? (
                    <div className="space-y-2 font-mono">
                      <div className="text-slate-400">
                        <span className="text-slate-500 font-semibold mr-2">TO:</span>
                        <span className="text-slate-200">{content.recipient}</span>
                      </div>
                      <div className="text-slate-400">
                        <span className="text-slate-500 font-semibold mr-2">SUBJECT:</span>
                        <span className="text-slate-200 font-semibold">{content.subject}</span>
                      </div>
                      <div className="pt-2 border-t border-slate-800 text-slate-300 whitespace-pre-line font-sans text-xs">
                        {content.body}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                      <div>
                        <span className="text-slate-500 text-[10px] block">ENTRY TYPE</span>
                        <span className="text-slate-200 uppercase font-semibold">{content.entry_type}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">AMOUNT</span>
                        <span className="text-brand-400 font-bold">INR {content.amount?.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">DEBIT ACCOUNT</span>
                        <span className="text-slate-200 truncate block">{content.proposed_debit_account}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">CREDIT ACCOUNT</span>
                        <span className="text-slate-200 truncate block">{content.proposed_credit_account}</span>
                      </div>
                      <div className="col-span-2 sm:col-span-4 pt-1 border-t border-slate-800">
                        <span className="text-slate-500 text-[10px] block">NARRATION</span>
                        <span className="text-slate-300">{content.narration}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {isPending && (
                  <div className="flex items-center justify-end space-x-2.5 pt-1">
                    <button
                      onClick={() => handleUpdateStatus(draft._id, 'approved')}
                      disabled={isActioning}
                      className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Approve Action</span>
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(draft._id, 'rejected')}
                      disabled={isActioning}
                      className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 border border-slate-700 text-xs font-semibold transition-all disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
