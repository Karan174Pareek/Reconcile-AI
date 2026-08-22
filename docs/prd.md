# Product Requirements Document (PRD) — ReconcileAI

## 1. Executive Summary
**ReconcileAI** is an intelligent AI Finance Controller designed for enterprise merchants, marketplaces, and high-growth B2B fintechs operating on Razorpay. It solves the industry-wide **N-to-1 Settlement Unpacking Problem** — converting lumped bank NEFT/RTGS settlement credits into individual order matches, isolating 2% MDR fees, claiming 18% GST Input Tax Credits (ITC), enforcing mathematical batch integrity gates, and orchestrating Claude 3.5 Sonnet forensic audits with Human-in-the-Loop (HITL) remediation.

---

## 2. The Core Problem: Why 1:1 Matching Fails in Modern Fintech
When Razorpay settles funds to a merchant's nodal bank account, it does **not** send 1 bank credit per order. It batches hundreds of payments into a single lumped credit on a T+2 settlement cycle, net of:
- **Merchant Discount Rate (MDR)**: Typically ~2.0% per transaction.
- **18% GST on MDR**: Tax charged on top of the gateway fee.
- **Refund Deductions**: Net deductions for returns processed in that settlement cycle.

The bank statement shows exactly **ONE row** (`NEFT CR: ... RAZORPAY SETTLEMENT setl_...`).
Standard 2-way bank-to-ledger matching algorithms fail completely because no single ledger order matches the lumped bank credit amount. ReconcileAI solves this with a **3-Level Settlement Unpacking Engine**.

---

## 3. The 3-Level Settlement Unpacking Architecture

```
Level 0: Bank Credit ↔ Settlement Batch Match
         (1 lumped bank NEFT credit matched to Razorpay setl_... batch header via UTR + Net Amount)
                              │
                              ▼
Level 1: Settlement Batch Explosion & Integrity Check
         (Cryptographic Gate: Verifies Σ line item net amounts == Bank Credit within ₹0.05)
         [If Balanced] ──► Proceed to Level 2
         [If Imbalanced] ──► Flag 'batch_imbalance' Exception & Halt Unpacking
                              │
                              ▼
Level 2: Granular Line-Item ↔ Internal Order Match
         (Unpacks 500+ order line items, isolates 2% MDR & 18% GST ITC, diagnoses variances)
```

---

## 4. Variance Categorization & Tax Intelligence
Every variance identified during unpacking is strictly classified into a deterministic enum:
1. `mdr_fee`: Payment gateway processing fee (~2%).
2. `gst_on_mdr`: 18% Goods & Services Tax on gateway MDR (eligible for Input Tax Credit under GST law).
3. `refund_deduction`: Customer return debited directly from the batch credit.
4. `rounding`: Fractional paisa rounding difference (`< ₹0.50`).
5. `partial_settlement`: Multi-part order installment settlement.
6. `unrecorded`: Settled Razorpay order missing from internal ERP/ledger.
7. `batch_imbalance`: Line item sum mismatch against nodal bank credit.
8. `unknown`: Unparseable or corrupt payload.

---

## 5. Key Product Features

### 5.1. 3-Level Reconciliation Engine
- **Level 0 (Deterministic UTR & Amount Match)**: Correlates bank credits with Razorpay settlement headers.
- **Level 1 (Batch Integrity Gate)**: Mathematical integrity check ($\sum \text{Net} == \text{Bank Credit}$). Stops cascade errors immediately.
- **Level 2 (Order Unpacking)**: Matches constituent payments (`pay_...`) to internal order records (`order_...`).

### 5.2. Claude 3.5 Sonnet Settlement Variance Reasoner (Pass 3)
- Bounded batch reasoning over complex multi-order variances and unrecorded orders.
- Produces forensic citations calculating gross order value, exact MDR% applied, 18% GST on MDR, and net variance.

### 5.3. Settlement Reconciliation Worksheet UI
- Interactive modal showing high-level bank credit, gross order volume, total gateway fees, claimable GST ITC, and granular line item tables.
- Exception queue grouped by parent `settlement_id`.

### 5.4. Human-in-the-Loop (HITL) Draft Remediation
- Auto-generates vendor inquiries for missing invoices and adjusting journal entries for bank charges and refunds.
- Analyst inline editing and approval gates before dispatch.

### 5.5. Conversational Forensic Auditor
- Read-only streaming agent drawer with scoped query tools: `query_settlements`, `get_settlement_detail`, `query_matches`, `query_exceptions`, `query_audit_log`.

### 5.6. Immutable Append-Only Audit Trail
- Cryptographically verified, mutation-blocked audit records documenting every pass, rule evaluation, and human decision.
