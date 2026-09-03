import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Shield,
  Search,
  Bot,
  User,
  Cpu,
  ChevronDown,
  ChevronRight,
  Clock,
  Loader2,
  Lock,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_SERVER_URL
  ? `${import.meta.env.VITE_SERVER_URL}/api`
  : '/api';

const ACTOR_BADGES = {
  claude: {
    label: 'CLAUDE_REASONER',
    icon: Bot,
    style: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  system: {
    label: 'SYSTEM_ENGINE',
    icon: Cpu,
    style: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  default: {
    label: 'HUMAN_AUDITOR',
    icon: User,
    style: 'bg-slate-100 text-slate-700 border-slate-200',
  },
};

export default function AuditLog({ runId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [targetTypeFilter, setTargetTypeFilter] = useState('all');
  const [actorFilter, setActorFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLogId, setExpandedLogId] = useState(null);

  const fetchLogs = async () => {
    if (!runId) return;
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/runs/${runId}/audit-log`, {
        params: {
          target_type: targetTypeFilter,
          actor: actorFilter,
          limit: 100,
        },
      });
      setLogs(res.data.data || []);
    } catch (err) {
      console.error('[AuditLog] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [runId, targetTypeFilter, actorFilter]);

  const toggleExpand = (logId) => {
    setExpandedLogId((prev) => (prev === logId ? null : logId));
  };

  const filteredLogs = logs.filter((l) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const act = (l.action || '').toLowerCase();
    const actor = (l.actor || '').toLowerCase();
    const target = (l.target_id || '').toLowerCase();
    return act.includes(q) || actor.includes(q) || target.includes(q);
  });

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Screen Title & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Audit Trail & Event History</h2>
          <p className="text-xs text-slate-500">
            Immutable, chronological ledger of every reconciliation pass, AI diagnosis, and human auditor decision.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="badge-slate text-[11px] font-mono font-semibold">
            {filteredLogs.length} EVENTS LOGGED
          </span>
          <span className="badge-emerald text-[10px] font-mono font-semibold">
            <Lock className="h-2.5 w-2.5" />
            <span>APPEND-ONLY AUDIT LOG SEALED</span>
          </span>
        </div>
      </div>

      <div className="card-base bg-white border border-slate-200/80 shadow-2xs overflow-hidden">
        {/* Filter Controls Header */}
        <div className="p-3.5 border-b border-slate-200 space-y-3 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Target Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500 mr-1 uppercase font-mono text-[10px]">Filter:</span>
              {['all', 'match', 'exception', 'draft_action', 'run'].map((type) => (
                <button
                  key={type}
                  onClick={() => setTargetTypeFilter(type)}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-medium capitalize transition-all cursor-pointer ${
                    targetTypeFilter === type
                      ? 'bg-[#0C2340] text-white font-semibold shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {type.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* Search Box */}
            <div className="relative w-full sm:w-64">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search action, actor, or ref ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-900 text-xs rounded-md pl-9 pr-3 py-1.5 placeholder-slate-400 font-mono focus:outline-none focus:ring-1 focus:ring-[#0B72E7]"
              />
            </div>
          </div>
        </div>

        {/* Vertical Timeline with Continuous 2px Line */}
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="h-6 w-6 text-[#0B72E7] animate-spin" />
            <p className="text-xs text-slate-500 font-mono">Loading audit logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Shield className="h-8 w-8 text-slate-400 mx-auto" />
            <h4 className="text-sm font-semibold text-slate-900">No Audit Events Found</h4>
            <p className="text-xs text-slate-500">Events from reconciliation runs and approvals will appear here.</p>
          </div>
        ) : (
          <div className="p-4 relative">
            {/* Continuous Vertical Timeline Connecting Line */}
            <div className="absolute left-8 top-6 bottom-6 w-0.5 bg-slate-200 pointer-events-none" />

            <div className="space-y-4">
              {filteredLogs.map((log, idx) => {
                const logId = log._id || log.id || `log_${idx}`;
                const isExpanded = expandedLogId === logId;
                const actorKey = log.actor?.toLowerCase()?.includes('claude')
                  ? 'claude'
                  : log.actor?.toLowerCase() === 'system'
                  ? 'system'
                  : 'default';
                const actorMeta = ACTOR_BADGES[actorKey];
                const ActorIcon = actorMeta.icon;
                const eventSeqId = `EVT-${String(filteredLogs.length - idx).padStart(3, '0')}`;

                return (
                  <div key={logId} className="relative pl-10">
                    {/* Node Dot on Timeline */}
                    <div className="absolute left-2.5 top-2 -translate-x-1/2 h-3.5 w-3.5 rounded-full bg-white border-2 border-[#0B72E7] z-10 shadow-2xs" />

                    <div className="card-base p-3 border border-slate-200/80 hover:border-slate-300 transition-colors space-y-2">
                      <div
                        onClick={() => toggleExpand(logId)}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer select-none"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <button className="text-slate-400 hover:text-slate-700">
                            {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                          </button>

                          {/* High Contrast Actor Badge */}
                          <span className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded border text-[10px] font-mono font-bold ${actorMeta.style}`}>
                            <ActorIcon className="h-3 w-3" />
                            <span>{actorMeta.label}</span>
                          </span>

                          {/* Action Name */}
                          <span className="font-semibold text-slate-900 font-mono text-xs">{log.action}</span>

                          {/* Target Type Tag */}
                          <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 uppercase font-mono font-semibold">
                            {log.target_type}
                          </span>

                          {/* Target Reference Pill */}
                          {(log.target_id || log.details?.settlement_id || log.details?.order_id) && (
                            <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-mono font-semibold">
                              {log.details?.settlement_id ? `BATCH: ${log.details.settlement_id}` : log.details?.order_id ? `ORD: ${log.details.order_id}` : `REF: ${log.target_id}`}
                            </span>
                          )}

                          {/* State Transition Pill */}
                          {(log.details?.decision || log.details?.after_state) && (
                            <span className="text-[10px] font-mono bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200 font-bold uppercase">
                              [{log.details?.before_state || 'pending'}] ➔ [{log.details?.after_state || log.details?.decision}]
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-500 self-start sm:self-auto shrink-0">
                          {/* Sequential Event ID Display */}
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 select-all font-mono">
                            {eventSeqId}
                          </span>
                          <span className="flex items-center space-x-1">
                            <Clock className="h-3 w-3 text-slate-400" />
                            <span>{new Date(log.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'medium' })}</span>
                          </span>
                        </div>
                      </div>

                      {/* Expandable JSON Details */}
                      {isExpanded && (
                        <div className="mt-2 rounded bg-slate-50 border border-slate-200 p-2.5 space-y-1">
                          <div className="text-[10px] text-slate-500 uppercase font-mono font-bold">EVENT PAYLOAD DETAILS:</div>
                          <pre className="text-xs text-slate-800 whitespace-pre-wrap overflow-x-auto font-mono bg-white p-2 rounded border border-slate-200">
                            {JSON.stringify(log.details || {}, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
