# ReconcileAI — Database Schema & Data Dictionary

All schemas are managed via Mongoose under `server/models/`.

### 1. BankRecord (`bank_records`)
- `id` / `_id`: String or ObjectId
- `run_id`: String (Indexed)
- `date`: Date
- `amount`: Number (Signed: positive credit, negative debit)
- `utr_ref`: String (Indexed, e.g. `UTR-MOCK-10029`)
- `narration`: String
- `status`: String enum `['pending', 'matched', 'exception']` (Default: `'pending'`)

### 2. LedgerRecord (`ledger_records`)
- `id` / `_id`: String or ObjectId
- `run_id`: String (Indexed)
- `date`: Date
- `amount`: Number
- `invoice_ref`: String (Indexed, e.g. `INV-MOCK-8821`)
- `payee`: String
- `status`: String enum `['pending', 'matched', 'exception']` (Default: `'pending'`)

### 3. Match (`matches`)
- `run_id`: String (Indexed)
- `bank_record_id`: String / ObjectId
- `ledger_record_id`: String / ObjectId
- `method`: String enum `['exact', 'fuzzy', 'ai']`
- `confidence`: Number (0.0 to 1.0)
- `rationale`: String
- `created_at`: Date (Default: `Date.now`)

### 4. Exception (`exceptions`)
- `run_id`: String (Indexed)
- `bank_record_id`: String / ObjectId
- `candidate_ledger_ids`: `[String]`
- `category`: String enum `['duplicate', 'refund', 'bank_fee', 'timing_lag', 'unrecorded', 'unknown']`
- `ai_rationale`: String
- `confidence`: Number (0.0 to 1.0)
- `human_decision`: String enum `['pending', 'accepted', 'rejected', 'manually_resolved']` (Default: `'pending'`)
- `resolved_by`: String (User ID or email)
- `manual_ledger_id`: String
- `ai_error`: Boolean (Default: `false`)
- `created_at`: Date (Default: `Date.now`)

### 5. DraftAction (`draft_actions`)
- `run_id`: String (Indexed)
- `exception_id`: String / ObjectId
- `action_type`: String enum `['vendor_email', 'ledger_correction']`
- `draft_content`: Mixed / Object (`{ to, subject, body }` or `{ field, old_value, new_value, reason }`)
- `confidence`: Number (0.0 to 1.0)
- `status`: String enum `['pending_approval', 'approved', 'rejected']` (Default: `'pending_approval'`)
- `executed_at`: Date
- `was_edited`: Boolean (Default: `false`)
- `edited_content`: Mixed / Object
- `created_at`: Date (Default: `Date.now`)

### 6. AuditLog (`audit_logs`)
- `run_id`: String (Indexed)
- `actor`: String (`'system'`, `'claude'`, or User ID)
- `action`: String (e.g. `'exact_match_created'`, `'agent_query'`, `'draft_action_approved'`)
- `target_type`: String enum `['match', 'exception', 'draft_action', 'agent_query']`
- `target_id`: String
- `details`: Mixed / Object
- `timestamp`: Date (Default: `Date.now`, immutable/append-only)

### 7. Run (`runs`)
- `run_id`: String (Unique, Indexed)
- `status`: String enum `['pending', 'running', 'complete', 'failed']` (Default: `'pending'`)
- `total_records`: Number
- `pass1_matched`: Number (Default: `0`)
- `pass2_matched`: Number (Default: `0`)
- `pass3_matched`: Number (Default: `0`)
- `unresolved`: Number (Default: `0`)
- `match_rate`: Number (Default: `0.0`)
- `created_at`: Date (Default: `Date.now`)
- `completed_at`: Date

### 8. User (`users`)
- `email`: String (Unique, Indexed)
- `password`: String (Hashed with bcrypt)
- `role`: String enum `['analyst', 'admin']` (Default: `'analyst'`)
- `created_at`: Date (Default: `Date.now`)
