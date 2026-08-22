# ReconcileAI — 5-Minute Video Demo Script
**Track:** AI Finance Controller — **Razorpay AI Buildathon 2026**  
**Presenter:** Karan Pareek  
**Total Duration:** 5:00 Minutes

---

## [0:00 – 0:45] Act 1: The Problem Statement & Financial Verification Bottleneck

**[Screen: Fullscreen facecam + Split to messy Excel sheets comparing bank statements with ERP ledgers]**

> **Speaker (Confident & Direct):**  
> "In high-volume finance operations, transaction volume grows exponentially, but monthly reconciliation remains trapped in spreadsheets. Every month, finance controllers spend hundreds of hours manually cross-referencing bank statements against internal ERP ledgers.
> 
> "Existing AI tools try to pass every single row through an LLM. That creates a massive **verification bottleneck**, astronomical token costs, and high hallucination risk on simple deterministic math.
> 
> "Enter **ReconcileAI** — an AI Finance Controller designed around an intelligent **3-pass architecture**. It matches what can be mathematically proven deterministically, reserves Claude 3.5 Sonnet exclusively for genuine exceptions, and reports an **honest, explainable match rate** with zero fabricated numbers."

---

## [0:45 – 2:15] Act 2: Ingestion & 3-Pass Matching Pipeline

**[Screen: ReconcileAI Dashboard at `http://localhost:5173`. Click 'New Run' -> 'Generate 500-Record Seed Batch' -> Click 'Execute All Passes']**

> **Speaker:**  
> "Let’s see it live in action. I’ll start a new reconciliation run with a 500-record B2B benchmark dataset containing realistic exact matches, timing lag, duplicates, bank fees, and unrecorded payments.
> 
> *(Click 'Execute All Passes')*
> 
> "Notice the real-time Socket.io pipeline streaming across the top:
> 
> 1. **Pass 1 (Deterministic Exact Match):** Instantly matches records with exact amount equality, identical UTR reference, and same date. In under 15ms, **66.7%** of the ledger is settled with zero AI cost.
> 2. **Pass 2 (Fuzzy Heuristics):** Evaluates remaining rows with amount tolerances, `+/- 3 day` settlement windows, and 3-gram string similarity between messy narration strings and corporate payee names (like *'AWS CLOUD'* vs *'Amazon Web Services'*). Another **20.0%** is matched. When multiple candidates tie, Pass 2 refuses to guess and forwards them safely.
> 3. **Pass 3 (Claude AI Reasoner):** Claude only receives the genuine unresolved tail. It batches rows, narrows candidates by date and amount proximity, and classifies them into structured categories with citations.
> 
> "Our final reconciliation rate is an honest **91.4%**, with **8.6%** routed directly to our Exception Queue for human review."

---

## [2:15 – 3:15] Act 3: Interactive Exception Queue & Claude Reasoning

**[Screen: Click 'Exception Queue' tab. Filter by Category: 'Bank Fee', 'Timing Lag', 'Unrecorded']**

> **Speaker:**  
> "Now let's switch to the **Exception Queue**. Unlike black-box tools, every diagnosed exception shows a side-by-side comparison between the bank transaction and candidate ledger entries, accompanied by Claude's rationale and confidence score.
> 
> "Here’s a **Bank Fee** exception: Claude recognized *'CMS MONTHLY MAINTENANCE CHARGE'* of INR 450 with 95% confidence and cited that no internal invoice was issued because it was an auto-debited bank fee.
> 
> "Here’s a **Timing Lag** transaction: Claude matched a payment delayed over a weekend by 4 days that missed Pass 2’s standard tolerance.
> 
> "And here’s an **Unrecorded Transaction**: A vendor received a direct INR 45,000 transfer, but no corresponding ledger entry exists in the ERP. Let's see how ReconcileAI fixes this."

---

## [3:15 – 4:30] Act 4: Agent Chat & Human-in-the-Loop (HITL) Action Approval

**[Screen: Open 'Agent Chat' drawer. Type: "Why is BNK-XXXX unresolved?" -> Watch tool execution chip -> Open 'Draft Actions' tab -> Inline-edit draft email -> Click 'Approve Action']**

> **Speaker:**  
> "As an auditor, I don't just want static lists; I want to interrogate the dataset. I'll open our **Conversational Forensic Chat**.
> 
> *(Type in chat: 'Why is BNK-98124 unresolved and what action is drafted?')*
> 
> "Watch the tool-use stream: Claude executes read-only queries against our database — `query_exceptions` and `get_record_by_id` — strictly scoped to this run. It explains that this was an unrecorded INR 18,500 payment to Razorpay Software without a tax invoice.
> 
> "Now, let’s look at the **Draft Actions Queue**. For this unrecorded item, Claude has drafted a formal invoice inquiry email to Razorpay.
> 
> "Crucially, **no real-world side effect is ever executed without a human analyst**. I can click 'Edit Content', update the email recipient or add specific internal PO references right inline, and click **'Approve Action'**.
> 
> "The action is dispatched to our sandbox, marked as approved, and an immutable audit entry is stamped."

---

## [4:30 – 5:00] Act 5: Append-Only Audit Trail & Architecture Wrap-Up

**[Screen: Click 'Audit Trail' tab. Scroll through immutable events. Show JSON payload details inspector]**

> **Speaker:**  
> "Finally, we visit the **Audit Trail**. Every single deterministic match, Claude AI batch reasoning, tool query, inline edit, and human approval is immutably logged with actor badges, timestamps, and deep JSON payload inspectors. Our MongoDB schema enforces application-level immutability — no updates or deletions allowed.
> 
> "ReconcileAI bridges the gap between deterministic speed and agentic reasoning — delivering audit-grade financial reconciliation with bounded costs, zero hallucinations, and full human governance.
> 
> "Thank you!"

---
