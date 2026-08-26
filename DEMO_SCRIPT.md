# ReconcileAI — 5-Minute Production Demo Script

**Live Production URL**: [https://reconcile-ai-server.vercel.app/](https://reconcile-ai-server.vercel.app/)  
**Presenter**: Lead Fintech & Autonomous AI Engineer  
**Target Audience**: Finance Controllers, Auditors, Hackathon Judges

---

## ⏱️ Timeline & Flow Overview

```
[0:00 - 0:45] The N-to-1 Gateway Settlement Problem
[0:45 - 1:45] Ingestion & Level 0/1/2 Autonomous Reconciliation
[1:45 - 2:45] Exception Queue, Fee Breakdown & Payout Worksheet
[2:45 - 3:45] Human-in-the-Loop (HITL) Draft Remediation & Audit Trail
[3:45 - 5:00] Conversational Forensic AI Auditor & Live GST ITC Query
```

---

## 🎬 Act 1: The Problem & Track 04 Positioning (0:00 – 0:45)

> *"Welcome to ReconcileAI. Built specifically for Razorpay Buildathon Track 04 — AI Finance Controller — ReconcileAI is a multi-source financial reconciliation engine that tackles the N-to-1 Payment Gateway Settlement Unpacking Problem."*
>
> *"Payment gateways like Razorpay aggregate hundreds of customer transactions into lump-sum payouts while deducting MDR processing fees, GST, and customer refunds. Bank statements show one net credit, ERP ledgers show hundreds of sales invoices, and traditional 1:1 matchers fail."*
>
> *"Track 04 demands throughput, measured accuracy, and an honest exception list. ReconcileAI delivers exact multi-source matching and differentiates on explainability and auditability — featuring 3-tier GST/MDR unpacking, a governed HITL approval loop, and a conversational forensic auditor."*

---

## 🎬 Act 2: Ingestion & 3-Tier Multi-Pass Engine (0:45 – 1:45)

1. Open **[https://reconcile-ai-server.vercel.app/](https://reconcile-ai-server.vercel.app/)**.
2. Point out the live production banner and click **"Try with Benchmark Data (500 records)"**.
3. In $<300\text{ms}$, 505 transactions across 16 settlement batches and 17 bank records are loaded.
4. Click **"Run Full Reconciliation"**:
   - Show the **Live Progress Stepper** transitioning from **Level 0 (Bank Matching: 94.1%)** $\rightarrow$ **Level 1 (Batch Integrity Gate: 15 Balanced, 1 Flagged)** $\rightarrow$ **Level 2 (Order Unpacking: 87.5% Matched)**.
   - Point out the 4 headline metric cards:
     - **505 Ingested Records**
     - **442 Automatically Cleared Orders**
     - **87.52% Clean Match Rate**
     - **63 Exceptions Flagged for Review**

---

## 🎬 Act 3: Exception Queue, Settlement Worksheet & Graceful Failure Handling (1:45 – 2:45)

1. Scroll to the **Exceptions Queue** or click the **"Exceptions"** tab.
2. **Explicit Failure Handling Demo (Level 1 Integrity Gate)**:
   - Highlight batch `setl_..._108` in **Batch Mismatches**.
   - Show how the gateway batch stated total (₹476,028.48) failed mathematical checksum against line items (variance of ₹650.00).
   - Point out that the **Level 1 Mathematical Integrity Gate** blocked unpacking automatically, preventing ledger contamination and safely routing the batch to the Exception Queue with complete context.
3. Demonstrate category filtering:
   - Click **"Gateway Fees"**: Shows individual orders where the 2% fee + 18% GST was isolated.
   - Click **"Batch Mismatches"**: Shows flagged gateway batch integrity violations.
4. Click **"Inspect Payout Worksheet"** on any settlement batch:
   - Walk through the interactive worksheet drawer displaying:
     - **Gross Customer Charges**: ₹488,200.00
     - **MDR Processing Fees (2.0%)**: ₹9,764.00
     - **Claimable 18% GST ITC**: ₹1,757.52
     - **Net Dispatched Payout**: ₹476,678.48
5. Click **"Accept"** on an exception card:
   - Show the **0ms optimistic update** where the card instantly transitions to **ACCEPTED** with zero UI lag.

---

## 🎬 Act 4: HITL Draft Remediation & Immutable Audit Trail (2:45 – 3:45)

1. Click the **"Draft Actions"** tab:
   - Highlight the AI-generated remediation actions:
     - *Vendor Discrepancy Email*: Drafted for the payment gateway operations team regarding MDR fee variance.
     - *Adjusting Journal Entry*: Formatted for SAP/Oracle ERP clearing accounts.
2. Click **"Approve & Dispatch"**:
   - The action transitions to `Approved` with a timestamp and dispatches to the sandbox ledger.
3. Click **"Audit Trail"** tab:
   - Show the immutable, append-only log recording:
     - `human_exception_accepted` (Actor: `human_auditor`)
     - `draft_action_approved` (Actor: `auditor@merchant.in`)
     - Complete metadata payload and timestamp.

---

## 🎬 Act 5: Conversational AI Forensic Auditor (3:45 – 5:00)

1. Click **"Ask AI"** in the top navigation bar to open the slide-out AI assistant.
2. Click the suggestion chip:
   > *"What is our total claimable GST Input Tax Credit (18%) this cycle and why?"*
3. Watch the assistant query the active database in real time:
   - Streams a complete financial breakdown:
     - Total MDR processing fees incurred.
     - Exact 18% GST tax credit amount claimable on GSTR-2B.
     - Specific settlement batch citations and UTR numbers.
4. Conclude:
   > *"ReconcileAI turns days of manual reconciliation and tax reconciliation into 3 seconds of autonomous, audit-grade intelligence. 100% serverless, 100% verified, and live on Vercel."*
