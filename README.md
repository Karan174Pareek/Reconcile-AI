# ReconcileAI — Autonomous Financial Reconciliation & Settlement Intelligence Platform

**ReconcileAI** is an autonomous financial intelligence platform built to solve the complex **N-to-1 Payment Gateway Settlement Unpacking Problem** for modern enterprises and finance teams. It bridges the gap between bank statement credits, payment gateway batch settlements (such as Razorpay), and internal ERP sales ledgers.

---

## 📌 What is ReconcileAI & What Problem Does It Solve?

### The Core Fintech Pain Point
When modern businesses accept online customer payments via payment gateways (e.g., Razorpay, Stripe), the gateway does **not** deposit money into the merchant's bank account order-by-order. Instead, it aggregates hundreds or thousands of individual customer purchases into a single bulk lump-sum bank transfer on a T+2 settlement cadence, minus:
1. **Merchant Discount Rate (MDR) Fees** (~2.0% per transaction).
2. **18% GST on Gateway Fees** (tax charged on processing fees).
3. **Customer Refunds & Chargebacks** processed during that settlement window.

### Why Traditional Reconciliation Fails
- A typical bank statement contains **only one consolidated deposit line**:  
  `NEFT CR: HDFC0000060 UTR-RAZORPAY-88290101 RAZORPAY SETTLEMENT setl_DGlQ101os78Ec ₹488,200.00`
- Meanwhile, the merchant's internal ERP ledger contains **500+ individual sales invoices** (e.g., ₹1,200, ₹5,000, ₹38,000).
- Standard 1:1 or 2-way bank matchers fail completely because no single customer order equals ₹488,200.00.
- Finance and accounting teams are forced to manually download settlement spreadsheets, write fragile VLOOKUP/Excel macros, and manually compute claimable **18% GST Input Tax Credits (ITC)** — leading to costly bookkeeping errors, tax leakage, and audit compliance risks.

### The ReconcileAI Solution
ReconcileAI automates this entire lifecycle autonomously:
- **Correlates Nodal Bank Credits to Gateway Batches** via exact UTR tracking (Level 0).
- **Enforces Mathematical Batch Integrity Gates** ($\text{Gross} - \text{MDR} - \text{GST} - \text{Refunds} == \text{Net Bank Deposit}$) to stop faulty gateway batches before they cascade (Level 1).
- **Unpacks Constituent Orders & Isolates 18% GST ITC** for tax claim compliance (Level 2).
- **Triage Complex Variances using Claude 3.5 Sonnet** into categorized exceptions and ready-to-approve Human-in-the-Loop (HITL) action drafts.
- **Records Every Action in an Append-Only Immutable SHA-256 Audit Trail**.

---

## 🧭 How to Use the Website (User Guide)

Using ReconcileAI is fast and intuitive:

```
[1. Load Data] ──▶ [2. Explore Architecture] ──▶ [3. Run Engine] ──▶ [4. Review & Approve]
```

### Step 1: Initialize Reconciliation Data
- **Option A (Instant Benchmark)**: Click **"Try with Benchmark Data (500 records)"** on the top hero banner to instantly spin up a full enterprise test suite with 16 settlement batches and 500+ customer transactions.
- **Option B (Custom Data)**: Click **"Upload CSV Statements"** to upload your own custom Bank Statement CSV, Razorpay Settlement CSV, and ERP Sales Journal CSV files with instant schema validation.

### Step 2: Explore the Interactive Storytelling Sections
Scroll through the platform's **11 visual sections** using the sticky top navigation bar:
- **02 & 03 Flowcharts**: Click any pipeline node to inspect real data transformation contracts and schemas.
- **04 Decision Tree & Tax Simulator**: Slide the interactive MDR & GST calculator to see how tax credits are isolated in real time.
- **05 Heuristic Timeline**: Compare Pass 1 Exact, Pass 2 Fuzzy, and Pass 3 AI Reasoner tolerances.
- **09 & 10 Architecture & Verification**: Inspect the full-stack system topology and view the verified **31/31 passing unit tests**.

### Step 3: Execute Autonomous Reconciliation
- Click **"Run Full Autonomous Pipeline"** in the operations workbench (Section 08).
- Watch the **Live Progress Stepper** transition in real time:
  - **Level 0**: Correlates bank credits to gateway settlement batches.
  - **Level 1**: Validates mathematical integrity across all batches.
  - **Level 2**: Unpacks constituent orders and separates claimable GST ITC.
  - **Pass 3 (AI)**: Diagnoses variances (timing lags, gateway fees, refunds) and drafts remediation tickets.

### Step 4: Inspect Exceptions & Drilldowns
- Navigate to the **Exceptions Tab** or Section 07 to view exceptions grouped by settlement batch.
- Click on any settlement batch row to open the **Settlement Worksheet Modal** showing gross volume, fees deducted, claimable tax credits, and granular constituent orders.

### Step 5: Review Human-in-the-Loop (HITL) Draft Actions
- Navigate to the **Draft Actions Tab** to view AI-generated vendor inquiry emails and adjusting journal entries.
- Review, edit inline, and click **Accept** or **Reject** to post adjustments directly to the ledger with full human governance.

