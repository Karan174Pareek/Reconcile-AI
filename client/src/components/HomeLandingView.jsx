import React from 'react';
import SectionNav from './storytelling/SectionNav.jsx';
import HeroOverviewSection from './storytelling/HeroOverviewSection.jsx';
import HowItWorksFlowchart from './storytelling/HowItWorksFlowchart.jsx';
import MasterReconciliationFlow from './storytelling/MasterReconciliationFlow.jsx';
import MatchingEngineSection from './storytelling/MatchingEngineSection.jsx';
import MultiPassTimeline from './storytelling/MultiPassTimeline.jsx';
import DataTransformationSection from './storytelling/DataTransformationSection.jsx';
import ExceptionReviewFlowSection from './storytelling/ExceptionReviewFlowSection.jsx';
import ReconciliationResultsSection from './storytelling/ReconciliationResultsSection.jsx';
import SystemArchitectureDiagram from './storytelling/SystemArchitectureDiagram.jsx';
import TechnicalValidationSection from './storytelling/TechnicalValidationSection.jsx';
import SystemOverviewMapSection from './storytelling/SystemOverviewMapSection.jsx';
import BusinessImpactPanel from './BusinessImpactPanel.jsx';

export default function HomeLandingView({
  runs = [],
  activeRunId,
  onSelectRun,
  onOpenUpload,
  onOpenExplainer,
  onNavigateTab,
  onRunCreated,
  runData,
  isConnected,
  liveProgress,
  liveEvents,
  onExecuteFullPipeline,
  isExecutingPipeline,
  refreshRun,
}) {
  const activeRun = (runData && (runData.run_id === activeRunId || !activeRunId)) ? runData : (runs.find((r) => r.run_id === activeRunId) || runData || runs[0]);

  return (
    <div className="space-y-10 animate-fadeIn">
      {/* Sticky Quick Section Navigation */}
      <SectionNav />

      {/* 01 — Overview & Real System Status Strip */}
      <HeroOverviewSection
        activeRun={activeRun}
        isConnected={isConnected}
        onOpenUpload={onOpenUpload}
        onOpenExplainer={onOpenExplainer}
        onRunCreated={onRunCreated}
      />

      {/* Financial Controller Business Impact & Tax Summary */}
      <BusinessImpactPanel run={activeRun} />

      {/* 02 — How ReconcileAI Works (Visual Pipeline Intro) */}
      <HowItWorksFlowchart />

      {/* 03 — Master Reconciliation Flow (Large Interactive Centerpiece Flowchart) */}
      <MasterReconciliationFlow />

      {/* 04 — Matching Engine (L0 Nodal ⇄ L1 Batch Integrity ⇄ L2 Order Unpacking Decision Tree) */}
      <MatchingEngineSection />

      {/* 05 — Multi-Pass Processing (Pass 1 Exact ⇄ Pass 2 Fuzzy ⇄ Pass 3 Claude AI Timeline) */}
      <MultiPassTimeline />

      {/* 06 — Data Transformation (Real Record Lifecycle & Schemas) */}
      <DataTransformationSection />

      {/* 07 — Exception & Fallback Flow (HITL Triage & Approval Desk) */}
      <ExceptionReviewFlowSection
        runId={activeRun?.run_id || activeRunId}
        onRefresh={refreshRun}
      />

      {/* 08 — Reconciliation Results & Live Operations Stepper */}
      <ReconciliationResultsSection
        runData={activeRun}
        liveProgress={liveProgress}
        liveEvents={liveEvents}
        onExecuteFullPipeline={onExecuteFullPipeline}
        isExecutingPipeline={isExecutingPipeline}
        onNavigateTab={onNavigateTab}
      />

      {/* 09 — System Architecture (Interactive Full-Stack Topology) */}
      <SystemArchitectureDiagram />

      {/* 10 — System Verification (31 / 31 Tests Passed Verification Suite) */}
      <TechnicalValidationSection />

      {/* 11 — Final System Map (Executive Architecture Blueprint) */}
      <SystemOverviewMapSection
        onOpenUpload={onOpenUpload}
        onNavigateTab={onNavigateTab}
      />
    </div>
  );
}
