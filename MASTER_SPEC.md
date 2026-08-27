# ReconcileAI — MASTER SPEC (Single Source of Truth)

**READ THIS ENTIRE FILE BEFORE MAKING ANY CHANGE TO THIS CODEBASE.**

This document describes what the product currently does, screen by screen, and what it must continue to do. It exists because features have been accidentally removed or broken while building new ones. **Nothing described in this file may be removed, simplified away, or silently changed without explicitly telling me first and getting confirmation.** If a task seems to require removing or fundamentally changing something described here, stop and ask before proceeding.

---

## 1. What this product is

ReconcileAI is a finance reconciliation tool that solves a specific, real problem: payment gateways like Razorpay deposit a single lumped bank credit covering hundreds of individual orders, net of MDR fees, GST on those fees, and refund deductions. This product automatically unpacks that lumped credit back down to the order level, verifies the math balances, categorizes anything that doesn't, and lets a human review and approve any resulting actions — with full audit traceability throughout.

It is NOT a simple "match list A against list B" tool. It is a 3-level settlement unpacking engine. See section 3.

---

## 2. Navigation structure (top-level)

The app has exactly 5 primary destinations, reachable from the top navbar, consistently styled and present on every page:

1. **Overview** — the landing/explainer page (see section 4.1)
2. **Dashboard** — the live run view and metrics (see section 4.2)
3. **Exceptions** — the exception queue (see section 4.3)
4. **Draft Actions** — the HITL approval queue (see section 4.4)
5. **Audit Trail** — the append-only decision log (see section 4.5)

Additional persistent UI elements present on every page, in the top navbar:
- Logo + product name + version badge
- A "LIVE" status indicator (real-time connection status — polling-based on Vercel per the serverless fix, socket-based locally)
- A run selector (shows the current active run, allows switching between runs)
- A refresh icon
- **"Ask AI"** button — opens the Agent Chat drawer (see section 4.6) from ANY page, not just one screen
- **"New Run"** button — the primary CTA, starts a fresh reconciliation run

The navbar must be responsive: full row on desktop, collapsing into a hamburger/menu on tablet and mobile (per the simple-UI redesign already implemented — do not reintroduce glassmorphism or reintroduce visual clutter).

---

## 3. Core architecture — the 3-level pipeline (do not flatten this back to a simple 2-way match)

- **Level 0 — Bank Deposit Matching**: matches a single bulk bank NEFT/RTGS credit to a Razorpay Settlement Report entry, via UTR + net amount + date proximity (T+2 window).
- **Level 1 — Batch Integrity Check**: verifies `sum(settlement line items' net amounts) == bank credit amount` within ₹0.05 tolerance. Imbalanced batches are flagged immediately as `batch_imbalance` exceptions, not silently proceeded past.
- **Level 2 — Order Unpacking & Tax Breakdown**: matches each settlement line item (`payment_id`/`order_id`) to the internal ledger order, isolating MDR fee %, 18% GST on that MDR (for GST Input Tax Credit purposes), refund deductions, rounding, and partial-settlement cases.

Variance/exception categories (do not collapse back to a generic flat "exception" type): `batch_imbalance`, `mdr_fee`, `gst_on_mdr`, `refund_deduction`, `rounding`, `partial_settlement`, `unrecorded`, `unknown`.

`ai_mode` field on each run indicates whether Level 2 unresolved reasoning ran on real Claude AI (`"claude"`/similar) or the deterministic/heuristic fallback (`"heuristic"`/`"fallback"`) — this must always be labeled honestly, never mislabeled as AI when it was actually the fallback path.

---

## 4. Screen-by-screen required behavior

### 4.1 Overview (landing page)
- Plain-language explanation of what the product is, what problem it solves, and a 3-step "how it works" guide (this content was deliberately merged here from a separate "How it works" tab — do not re-split it into a separate nav item).
- A "Try with sample data" primary action.
- The numbered sub-navigation (01 Overview, 02 How It Works, 03 Master Flow, 04 Matching Engine, 05 Multi-Pass, 06 Data Transform, 07 Exception Flow, 08 Results & Ops, and further sections) — this scroll-spy navigation's active-tab highlight and the content shown below it MUST always be in sync (this was a previously fixed bug — do not reintroduce a desync between them).
- The **Business Impact summary panel** (see 4.7) also renders here.

### 4.2 Dashboard
- Live pipeline progress across Level 0 → 1 → 2, updating in real time (via polling on Vercel, sockets locally) as a run executes — not a fake/timer-based animation independent of real backend state.
- Metric cards showing real, computed numbers: total records (unpacked line-item universe), matched counts per pass (pass1 + pass2 + pass3), unresolved count, overall match rate — these must always satisfy the identity `pass1 + pass2 + pass3 + unresolved = total_records` (where `match_rate = ((pass1 + pass2 + pass3) / total_records) * 100` and is strictly bounded between `0.00%` and `100.00%`). Never let this identity break.
- The **Business Impact summary panel** (see 4.7) also renders here.
- **Export actions** (see 4.8) appear here once a run is complete — "Export Journal Entries CSV" and "Download Reconciliation Certificate."
- A live activity log / stream of what the pipeline is currently doing.
- Ability to trigger a new run or re-run reconciliation.