### Step 6: Ask the AI Forensic Auditor
- Click the **"Ask AI Agent"** button in the navigation bar to open the slide-out conversational auditor.
- Query transaction details, ask for settlement batch breakdowns, or calculate total claimable GST ITC in plain English using scoped read-only database tools.

---

## 🏗️ System Architecture & Data Flow

```mermaid
flowchart TD
    subgraph INGESTION ["1. Ingestion & Validation Layer"]
        A[Bank Statement CSV] -->|PapaParse & Zod| V1[Bank Record Ingestion]
        B[Razorpay Settlement CSV] -->|PapaParse & Zod| V2[Settlement Report Ingestion]
        C[Internal ERP Sales Orders] -->|PapaParse & Zod| V3[Ledger Order Ingestion]
    end

    subgraph ENGINE ["2. 3-Level Settlement Unpacking Engine"]
        V1 & V2 --> L0[Level 0: Bank Credit ↔ Settlement Match<br/>Exact UTR + Net Amount + T+2 Window]
        L0 --> L1{Level 1: Batch Integrity Gate<br/>Gross - MDR - GST - Refunds == Net Deposit?}
        L1 -->|Imbalanced Batch| EX1[Quarantine 'batch_imbalance' Exception<br/>Halt Cascading Errors]
        L1 -->|Balanced Batch| L2[Level 2: Order-Level Unpacking<br/>Gross - 2% MDR - 18% GST = Net]
        L2 & V3 --> MAT[Level 2 Order Matches & Tax Isolation]
    end

    subgraph REASONING ["3. Claude 3.5 Sonnet Forensic AI"]
        MAT & EX1 --> P3[Pass 3 Exception Reasoner<br/>Bounded 10-Item Batching]
        P3 --> HITL[HITL Draft Action Generation<br/>Vendor Emails & Journal Adjustments]
    end

    subgraph INTERFACE ["4. Presentation & Audit Ledger"]
        MAT --> DASH[Live Operations Workbench & Stepper]
        EX1 --> EXQ[Exception Queue Grouped by Batch]
        HITL --> DRAFT[Human Approval Desk (Accept/Reject)]
        DASH --> AUDIT[(Immutable MongoDB SHA-256 Audit Log)]
        AGENT[Conversational AI Auditor] -->|Scoped Read Tools| AUDIT
    end
```

---

## 📐 11-Section Platform Breakdown

The application UI is structured into 11 purpose-built sections:

| # | Section Name | Focus & User Value |
|---|---|---|
| **01** | **Overview** | Value proposition, quick action buttons, and live system telemetry strip. |
| **02** | **How ReconcileAI Works** | 8-stage interactive pipeline intro with click-to-drawer inspection. |
| **03** | **Master Reconciliation Flow** | Centerpiece interactive flowchart with animated directional streams. |
| **04** | **3-Tier Matching Engine** | Multi-level decision tree (Level 0, 1, 2) + live MDR & GST tax simulator. |
| **05** | **Multi-Pass Processing** | Multi-pass timeline detailing Pass 1 Exact, Pass 2 Fuzzy, and Pass 3 Claude AI. |
| **06** | **Data Transformation** | 4-step transformation flow: Raw Ingested Row ➔ Normalized Entity ➔ Candidate Window ➔ Reconciled Output. |
| **07** | **Exception & Fallback Flow** | Failure lifecycle triage desk embedding active Exception Queue and HITL desk. |
| **08** | **Reconciliation Results** | Active operations workbench embedding 4 priority metric cards and live stepper. |
| **09** | **System Architecture** | Full-stack topology graph (`Client → API → 3-Tier Engine → Claude → DB`). |
| **10** | **System Verification** | Engineering verification dashboard showcasing **31 / 31 Tests Passed (100%)**. |
| **11** | **Final System Map** | Executive architecture blueprint summarizing the entire system end-to-end. |

---

## ⚡ Verified Benchmark Performance (500 Records)

- **Level 0 (Bank ↔ Batch Match)**: **94.1%** (16 / 17 bank credits matched via UTR & net amount).
- **Level 1 (Batch Integrity Gate)**: **15 batches balanced**, exactly **1 batch imbalance** intercepted and quarantined.
- **Level 2 (Order Unpacking)**: **86.8% matched orders** (422 / 486 constituent orders matched to internal ledger).
- **Tax Intelligence**: Automatically isolated **₹1,82,280.10** in MDR fees and **₹32,810.47** in claimable GST Input Tax Credit.
- **Automated Test Suite**: **31 / 31 tests passing (100%)** across 26 test suites.

---

## 🛠️ Tech Stack & Governance

- **Frontend**: React 18, Vite, Tailwind CSS, Framer Motion, Lucide Icons.
- **Backend**: Node.js (ES Modules), Express, Mongoose, Socket.io, PapaParse, Zod.
- **AI Engine**: Anthropic Claude 3.5 Sonnet (`@anthropic-ai/sdk`), bounded JSON schema extraction with retry repair.
- **Database**: MongoDB Atlas with append-only immutable SHA-256 chained audit logs.
- **Deployment**: Vercel Serverless Functions + Cloudflare / CDN.

---

## ⚖️ License
MIT License. Copyright (c) 2026 Karan Pareek.
