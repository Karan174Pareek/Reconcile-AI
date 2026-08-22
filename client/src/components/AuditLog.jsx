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
    style: 'bg-amber-950/60 text-amber-400 border-amber-500/30',
  },
  system: {
    label: 'System Engine',
    icon: Cpu,
    style: 'bg-teal-950/60 text-teal-400 border-teal-500/30',
  },
  default: {
    label: 'Auditor',
    icon: User,
    style: 'bg-white/5 text-text-primary border-white/10',
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
    <div className="glass-panel rounded-2xl shadow-glass overflow-hidden animate-fadeIn">
      {/* Header */}
      <div className="p-5 border-b border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="flex items-center space-x-1.5 text-teal-400">
                <Shield className="h-4 w-4" />
                <h3 className="text-base font-semibold text-text-primary tracking-tight">Append-Only Audit Trail</h3>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white/5 text-text-secondary border border-white/10">
                {filteredLogs.length} events
              </span>
              <span className="text-[10px] font-mono flex items-center space-x-1 px-2 py-0.5 rounded-md bg-teal-950/60 text-teal-400 border border-teal-500/30">
                <Lock className="h-2.5 w-2.5" />
                <span>IMMUTABLE</span>
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              Cryptographically timestamped and immutable log of AI decisions, tool executions, and auditor actions
            </p>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-text-muted" />
            <input
              type="text"
              placeholder="Search action or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 text-text-primary text-xs rounded-lg pl-9 pr-3 py-2 placeholder-text-muted font-mono focus:outline-none focus:ring-1 focus:ring-teal-500/50 focus:border-teal-500"
            />
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-medium text-text-secondary flex items-center space-x-1 mr-1">
            <Filter className="h-3 w-3 text-text-muted" />
            <span>Target:</span>
          </span>

          {['all', 'match', 'exception', 'draft_action', 'agent_query'].map((type) => (
            <button
              key={type}
              onClick={() => setTargetTypeFilter(type)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium capitalize transition-all ${
                targetTypeFilter === type
                  ? 'bg-teal-500 text-navy-950 font-semibold shadow-sm'
                  : 'bg-white/5 text-text-secondary hover:text-text-primary hover:bg-white/10 border border-white/5'
              }`}
            >
              {type.replace('_', ' ')}
            </button>
          ))}

          <div className="h-4 w-px bg-white/10 mx-1 hidden sm:block" />

          <span className="text-[11px] font-medium text-text-secondary mr-1 hidden sm:inline">Actor:</span>
          {['all', 'claude', 'system'].map((act) => (
            <button
              key={act}
              onClick={() => setActorFilter(act)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium capitalize transition-all ${
                actorFilter === act
                  ? 'bg-teal-500 text-navy-950 font-semibold shadow-sm'
                  : 'bg-white/5 text-text-secondary hover:text-text-primary hover:bg-white/10 border border-white/5'
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
          <Loader2 className="h-6 w-6 text-teal-400 animate-spin" />
          <p className="text-xs text-text-secondary font-mono">Loading audit records...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="p-12 text-center space-y-2">
          <Shield className="h-8 w-8 text-text-muted mx-auto" />
          <h4 className="text-sm font-semibold text-text-primary">No Audit Events Logged</h4>
          <p className="text-xs text-text-secondary">Events from AI passes, tool queries, and approvals will appear here.</p>
        </div>
      ) : (
        <div className="divide-y divide-white/5 font-mono text-xs">
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
              <div key={log._id} className="p-4 hover:bg-white/[0.02] transition-colors space-y-2">
                <div
                  onClick={() => toggleExpand(log._id)}
                  className="flex items-center justify-between cursor-pointer select-none"
                >
                  <div className="flex items-center space-x-3">
                    <button className="text-text-muted hover:text-text-primary">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>

                    {/* Actor Badge */}
                    <span className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-md border text-[11px] font-semibold ${actorMeta.style}`}>
                      <ActorIcon className="h-3 w-3" />
                      <span>{log.actor}</span>
                    </span>

                    {/* Action Name */}
                    <span className="font-semibold text-text-primary">{log.action}</span>

                    {/* Target Type Tag */}
                    <span className="text-[10px] bg-white/5 text-text-muted px-2 py-0.5 rounded border border-white/5 uppercase">
                      {log.target_type}
                    </span>

                    {/* Target ID if present */}
                    {log.target_id && (
                      <span className="text-[11px] text-teal-400 font-medium hidden sm:inline font-mono">
                        ID: {log.target_id}
                      </span>
                    )}
                  </div>

                  {/* Monospace Timestamp */}
                  <div className="flex items-center space-x-1.5 text-[11px] text-text-secondary font-mono">
                    <Clock className="h-3 w-3 text-text-muted" />
                    <span>{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                </div>

                {/* Expandable JSON Details with Refined Styling */}
                {isExpanded && (
                  <div className="mt-2 ml-7 glass-panel-subtle border border-white/5 rounded-xl p-3.5 space-y-1.5 animate-fadeIn">
                    <div className="text-[10px] text-text-muted uppercase font-mono font-semibold">Event Payload Details:</div>
                    <pre className="text-[11px] text-teal-300/90 whitespace-pre-wrap overflow-x-auto font-mono">
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
