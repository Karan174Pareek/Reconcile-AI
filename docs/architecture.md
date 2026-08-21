# ReconcileAI — Architecture

## System Overview

ReconcileAI is an end-to-end reconciliation system designed to process disparate bank statements and internal accounting ledgers. It leverages a deterministic matching engine, fuzzy matching heuristics, and LLM-powered (Claude 3.5 Sonnet) reasoning to categorize exceptions, facilitate interactive agentic chat, and draft auditable remediation actions.

```
+-------------------------------------------------------------+
|                      React 18 Frontend                      |
| (Dashboard, Upload Zone, Exception Queue, Chat & Actions)  |
+-------------------------------------------------------------+
                              |
                     REST API & WebSocket
                              |
+-------------------------------------------------------------+
|                   Express + Socket.io Server                |
|  - Auth Middleware (JWT & bcrypt)                           |
|  - CSV Ingestion & Parser (PapaParse strict)                |
|  - 3-Pass Reconciliation Engine:                            |
|       * Pass 1: Deterministic Exact Matching (UTR/Amount)   |
|       * Pass 2: Fuzzy Matching (Levenshtein + Date Window)  |
|       * Pass 3: Claude Exception Reasoner & Classifier      |
|  - Agent Chat Tool Router (Read-only execution layer)       |
|  - Draft Action Dispatcher (Sandbox/Human-in-the-loop)      |
+-------------------------------------------------------------+
            |                                  |
            v                                  v
+-----------------------+          +-----------------------+
|    MongoDB Database   |          |      Claude API       |
| - bank_records        |          | - Exception Reasoning |
| - ledger_records      |          | - Agent DB Tool-Use   |
| - matches             |          | - Draft Generation    |
| - exceptions          |          +-----------------------+
| - draft_actions       |
| - audit_logs (append) |
| - runs & users        |
+-----------------------+
```

## Data Pipeline & Passes

1. **Ingestion**: Bank statements (CSV) & Ledger exports (CSV) uploaded or synthetically generated.
2. **Pass 1 (Deterministic)**: Direct key matches on standard identifiers (`utr_ref` / `invoice_ref` with identical amounts and zero day delta). Confidence: `1.0`.
3. **Pass 2 (Fuzzy)**: Matches within amount thresholds (e.g. within minor tolerances or exact amount with timing lag +/- 2 days) and narration/payee text similarity > 0.85. Confidence: `0.80 - 0.95`.
4. **Pass 3 (AI Exception Reasoning)**: Unresolved rows are bundled with candidate ledger entries (±10% amount, ±14 days window) and passed to Claude with structured JSON prompt contracts to categorize:
   - `duplicate`
   - `refund`
   - `bank_fee`
   - `timing_lag`
   - `unrecorded`
   - `unknown`
5. **Human-in-the-Loop & Draft Actions**: Resolvable exceptions trigger draft actions with approval workflows. No external action executes without human sign-off.
