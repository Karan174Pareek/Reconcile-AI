import React, { useState, useRef, useEffect } from 'react';
import BrandLogo from './BrandLogo.jsx';
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
  Menu,
  X,
  Home,
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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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

  // 5 Top-Level Navigation Items
  const navItems = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'exceptions', label: 'Exceptions', icon: AlertTriangle },
    { id: 'draft_actions', label: 'Draft Actions', icon: Send },
    { id: 'audit_trail', label: 'Audit Trail', icon: FileCheck2 },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200/90 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-15 sm:h-16 gap-2">
          
          {/* Left: Brand Logo */}
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => onSelectTab('overview')}
              className="flex items-center space-x-2 sm:space-x-2.5 text-left focus:outline-hidden cursor-pointer group"
            >
              <BrandLogo className="h-8 w-8 sm:h-9 sm:w-9 group-hover:scale-105 transition-transform" />
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-sm sm:text-base text-gray-900 tracking-tight">ReconcileAI</span>
                <span className="text-[10px] font-semibold font-mono px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                  v2.0
                </span>
              </div>
            </button>
          </div>

          {/* Center: Desktop Navigation Links (5 Items, 100% Consistent Active Style) */}
          <nav className="hidden xl:flex items-center space-x-1 bg-gray-50/80 p-1 rounded-xl border border-gray-200/70">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200/80 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/70 font-medium'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right: Actions */}
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            
            {/* Live WS Status Pill (Visible on Desktop) */}
            <div
              title={isConnected ? 'Connected to live WebSocket events' : 'Polling for updates'}
              className={`hidden 2xl:flex items-center space-x-1 px-2 py-1 rounded-md text-[10px] font-mono font-semibold border ${
                isConnected
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-amber-50 border-amber-200 text-amber-700'
              }`}
            >
              <Radio className={`h-2.5 w-2.5 ${isConnected ? 'animate-pulse text-emerald-600' : 'text-amber-600'}`} />
              <span>{isConnected ? 'LIVE' : 'POLLING'}</span>
            </div>

            {/* Simplified Run Selector Dropdown (Visible on Tablet & Desktop) */}
            {runs.length > 0 && activeRun && (
              <div className="relative hidden md:block" ref={dropdownRef}>
                <div className="inline-flex items-center rounded-lg border border-gray-200 bg-white shadow-xs">
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center space-x-1.5 px-2.5 py-1.5 text-xs text-gray-800 hover:bg-gray-50 rounded-l-lg transition-colors cursor-pointer font-medium"
                  >
                    <span className={`h-2 w-2 rounded-full ${activeRun.status === 'complete' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                    <span className="font-medium text-gray-900">Current Run</span>
                    <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                  </button>

                  <div className="h-4 w-px bg-gray-200" />

                  {/* Integrated Refresh Button */}
                  <button
                    type="button"
                    onClick={onRefresh}
                    disabled={isRefreshing}
                    title="Refresh run data"
                    className="p-1.5 hover:bg-gray-50 rounded-r-lg text-gray-500 hover:text-gray-800 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
                  </button>
                </div>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-1.5 w-80 bg-white rounded-xl border border-gray-200 shadow-lg py-1.5 z-50 animate-fadeIn">
                    <div className="px-3.5 py-2 border-b border-gray-100 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">
                        Reconciliation Runs
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono font-medium">
                        {runs.length} total
                      </span>
                    </div>

                    <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
                      {runs.map((r) => {
                        const isSelected = r.run_id === activeRunId;
                        return (
                          <button
                            key={r.run_id}
                            onClick={() => {
                              onSelectRun(r.run_id);
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-blue-50/70 text-blue-900 font-semibold'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <div className="space-y-1 min-w-0 pr-2">
                              <div className="font-mono text-[11px] flex items-center space-x-1.5 truncate">
                                <span className="truncate">{r.run_id}</span>
                                {isSelected && <Check className="h-3 w-3 text-blue-600 shrink-0" />}
                              </div>
                              <div className="text-[10px] text-gray-500 flex items-center space-x-2">
                                <span>{r.total_records || 0} records</span>
                                <span>•</span>
                                <span>{Number(r.match_rate || 0).toFixed(1)}% match</span>
                              </div>
                            </div>

                            <span
                              className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border shrink-0 ${
                                r.status === 'complete'
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                  : 'bg-amber-50 border-amber-200 text-amber-700'
                              }`}
                            >
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

            {/* Secondary Ask AI Button (Ghost / Outline Style - Desktop & Tablet) */}
            <button
              onClick={onOpenChat}
              className="hidden md:inline-flex items-center space-x-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 hover:text-gray-900 text-xs font-medium px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              <span>Ask AI</span>
            </button>

            {/* Primary Action: New Run Button (Solid Blue) */}
            <button
              onClick={onOpenUpload}
              className="btn-primary text-xs py-1.5 px-3 sm:px-3.5 shadow-xs flex items-center space-x-1.5"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>New Run</span>
            </button>

            {/* Mobile / Tablet Hamburger Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="xl:hidden p-1.5 sm:p-2 rounded-lg border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {isMobileMenuOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Responsive Mobile / Tablet Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="xl:hidden border-t border-gray-200 bg-white px-4 pt-3 pb-4 space-y-3 animate-fadeIn shadow-inner">
          
          {/* Mobile Run Selector Summary & Switcher */}
          {runs.length > 0 && activeRun && (
            <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500 font-semibold">Active Run</span>
                <button
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  className="flex items-center space-x-1 text-[11px] text-blue-600 font-medium hover:text-blue-700"
                >
                  <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
              <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-gray-200 text-xs">
                <div className="min-w-0 pr-2">
                  <div className="font-mono text-[11px] font-semibold text-gray-900 truncate">
                    {activeRun.run_id}
                  </div>
                  <div className="text-[10px] text-gray-500">
                    {activeRun.total_records || 0} recs • {activeRun.match_rate || 0}% match
                  </div>
                </div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                  {activeRun.status}
                </span>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 px-1">Navigation</span>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Mobile Secondary Actions (Ask AI + WS status) */}
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
            <button
              onClick={() => {
                onOpenChat();
                setIsMobileMenuOpen(false);
              }}
              className="flex items-center space-x-1.5 text-xs text-gray-800 font-medium py-1.5 px-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 shadow-xs"
            >
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              <span>Ask AI Agent</span>
            </button>

            <div className="flex items-center space-x-1.5 text-[10px] font-mono text-gray-500">
              <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span>{isConnected ? 'LIVE SYNC' : 'POLLING'}</span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
