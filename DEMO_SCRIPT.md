# ReconcileAI — 5-Minute Video Demo Script
**Track:** AI Finance Controller — **Razorpay AI Buildathon 2026**  
**Presenter:** Karan Pareek  
**Total Duration:** 5:00 Minutes

---

## [0:00 – 0:30] Act 1: The Problem — Slow & Predictably Error-Prone

**[Screen: Fullscreen facecam + Split to messy CSV / spreadsheet ledger comparing bank statements against ERP]**

> **Speaker (Confident & Direct):**  
> "In high-volume finance ops, monthly reconciliation is still manual, slow, and error-prone in very specific, predictable ways: vendor name mismatches (*'AWS CLOUD'* vs *'Amazon Web Services'*), weekend timing lag, unrecorded bank fees, and duplicate payment transfers.
> 
> "Most AI tools try to pass every single ledger row into an LLM. That creates a massive **verification bottleneck**, astronomical token costs, and high hallucination risks on simple arithmetic.
> 
> "We built **ReconcileAI** with an intelligent **3-pass hybrid architecture**: solve deterministic math in milliseconds with zero AI cost, reserve Claude 3.5 Sonnet exclusively for genuine exceptions, and give finance teams an **honest, explainable match rate** with an immutable audit trail."

---

## [0:30 – 1:50] Act 2: Live Ingestion & 3-Pass Matching Pipeline

**[Screen: ReconcileAI Dashboard at `http://localhost:5173`. Click 'New Run' -> 'Generate 500-Record Seed Batch' -> Click 'Execute All Passes']**

> **Speaker:**  
> "Let’s start a live run with our 500-record B2B benchmark dataset containing realistic exact matches, timing lag, duplicates, bank fees, and unrecorded vendor payments.
> 
> *(Click 'Execute All Passes')*
> 
> "Watch the real-time Socket.io pipeline stream:
> 
> 1. **Pass 1 (Deterministic Exact Match):** Instantly matches identical UTR references, exact amounts, and dates. In under 15ms, **66.7%** of the ledger is settled at $0 AI cost.
> 2. **Pass 2 (Fuzzy Heuristics):** Evaluates remaining records using amount tolerances (`+/- 1.00`), date windows (`+/- 3 days`), and 3-gram string similarity between messy narration strings and corporate payee names. Another **20.0%** is matched. When multiple candidates tie, Pass 2 refuses to guess and forwards them safely to Pass 3.
> 3. **Pass 3 (Claude AI Reasoner):** Claude only receives the genuine unresolved tail. It batches rows in sets of 10, narrows candidate proximity, and classifies them into structured categories with citations.
> 
> "Our pipeline finishes with an honest **91.4% match rate**, routing the remaining **8.6%** directly into our Exception Queue."

---

## [1:50 – 2:50] Act 3: Exception Queue & Claude's Forensic Reasoning

**[Screen: Click 'Exception Queue' tab. Filter by Category: 'Bank Fee', 'Timing Lag', 'Unrecorded']**

> **Speaker:**  
> "Let’s inspect the **Exception Queue**. Rather than a black-box percentage, every exception displays a side-by-side comparison between the bank record and candidate ledger rows, accompanied by Claude's rationale and confidence meter.
> 
> "Here’s a **Bank Fee** exception: Claude recognized *'CMS MONTHLY MAINTENANCE CHARGE'* of INR 450 with 95% confidence and explained that no internal invoice was issued because it was an auto-debited bank charge.
> 
> "Here’s a **Timing Lag** transaction: Claude matched a payment delayed over a weekend by 4 days that missed Pass 2’s standard tolerance.
> 
> "And here’s an **Unrecorded Transaction**: A vendor received a direct INR 18,500 transfer, but no corresponding ledger entry exists in the ERP. Let's see how ReconcileAI handles this."

---

## [2:50 – 4:00] Act 4: Forensic Agent Chat & HITL Action Approval

**[Screen: Open 'Agent Chat' drawer. Type: "Why is BNK-98124 unresolved?" -> Watch tool execution chip -> Open 'Draft Actions' tab -> Inline-edit draft email -> Click 'Approve Action']**

> **Speaker:**  
> "As an auditor, I can interrogate the system in natural language. I’ll open our **Forensic Agent Chat**.
> 
> *(Type in chat: 'Why is BNK-98124 unresolved and what action is drafted?')*
> 
> "Notice the tool execution chip: Claude executes read-only queries against our database — `query_exceptions` and `get_record_by_id` — strictly scoped to this run. It answers with specific cited record IDs, dates, and amounts — not a canned response.
> 
> "Now, let’s look at the **Draft Actions Queue**. For this unrecorded transaction, Claude has auto-drafted a vendor invoice request email to Razorpay Software.
> 
> "Crucially, **no real-world side effect is ever executed without a human analyst**. I can click 'Edit Content', update the email recipient or add a specific PO reference right inline, and click **'Approve Action'**.
> 
> "The action is safely dispatched to our sandbox, marked as approved, and an immutable audit entry is stamped."

---

## [4:00 – 5:00] Act 5: Append-Only Audit Trail, Honest Metrics & Production Hardening

**[Screen: Click 'Audit Trail' tab. Scroll through immutable events. Show JSON payload details inspector]**

> **Speaker:**  
> "Finally, we visit the **Audit Trail**. Every deterministic match, AI batch reasoning, agent tool query, and human approval is immutably logged with actor badges, timestamps, and expandable JSON payload inspectors. Our MongoDB schema enforces application-level immutability — update and delete mutations are strictly blocked.
> 
> "Notice our metrics: **91.4% matched, 8.6% unresolved exceptions**. In financial accounting, any AI claiming a '100% automatic match rate' is suspicious — because in the real world, unrecorded bank fees, fraudulent debits, and timing lags genuinely occur and must be flagged for human governance.
> 
> "For a production enterprise deployment, the next hardening steps would be:
> 1. Automated AWS KMS envelope encryption for tenant credentials at rest.
> 2. Webhook-driven two-way sync with ERPs like NetSuite and SAP with rate-limited dispatch.
> 
> "ReconcileAI bridges the gap between deterministic speed and agentic reasoning — delivering audit-grade financial reconciliation with bounded costs, zero hallucinations, and full human governance.
> 
> "Thank you!"

---
