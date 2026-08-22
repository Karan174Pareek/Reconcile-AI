import React, { useState, useRef, useEffect } from 'react';
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
  ChevronDown,
  Check,
} from 'lucide-react';

function truncateRunId(id) {
  if (!id) return '';
  if (id.length <= 16) return id;
  const parts = id.split('-');
  if (parts.length >= 3) {
    const prefix = parts.slice(0, 2).join('-');
    const suffix = id.slice(-6);
    return `${prefix}-...${suffix}`;
  }
  return `${id.slice(0, 10)}...${id.slice(-6)}`;
}

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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const activeRun = runs.find((r) => r.run_id === activeRunId) || runs[0];

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Live Dashboard', icon: Activity },
    { id: 'exceptions', label: 'Exception Queue', icon: AlertTriangle },
    { id: 'draft_actions', label: 'Draft Actions', icon: Send },
    { id: 'audit_trail', label: 'Audit Trail', icon: FileCheck2 },
  ];

  return (
    <header className="sticky top-0 z-40 bg-navy-950/80 backdrop-blur-xl border-b border-white/10 shadow-glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Logo */}
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

          {/* Unified Nav Items (Option 1: Glass Ghost-Buttons) */}
          <nav className="hidden md:flex items-center space-x-1.5 bg-white/[0.02] p-1.5 rounded-xl border border-white/5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs transition-all ${
                    isActive
                      ? 'bg-teal-500 text-navy-950 font-semibold border border-teal-400 shadow-glow-teal'
                      : 'bg-white/[0.04] text-text-secondary hover:text-text-primary hover:bg-white/[0.08] border border-white/10 hover:border-white/20'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Actions & Selectors */}
          <div className="flex items-center space-x-2.5">
            {/* LIVE WS Status Pill (Glass Outline) */}
            <div
              className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-medium border ${
                isConnected
                  ? 'bg-teal-500/[0.05] border-teal-500/30 text-teal-400'
                  : 'bg-amber-500/[0.05] border-amber-500/30 text-amber-400'
              }`}
            >
              <Radio className={`h-3 w-3 ${isConnected ? 'animate-pulse text-teal-400' : 'text-amber-400'}`} />
              <span>{isConnected ? 'LIVE WS' : 'POLLING'}</span>
            </div>

            {/* Run Selector Dropdown (Truncated + Badges + Chevron) */}
            {runs.length > 0 && activeRun && (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center space-x-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 text-text-primary text-xs rounded-lg px-2.5 py-1.5 font-mono transition-all"
                >
                  <span className="font-semibold text-text-primary">
                    {truncateRunId(activeRun.run_id)}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-text-secondary">
                    {activeRun.total_records || 0} recs
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-text-muted" />
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-72 glass-panel rounded-xl border border-white/15 shadow-glass py-1.5 z-50 animate-fadeIn">
                    <div className="px-3 py-1.5 text-[10px] font-mono text-text-muted uppercase border-b border-white/5">
                      Select Active Run
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {runs.map((r) => {
                        const isSelected = r.run_id === activeRunId;
                        return (
                          <button
                            key={r.run_id}
                            onClick={() => {
                              onSelectRun(r.run_id);
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                              isSelected
                                ? 'bg-teal-500/10 text-teal-300 font-semibold'
                                : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'
                            }`}
                          >
                            <div className="space-y-0.5">
                              <div className="font-mono text-[11px] text-text-primary flex items-center space-x-1.5">
                                <span>{truncateRunId(r.run_id)}</span>
                                {isSelected && <Check className="h-3 w-3 text-teal-400" />}
                              </div>
                              <div className="text-[10px] text-text-muted font-mono">
                                {r.total_records || 0} rows • {r.status}
                              </div>
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-text-secondary uppercase">
                              {r.status}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Refresh Button with Tooltip */}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              title="Refresh run data"
              className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 text-text-secondary hover:text-text-primary transition-all disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-teal-400' : ''}`} />
            </button>

            {/* Agent Chat Button (Secondary Glass Outline) */}
            <button
              onClick={onOpenChat}
              className="flex items-center space-x-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/15 text-text-primary text-xs font-medium px-3 py-1.5 rounded-lg transition-all active:scale-98"
            >
              <Sparkles className="h-3.5 w-3.5 text-teal-400" />
              <span>Agent Chat</span>
            </button>

            {/* New Run Button (Primary Solid Teal CTA) */}
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