### 4.3 Exceptions (Exception Queue)
- List/table of flagged items, each showing: the record(s) involved, the variance category (see section 3's category list — use the specific categories, not a generic label), the AI or heuristic rationale text, and a confidence score.
- Filterable by category and by resolution status (pending/accepted/rejected/manually resolved).
- Actions per row: **Accept**, **Reject**, **Manually map** — these must actually update the record's status and write an audit log entry (not just a client-side visual change with no backend effect).
- Exceptions should be groupable/viewable by their parent `settlement_id` so an analyst investigating one batch sees all its related exceptions together (per the Settlement Worksheet concept — see 4.9).

### 4.4 Draft Actions (HITL approval queue)
- Shows AI-proposed next actions (vendor emails, ledger corrections) for resolvable exceptions, in `pending_approval` status.
- Each is editable before approval (inline edit of email content or correction fields).
- **Approve** and **Reject** buttons — approving must be idempotent (clicking Approve twice must not create a duplicate action or duplicate audit entry; the second click should return an "already processed" result).
- Nothing in this system ever auto-executes an action without a human clicking Approve — this is a hard rule, not a threshold-tunable setting.

### 4.5 Audit Trail
- A chronological, append-only log of every match, exception, resolution, and draft-action approval/rejection.
- Must be genuinely immutable at the schema/database level (update/delete operations against this collection must be rejected, not just documented as a convention).
- Filterable by actor and action type.
- Shows enough detail (actor, action, target, timestamp, and a payload/details view) to reconstruct exactly what happened and why, for audit purposes.

### 4.6 Ask AI (Agent Chat — accessible from every page via the navbar button)
- A chat drawer where the user can ask natural-language questions about the current run.
- Answers must be grounded in real data via read-only tool-calls against the actual database (query_matches, query_exceptions, query_audit_log, get_record_by_id, or equivalent) — never a hallucinated/generic answer.
- **Suggested question chips**: dynamically generated from the current run's actual data (e.g. referencing a real imbalanced batch ID if one exists in this run) — not hardcoded generic suggestions.
- **Clickable citations**: when the AI references a specific record (settlement_id, order_id, exception ID), that reference must render as a clickable element that navigates to that record in the Exception Queue or Settlement Worksheet.
- **Multi-turn memory**: the chat must retain conversation history within a session so follow-up questions work without re-explaining context.
- If Claude API credits/quota are unavailable, the chat must clearly and honestly tell the user it's using a fallback/heuristic answer path — never silently pretend it's a full AI answer.

### 4.7 Business Impact summary panel (appears on both Overview and Dashboard)
Stat cards, computed from REAL run data (never placeholder/mock numbers):
- Claimable GST Input Tax Credit (18% on MDR fees) for this run, as a real ₹ figure.
- Estimated manual hours saved — clearly labeled with its stated assumption (e.g. "assuming 2 min/transaction manual review"), never presented as a measured fact.
- Exceptions cleared vs still pending (both numbers shown — never hide the pending/unresolved count in favor of only showing positive numbers).
- Total settlement volume processed, as a real ₹ figure.

### 4.8 Export actions (on Dashboard, once a run is complete)
- **Reconciliation Journal CSV**: one row per resolved line item with columns: `date, order_id, settlement_id, gross_amount, mdr_fee, gst_on_mdr, net_settled, account_category, variance_category, resolution_status`.
- **Reconciliation Certificate** (Markdown or PDF): run summary — ID, date range, totals, match rate, GST ITC identified, list of unresolved exceptions — suitable for a monthly close or audit request.
- These export buttons must only appear once a run has genuinely completed, not mid-run.

### 4.9 Settlement Worksheet (drill-down modal/view)
- Clicking a settlement badge/ID anywhere in the UI opens a worksheet showing: the bank credit at the top, and every unpacked line item below it with its variance category — like a real reconciliation worksheet, not a flat undifferentiated list.

---

## 5. Non-negotiable engineering rules (carried over from earlier fixes — do not regress on these)

- MongoDB connection must use the serverless-safe cached-connection pattern (no fresh connection per request).
- `client/server/` is kept in sync with `server/` via the automated `scripts/syncServer.js` build hook — never manually diverge these, never remove the sync step.
- Real-time updates use polling as the primary mechanism in production (Vercel), with Socket.io retained for local dev only.
- Long-running Pass 3/Level 2 AI batch calls must stay within the configured `maxDuration` — batches are processed with bounded concurrency (`mapConcurrent`) with backoff on rate limits, not unbounded `Promise.all` bursts.
- File uploads are handled fully in-memory (no reliance on a persistent/writable filesystem).
- `ai_mode` labeling must always be honest — heuristic fallback results are never labeled as if they came from real Claude reasoning.
- The audit log is append-only at the schema level, enforced, not just by convention.
- Draft action approval/rejection is idempotent.
- No hardcoded secrets anywhere in the codebase; all required env vars are listed in `.env.example`.

---

## 6. What "production-ready" means for this project

Before considering any deployment "done," all of the following must be true simultaneously — not just individually verified at different times with different code states:

1. Every screen in section 4 works exactly as described, using real data, on the LIVE deployed URL (not just localhost).
2. `ai_mode` shows real AI (not fallback) when Anthropic credits are available.
3. `npm test --prefix server` passes fully.
4. `npm run build --prefix client` completes cleanly.
5. No feature described in this document has been removed or silently altered from a previous working state.
6. The navbar, Overview scroll-spy, and all other previously-fixed UI bugs remain fixed.

---

## 7. Rule for future changes

Before implementing ANY new request, cross-check it against this document. If a new request would require removing, hiding, or fundamentally changing something described above, **stop and explicitly flag this to me before proceeding** — do not silently drop existing functionality to make room for something new. When in doubt, ADD alongside existing functionality rather than REPLACE it.
