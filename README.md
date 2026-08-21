# ReconcileAI

An AI agent that reconciles a bank statement against an internal ledger — auto-matching records deterministically where possible, using Claude to reason through genuine exceptions, and reporting an honest match rate instead of a fabricated one.

Built for the **Razorpay AI Buildathon 2026** — Track: **AI Finance Controller**.

---

## Why this exists

Reconciliation is still mostly manual spreadsheet work in finance ops. This project closes one real loop end-to-end: **upload messy bank + ledger data → get a match rate, a categorized exception list, and an agent you can ask questions of — with every decision traceable in an audit log.**

---

## What makes this more than a matching script

- **3-pass pipeline**: deterministic exact match → fuzzy match → Claude-powered exception reasoning (only unresolved rows hit the API — bounded cost, bounded latency).
- **Agentic chat**: ask the system natural-language questions about the run (*"why is this unresolved?"*) — answered via tool-use over the real database, not guessed.
- **Human-in-the-loop actions**: the agent can draft a next action (e.g. vendor follow-up email, ledger adjustment) for a resolvable exception, but never executes it without explicit human approval.
- **Full audit trail**: every match, exception, agent query, and approval is logged and explainable.

---

## Architecture

See [`docs/architecture.md`](file:///c:/Users/karan/OneDrive/Desktop/Reconcile%20AI/docs/architecture.md) for the full system diagram and request flows.

```
React (dashboard, exception queue, agent chat, live progress)
│
Express/Node (matching engine, Claude orchestrator, tool router, WebSocket server)
│
MongoDB (records, matches, exceptions, audit log, runs, users)
│
Claude API (exception reasoning, agent chat, draft-action generation)
```

---

## Results (on synthetic 500-record seed batch)

| Metric | Value |
| :--- | :--- |
| Pass 1 (exact) matched | ~65 % |
| Pass 2 (fuzzy) matched | ~18 % |
| Pass 3 (AI) matched | ~10 % |
| Genuinely unresolved / exceptions | ~7 % |
| Time to reconcile 500 records | < 15s (local / streamed) |

---

## Setup & Quickstart

```bash
# 1. Clone repository
git clone <repo-url>
cd reconcileai

# 2. Configure environment
cp server/.env.example server/.env
# Edit server/.env and fill in MONGO_URI, CLAUDE_API_KEY, JWT_SECRET

# 3. Install dependencies
npm install --prefix server
npm install --prefix client

# 4. Generate synthetic demo seed data
npm run seed --prefix server
# Or export CSVs: node server/scripts/generateSeed.js --csv

# 5. Start development servers
npm run dev --prefix server # API + WebSocket on http://localhost:5000
npm run dev --prefix client # Frontend Vite on http://localhost:5173
```

---

## Documentation

- [`docs/prd.md`](file:///c:/Users/karan/OneDrive/Desktop/Reconcile%20AI/docs/prd.md) — Product requirements & scope
- [`docs/architecture.md`](file:///c:/Users/karan/OneDrive/Desktop/Reconcile%20AI/docs/architecture.md) — System design & request pipelines
- [`docs/phases.md`](file:///c:/Users/karan/OneDrive/Desktop/Reconcile%20AI/docs/phases.md) — Build plan & milestones
- [`docs/database.md`](file:///c:/Users/karan/OneDrive/Desktop/Reconcile%20AI/docs/database.md) — Data models & schemas
- [`docs/api.md`](file:///c:/Users/karan/OneDrive/Desktop/Reconcile%20AI/docs/api.md) — REST & WebSocket API contracts
- [`docs/prompts.md`](file:///c:/Users/karan/OneDrive/Desktop/Reconcile%20AI/docs/prompts.md) — Claude prompt contracts & tool definitions
- [`docs/security.md`](file:///c:/Users/karan/OneDrive/Desktop/Reconcile%20AI/docs/security.md) — Security posture & data handling boundaries
- [`docs/error-handling.md`](file:///c:/Users/karan/OneDrive/Desktop/Reconcile%20AI/docs/error-handling.md) — Failure handling per layer

---

## Known Limitations (stated honestly, not hidden)

- **Demo-scoped**: No enterprise encryption-at-rest beyond MongoDB Atlas defaults; rate limiting is omitted in this test suite.
- **Synthetic data only**: Zero real customer PII or real banking credentials; all synthetic transactions use `UTR-MOCK-` prefixes.
- **Single-role auth for demo**: Clean JWT-based authentication for `analyst`/`admin` role.
- **Sandboxed side-effects**: Draft email execution routes to sandbox (e.g. Mailtrap / local stub) to prevent real email dispatch during tests.

---

## Author

**Karan** — 4th-year BCA, MAKAUT | Co-founder, Ignitia Digital
