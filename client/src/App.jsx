import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Navbar from './components/Navbar.jsx';
import UploadView from './components/UploadView.jsx';
import MetricCards from './components/MetricCards.jsx';
import LiveProgressStepper from './components/LiveProgressStepper.jsx';
import ExceptionQueue from './components/ExceptionQueue.jsx';
import DraftActionsQueue from './components/DraftActionsQueue.jsx';
import AuditLog from './components/AuditLog.jsx';
import AgentChat from './components/AgentChat.jsx';
import { useRunSocket } from './hooks/useRunSocket.js';
import {
  Layers,
  PlusCircle,
  Activity,
  AlertTriangle,
  Send,
  Loader2,
  FileCheck2,
  Sparkles,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_SERVER_URL
  ? `${import.meta.env.VITE_SERVER_URL}/api`
  : 'http://localhost:5000/api';

export default function App() {
  const [runs, setRuns] = useState([]);
  const [activeRunId, setActiveRunId] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isExecutingPipeline, setIsExecutingPipeline] = useState(false);
  const [isLoadingRuns, setIsLoadingRuns] = useState(true);

  // Hook for Socket.io real-time streaming & polling
  const {
    runData,
    isConnected,
    liveProgress,
    liveEvents,
    loading: isRefreshing,
    refreshRun,
  } = useRunSocket(activeRunId);

  // Fetch available runs
  const fetchRunsList = useCallback(async (selectRunId = null) => {
    try {
      setIsLoadingRuns(true);
      const res = await axios.get(`${API_BASE}/runs`);
      const fetched = res.data.data || [];
      setRuns(fetched);

      if (selectRunId) {
        setActiveRunId(selectRunId);
      } else if (fetched.length > 0 && !activeRunId) {
        setActiveRunId(fetched[0].run_id);
      }
    } catch (err) {
      console.error('[App] Failed to fetch runs:', err);
    } finally {
      setIsLoadingRuns(false);
    }
  }, [activeRunId]);

  useEffect(() => {
    fetchRunsList();
  }, []);

  const handleRunCreated = (newRunId) => {
    fetchRunsList(newRunId);
  };

  const handleExecuteFullPipeline = async () => {
    if (!activeRunId) return;
    try {
      setIsExecutingPipeline(true);
      await axios.post(`${API_BASE}/runs/${activeRunId}/reconcile-all`);
      refreshRun();
    } catch (err) {
      console.error('[Pipeline Execution Error]:', err);
      alert(err.response?.data?.error?.message || 'Pipeline execution failed');
    } finally {
      setIsExecutingPipeline(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-brand-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        runs={runs}
        activeRunId={activeRunId}
        onSelectRun={setActiveRunId}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenChat={() => setIsChatOpen(true)}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isConnected={isConnected}
        isRefreshing={isRefreshing}
        onRefresh={refreshRun}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Agent Chat Slide-over Drawer */}
        <AgentChat
          runId={activeRunId}
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
        />

        {/* Upload Modal */}
        <UploadView
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          onRunCreated={handleRunCreated}
        />

        {/* Empty State when no runs exist */}
        {runs.length === 0 && !isLoadingRuns ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center max-w-xl mx-auto my-12 shadow-2xl space-y-5">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-brand-600/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
              <Layers className="h-8 w-8" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-white">Welcome to ReconcileAI</h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No reconciliation runs found. Upload your bank and ledger CSV files or generate a synthetic 500-record benchmark batch to start.
              </p>
            </div>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-600/20 transition-all"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Create Initial Run</span>
            </button>
          </div>
        ) : (
          <>
            {/* Top Metric Cards */}
            <MetricCards run={runData} />

            {/* Tab Views */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6 animate-fadeIn">
                {/* Live Progress Stepper */}
                <LiveProgressStepper
                  run={runData}
                  liveProgress={liveProgress}
                  liveEvents={liveEvents}
                  onExecuteFullPipeline={handleExecuteFullPipeline}
                  isExecuting={isExecutingPipeline}
                />

                {/* Quick Embedded Preview of Exception Queue */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold font-mono uppercase tracking-wider text-slate-400">
                      Exception Queue Overview
                    </h4>
                    <button
                      onClick={() => setActiveTab('exceptions')}
                      className="text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors"
                    >
                      View Full Queue →
                    </button>
                  </div>
                  <ExceptionQueue
                    runId={activeRunId}
                    onExceptionResolved={refreshRun}
                  />
                </div>
              </div>
            )}

            {activeTab === 'exceptions' && (
              <div className="animate-fadeIn">
                <ExceptionQueue
                  runId={activeRunId}
                  onExceptionResolved={refreshRun}
                />
              </div>
            )}

            {activeTab === 'draft_actions' && (
              <div className="animate-fadeIn">
                <DraftActionsQueue runId={activeRunId} />
              </div>
            )}

            {activeTab === 'audit_trail' && (
              <div className="animate-fadeIn">
                <AuditLog runId={activeRunId} />
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-[11px] text-slate-500 font-mono">
        ReconcileAI • 3-Pass Forensic Engine with Claude AI & Socket.io Real-Time Streaming
      </footer>
    </div>
  );
}
