import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from './components/Navbar.jsx';
import HomeLandingView from './components/HomeLandingView.jsx';
import UploadView from './components/UploadView.jsx';
import ExplainerModal from './components/ExplainerModal.jsx';
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
  Zap,
  HelpCircle,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_SERVER_URL
  ? `${import.meta.env.VITE_SERVER_URL}/api`
  : '/api';

export default function App() {
  const [runs, setRuns] = useState([]);
  const [activeRunId, setActiveRunId] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isExplainerOpen, setIsExplainerOpen] = useState(false);
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
    setActiveTab('dashboard');
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
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Top Navigation Bar */}
      <Navbar
        runs={runs}
        activeRunId={activeRunId}
        onSelectRun={setActiveRunId}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenChat={() => setIsChatOpen(true)}
        onOpenExplainer={() => setIsExplainerOpen(true)}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isConnected={isConnected}
        isRefreshing={isRefreshing}
        onRefresh={refreshRun}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Explainer Modal */}
        <ExplainerModal
          isOpen={isExplainerOpen}
          onClose={() => setIsExplainerOpen(false)}
        />

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

        {/* Dynamic Tab Views */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <HomeLandingView
                runs={runs}
                activeRunId={activeRunId}
                onSelectRun={setActiveRunId}
                onOpenUpload={() => setIsUploadOpen(true)}
                onOpenExplainer={() => setIsExplainerOpen(true)}
                onNavigateTab={(tab) => setActiveTab(tab)}
                onRunCreated={handleRunCreated}
                runData={runData}
                isConnected={isConnected}
                liveProgress={liveProgress}
                liveEvents={liveEvents}
                onExecuteFullPipeline={handleExecuteFullPipeline}
                isExecutingPipeline={isExecutingPipeline}
                refreshRun={refreshRun}
              />
            </motion.div>
          )}

          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {runs.length === 0 && !isLoadingRuns ? (
                <div className="card-base p-10 text-center max-w-lg mx-auto my-8 space-y-4 bg-white border border-gray-200 shadow-sm">
                  <div className="h-14 w-14 mx-auto rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                    <Layers className="h-7 w-7" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-lg font-bold text-gray-900">No Reconciliation Runs Yet</h2>
                    <p className="text-xs text-gray-500 max-w-sm mx-auto">
                      Get started by trying our 500-record benchmark dataset or upload your own bank statement and ledger CSVs.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                      onClick={() => setActiveTab('overview')}
                      className="btn-primary text-xs py-2 px-4"
                    >
                      <Zap className="h-4 w-4" />
                      <span>Start with Sample Data</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Screen Subtitle Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 tracking-tight">Reconciliation Dashboard</h2>
                      <p className="text-xs text-gray-500">
                        High-level summary of automatically cleared transactions, batch verifications, and flagged exceptions.
                      </p>
                    </div>
                  </div>

                  {/* 4 Prioritized Metric Cards */}
                  <MetricCards run={runData} />

                  {/* Live Progress Stepper */}
                  <LiveProgressStepper
                    run={runData}
                    liveProgress={liveProgress}
                    liveEvents={liveEvents}
                    onExecuteFullPipeline={handleExecuteFullPipeline}
                    isExecuting={isExecutingPipeline}
                  />

                  {/* Embedded Exception Queue Snapshot */}
                  <div className="space-y-2.5 pt-2">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-700">
                        Exceptions Requiring Review
                      </h3>
                      <button
                        onClick={() => setActiveTab('exceptions')}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        View Full Exception Queue →
                      </button>
                    </div>
                    <ExceptionQueue
                      runId={activeRunId}
                      onExceptionResolved={refreshRun}
                    />
                  </div>
                </>
              )}
            </motion.div>
          )}

          {activeTab === 'exceptions' && (
            <motion.div
              key="exceptions"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
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
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <DraftActionsQueue runId={activeRunId} onDraftActionUpdated={refreshRun} />
            </motion.div>
          )}

          {activeTab === 'audit_trail' && (
            <motion.div
              key="audit_trail"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <AuditLog runId={activeRunId} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Structured Footer */}
      <footer className="border-t border-gray-200 bg-white py-4 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>ReconcileAI • Automated Bank-to-Ledger Matching Controller</span>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsExplainerOpen(true)}
              className="hover:text-gray-900 transition-colors text-xs"
            >
              How it works
            </button>
            <span>•</span>
            <span>Immutable Audit Trail Enabled</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
