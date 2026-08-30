# ReconcileAI

**An intelligent settlement reconciliation system that automatically unpacks lumped payment-gateway payouts back down to the order level — flagging what it can't resolve instead of guessing, and producing books-ready output instead of just a report.**

Built for the Razorpay AI Buildathon 2026 (AI Finance Controller track).

**Live:** https://reconcile-ai-server.vercel.app/

---

## The Problem

When a payment gateway like Razorpay settles funds to a merchant's bank account, it doesn't send one credit per order. It batches hundreds of individual payments into a single lumped NEFT/RTGS credit — typically on a T+2 cycle — net of:

- MDR (Merchant Discount Rate) fees, roughly 2% per transaction
- 18% GST charged on top of that MDR fee
- Any refunds processed within that settlement cycle

The bank statement shows exactly **one row**. But that row actually represents hundreds of individual customer orders, each with its own gross amount, its own fee deduction, its own tax, and possibly its own refund adjustment. Without unpacking this batch back down to the order level, a business cannot post revenue and expense entries to the correct accounts, and cannot correctly claim GST Input Tax Credit (ITC) on the fees it paid.

This is the real reconciliation problem merchants using any payment gateway deal with — not a simplified "match list A against list B" exercise.

## The Solution — A 3-Level Unpacking Pipeline

1. **Level 0 — Bank Deposit Matching**: matches the single bulk bank credit to a settlement batch header, using UTR and net amount checksums.
2. **Level 1 — Batch Integrity Check**: verifies the arithmetic of every settlement batch — `sum(gross − fee − tax − refunds) = net bank credit`, within ₹0.05 tolerance. An imbalanced batch is quarantined and flagged immediately rather than unpacked further, because unpacking numbers that don't already add up would just propagate an error.
3. **Level 2 — Order Unpacking & Tax Breakdown**: matches each individual line item back to the internal ledger order, isolating the MDR fee, the GST on that fee, refund deductions, rounding differences, and partial settlements — each categorized specifically, not lumped into one generic "exception."

Whatever can't be confidently resolved by deterministic + fuzzy matching gets reasoned through individually by Claude, which explains *why* — duplicate, refund, bank fee, timing lag, unrecorded, or genuinely unknown — rather than just marking it red.

## Architecture

```
┌─────────────────┐     ┌──────────────────────┐     ┌──────────────────┐
│  React Frontend  │ <-> │  Express/Node Backend │ <-> │  MongoDB Atlas    │
│  Vite + Tailwind │     │  - Matching Engine     │     │  - bank_records   │
│  - Dashboard     │     │  - Claude Orchestrator │     │  - settlement_*   │
│  - Exceptions    │     │  - Agent Tool Router   │     │  - ledger_records │
│  - Draft Actions │     │  - Auth + Audit hooks  │     │  - matches         │
│  - Audit Trail   │     └───────────┬────────────┘     │  - exceptions      │
│  - Ask AI drawer │                 │                  │  - draft_actions   │
└─────────────────┘                 ▼                  │  - audit_log       │
                            ┌──────────────────┐        └──────────────────┘
                            │   Claude API      │
                            │  - Level 2 reasoning│
                            │  - Ask AI tool-use  │
                            │  - Draft-action gen │
                            └──────────────────┘
```

**Request flow — a reconciliation run:**

1. Bank statement + settlement report + ledger data are ingested (upload or synthetic seed).
2. **Level 0** matches the single bank credit to its settlement batch (UTR + net amount + date).
3. **Level 1** verifies the batch's own arithmetic balances within ₹0.05 — an imbalanced batch is flagged immediately, not unpacked further.
4. **Level 2** unpacks the batch into individual order-level line items, using deterministic exact-matching first, then fuzzy matching, then — only for what's still unresolved — Claude reasoning, to keep AI cost and latency bounded.
5. Every match and exception is written to MongoDB with a full audit trail entry.
6. The frontend reflects progress in real time — Socket.io locally, polling in production, since Vercel's serverless functions don't support long-lived WebSocket connections.

**Request flow — Ask AI:**

A question comes in → Claude is given read-only tool access to query matches, exceptions, the audit log, and individual records, scoped to the current run → it answers using only what those tools return, citing real record IDs → every tool call is itself logged to the audit trail.

**Request flow — Draft actions:**

Claude proposes a next action (e.g. a vendor follow-up email) for a resolvable exception → it's written as `pending_approval`, no side effect yet → a human reviews, optionally edits, and approves → only then does the action execute, and it's recorded as idempotent (a duplicate approval click is a no-op, not a duplicate action).

