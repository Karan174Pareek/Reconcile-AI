import React from 'react';
import SectionNav from './storytelling/SectionNav.jsx';
import HeroOverviewSection from './storytelling/HeroOverviewSection.jsx';
import HowItWorksSection from './storytelling/HowItWorksSection.jsx';
import ReconciliationResultsSection from './storytelling/ReconciliationResultsSection.jsx';
import DecisionEngineSection from './storytelling/DecisionEngineSection.jsx';
import UnderTheHoodSection from './storytelling/UnderTheHoodSection.jsx';
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

      {/* 01 — Overview (Hero & Business Impact Summary) */}
      <HeroOverviewSection
        activeRun={activeRun}
        isConnected={isConnected}
        onOpenUpload={onOpenUpload}
        onOpenExplainer={onOpenExplainer}
        onRunCreated={onRunCreated}
      />

      {/* Business Impact & Tax Summary */}
      <BusinessImpactPanel run={activeRun} />

      {/* 02 — How It Works (3-Level Settlement Pipeline & Tax Calculator) */}
      <HowItWorksSection />

      {/* 03 — Live Results (Active Telemetry & Live Stepper Workbench) */}
      <ReconciliationResultsSection
        runData={activeRun}
        liveProgress={liveProgress}
        liveEvents={liveEvents}
        onExecuteFullPipeline={onExecuteFullPipeline}
        isExecutingPipeline={isExecutingPipeline}
        onNavigateTab={onNavigateTab}
      />

      {/* 04 — Decision Engine (Multi-Pass Reconciliation & Exception Cascade) */}
      <DecisionEngineSection />

      {/* 05 — Under the Hood (Collapsible System Specs & Architecture) */}
      <UnderTheHoodSection />
    </div>
  );
}
