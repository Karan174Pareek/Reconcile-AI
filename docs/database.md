# ReconcileAI — Database Schema & Data Dictionary

All schemas are managed via Mongoose under `server/models/`.

### 1. BankRecord (`bank_records`)
*Represents nodal settlement credits appearing on the merchant's bank statement.*
- `id` / `_id`: String or ObjectId
- `run_id`: String (Indexed)
- `date`: Date
- `amount`: Number (Net batch settlement credit)
- `utr_ref`: String (Indexed, e.g. `UTR-RAZORPAY-88129`)
- `narration`: String (e.g. `NEFT CR: HDFC0000060 UTR-RAZORPAY-88129 RAZORPAY SETTLEMENT`)
- `status`: String enum `['pending', 'matched', 'exception']` (Default: `'pending'`)

### 2. SettlementReport (`settlement_reports`)
*Represents Razorpay's batch-level settlement entity.*
- `run_id`: String (Indexed)
- `settlement_id`: String (Unique, Indexed, e.g. `setl_DGlQ1Rj8os78Ec`)
- `amount`: Number (Net settled amount in INR)
- `gross_amount`: Number (Gross order total in INR)
- `fees`: Number (Total MDR fees in INR)
- `tax`: Number (Total 18% GST on MDR fees in INR)
- `refunds`: Number (Total refund deductions in INR)
- `utr`: String (Indexed)
- `status`: String enum `['created', 'processed', 'settled', 'failed']`
- `settled_at`: Date
- `item_count`: Number
- `integrity_status`: String enum `['pending', 'balanced', 'imbalanced']`
- `bank_record_id`: String (Linked BankRecord ID)

### 3. SettlementLineItem (`settlement_line_items`)
*Represents granular per-transaction line items inside a Razorpay settlement batch.*
- `run_id`: String (Indexed)
- `settlement_id`: String (Indexed, parent settlement)
- `payment_id`: String (Indexed, e.g. `pay_N09247ab1`)
- `order_id`: String (Indexed, e.g. `order_MOCK_10023`)
- `type`: String enum `['payment', 'refund', 'adjustment', 'transfer']`
- `amount`: Number (Gross amount in INR)
- `fee`: Number (MDR fee deducted in INR)
- `tax`: Number (18% GST on MDR fee in INR)
- `debit`: Number (Total deductions)
- `credit`: Number (Gross credit)
- `net_amount`: Number (`credit - debit`)
- `currency`: String (`'INR'`)
- `settled_at`: Date
- `unpacked_status`: String enum `['pending', 'matched', 'variance_flagged', 'unrecorded']`
- `ledger_record_id`: String (Linked internal ledger order ID)
- `variance_category`: String enum `['mdr_fee', 'gst_on_mdr', 'refund_deduction', 'rounding', 'partial_settlement', 'unrecorded', 'none', 'unknown']`

### 4. LedgerRecord (`ledger_records`)
*Represents the merchant's internal order and revenue records.*
- `id` / `_id`: String or ObjectId
- `run_id`: String (Indexed)
- `date`: Date
- `amount`: Number (Expected gross revenue in INR)
- `order_id` / `invoice_ref`: String (Indexed, e.g. `order_MOCK_10023`)
- `payee`: String / Customer Name
- `status`: String enum `['pending', 'matched', 'exception']` (Default: `'pending'`)

### 5. Match (`matches`)
*Represents cryptographically validated matches across the 3-level hierarchy.*
- `run_id`: String (Indexed)
- `level`: Number (`0`: Bank↔Settlement, `1`: Batch Integrity Verified, `2`: LineItem↔Order)
- `bank_record_id`: String
- `settlement_id`: String
- `payment_id`: String
- `order_id`: String
- `ledger_record_id`: String
- `method`: String enum `['exact', 'fuzzy', 'ai', 'batch_integrity']`
- `confidence`: Number (0.0 to 1.0)
- `rationale`: String
- `variance_category`: String
- `variance_amount`: Number
- `created_at`: Date (Default: `Date.now`)

### 6. Exception (`exceptions`)
*Represents flagged variances, batch imbalances, and unrecorded orders.*
- `run_id`: String (Indexed)
- `level`: Number (`0`, `1`, `2`)
- `bank_record_id`: String
- `settlement_id`: String
- `payment_id`: String
- `order_id`: String
- `candidate_ledger_ids`: `[String]`
- `category`: String enum `['mdr_fee', 'gst_on_mdr', 'refund_deduction', 'rounding', 'partial_settlement', 'unrecorded', 'batch_imbalance', 'unknown']`
- `expected_amount`: Number
- `settled_amount`: Number
- `variance_amount`: Number
- `variance_breakdown`: Object (`{ mdr_fee, gst_on_mdr, refund, rounding, unaccounted }`)
- `ai_rationale`: String
- `confidence`: Number (0.0 to 1.0)
- `human_decision`: String enum `['pending', 'accepted', 'rejected', 'manually_resolved']`
- `resolved_by`: String
- `manual_ledger_id`: String
- `ai_error`: Boolean
- `created_at`: Date (Default: `Date.now`)

### 7. DraftAction (`draft_actions`)
- `run_id`: String (Indexed)
- `exception_id`: String
- `action_type`: String enum `['vendor_email', 'ledger_correction']`
- `draft_content`: Object (`{ to, subject, body }` or `{ field, old_value, new_value, reason }`)
- `confidence`: Number
- `status`: String enum `['pending_approval', 'approved', 'rejected']`
- `executed_at`: Date
- `was_edited`: Boolean
- `edited_content`: Object
- `created_at`: Date

### 8. AuditLog (`audit_logs`)
- `run_id`: String (Indexed)
- `actor`: String (`'system'`, `'claude'`, or User ID)
- `action`: String
- `payload`: Object
- `timestamp`: Date