**Deployment notes:** Running on Vercel required adapting away from a few defaults a traditional always-on Express server would use — a serverless-safe cached MongoDB connection instead of a fresh connection per request, polling instead of relying on Socket.io, and bounded-concurrency batching for Claude API calls to stay within serverless execution time limits.

Full details — including the exact database schema, API contracts, and Claude prompt contracts — are in [`/docs`](./docs) and [`MASTER_SPEC.md`](./MASTER_SPEC.md).

## Verified Results

From a real run on a synthetic 520-record dataset (all numbers below are from an actual execution, not estimates):

| Metric | Result |
|---|---|
| Total records processed | 520 |
| Level 0 — bank↔settlement matches | 16 / 17 batches |
| Level 1 — batches passing integrity check | 15 / 16 |
| Automatically matched (deterministic) | 462 |
| Resolved via AI reasoning | 33 |
| Flagged for human review | 25 |
| **Overall resolution rate** | **95.19%** |
| GST Input Tax Credit identified | ₹35,234.59 |
| Total settlement volume processed | ₹90,75,267.03 |

The 25 flagged cases are intentional, not hidden — a reconciliation tool claiming 100% accuracy on real-world settlement data would be a red flag, not an achievement. Those are exactly the cases that should reach a human.

## Beyond Flagging — Books-Ready Output

Most reconciliation demos stop at "here's a dashboard with a match rate." ReconcileAI goes further:

- **Business Impact panel** — translates the technical numbers into what a finance controller actually cares about: claimable GST ITC in rupees, estimated hours saved vs. manual review (with the assumption stated explicitly, never overstated as measured fact), and total settlement volume processed.
- **Exportable Reconciliation Journal (CSV)** — one row per resolved line item with the exact columns an accountant needs to post entries: date, order ID, settlement ID, gross amount, MDR fee, GST on MDR, net settled, account category, variance category, resolution status.
- **Reconciliation Certificate** — a downloadable summary suitable for a monthly close or an audit request: run totals, match rate, GST ITC identified, and every unresolved exception with its category.

## Conversational Forensic Assistant

An "Ask AI" panel, accessible from every screen, lets you query the current run in plain language — grounded in the actual database via read-only tool calls, not a hallucinated answer:

- Suggested questions are generated from the *actual* current run (e.g. a real imbalanced batch ID if one exists), not hardcoded examples.
- When the answer references a specific record, that reference is clickable and jumps you straight to it in the Exception Queue or Settlement Worksheet.
- The conversation retains context across follow-up questions within a session.
- If Claude's API is unavailable, the assistant says so honestly and falls back to a deterministic answer path — it never silently pretends to be running real AI reasoning when it isn't.

## Human-in-the-Loop, Always

The system can draft next actions for resolvable exceptions — a vendor follow-up email, a ledger correction entry — but never executes anything automatically. Every draft requires explicit human review and approval before any real effect happens, and approving is idempotent (clicking Approve twice never creates a duplicate action).

## Full Audit Trail

Every match, exception, and approval is logged to an append-only audit trail — enforced at the schema level, not just by convention. Nothing in this system can quietly rewrite its own history.

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS
- **Backend:** Node.js, Express, MongoDB (Atlas), serverless-safe connection caching
- **Real-time:** Socket.io locally, polling in production (Vercel's serverless model doesn't support long-lived WebSocket connections)
- **AI reasoning:** Claude API — used specifically for the minority of cases simple rule-based matching can't confidently resolve, not as a blanket solution for the whole pipeline
- **Deployment:** Vercel

## Getting Started

```bash
git clone https://github.com/Karan174Pareek/Reconcile-AI.git
cd Reconcile-AI
cp server/.env.example server/.env   # add your Claude API key and MongoDB URI
npm install --prefix server
npm install --prefix client
npm run seed --prefix server
npm run dev --prefix server
npm run dev --prefix client
```

## Documentation

Full design docs are in [`/docs`](./docs) and [`MASTER_SPEC.md`](./MASTER_SPEC.md) — product requirements, architecture, database schema, API contracts, Claude prompt contracts, security considerations, and error-handling strategy.

## Known Limitations (stated plainly, not hidden)

- Demo-scoped: no production-grade encryption-at-rest configuration or rate limiting beyond what MongoDB Atlas and Vercel provide by default.
- Synthetic settlement data only — no live payment gateway integration in this submission.
- Estimated time-savings figures are explicitly labeled assumptions, not measured facts.

## About

Built by **Karan** — 4th-year BCA student at MAKAUT, co-founder of Ignitia Digital. This project reflects how I approach engineering problems: understand the real workflow before writing code, design for the failure cases before the happy path, and build systems that are honest about what they couldn't resolve rather than ones that look flawless on the surface.
