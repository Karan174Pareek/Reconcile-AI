import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FileCheck2,
  Shield,
  Filter,
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
    label: 'Claude AI',
    icon: Bot,
    style: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  system: {
    label: 'System Engine',
    icon: Cpu,
    style: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  default: {
    label: 'Auditor',
    icon: User,
    style: 'bg-gray-100 text-gray-700 border-gray-200',
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
          <h2 className="text-lg font-bold text-gray-900 tracking-tight">Audit Trail & Event History</h2>
          <p className="text-xs text-gray-500">
            Complete, chronological history of every reconciliation pass, AI diagnosis, and human approval.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="badge-gray text-[11px] font-mono">
            {filteredLogs.length} events logged
          </span>
          <span className="badge-emerald text-[10px] font-mono">
            <Lock className="h-2.5 w-2.5" />
            <span>IMMUTABLE</span>
          </span>
        </div>
      </div>

      <div className="card-base bg-white border border-gray-200 shadow-sm overflow-hidden">
        {/* Filter Controls Header */}
        <div className="p-4 border-b border-gray-200 space-y-3 bg-gray-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Target Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-gray-500 mr-1">Filter:</span>
              {['all', 'match', 'exception', 'draft_action', 'agent_query'].map((type) => (
                <button
                  key={type}
                  onClick={() => setTargetTypeFilter(type)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors cursor-pointer ${
                    targetTypeFilter === type
                      ? 'bg-blue-600 text-white font-semibold shadow-sm'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {type.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* Search Box */}
            <div className="relative w-full sm:w-64">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search action or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-gray-200 text-gray-900 text-xs rounded-lg pl-9 pr-3 py-1.5 placeholder-gray-400 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Log Entries List */}
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
            <p className="text-xs text-gray-500 font-mono">Loading audit logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Shield className="h-8 w-8 text-gray-400 mx-auto" />
            <h4 className="text-sm font-semibold text-gray-900">No Audit Events Found</h4>
            <p className="text-xs text-gray-500">Events from reconciliation runs and approvals will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 font-mono text-xs">
            {filteredLogs.map((log) => {
              const isExpanded = expandedLogId === log._id;
              const actorKey = log.actor?.toLowerCase()?.includes('claude')
                ? 'claude'
                : log.actor?.toLowerCase() === 'system'
                ? 'system'
                : 'default';
              const actorMeta = ACTOR_BADGES[actorKey];
              const ActorIcon = actorMeta.icon;

              return (
                <div key={log._id} className="p-4 hover:bg-gray-50/50 transition-colors space-y-2">
                  <div
                    onClick={() => toggleExpand(log._id)}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer select-none"
                  >
                    <div className="flex flex-wrap items-center gap-2.5">
                      <button className="text-gray-400 hover:text-gray-700">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>

                      {/* Actor Badge */}
                      <span className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${actorMeta.style}`}>
                        <ActorIcon className="h-3 w-3" />
                        <span>{log.actor}</span>
                      </span>

                      {/* Action Name */}
                      <span className="font-semibold text-gray-900">{log.action}</span>

                      {/* Target Type Tag */}
                      <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-200 uppercase font-mono">
                        {log.target_type}
                      </span>

                      {/* Target ID / Batch / Order Reference */}
                      {(log.target_id || log.details?.settlement_id || log.details?.order_id) && (
                        <span className="text-[11px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-medium font-mono">
                          {log.details?.settlement_id ? `Batch: ${log.details.settlement_id}` : log.details?.order_id ? `Order: ${log.details.order_id}` : `Ref: ${log.target_id}`}
                        </span>
                      )}

                      {/* Before / After State Transition Pill */}
                      {(log.details?.decision || log.details?.after_state) && (
                        <span className="text-[10px] font-mono bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200 font-bold uppercase">
                          {log.details?.before_state || 'pending'} → {log.details?.after_state || log.details?.decision}
                        </span>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div className="flex items-center space-x-1.5 text-xs text-gray-500 font-mono self-start sm:self-auto">
                      <Clock className="h-3 w-3 text-gray-400" />
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Expandable JSON Details */}
                  {isExpanded && (
                    <div className="mt-2 ml-6 rounded-lg bg-gray-50 border border-gray-200 p-3 space-y-1.5">
                      <div className="text-[10px] text-gray-500 uppercase font-mono font-semibold">Event Payload Details:</div>
                      <pre className="text-xs text-gray-800 whitespace-pre-wrap overflow-x-auto font-mono bg-white p-2.5 rounded border border-gray-200">
                        {JSON.stringify(log.details || {}, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
