# Product Requirements Document (PRD) — ReconcileAI

## 1. Executive Summary
**ReconcileAI** is an intelligent AI Finance Controller designed for enterprise and high-growth B2B fintechs. It closes the monthly reconciliation loop between bank statements and internal accounting ledgers through a **3-pass hybrid engine**, an interactive **Exception Queue**, a **Conversational Forensic Agent**, and **Human-in-the-Loop (HITL)** draft-action remediation.

---

## 2. Core Problem & Market Opportunity
- **The Verification Bottleneck**: Transaction volumes grow exponentially, but monthly reconciliation is still manual spreadsheet work.
- **LLM Inefficiency**: Naive AI tools pass raw tabular ledgers into LLMs, causing high token costs, latency delays, and arithmetic hallucinations.
- **The ReconcileAI Solution**: Deterministic math handles high-volume exact matching (Pass 1) and fuzzy heuristics (Pass 2) in milliseconds, reserving Claude 3.5 Sonnet exclusively for ambiguous exceptions (Pass 3).

---

## 3. Key User Personas
1. **Financial Controller**: Needs accurate, provable reconciliation rates with zero fabricated data.
2. **Finance Operations Analyst**: Reviews exception queues, inspects side-by-side transaction anomalies, and executes draft remediation workflows.
3. **Internal / External Auditor**: Requires an immutable, append-only audit trail with exact rationale citations for every match and decision.

---

## 4. Product Feature Scope

### 4.1. Data Ingestion & Validation
- **Formats**: CSV file uploads for Bank Statements and Internal Ledgers.
- **Schema Enforcement**: Strict Zod validation on dates, amounts, and reference IDs before database persistence. Line-numbered error reporting on malformed data.
- **Synthetic Seed Generator**: Instant one-click benchmark dataset (500+ records) with realistic noise profiles (exact matches, timing lag, duplicates, bank fees, refunds, and unrecorded payments).

### 4.2. 3-Pass Reconciliation Engine
- **Pass 1 (Exact Deterministic)**: Exact UTR reference equality, exact amount float match, same-day settlement.
- **Pass 2 (Fuzzy Heuristics)**: Amount tolerance (`+/- 1.00`), date window (`+/- 3 days`), and 3-gram/Levenshtein similarity on corporate payee narrations. Multi-candidate ties are preserved and routed to Pass 3.
- **Pass 3 (Claude AI Reasoner)**: Bounded batching (10 rows/call), candidate narrowing (`+/- 10%` amount, `+/- 14 days`), diagnosis into `duplicate`, `bank_fee`, `timing_lag`, `unrecorded`, `refund`, or `unknown` with cited rationales.

### 4.3. Real-Time Dashboard & Exception Queue
- **Live Visualizer**: Multi-pass progress stepper powered by Socket.io with 3s REST polling fallback.
- **Exception Queue**: Side-by-side transaction inspection, Claude AI rationale badges, confidence score meters, and manual mapping modal.

### 4.4. Human-in-the-Loop (HITL) Draft Actions
- Auto-drafts vendor inquiry emails (for unrecorded invoices) and adjusting journal entries (for bank fees/refunds).
- Inline-editable UI for analyst adjustments before approval.
- Idempotent execution with sandboxed email/ledger dispatch.

### 4.5. Forensic Agent Chat
- Server-Sent Events (SSE) streaming chat drawer.
- Read-only tools scoped to `run_id` (`query_matches`, `query_exceptions`, `query_audit_log`, `get_record_by_id`).
- Automated audit logging for every tool execution.

### 4.6. Immutable Audit Trail
- Append-only MongoDB collection with schema-level mutation blocks on updates and deletes.
