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

## 3. Multi-Provider AI Resilience (Claude ➔ Gemini ➔ Heuristic)
- **Primary Tier (Claude 3.5 Sonnet)**: `executePass3` and agent chat evaluate `ANTHROPIC_API_KEY` first. If configured and healthy, execution uses Claude.
- **Secondary Tier (Google Gemini 3.5 Flash Lite)**: If Anthropic returns an HTTP 400 credit balance error, HTTP 429 quota error, or network timeout, the orchestrator immediately catches the exception and fails over to Google Gemini (`gemini-3.5-flash-lite`).
  - **Free Tier Rate Limit Handling (15 RPM)**: Google Gemini AI Studio free tier enforces a strict limit of 15 requests per minute (15 RPM). When batch reasoning or multi-turn chat exceeds 15 RPM, Gemini returns HTTP 429 `RESOURCE_EXHAUSTED`. The orchestrator handles 429 errors by gracefully falling back to Tier 3 without breaking the pipeline.
  - **Schema Enum & Nullable Compliance**: Gemini REST API function declarations enforce string-only enum values (`convertSchemaForGemini()`) and nullable field structures (`Pass3ItemSchema`).
  - **Thought Signature Preservation**: Gemini 3.5 Flash Lite requires model `thoughtSignature` metadata to be preserved across multi-turn tool calling turns (`contents.push(candidate.content)`).
- **Tertiary Tier (Deterministic Heuristic Engine)**: If both Claude and Gemini are unconfigured, out of credits, or rate-limited, execution safely degrades to the offline Forensic Inspector Engine (`ai_mode: "heuristic"`), ensuring 100% operational uptime.
- **Parallel Concurrency Limiting (`mapConcurrent`)**: Pass 3 processes batches with a concurrency window of 2 simultaneous requests, avoiding burst-induced rate limit spikes.
- **Exponential Backoff**: If a 429 Rate Limit error occurs, the orchestrator backs off before retrying.
- **Single Corrective Retry**: If an AI call returns malformed JSON, the orchestrator triggers a corrective repair prompt enforcing exact JSON schemas.

---

## 4. Real-Time Streaming & Client Reliability
- **Dual-Mode Polling & WebSocket Architecture**: When running on Vercel Serverless, client automatically uses a 2.5s polling loop to fetch run progress, eliminating spurious WebSocket 404/500 connection warnings.
- **Optimistic UI Resolution**: Human resolutions (**Accept** / **Reject**) apply instantly in the React state (0ms perceived latency) while persisting asynchronously.
- **React Error Boundary**: Top-level error boundary catches rendering failures and offers single-click reload.
