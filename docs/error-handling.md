# ReconcileAI — Error Handling & Fault-Tolerance Strategy

## 1. Ingestion Layer Fault Tolerance
- **Strict Zod CSV Validation**: Malformed dates, non-numeric amounts, or missing reference keys are caught upfront before database persistence.
- **Line-Numbered Feedback**: Validation errors return exact row numbers and fields to the user without crashing the server.

---

## 2. Matching Engine & Record Integrity
- **Graceful Anomaly Handling**: Corrupted or unparseable rows in memory are automatically flagged and routed to `Exception` with category `'unknown'`.
- **Multi-Candidate Tie Preservation**: If multiple candidate ledger records match a bank record, Pass 2 refuses to guess and safely forwards all candidates to Pass 3.
- **Mathematical Batch Gate (Level 1)**: If a gateway settlement report fails internal integrity ($\text{Gross} - \text{Fees} - \text{GST} - \text{Refunds} \neq \text{Net}$), unpacking of that batch is halted immediately, and a `batch_imbalance` exception is raised to prevent ledger corruption.

---

## 3. Claude AI Orchestration, Quotas & Rate Limits
- **Parallel Concurrency Limiting (`mapConcurrent`)**: Pass 3 processes batches with a concurrency window of 2 simultaneous requests, avoiding burst-induced HTTP 429 rate limit spikes on external AI APIs.
- **Exponential Backoff**: If a 429 Rate Limit error occurs, the orchestrator backs off for 1500ms before retrying.
- **Quota & Credit Balance Graceful Fallback**: If an Anthropic API call encounters a 400/402 credit balance or quota error, the system fast-memoizes the limit and seamlessly routes reasoning to the deterministic forensic analysis engine. The auditor is transparently notified without pipeline termination.
- **Single Corrective Retry**: If an AI call returns malformed JSON, the orchestrator triggers a corrective repair prompt enforcing exact JSON schemas.

---

## 4. Real-Time Streaming & Client Reliability
- **Dual-Mode Polling & WebSocket Architecture**: When running on Vercel Serverless, client automatically uses a 2.5s polling loop to fetch run progress, eliminating spurious WebSocket 404/500 connection warnings.
- **Optimistic UI Resolution**: Human resolutions (**Accept** / **Reject**) apply instantly in the React state (0ms perceived latency) while persisting asynchronously.
- **React Error Boundary**: Top-level error boundary catches rendering failures and offers single-click reload.
