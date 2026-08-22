import React from 'react';
import {
  Activity,
  Layers,
  FileCheck2,
  AlertTriangle,
  Send,
  PlusCircle,
  Radio,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

export default function Navbar({
  runs = [],
  activeRunId,
  onSelectRun,
  onOpenUpload,
  onOpenChat,
  activeTab,
  onSelectTab,
  isConnected,
  isRefreshing,
  onRefresh,
}) {
  return (
    <header className="sticky top-0 z-40 bg-navy-950/80 backdrop-blur-xl border-b border-white/10 shadow-glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-teal-600 to-teal-400 flex items-center justify-center shadow-glow-teal">
              <Layers className="h-5 w-5 text-navy-950" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-base tracking-tight text-text-primary">Reconcile</span>
                <span className="text-[10px] font-semibold font-mono px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  AI v2.0
                </span>
              </div>
              <p className="text-[10px] text-text-secondary font-mono tracking-tight">Autonomous Finance Controller</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 bg-white/[0.04] p-1 rounded-xl border border-white/10">
            <button
              onClick={() => onSelectTab('dashboard')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-teal-500 text-navy-950 font-semibold shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              <span>Live Dashboard</span>
            </button>

            <button
              onClick={() => onSelectTab('exceptions')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'exceptions'
                  ? 'bg-teal-500 text-navy-950 font-semibold shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Exception Queue</span>
            </button>

            <button
              onClick={() => onSelectTab('draft_actions')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'draft_actions'
                  ? 'bg-teal-500 text-navy-950 font-semibold shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
              }`}
            >
              <Send className="h-3.5 w-3.5" />
              <span>Draft Actions</span>
            </button>

            <button
              onClick={() => onSelectTab('audit_trail')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'audit_trail'
                  ? 'bg-teal-500 text-navy-950 font-semibold shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
              }`}
            >
              <FileCheck2 className="h-3.5 w-3.5" />
              <span>Audit Trail</span>
            </button>
          </nav>

          {/* Run Selector & Actions */}
          <div className="flex items-center space-x-2.5">
            {/* Live Socket Status Pill */}
            <div
              className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-medium border ${
                isConnected
                  ? 'bg-teal-950/60 border-teal-500/30 text-teal-400'
                  : 'bg-amber-950/60 border-amber-500/30 text-amber-400'
              }`}
            >
              <Radio className={`h-3 w-3 ${isConnected ? 'animate-pulse text-teal-400' : 'text-amber-400'}`} />
              <span>{isConnected ? 'LIVE WS' : 'POLLING'}</span>
            </div>

            {/* Run Switcher Dropdown */}
            {runs.length > 0 && (
              <div className="relative">
                <select
                  value={activeRunId || ''}
                  onChange={(e) => onSelectRun(e.target.value)}
                  className="bg-white/5 border border-white/10 text-text-primary text-xs rounded-lg px-2.5 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-teal-500/50 focus:border-teal-500"
                >
                  {runs.map((r) => (
                    <option key={r.run_id} value={r.run_id} className="bg-navy-950 text-text-primary">
                      {r.run_id} ({r.total_records || 0} recs • {r.status})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Refresh Button */}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              title="Refresh Run Metrics"
              className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-text-secondary hover:text-text-primary hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-teal-400' : ''}`} />
            </button>

            {/* Agent Chat Button */}
            <button
              onClick={onOpenChat}
              className="flex items-center space-x-1.5 bg-white/10 hover:bg-white/15 border border-white/15 text-text-primary text-xs font-semibold px-3 py-1.5 rounded-lg transition-all active:scale-98 shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5 text-teal-400" />
              <span>Agent Chat</span>
            </button>

            {/* New Run Button */}
            <button
              onClick={onOpenUpload}
              className="flex items-center space-x-1.5 bg-teal-500 hover:bg-teal-400 text-navy-950 text-xs font-semibold px-3.5 py-1.5 rounded-lg shadow-glow-teal transition-all active:scale-98"
            >
              <PlusCircle className="h-4 w-4" />
              <span>New Run</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
