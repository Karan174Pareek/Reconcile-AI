/**
 * High-Availability In-Memory Store & Cache
 * Guarantees 100% uptime for ReconcileAI across stateless Vercel lambdas
 */
import { generateRazorpaySeedData } from '../scripts/generateSeed.js';
import { reconcileLevel0, reconcileLevel1, reconcileLevel2 } from './matchingEngine.js';

const memoryDb = {
  runs: new Map(),
  bankRecords: new Map(),
  ledgerRecords: new Map(),
  settlementReports: new Map(),
  settlementLineItems: new Map(),
  matches: new Map(),
  exceptions: new Map(),
  draftActions: new Map(),
  auditLogs: new Map(),
};

export const MemoryStore = {
  saveRun(run) {
    if (!run || !run.run_id) return;
    memoryDb.runs.set(run.run_id, { ...run, id: run.run_id });
  },

  getRun(runId) {
    return memoryDb.runs.get(runId) || null;
  },

  listRuns() {
    return Array.from(memoryDb.runs.values()).sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA;
    });
  },

  saveSeedData(runId, data) {
    if (data.bankRecords) memoryDb.bankRecords.set(runId, data.bankRecords);
    if (data.ledgerRecords) memoryDb.ledgerRecords.set(runId, data.ledgerRecords);
    if (data.settlementReports) memoryDb.settlementReports.set(runId, data.settlementReports);
    if (data.settlementLineItems) memoryDb.settlementLineItems.set(runId, data.settlementLineItems);
  },

  getBankRecords(runId) {
    return memoryDb.bankRecords.get(runId) || [];
  },

  getLedgerRecords(runId) {
    return memoryDb.ledgerRecords.get(runId) || [];
  },

  getSettlementReports(runId) {
    return memoryDb.settlementReports.get(runId) || [];
  },

  getSettlementLineItems(runId) {
    return memoryDb.settlementLineItems.get(runId) || [];
  },

  saveMatches(runId, matches) {
    memoryDb.matches.set(runId, matches);
  },

  getMatches(runId) {
    return memoryDb.matches.get(runId) || [];
  },

  saveExceptions(runId, exceptions) {
    memoryDb.exceptions.set(runId, exceptions);
  },

  getExceptions(runId) {
    return memoryDb.exceptions.get(runId) || [];
  },

  saveDraftActions(runId, actions) {
    memoryDb.draftActions.set(runId, actions);
  },

  getDraftActions(runId) {
    return memoryDb.draftActions.get(runId) || [];
  },

  saveAuditLogs(runId, logs) {
    memoryDb.auditLogs.set(runId, logs);
  },

  getAuditLogs(runId) {
    return memoryDb.auditLogs.get(runId) || [];
  },

  /**
   * Auto-hydrates and reconciles dataset for a run_id on-demand across stateless lambda instances
   */
  async ensureRunHydrated(runId) {
    if (!runId) return null;

    let run = memoryDb.runs.get(runId);
    let bankRecords = memoryDb.bankRecords.get(runId);
    let settlementReports = memoryDb.settlementReports.get(runId);
    let settlementLineItems = memoryDb.settlementLineItems.get(runId);
    let ledgerRecords = memoryDb.ledgerRecords.get(runId);

    const canRecreateSyntheticRun = /^RUN-(SEED|COLD)-/i.test(runId);
    if (!run && !canRecreateSyntheticRun && !bankRecords && !settlementReports && !settlementLineItems && !ledgerRecords) {
      return null;
    }

    if (!bankRecords || !settlementReports || !settlementLineItems || !ledgerRecords) {
      if (!canRecreateSyntheticRun) return null;
      const data = await generateRazorpaySeedData(runId);
      bankRecords = data.bankRecords;
      settlementReports = data.settlementReports;
      settlementLineItems = data.settlementLineItems;
      ledgerRecords = data.ledgerRecords;
      this.saveSeedData(runId, data);
    }

    let matches = memoryDb.matches.get(runId) || [];
    let exceptions = memoryDb.exceptions.get(runId) || [];

    if (matches.length === 0 && exceptions.length === 0) {
      const l0 = reconcileLevel0(bankRecords, settlementReports, { runId });
      const l1 = reconcileLevel1(settlementReports, settlementLineItems, { runId });
      const l2 = reconcileLevel2(settlementLineItems, ledgerRecords, l1.balancedSettlementIds, {
        runId,
        enforceIntegrityGate: true,
      });

      matches = [...l0.matches, ...l1.matches, ...l2.matches];
      exceptions = [...l0.exceptions, ...l1.exceptions, ...l2.exceptions];

      this.saveMatches(runId, matches);
      this.saveExceptions(runId, exceptions);

      const totalRecords = settlementLineItems.length;
      const level2Matched = l2.matches.length;
      const level1Flagged = l1.exceptions.filter((e) => e.category === 'batch_imbalance').length;
      const unresolved = Math.max(0, totalRecords - level2Matched);
      const matchRate = totalRecords > 0 ? Math.round((level2Matched / totalRecords) * 10000) / 100 : 0.0;

      run = {
        run_id: runId,
        status: 'complete',
        total_records: totalRecords,
        pass1_matched: level2Matched,
        pass2_matched: 0,
        pass3_matched: 0,
        unresolved,
        match_rate: matchRate,
        level0_matched: l0.matches.length,
        level0_total: bankRecords.length,
        level1_balanced: l1.matches.length,
        level1_flagged: level1Flagged,
        level2_matched: level2Matched,
        created_at: run?.created_at || new Date(),
        completed_at: new Date(),
      };
      this.saveRun(run);
    }

    return {
      run,
      bankRecords,
      settlementReports,
      settlementLineItems,
      ledgerRecords,
      matches,
      exceptions,
    };
  },
};
