import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
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
    <div className="relative min-h-screen bg-navy-950 text-text-primary flex flex-col font-sans selection:bg-teal-500 selection:text-navy-950">
      {/* Ambient Asymmetric Glow Accents */}
      <div className="ambient-glow-teal" />
      <div className="ambient-glow-amber" />
      <div className="ambient-glow-bottom" />

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
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-6">
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
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="glass-panel rounded-2xl p-12 text-center max-w-xl mx-auto my-12 space-y-5"
          >
            <div className="h-16 w-16 mx-auto rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <Layers className="h-8 w-8" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-text-primary tracking-tight">Welcome to ReconcileAI</h2>
              <p className="text-xs text-text-secondary max-w-md mx-auto leading-relaxed">
                No reconciliation runs found. Upload your bank and ledger CSV files or generate a synthetic 500-record benchmark batch to start.
              </p>
            </div>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-navy-950 text-xs font-semibold shadow-glow-teal transition-all active:scale-98"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Create Initial Run</span>
            </button>
          </motion.div>
        ) : (
          <>
            {/* Top Metric Cards */}
            <MetricCards run={runData} />

            {/* Tab Views with Fluid Transitions */}
            <AnimatePresence mode="wait">
              {activeTab === 'dashboard' && (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="space-y-6"
                >
                  {/* Live Progress Stepper */}
                  <LiveProgressStepper
                    run={runData}
                    liveProgress={liveProgress}
                    liveEvents={liveEvents}
                    onExecuteFullPipeline={handleExecuteFullPipeline}
                    isExecuting={isExecutingPipeline}
                  />

                  {/* Quick Embedded Preview of Exception Queue */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between px-1">
                      <h4 className="text-[11px] font-semibold font-mono uppercase tracking-wider text-text-muted">
                        Exception Queue Snapshot
                      </h4>
                      <button
                        onClick={() => setActiveTab('exceptions')}
                        className="text-xs font-semibold text-teal-400 hover:text-teal-300 transition-colors"
                      >
                        View Full Queue →
                      </button>
                    </div>
                    <ExceptionQueue
                      runId={activeRunId}
                      onExceptionResolved={refreshRun}
                    />
                  </div>
                </motion.div>
              )}

              {activeTab === 'exceptions' && (
                <motion.div
                  key="exceptions"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                >
                  <ExceptionQueue
                    runId={activeRunId}
                    onExceptionResolved={refreshRun}
                  />
                </motion.div>
              )}

              {activeTab === 'draft_actions' && (
                <motion.div
                  key="draft_actions"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                >
                  <DraftActionsQueue runId={activeRunId} />
                </motion.div>
              )}

              {activeTab === 'audit_trail' && (
                <motion.div
                  key="audit_trail"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                >
                  <AuditLog runId={activeRunId} />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 bg-navy-950/80 backdrop-blur-md py-4 text-center text-[11px] text-text-muted font-mono">
        ReconcileAI • 3-Pass Forensic Hybrid Engine with Claude AI & Socket.io Real-Time Streaming
      </footer>
    </div>
  );
}
