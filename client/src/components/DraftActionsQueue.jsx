import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
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
  ShieldCheck,
  HelpCircle,
} from 'lucide-react';

const isDraftValid = (draft, currentContent) => {
  if (!currentContent) return false;
  if (draft.action_type === 'ledger_correction') {
    const hasAmount = Number(currentContent.amount) > 0;
    const hasDebit = Boolean(currentContent.proposed_debit_account && String(currentContent.proposed_debit_account).trim());
    const hasCredit = Boolean(currentContent.proposed_credit_account && String(currentContent.proposed_credit_account).trim());
    const hasNarration = Boolean(currentContent.narration && String(currentContent.narration).trim());
    return hasAmount && hasDebit && hasCredit && hasNarration;
  } else if (draft.action_type === 'vendor_email') {
    const hasRecipient = Boolean(currentContent.recipient && String(currentContent.recipient).trim());
    const hasSubject = Boolean(currentContent.subject && String(currentContent.subject).trim());
    const hasBody = Boolean(currentContent.body && String(currentContent.body).trim());
    return hasRecipient && hasSubject && hasBody;
  }
  return true;
};

export default function DraftActionsQueue({ runId, onDraftActionUpdated }) {
  const [draftActions, setDraftActions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actioningId, setActioningId] = useState(null);
  const [recentlyApprovedId, setRecentlyApprovedId] = useState(null);

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

      setRecentlyApprovedId(draftId);
      setTimeout(() => setRecentlyApprovedId(null), 1800);

      setDraftActions((prev) =>
        prev.map((d) => (d._id === draftId ? res.data.data : d))
      );
      setEditingId(null);
      if (onDraftActionUpdated) onDraftActionUpdated();
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
      if (onDraftActionUpdated) onDraftActionUpdated();
    } catch (err) {
      console.error('[Reject Action Error]:', err);
      alert(err.response?.data?.error?.message || 'Failed to reject draft action');
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Screen Title & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
        <div>
          <h2 className="text-lg font-bold text-gray-900 tracking-tight">Remediation Draft Actions</h2>
          <p className="text-xs text-gray-500">
            AI-suggested vendor emails and adjusting journal entries. Nothing is sent or booked without your explicit approval.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="badge-blue text-[11px] font-mono">
            {draftActions.length} draft actions
          </span>
        </div>
      </div>

      <div className="card-base bg-white border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
            <p className="text-xs text-gray-500">Loading draft actions...</p>
          </div>
        ) : draftActions.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Send className="h-8 w-8 text-gray-400 mx-auto" />
            <h4 className="text-sm font-semibold text-gray-900">No Draft Actions Generated</h4>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Unrecorded transactions or customer refund deductions diagnosed during reconciliation will appear here with auto-drafted remediations.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            <AnimatePresence>
              {draftActions.map((draft, idx) => {
                const isEmail = draft.action_type === 'vendor_email';
                const isEditing = editingId === draft._id;
                const content = isEditing
                  ? editFormData
                  : draft.was_edited && draft.edited_content
                  ? draft.edited_content
                  : draft.draft_content || {};
                const isPending = draft.status === 'pending_approval';
                const isActioning = actioningId === draft._id;
                const isJustApproved = recentlyApprovedId === draft._id;

                return (
                  <motion.div
                    key={draft._id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    transition={{ duration: 0.25, delay: idx * 0.03 }}
                    className={`p-5 transition-colors space-y-3.5 ${
                      isJustApproved ? 'bg-emerald-50/70' : 'hover:bg-gray-50/50'
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border flex items-center space-x-1.5 ${
                            isEmail
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {isEmail ? <Mail className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                          <span className="capitalize">{draft.action_type.replace('_', ' ')}</span>
                        </span>

                        <span className="text-xs font-mono text-gray-500">
                          Ref: {draft.exception_id}
                        </span>

                        {draft.was_edited && (
                          <span className="text-[10px] font-mono font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                            EDITED BY AUDITOR
                          </span>
                        )}

                        {draft.confidence && (
                          <span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                            {(draft.confidence * 100).toFixed(0)}% AI confidence
                          </span>
                        )}
                      </div>

                      <div className="text-xs">
                        {draft.status === 'approved' ? (
                          <span className="badge-emerald">
                            <Check className="h-3 w-3" />
                            <span>Approved & Logged</span>
                          </span>
                        ) : draft.status === 'rejected' ? (
                          <span className="badge-rose">
                            <X className="h-3 w-3" />
                            <span>Rejected</span>
                          </span>
                        ) : (
                          <span className="badge-amber">
                            <span>Pending Auditor Review</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Proposed Document Details Box */}
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3 text-xs">
                      {isEmail ? (
                        <div className="space-y-2.5">
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-500 font-mono font-semibold w-16 shrink-0">TO:</span>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editFormData.recipient || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, recipient: e.target.value })}
                                className="w-full bg-white border border-gray-300 rounded px-2.5 py-1 text-gray-900 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            ) : (
                              <span className="text-gray-900 font-mono font-medium">{content.recipient}</span>
                            )}
                          </div>

                          <div className="flex items-center space-x-2">
                            <span className="text-gray-500 font-mono font-semibold w-16 shrink-0">SUBJECT:</span>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editFormData.subject || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, subject: e.target.value })}
                                className="w-full bg-white border border-gray-300 rounded px-2.5 py-1 text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            ) : (
                              <span className="text-gray-900 font-semibold">{content.subject}</span>
                            )}
                          </div>

                          <div className="pt-2 border-t border-gray-200 space-y-1">
                            <span className="text-gray-500 font-mono font-semibold block">MESSAGE BODY:</span>
                            {isEditing ? (
                              <textarea
                                rows={4}
                                value={editFormData.body || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, body: e.target.value })}
                                className="w-full bg-white border border-gray-300 rounded p-2.5 text-gray-900 leading-relaxed focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                              />
                            ) : (
                              <div className="text-gray-700 whitespace-pre-line leading-relaxed font-sans bg-white p-3 rounded border border-gray-200">
                                {content.body}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                            <div>
                              <span className="text-gray-500 text-[10px] block">ENTRY TYPE</span>
                              <span className="text-gray-900 uppercase font-semibold">{content.entry_type}</span>
                            </div>
                            <div>
                              <span className="text-gray-500 text-[10px] block">AMOUNT</span>
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={editFormData.amount || ''}
                                  onChange={(e) => setEditFormData({ ...editFormData, amount: Number(e.target.value) })}
                                  className="bg-white border border-gray-300 rounded px-2 py-0.5 text-gray-900 font-bold w-full font-mono"
                                />
                              ) : (
                                <span className="text-gray-900 font-bold">INR {content.amount?.toLocaleString()}</span>
                              )}
                            </div>
                            <div>
                              <span className="text-gray-500 text-[10px] block">DEBIT ACCOUNT</span>
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editFormData.proposed_debit_account || ''}
                                  onChange={(e) => setEditFormData({ ...editFormData, proposed_debit_account: e.target.value })}
                                  className="bg-white border border-gray-300 rounded px-2 py-0.5 text-gray-900 w-full"
                                />
                              ) : (
                                <span className="text-gray-900 truncate block">{content.proposed_debit_account}</span>
                              )}
                            </div>
                            <div>
                              <span className="text-gray-500 text-[10px] block">CREDIT ACCOUNT</span>
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editFormData.proposed_credit_account || ''}
                                  onChange={(e) => setEditFormData({ ...editFormData, proposed_credit_account: e.target.value })}
                                  className="bg-white border border-gray-300 rounded px-2 py-0.5 text-gray-900 w-full"
                                />
                              ) : (
                                <span className="text-gray-900 truncate block">{content.proposed_credit_account}</span>
                              )}
                            </div>
                          </div>

                          <div className="pt-2 border-t border-gray-200">
                            <span className="text-gray-500 text-[10px] block font-mono">ACCOUNTING NARRATION</span>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editFormData.narration || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, narration: e.target.value })}
                                className="bg-white border border-gray-300 rounded px-2.5 py-1 text-gray-900 w-full mt-1 font-mono"
                              />
                            ) : (
                              <span className="text-gray-700 font-mono">{content.narration}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Controls */}
                    {isPending && (() => {
                      const isValid = isDraftValid(draft, content);
                      return (
                        <div className="flex items-center justify-end space-x-2 pt-1">
                          {isEditing ? (
                            <>
                              <button
                                onClick={handleCancelEdit}
                                className="px-3 py-1.5 rounded-lg text-xs text-gray-600 hover:text-gray-900 cursor-pointer"
                              >
                                Cancel Edit
                              </button>
                              <button
                                onClick={() => handleApproveAction(draft._id)}
                                disabled={isActioning || !isValid}
                                title={!isValid ? 'Incomplete draft: required fields must be populated' : 'Save and approve action'}
                                className="btn-primary text-xs py-1.5 px-3.5 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Save className="h-3.5 w-3.5" />
                                <span>Save & Approve</span>
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleStartEdit(draft)}
                                className="btn-secondary text-xs py-1.5 px-3"
                              >
                                <Edit3 className="h-3.5 w-3.5 text-gray-600" />
                                <span>Edit Draft</span>
                              </button>
                              <button
                                onClick={() => handleRejectAction(draft._id)}
                                disabled={isActioning}
                                className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => handleApproveAction(draft._id)}
                                disabled={isActioning || !isValid}
                                title={!isValid ? 'Incomplete draft: required fields must be populated before approval' : 'Approve action'}
                                className="btn-primary text-xs py-1.5 px-3.5 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isActioning ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Send className="h-3.5 w-3.5" />
                                )}
                                <span>Approve Action</span>
                              </button>
                            </>
                          )}
                        </div>
                      );
                    })()}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
