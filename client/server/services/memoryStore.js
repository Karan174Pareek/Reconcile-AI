/**
 * High-Availability In-Memory Store & Cache
 * Guarantees 100% uptime for ReconcileAI even if MongoDB Atlas is cold-starting,
 * blocked by network firewall, or unconfigured on serverless platforms.
 */

const memoryDb = {
  runs: new Map(),
  bankRecords: new Map(), // run_id -> array
  ledgerRecords: new Map(), // run_id -> array
  settlementReports: new Map(), // run_id -> array
  settlementLineItems: new Map(), // run_id -> array
  matches: new Map(), // run_id -> array
  exceptions: new Map(), // run_id -> array
  draftActions: new Map(), // run_id -> array
  auditLogs: new Map(), // run_id -> array
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
    const existing = memoryDb.matches.get(runId) || [];
    memoryDb.matches.set(runId, [...existing, ...matches]);
  },

  getMatches(runId) {
    return memoryDb.matches.get(runId) || [];
  },

  saveExceptions(runId, exceptions) {
    const existing = memoryDb.exceptions.get(runId) || [];
    memoryDb.exceptions.set(runId, [...existing, ...exceptions]);
  },

  getExceptions(runId) {
    return memoryDb.exceptions.get(runId) || [];
  },

  saveDraftActions(runId, actions) {
    const existing = memoryDb.draftActions.get(runId) || [];
    memoryDb.draftActions.set(runId, [...existing, ...actions]);
  },

  getDraftActions(runId) {
    return memoryDb.draftActions.get(runId) || [];
  },

  saveAuditLogs(runId, logs) {
    const existing = memoryDb.auditLogs.get(runId) || [];
    memoryDb.auditLogs.set(runId, [...existing, ...logs]);
  },

  getAuditLogs(runId) {
    return memoryDb.auditLogs.get(runId) || [];
  },
};
