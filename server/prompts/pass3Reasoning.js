import { z } from 'zod';

export const PROMPT_VERSION = 'v1.0.0';

export const PASS3_SYSTEM_PROMPT = `You are ReconcileAI's Tier-3 Senior Forensic Financial Auditor.
Your task is to analyze unmatched bank transactions against a set of candidate ledger records, or diagnose why no ledger entry exists.

CRITICAL INSTRUCTIONS:
1. Output MUST be strictly valid JSON.
2. DO NOT output any markdown code blocks, backticks (\`\`\` or \`\`\`json), explanations, or preamble before or after the JSON.
3. Your output must parse directly with JSON.parse().
4. Every decision must provide a concise 1-2 sentence rationale citing specific field values (dates, exact amounts, narrations, or payee names).
5. If matching a candidate, "match_ledger_id" MUST be one of the provided candidate ledger IDs.
6. If classifying as an exception, "category" MUST be one of:
   - "duplicate": Duplicate debit or double charge on the bank statement.
   - "refund": Credit reversal or vendor overpayment refund (often negative or credit amounts).
   - "bank_fee": Unilateral bank service charge, RTGS/IMPS fee, or monthly maintenance fee.
   - "timing_lag": Legitimate transaction in transit with substantial date or processing lag.
   - "unrecorded": Genuine business expense missing from accounting ledger.
   - "unknown": Ambiguous, corrupted, or unresolvable discrepancy.
`;

/**
 * Zod schema for individual Pass 3 reasoning item
 */
export const Pass3ItemSchema = z.object({
  bank_record_id: z.string(),
  decision: z.enum(['match', 'exception']),
  match_ledger_id: z.string().nullable().optional(),
  category: z
    .enum(['duplicate', 'refund', 'bank_fee', 'timing_lag', 'unrecorded', 'unknown'])
    .optional(),
  confidence: z.number().min(0).max(1),
  rationale: z.string().min(5),
});

/**
 * Zod schema for batch Pass 3 reasoning response
 */
export const Pass3BatchResponseSchema = z.object({
  evaluations: z.array(Pass3ItemSchema),
});

/**
 * Builds the user prompt payload for a batch of unmatched bank records with narrowed candidate ledger items.
 *
 * @param {Array<{ bank: object, candidates: Array<object> }>} batchItems
 * @returns {string}
 */
export function buildPass3UserPrompt(batchItems) {
  const formattedItems = batchItems.map((item, idx) => {
    const b = item.bank;
    const candidates = item.candidates || [];

    const candidateLines = candidates.length > 0
      ? candidates
          .map(
            (c, cIdx) =>
              `    [Candidate ${cIdx + 1}] ID: "${c.id}", Date: "${c.date ? new Date(c.date).toISOString().split('T')[0] : 'N/A'}", Amount: ${c.amount}, Invoice: "${c.invoice_ref || ''}", Payee: "${c.payee || ''}"`
          )
          .join('\n')
      : '    (No ledger candidates within +/- 10% amount and +/- 14 days window)';

    return `Item ${idx + 1}:
  Bank Record:
    ID: "${b.id}"
    Date: "${b.date ? new Date(b.date).toISOString().split('T')[0] : 'N/A'}"
    Amount: ${b.amount}
    UTR / Ref: "${b.utr_ref || ''}"
    Narration: "${b.narration || ''}"
  Candidate Ledger Records (${candidates.length}):
${candidateLines}`;
  });

  return `Evaluate the following ${batchItems.length} unmatched bank transaction(s) and provide your evaluation in strict JSON format.

JSON Contract:
{
  "evaluations": [
    {
      "bank_record_id": "BNK-xxx",
      "decision": "match" | "exception",
      "match_ledger_id": "LED-xxx" (required if decision is "match", null otherwise),
      "category": "duplicate" | "refund" | "bank_fee" | "timing_lag" | "unrecorded" | "unknown" (required if decision is "exception"),
      "confidence": 0.0 to 1.0,
      "rationale": "Concise 1-2 sentence explanation citing exact amounts, dates, or vendor names."
    }
  ]
}

Transactions to analyze:
${formattedItems.join('\n\n')}
`;
}
