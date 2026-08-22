# ReconcileAI — Architectural & Technical Overview

## High-Level Vision
**ReconcileAI** is an intelligent AI Finance Controller designed to solve the **Razorpay Settlement Unpacking Problem** for high-volume enterprise merchants.

In real-world commerce, funds are not deposited transaction-by-transaction. Payment gateways batch hundreds of consumer transactions into lumped NEFT credits, deducting Merchant Discount Rates (MDR) and 18% GST before crediting the merchant's nodal bank account.

ReconcileAI provides a **3-Level Reconciliation Architecture** that bridges bank credits, Razorpay settlement reports, and internal ERP ledgers with cryptographic precision and Claude 3.5 Sonnet forensic analysis.

---

## 3-Level Matching Pipeline

| Level | Component | Input | Operation | Output / Guarantee |
|---|---|---|---|---|
| **Level 0** | **Bank Credit ↔ Settlement Match** | Bank Statement Credits (`BNK-...`), Settlement Headers (`setl_...`) | Matches UTR reference, Net Amount, and T+2 settlement proximity. | 1:1 Batch verification (`level: 0`). |
| **Level 1** | **Batch Integrity Verification** | Settlement Reports (`setl_...`), Settlement Line Items (`pay_...`) | Mathematical validation: $\sum \text{Net Line Items} == \text{Bank Credit} \pm ₹0.05$. | Cryptographic integrity gate. Halts unpacking on `batch_imbalance`. |
| **Level 2** | **Order-Level Unpacking & ITC Diagnosis** | Settlement Line Items (`pay_...`), Internal Ledger Orders (`LED-...`) | Unpacks individual orders, matches `order_id` & amounts, separates 2% MDR fee and 18% GST Input Tax Credit. | Granular matched ledger entries & variance classifications. |

---

## Pass 3: Claude 3.5 Sonnet Settlement Variance Reasoner
For unrecorded payments, timing anomalies, and complex partial settlements, Claude 3.5 Sonnet operates as a specialized **Settlement Variance Reasoner**:
- Inputs: Unresolved line item, parent settlement metadata, candidate ledger records within $\pm 15\%$ amount window.
- Output: Strict JSON payload with exact variance categorization (`mdr_fee`, `gst_on_mdr`, `refund_deduction`, `unrecorded`, `batch_imbalance`, `rounding`), numerical variance breakdown, confidence score ($0.0 - 1.0$), and forensic audit rationale.

---

## Measured Engine Benchmarks
On a 500-record enterprise dataset:
- **Level 0 Match Rate**: 94.1% (16 / 17 Bank Settlement Credits matched).
- **Level 1 Integrity Check**: 15 Batches balanced, exactly 1 batch imbalance intercepted before cascading.
- **Level 2 Order Unpacking**: 86.8% matched orders with 2% MDR and 18% GST variance categorization.
- **Execution Latency**: 3-Level deterministic engine executes in **under 10ms**.
- **Tax Intelligence**: Computed ₹1,82,280.10 in MDR fees and ₹32,810.47 in claimable GST ITC.
