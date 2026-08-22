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
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <Layers className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-white">Reconcile</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
                  AI v2.0
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">Forensic Financial Engine</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-850 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => onSelectTab('dashboard')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              <span>Live Dashboard</span>
            </button>

            <button
              onClick={() => onSelectTab('exceptions')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'exceptions'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Exception Queue</span>
            </button>

            <button
              onClick={() => onSelectTab('draft_actions')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'draft_actions'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Send className="h-3.5 w-3.5" />
              <span>Draft Actions</span>
            </button>

            <button
              onClick={() => onSelectTab('audit_trail')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'audit_trail'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <FileCheck2 className="h-3.5 w-3.5" />
              <span>Audit Trail</span>
            </button>
          </nav>

          {/* Run Selector & Actions */}
          <div className="flex items-center space-x-3">
            {/* Live Socket Status Pill */}
            <div
              className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border ${
                isConnected
                  ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-400'
                  : 'bg-amber-950/60 border-amber-800/80 text-amber-400'
              }`}
            >
              <Radio className={`h-3 w-3 ${isConnected ? 'animate-pulse text-emerald-400' : 'text-amber-400'}`} />
              <span>{isConnected ? 'LIVE WS' : 'POLLING'}</span>
            </div>

            {/* Run Switcher Dropdown */}
            {runs.length > 0 && (
              <div className="relative">
                <select
                  value={activeRunId || ''}
                  onChange={(e) => onSelectRun(e.target.value)}
                  className="bg-slate-850 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                >
                  {runs.map((r) => (
                    <option key={r.run_id} value={r.run_id}>
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
              className="p-1.5 rounded-lg bg-slate-850 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-brand-400' : ''}`} />
            </button>

            {/* Agent Chat Button */}
            <button
              onClick={onOpenChat}
              className="flex items-center space-x-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-md shadow-purple-600/20 transition-all"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Agent Chat</span>
            </button>

            {/* New Run Button */}
            <button
              onClick={onOpenUpload}
              className="flex items-center space-x-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-md shadow-brand-600/20 transition-all"
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
