# ReconcileAI — Prompt Architecture & Schema Specifications

## 1. System Prompt Principles
1. **Strict JSON Output**: The model must output valid JSON only without markdown code fences or surrounding conversational text in API mode.
2. **Deterministic Evidence Citation**: Every diagnosis must cite specific dates, amounts, and reference tokens from the candidate context.
3. **Bounded Latency & Tokens**: Temperature is locked at `0.2` with low max tokens to prevent rambling.

---

## 2. Pass 3: Exception Reasoning Prompt (v1.0.0)

### System Prompt
```
You are ReconcileAI's Tier-3 Forensic Financial Reasoner.
Analyze unmatched bank transactions against potential candidate ledger rows.
For each bank record, determine if it is a match to a candidate or categorize the exception:
- 'duplicate': duplicate debit attempt
- 'refund': customer refund or charge reversal
- 'bank_fee': unbilled bank service charge
- 'timing_lag': legitimate match with delayed settlement
- 'unrecorded': legitimate expense missing ledger entry
- 'unknown': unresolvable anomaly

Output strictly valid JSON matching the Pass3BatchResponseSchema.
```

---

## 3. Draft Action Generation Prompts (v1.0.0)

### Vendor Email Inquiries (`vendor_email`)
```
Generate a professional, audit-grade invoice request email to the vendor for an unrecorded bank payment.
Include: recipient name, subject line citing UTR reference and date, and polite body requesting formal tax invoice.
```

### Adjusting Journal Entries (`ledger_correction`)
```
Generate an adjusting journal entry for an unrecorded bank fee or refund reversal.
Include: proposed_debit_account, proposed_credit_account, amount, and formal accounting narration.
```

---

## 4. Multi-Provider Resilience Architecture & Tool Definitions

The prompt engine operates across a 3-tier provider hierarchy:
1. **Tier 1 (Claude 3.5 Sonnet)**: Primary reasoning engine (`ai_mode: "claude"`). Uses Anthropic messages API with system prompts and tool declarations.
2. **Tier 2 (Google Gemini 3.5 Flash Lite)**: Secondary fallback engine (`ai_mode: "gemini"`). 
   - **System Instruction Mapping**: System prompts are passed in `system_instruction.parts`.
   - **JSON Schema Enforcement**: Uses `responseMimeType: "application/json"` and `Pass3BatchResponseSchema`. Zod schemas include `.nullable()` on optional string fields (`bank_record_id`, `category`) for cross-provider compatibility.
   - **Tool Parameter Conversion (`convertSchemaForGemini()`)**: Converts JSON schema enum arrays containing non-string items (e.g. `level: [0, 1, 2]`) to string arrays (`['0', '1', '2']`) as required by Google's API schema validator.
   - **Thought Signature & Multi-Turn Loop**: Preserves model `thoughtSignature` metadata across function calls by pushing full `candidate.content` to `contents`, preventing Turn 2 validation rejections.
3. **Tier 3 (Forensic Heuristic Engine)**: Final deterministic fallback engine (`ai_mode: "heuristic"`). Ensures 100% offline availability with audit-grade rule-based evaluations.

### Unified Tool Definitions
- `query_settlements({ integrity_status, limit })`: Razorpay settlement batch inspector.
- `get_settlement_detail({ settlement_id })`: Unpacked settlement worksheet lookup.
- `query_matches({ level, method, min_confidence, limit })`: Scoped match lookup.
- `query_exceptions({ category, human_decision, limit })`: Scoped exception inspection.
- `query_audit_log({ target_type, limit })`: Append-only event history.
- `get_record_by_id({ collection, id })`: Exact document inspection.

