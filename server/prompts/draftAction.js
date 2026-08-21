import { z } from 'zod';

export const PROMPT_VERSION = 'v1.0.0';

export const DRAFT_ACTION_SYSTEM_PROMPT = `You are ReconcileAI's Remediation Action Assistant.
Your task is to draft precise, auditable financial remediation actions for unresolved reconciliation exceptions.

CRITICAL INSTRUCTIONS:
1. Output MUST be strictly valid JSON.
2. DO NOT output any markdown code blocks, backticks (\`\`\` or \`\`\`json), or conversational text.
3. Your output must parse directly with JSON.parse().
4. Generate ONE of the following action types:
   - "vendor_email": For reaching out to a vendor/payee to request missing invoice documents, payment receipts, or clarify refund discrepancies.
   - "ledger_correction": For proposing an adjusting journal entry to record unrecorded bank charges, direct debits, or credit refunds in the accounting system.
`;

/**
 * Zod schema for Vendor Email Draft Action
 */
export const VendorEmailContentSchema = z.object({
  recipient: z.string().min(1),
  subject: z.string().min(3),
  body: z.string().min(10),
});

/**
 * Zod schema for Ledger Correction Draft Action
 */
export const LedgerCorrectionContentSchema = z.object({
  entry_type: z.enum(['journal_entry', 'credit_note', 'bank_charge_entry', 'reversal']),
  proposed_debit_account: z.string().min(2),
  proposed_credit_account: z.string().min(2),
  amount: z.number(),
  date: z.string(),
  narration: z.string().min(5),
  notes: z.string().optional(),
});

/**
 * Zod schema for Draft Action Response
 */
export const DraftActionResponseSchema = z.object({
  action_type: z.enum(['vendor_email', 'ledger_correction']),
  confidence: z.number().min(0).max(1),
  draft_content: z.union([VendorEmailContentSchema, LedgerCorrectionContentSchema]),
});

/**
 * Builds user prompt for generating a draft remediation action
 *
 * @param {object} exceptionRecord - The Exception document or object
 * @param {object} bankRecord - The associated BankRecord
 * @returns {string}
 */
export function buildDraftActionUserPrompt(exceptionRecord, bankRecord) {
  const isRefund = exceptionRecord.category === 'refund' || (bankRecord && bankRecord.amount < 0);
  const suggestedActionType = isRefund ? 'ledger_correction' : 'vendor_email';

  return `Generate a remediation draft action for the following reconciliation exception.

Exception Details:
- Category: "${exceptionRecord.category}"
- AI Rationale: "${exceptionRecord.ai_rationale || ''}"
- Confidence: ${exceptionRecord.confidence}
- Bank Record ID: "${bankRecord?.id || exceptionRecord.bank_record_id}"
- Date: "${bankRecord?.date ? new Date(bankRecord.date).toISOString().split('T')[0] : 'N/A'}"
- Amount: ${bankRecord?.amount}
- Narration: "${bankRecord?.narration || ''}"
- UTR / Ref: "${bankRecord?.utr_ref || ''}"

Preferred action type: "${suggestedActionType}" (or "ledger_correction" / "vendor_email" as best fits the situation).

Output JSON Contract:
{
  "action_type": "vendor_email" | "ledger_correction",
  "confidence": 0.80 to 1.0,
  "draft_content": {
    // If "vendor_email":
    //   "recipient": "Vendor / Payee Name",
    //   "subject": "Missing Invoice / Payment Query for ...",
    //   "body": "Formal professional email body..."
    // If "ledger_correction":
    //   "entry_type": "journal_entry" | "credit_note" | "bank_charge_entry" | "reversal",
    //   "proposed_debit_account": "...",
    //   "proposed_credit_account": "...",
    //   "amount": number,
    //   "date": "YYYY-MM-DD",
    //   "narration": "...",
    //   "notes": "..."
  }
}
`;
}
