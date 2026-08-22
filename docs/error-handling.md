# ReconcileAI — Error Handling & Fault-Tolerance Strategy

## 1. Ingestion Layer Fault Tolerance
- **Strict Zod CSV Validation**: Malformed dates, non-numeric amounts, or missing reference keys are caught upfront before database persistence.
- **Line-Numbered Feedback**: Validation errors return exact row numbers and fields to the user without crashing the server.

---

## 2. Matching Engine & Record Integrity
- **Graceful Anomaly Handling**: Corrupted or unparseable rows in memory are automatically flagged and routed to `Exception` with category `'unknown'`.
- **Multi-Candidate Tie Preservation**: If multiple candidate ledger records match a bank record, Pass 2 refuses to guess and safely forwards all candidates to Pass 3.

---

## 3. Claude AI Orchestration & Retries
- **Single Corrective Retry**: If the Claude API returns malformed JSON or markdown fences, the orchestrator triggers a single retry with a corrective repair prompt.
- **Non-Fatal Fallback**: If an API error persists (e.g. 503 Overloaded), the unresolvable batch falls back to `Exception (category: 'unknown', ai_error: true)` without breaking the overall pipeline.

---

## 4. Real-Time Streaming & Client Reliability
- **Socket Disconnect Fallback**: If the WebSocket connection drops, the React client automatically falls back to polling `GET /api/runs/:run_id` every 3 seconds.
- **React Error Boundary**: Top-level error boundary catches rendering failures and interrupted streams, offering a single-click UI reload.
