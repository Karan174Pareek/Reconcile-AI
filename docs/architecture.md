# ReconcileAI — System Architecture

```mermaid
flowchart TD
    subgraph INGESTION ["1. Ingestion & Validation"]
        A[Bank Statement CSV] -->|Multer & Zod| V1[Bank Ingestion]
        B[Razorpay Settlement CSV] -->|PapaParse & Zod| V2[Settlement Ingestion]
        C[Internal ERP Orders] -->|Zod Validation| V3[Ledger Ingestion]
    end

    subgraph ENGINE ["2. 3-Level Settlement Unpacking Engine"]
        V1 & V2 --> L0[Level 0: Bank Credit ↔ Settlement Match<br/>UTR + Net Amount + T+2 Window]
        L0 --> L1{Level 1: Batch Integrity Gate<br/>Σ Line Items == Bank Credit?}
        L1 -->|Imbalanced| EX1[Flag 'batch_imbalance' Exception<br/>Halt Unpacking of Batch]
        L1 -->|Balanced| L2[Level 2: Order-Level Unpacking<br/>Gross - 2% MDR - 18% GST = Net]
        L2 & V3 --> MAT[Level 2 Order Matches & Variances]
    end

    subgraph REASONING ["3. Claude 3.5 Sonnet Pass 3"]
        MAT & EX1 --> P3[Settlement Variance Reasoner<br/>Pass 3 Bounded Batching]
        P3 --> HITL[Draft Actions Generation<br/>Vendor Emails & Journal Entries]
    end

    subgraph INTERFACE ["4. User Interface & Forensic Audit"]
        MAT --> DASH[Real-Time Dashboard & Stepper]
        EX1 --> EXQ[Exception Queue Grouped by Batch]
        HITL --> DRAFT[HITL Approval Workflow]
        DASH --> MODAL[Settlement Worksheet Modal]
        AGENT[Conversational Forensic Auditor] -->|Read-Only Tools| DB[(Immutable MongoDB)]
    end
```

## Security & Data Isolation
1. **Read-Only Agent Tools**: Claude Agent Chat runs through `agentToolRouter.js` with strictly scoped queries (`query_settlements`, `get_settlement_detail`, `query_matches`, `query_exceptions`, `query_audit_log`).
2. **Immutable Audit Trail**: Audit records in MongoDB have schema-level mutation blocks preventing `updateOne`, `updateMany`, `deleteOne`, and `deleteMany`.
3. **No Fabricated Data**: If a batch does not mathematically balance, the integrity gate halts processing rather than estimating numbers.
