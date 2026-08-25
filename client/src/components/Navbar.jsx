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
  HelpCircle,
  Menu,
  X,
  Home,
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
  onOpenExplainer,
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

  const navItems = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'exceptions', label: 'Exceptions', icon: AlertTriangle },
    { id: 'draft_actions', label: 'Draft Actions', icon: Send },
    { id: 'audit_trail', label: 'Audit Trail', icon: FileCheck2 },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Tagline */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => onSelectTab('overview')}
              className="flex items-center space-x-2.5 text-left focus:outline-none cursor-pointer"
            >
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold text-base text-gray-900 tracking-tight">ReconcileAI</span>
                  <span className="text-[10px] font-semibold font-mono px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200">
                    v2.0
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 hidden sm:block">Automated Bank-to-Ledger Matching</p>
              </div>
            </button>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 bg-gray-50 p-1 rounded-lg border border-gray-200">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-white text-blue-600 font-semibold shadow-sm border border-gray-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Header Actions */}
          <div className="flex items-center space-x-2">
            {/* How it works Button */}
            <button
              onClick={onOpenExplainer}
              title="How ReconcileAI Works"
              className="hidden sm:inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200 transition-colors cursor-pointer"
            >
              <HelpCircle className="h-3.5 w-3.5 text-gray-500" />
              <span>How it works</span>
            </button>

            {/* Live WS Status Pill */}
            <div
              className={`hidden lg:flex items-center space-x-1 px-2 py-1 rounded-md text-[11px] font-mono font-medium border ${
                isConnected
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-amber-50 border-amber-200 text-amber-700'
              }`}
            >
              <Radio className={`h-3 w-3 ${isConnected ? 'animate-pulse text-emerald-600' : 'text-amber-600'}`} />
              <span>{isConnected ? 'LIVE' : 'POLLING'}</span>
            </div>

            {/* Run Selector Dropdown */}
            {runs.length > 0 && activeRun && (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center space-x-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-900 text-xs rounded-lg px-2.5 py-1.5 font-mono transition-colors shadow-sm"
                >
                  <span className="font-semibold">{truncateRunId(activeRun.run_id)}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                    {activeRun.total_records || 0} recs
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-1.5 w-72 bg-white rounded-lg border border-gray-200 shadow-dropdown py-1 z-50 animate-fadeIn">
                    <div className="px-3 py-1.5 text-[10px] font-mono text-gray-400 uppercase tracking-wider border-b border-gray-100">
                      Select Reconciliation Run
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
                            className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-blue-50 text-blue-700 font-semibold'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <div className="space-y-0.5">
                              <div className="font-mono text-[11px] flex items-center space-x-1.5">
                                <span>{truncateRunId(r.run_id)}</span>
                                {isSelected && <Check className="h-3 w-3 text-blue-600" />}
                              </div>
                              <div className="text-[10px] text-gray-500 font-mono">
                                {r.total_records || 0} records • {r.status}
                              </div>
                            </div>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200 text-gray-600 uppercase">
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

            {/* Refresh Button */}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              title="Refresh data"
              className="p-2 rounded-lg bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50 shadow-sm cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
            </button>

            {/* Agent Chat Button */}
            <button
              onClick={onOpenChat}
              className="hidden sm:inline-flex items-center space-x-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors shadow-sm cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              <span>Ask AI</span>
            </button>

            {/* New Run Button (Primary Blue) */}
            <button
              onClick={onOpenUpload}
              className="btn-primary text-xs py-1.5 px-3"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New Run</span>
            </button>

            {/* Mobile Menu Hamburger */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white px-4 pt-2 pb-4 space-y-1 animate-fadeIn">
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
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
            <button
              onClick={() => {
                onOpenExplainer();
                setIsMobileMenuOpen(false);
              }}
              className="flex items-center space-x-1.5 text-xs text-gray-600 py-1"
            >
              <HelpCircle className="h-4 w-4 text-gray-400" />
              <span>How ReconcileAI Works</span>
            </button>

            <button
              onClick={() => {
                onOpenChat();
                setIsMobileMenuOpen(false);
              }}
              className="flex items-center space-x-1.5 text-xs text-blue-600 font-medium py-1"
            >
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span>Ask AI Agent</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
