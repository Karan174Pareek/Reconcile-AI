import React from 'react';
import MetricCards from '../MetricCards.jsx';
import LiveProgressStepper from '../LiveProgressStepper.jsx';
import { Activity, Layers, CheckCircle2, AlertCircle, TrendingUp } from 'lucide-react';

export default function ReconciliationResultsSection({
  runData,
  liveProgress,
  liveEvents,
  onExecuteFullPipeline,
  isExecutingPipeline,
  onNavigateTab,
}) {
  return (
    <section id="results" className="space-y-6">
      <div className="card-base p-6 sm:p-8 bg-white border border-gray-200 shadow-sm space-y-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-gray-200">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                03 • LIVE RESULTS
              </span>
              <span className="text-xs font-mono text-gray-500">LIVE EXECUTION WORKBENCH</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight mt-1">
              Live Reconciliation Workbench & Telemetry
            </h2>
          </div>

          <span className="text-xs font-mono text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 self-start sm:self-auto">
            Session: {runData?.run_id || 'Awaiting Run Creation'}
          </span>
        </div>

        {/* 4 Prioritized Metric Cards */}
        <MetricCards run={runData} />

        {/* Live Progress Stepper */}
        <LiveProgressStepper
          run={runData}
          liveProgress={liveProgress}
          liveEvents={liveEvents}
          onExecuteFullPipeline={onExecuteFullPipeline}
          isExecuting={isExecutingPipeline}
        />
      </div>
    </section>
  );
}
