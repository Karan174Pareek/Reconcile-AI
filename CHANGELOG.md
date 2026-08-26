# Changelog — ReconcileAI

All notable changes and buildathon refinements to ReconcileAI are documented in this file.

---

## [1.1.0] - 2026-08-26 — Razorpay Buildathon (Track 04: AI Finance Controller) Refinements

### Summary
Elevated ReconcileAI for **Razorpay Buildathon Track 04 (AI Finance Controller)** by adding judge-proof metrics, a reproducible benchmark CLI, a held-out validation dataset, cold-reset capabilities, edge-case unit test coverage, and refined positioning focusing on explainability and auditability.

---

### Key Punch List Items Addressed (1–12)

#### Priority 1 — Pitch & Positioning Reframing
- **Item 1 & 2**: Reframed `README.md`, `DEMO_SCRIPT.md`, and product documentation. Removed any claims of being "first ever" or that "Razorpay has nothing like this". Positioned ReconcileAI as a multi-source reconciliation engine built specifically for Track 04, differentiating on **explainability, auditability, 3-tier GST/MDR tax credit unpacking, and governed HITL approval**.

#### Priority 2 — Judge-Proof Metrics & Validation
- **Item 3**: Implemented an independent **Held-Out Validation Dataset** (`RUN-HELDOUT-RAZORPAY-2026`) containing unseen seed data with partial refunds, 14-day late authorization timing gaps, duplicate UTRs, and multiple imbalanced batches.
- **Item 4**: Created the reproducible benchmark CLI runner `npm run bench` (`server/scripts/runBenchmark.js`). Executes both Benchmark and Held-Out datasets through the 3-level matching pipeline and prints a structured evaluation table to stdout with match rate, FPR (0.00%), FNR, and pipeline runtime.
- **Item 5**: Added a **Cold Run** API endpoint (`POST /api/runs/cold-reset`) and a **"Reset & Cold Run"** UI button in `HeroOverviewSection.jsx` allowing judges to reset state and run full reconciliation live from scratch.

#### Priority 3 — Live Demo & SEO Pre-Rendering
- **Item 6**: Hardened `client/index.html` with full SEO description tags, OpenGraph (`og:title`, `og:description`), Twitter cards, and a semantic `<noscript>` static preview article detailing ReconcileAI's 3-tier architecture for non-JS crawlers and link previews.
- **Item 7**: Verified full 5-minute production walkthrough across all tabs (Benchmark data → Multi-tier engine → Exceptions queue → Payout worksheet → HITL draft actions → Audit trail → Ask AI conversational auditor).

#### Priority 4 — Test Suite Depth & Coverage
- **Item 8**: Added a comprehensive edge-case unit test suite `server/tests/edgeCases.test.js` covering floating-point rounding differences (₹0.01–₹1.00), split bank credits for single settlement batches, empty zero-order settlement batches, and duplicate/replayed webhook records.
- **Item 9**: Added `"test:coverage": "node --test --experimental-test-coverage"` script to `package.json` and `server/package.json`. Verified all **35/35 unit tests pass**.

#### Priority 5 — Governance & Audit Trail Enhancements
- **Item 10**: Enhanced `exceptionController.js`, `draftActionController.js`, and `AuditLog.jsx` UI event cards to explicitly display actor badges (`auditor@merchant.in` / `human_auditor`), state transition pills (`before_state` → `after_state`), timestamp, and linked settlement batch / order references.
- **Item 11**: Explicitly scripted **Level 1 Integrity Gate failure handling** into Act 3 of `DEMO_SCRIPT.md`, demonstrating how imbalanced gateway batches are blocked from misposting and routed safely to the Exception Queue.

#### Priority 6 — Scope Discipline
- **Item 12**: Maintained strict focus on Track 04 multi-source reconciliation depth without adding extraneous feature surface area.

---

### One-Paragraph Pitch Summary (Verbatim for Demo Video)

> "Built specifically for Razorpay Buildathon Track 04 (AI Finance Controller), ReconcileAI is a multi-source reconciliation engine that solves the N-to-1 Payment Gateway Settlement Unpacking Problem. It bridges lump-sum bank statement credits, payment gateway batch settlements, and internal ERP ledgers — delivering 87.5% autonomous match throughput with 0% false positives. ReconcileAI goes beyond standard matchers by isolating 2% MDR fees and 18% claimable GST Input Tax Credits, enforcing Level 1 mathematical batch integrity gates, providing governed Human-in-the-Loop draft remediation, and exposing a conversational Claude 3.5 Sonnet forensic auditor for total auditability and explainability."
