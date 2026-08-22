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
  : 'http://localhost:5000/api';

const ACTOR_BADGES = {
  claude: {
    label: 'Claude AI',
    icon: Bot,
    style: 'bg-purple-950/60 text-purple-400 border-purple-800/80',
  },
  system: {
    label: 'System Engine',
    icon: Cpu,
    style: 'bg-blue-950/60 text-blue-400 border-blue-800/80',
  },
  default: {
    label: 'Auditor',
    icon: User,
    style: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/80',
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
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden animate-fadeIn">
      {/* Header */}
      <div className="p-5 border-b border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1.5 text-brand-400">
                <Shield className="h-4 w-4" />
                <h3 className="text-base font-semibold text-white">Append-Only Audit Trail</h3>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {filteredLogs.length} events
              </span>
              <span className="text-[10px] font-mono flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                <Lock className="h-2.5 w-2.5" />
                <span>IMMUTABLE</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Cryptographically timestamped and immutable log of AI decisions, tool executions, and auditor actions
            </p>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search action or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-850 border border-slate-700 text-slate-200 text-xs rounded-xl pl-9 pr-3 py-2 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] font-medium text-slate-400 flex items-center space-x-1 mr-1">
            <Filter className="h-3 w-3" />
            <span>Target:</span>
          </span>

          {['all', 'match', 'exception', 'draft_action', 'agent_query'].map((type) => (
            <button
              key={type}
              onClick={() => setTargetTypeFilter(type)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-all ${
                targetTypeFilter === type
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {type.replace('_', ' ')}
            </button>
          ))}

          <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />

          <span className="text-[11px] font-medium text-slate-400 mr-1 hidden sm:inline">Actor:</span>
          {['all', 'claude', 'system'].map((act) => (
            <button
              key={act}
              onClick={() => setActorFilter(act)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-all ${
                actorFilter === act
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {act}
            </button>
          ))}
        </div>
      </div>

      {/* Table / Timeline List */}
      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="h-6 w-6 text-brand-400 animate-spin" />
          <p className="text-xs text-slate-400">Loading audit records...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="p-12 text-center space-y-2">
          <Shield className="h-8 w-8 text-slate-500 mx-auto" />
          <h4 className="text-sm font-semibold text-slate-200">No Audit Events Logged</h4>
          <p className="text-xs text-slate-400">Events from AI passes, tool queries, and approvals will appear here.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-800 font-mono text-xs">
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
              <div key={log._id} className="p-4 hover:bg-slate-850/40 transition-colors space-y-2">
                <div
                  onClick={() => toggleExpand(log._id)}
                  className="flex items-center justify-between cursor-pointer select-none"
                >
                  <div className="flex items-center space-x-3">
                    <button className="text-slate-500 hover:text-slate-300">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>

                    {/* Actor Badge */}
                    <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold ${actorMeta.style}`}>
                      <ActorIcon className="h-3 w-3" />
                      <span>{log.actor}</span>
                    </span>

                    {/* Action Name */}
                    <span className="font-semibold text-slate-200">{log.action}</span>

                    {/* Target Type Tag */}
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700 uppercase">
                      {log.target_type}
                    </span>

                    {/* Target ID if present */}
                    {log.target_id && (
                      <span className="text-[11px] text-brand-400 font-medium hidden sm:inline">
                        ID: {log.target_id}
                      </span>
                    )}
                  </div>

                  {/* Timestamp */}
                  <div className="flex items-center space-x-1 text-[11px] text-slate-400">
                    <Clock className="h-3 w-3 text-slate-500" />
                    <span>{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                </div>

                {/* Expandable JSON Details */}
                {isExpanded && (
                  <div className="mt-2 ml-7 bg-black/60 border border-slate-800 rounded-xl p-3.5 space-y-1.5 animate-fadeIn">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Event Payload Details:</div>
                    <pre className="text-[11px] text-emerald-400/90 whitespace-pre-wrap overflow-x-auto">
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
  );
}
