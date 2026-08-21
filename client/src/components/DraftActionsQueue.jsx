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
  Edit3,
  Save,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_SERVER_URL
  ? `${import.meta.env.VITE_SERVER_URL}/api`
  : 'http://localhost:5000/api';

export default function DraftActionsQueue({ runId }) {
  const [draftActions, setDraftActions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actioningId, setActioningId] = useState(null);

  // Inline editing state
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});

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

  const handleStartEdit = (draft) => {
    setEditingId(draft._id);
    setEditFormData({ ...(draft.was_edited && draft.edited_content ? draft.edited_content : draft.draft_content) });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditFormData({});
  };

  const handleApproveAction = async (draftId) => {
    try {
      setActioningId(draftId);
      const isCurrentlyEditing = editingId === draftId;
      const payload = {};
      if (isCurrentlyEditing) {
        payload.edited_content = editFormData;
      }

      const res = await axios.post(`${API_BASE}/draft-actions/${draftId}/approve`, payload);

      setDraftActions((prev) =>
        prev.map((d) => (d._id === draftId ? res.data.data : d))
      );
      setEditingId(null);
    } catch (err) {
      console.error('[Approve Action Error]:', err);
      alert(err.response?.data?.error?.message || 'Failed to approve draft action');
    } finally {
      setActioningId(null);
    }
  };

  const handleRejectAction = async (draftId) => {
    try {
      setActioningId(draftId);
      const res = await axios.post(`${API_BASE}/draft-actions/${draftId}/reject`);

      setDraftActions((prev) =>
        prev.map((d) => (d._id === draftId ? res.data.data : d))
      );
      setEditingId(null);
    } catch (err) {
      console.error('[Reject Action Error]:', err);
      alert(err.response?.data?.error?.message || 'Failed to reject draft action');
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
            Human-in-the-Loop review for auto-drafted vendor communications and adjusting journal entries
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
          <h4 className="text-sm font-semibold text-slate-200">No Draft Actions Generated</h4>
          <p className="text-xs text-slate-400">
            Unrecorded transactions or refunds diagnosed in Pass 3 will appear here with auto-drafted actions.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-800">
          {draftActions.map((draft) => {
            const isEmail = draft.action_type === 'vendor_email';
            const isEditing = editingId === draft._id;
            const content = isEditing
              ? editFormData
              : draft.was_edited && draft.edited_content
              ? draft.edited_content
              : draft.draft_content || {};
            const isPending = draft.status === 'pending_approval';
            const isActioning = actioningId === draft._id;

            return (
              <div key={draft._id} className="p-5 hover:bg-slate-850/40 transition-colors space-y-3.5">
                {/* Header Row */}
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
                    {draft.was_edited && (
                      <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 border border-amber-800/80 px-2 py-0.5 rounded-md">
                        EDITED BY AUDITOR
                      </span>
                    )}
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

                {/* Content Box (Editable or Read-Only) */}
                <div className="bg-slate-850 p-4 rounded-xl border border-slate-750 space-y-3 text-xs">
                  {isEmail ? (
                    <div className="space-y-2.5">
                      <div className="flex items-center space-x-2">
                        <span className="text-slate-500 font-semibold w-16 shrink-0">TO:</span>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editFormData.recipient || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, recipient: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200"
                          />
                        ) : (
                          <span className="text-slate-200 font-mono">{content.recipient}</span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-slate-500 font-semibold w-16 shrink-0">SUBJECT:</span>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editFormData.subject || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, subject: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200"
                          />
                        ) : (
                          <span className="text-slate-200 font-semibold">{content.subject}</span>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-800 space-y-1">
                        <span className="text-slate-500 font-semibold block">MESSAGE BODY:</span>
                        {isEditing ? (
                          <textarea
                            rows={4}
                            value={editFormData.body || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, body: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 font-sans leading-relaxed"
                          />
                        ) : (
                          <div className="text-slate-300 whitespace-pre-line font-sans leading-relaxed">
                            {content.body}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                        <div>
                          <span className="text-slate-500 text-[10px] block">ENTRY TYPE</span>
                          <span className="text-slate-200 uppercase font-semibold">{content.entry_type}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block">AMOUNT</span>
                          {isEditing ? (
                            <input
                              type="number"
                              value={editFormData.amount || ''}
                              onChange={(e) => setEditFormData({ ...editFormData, amount: Number(e.target.value) })}
                              className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-brand-400 font-bold w-full"
                            />
                          ) : (
                            <span className="text-brand-400 font-bold">INR {content.amount?.toLocaleString()}</span>
                          )}
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block">DEBIT ACCOUNT</span>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editFormData.proposed_debit_account || ''}
                              onChange={(e) => setEditFormData({ ...editFormData, proposed_debit_account: e.target.value })}
                              className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-slate-200 w-full"
                            />
                          ) : (
                            <span className="text-slate-200 truncate block">{content.proposed_debit_account}</span>
                          )}
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block">CREDIT ACCOUNT</span>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editFormData.proposed_credit_account || ''}
                              onChange={(e) => setEditFormData({ ...editFormData, proposed_credit_account: e.target.value })}
                              className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-slate-200 w-full"
                            />
                          ) : (
                            <span className="text-slate-200 truncate block">{content.proposed_credit_account}</span>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-800">
                        <span className="text-slate-500 text-[10px] block font-mono">NARRATION</span>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editFormData.narration || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, narration: e.target.value })}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 w-full mt-1"
                          />
                        ) : (
                          <span className="text-slate-300 font-mono">{content.narration}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {isPending && (
                  <div className="flex items-center justify-end space-x-2.5 pt-1">
                    {isEditing ? (
                      <>
                        <button
                          onClick={handleCancelEdit}
                          className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                        >
                          Cancel Edit
                        </button>
                        <button
                          onClick={() => handleApproveAction(draft._id)}
                          disabled={isActioning}
                          className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                        >
                          <Save className="h-3.5 w-3.5" />
                          <span>Save & Approve</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleStartEdit(draft)}
                          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 text-xs font-medium transition-all"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>Edit Content</span>
                        </button>

                        <button
                          onClick={() => handleApproveAction(draft._id)}
                          disabled={isActioning}
                          className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Approve Action</span>
                        </button>

                        <button
                          onClick={() => handleRejectAction(draft._id)}
                          disabled={isActioning}
                          className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 border border-slate-700 text-xs font-semibold transition-all disabled:opacity-50"
                        >
                          <X className="h-3.5 w-3.5" />
                          <span>Reject</span>
                        </button>
                      </>
                    )}
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
