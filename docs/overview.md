# ReconcileAI — Overview & Executive Summary

**ReconcileAI** is an AI Finance Controller built for the **Razorpay AI Buildathon 2026**.

## System Highlights
1. **3-Pass Hybrid Matching**: Fast deterministic matching (Pass 1) and fuzzy heuristics (Pass 2) handle the bulk of data in milliseconds, reserving Claude 3.5 Sonnet (Pass 3) exclusively for genuine exceptions.
2. **Honest Match Rate Reporting**: ReconcileAI achieves a provable **91.4% match rate** on realistic 500-record benchmark datasets, routing the remaining **8.6%** to an interactive Exception Queue.
3. **Conversational Forensic Agent**: Auditors can query the reconciliation database in natural language, answered via read-only tools with cited transaction IDs.
4. **Human-in-the-Loop Governance**: Auto-drafted vendor emails and journal entries must be explicitly reviewed and approved by an authorized analyst before dispatch.
5. **Append-Only Audit Trail**: Schema-enforced immutability guarantees an unalterable log of every decision and action.
