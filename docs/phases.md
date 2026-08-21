# ReconcileAI — Build Phases

## Phase 1: Foundation & Scaffolding (Current)
- [x] Project workspace initialization (Root, Server, Client)
- [x] Mongoose database schemas & models
- [x] Synthetic seed generator (500 records with realistic noise distribution)
- [x] Configuration templates, `.env.example`, and `.gitignore`

## Phase 2: Ingestion & Deterministic Pipeline (Pass 1 & Pass 2)
- [ ] PapaParse CSV ingestion with row-level validation
- [ ] Pass 1 Exact Matching Engine (UTR/Reference, Exact Amount, Same Date)
- [ ] Pass 2 Fuzzy Matching Engine (Narration similarity, date tolerance +/- 2 days)
- [ ] WebSocket streaming of run progress & metrics

## Phase 3: Claude Exception Engine (Pass 3) & Agent Chat
- [ ] Pass 3 Prompt template versioning & candidate narrowing
- [ ] Batch Claude API integration with retry & fallback
- [ ] Agent Chat tool router over MongoDB collections
- [ ] Append-only audit logging for every tool invocation and match event

## Phase 4: Human-in-the-Loop & Draft Actions
- [ ] Exception queue UI with filter by category and decision state
- [ ] Draft action generation (`vendor_email`, `ledger_correction`)
- [ ] Human review & approval modal with editable content
- [ ] Sandboxed execution & idempotency guarantees

## Phase 5: UI Polish & Demo Verification
- [ ] Metric cards (Match rate, pass breakdown, unresolved counts)
- [ ] Side-by-side transaction viewer
- [ ] Live WebSocket animation / progress bar
- [ ] Error boundary handling and test run validation
