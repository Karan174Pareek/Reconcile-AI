# ReconcileAI — API Specification & Interface Contracts

Base URL: `http://localhost:5000/api`

---

## 1. Reconciliation Runs API

### Ingestion & Execution
- `POST /runs/upload`
  - Upload `bank_csv` and `ledger_csv` multipart files.
  - Strict Zod validation on dates, amounts, and reference tokens.
- `POST /runs/generate-seed`
  - Body: `{ "count": 500 }`
  - Generates synthetic benchmark dataset.
- `GET /runs`
  - Lists all runs with summary metrics.
- `GET /runs/:run_id`
  - Returns run details, pass breakdown, and match rates.
- `POST /runs/:run_id/reconcile-all`
  - Triggers end-to-end 3-pass pipeline execution with Socket.io progress events.

---

## 2. Exception Queue API

- `GET /runs/:run_id/exceptions`
  - Query parameters: `category`, `decision`, `limit`.
  - Returns populated exception records with bank data and candidate ledger entries.
- `POST /exceptions/:id/resolve`
  - Body: `{ "decision": "accepted" | "rejected" | "manually_resolved", "manual_ledger_id": "...", "notes": "..." }`
  - Resolves exception, creates Match if mapped, and appends to AuditLog.

---

## 3. Human-in-the-Loop Draft Actions API

- `GET /draft-actions/run/:run_id`
  - Query parameters: `status` (`pending_approval`, `approved`, `rejected`).
- `POST /draft-actions/:id/approve`
  - Body: `{ "edited_content": { ... }, "user_email": "..." }`
  - Idempotent: returns `already_processed: true` if already handled.
  - Simulates sandboxed dispatch and stamps AuditLog.
- `POST /draft-actions/:id/reject`
  - Body: `{ "reason": "...", "user_email": "..." }`

---

## 4. Conversational Forensic Chat (SSE Streaming)

- `POST /runs/:run_id/chat`
  - Headers: `Accept: text/event-stream`
  - Body: `{ "messages": [{ "role": "user", "content": "..." }] }`
  - Streams SSE events: `tool_start`, `tool_result`, `text`, `done`, `error`.

---

## 5. Audit Trail API

- `GET /runs/:run_id/audit-log`
  - Query parameters: `target_type`, `actor`, `limit`.
  - Returns immutable timeline events.

---

## 6. Real-Time WebSocket Events (Socket.io)

Namespace / Room: `run:${runId}`
- `run:progress`: `{ "stage": "...", "percentage": 45, "processed": 200, "total": 525 }`
- `run:pass_complete`: `{ "pass": 1, "matched": 350, "match_rate": 66.7 }`
- `run:complete`: `{ "status": "complete", "total_matched": 480, "match_rate": 91.4 }`
- `run:error`: `{ "error": "..." }`
