import { z } from 'zod';

export const PROMPT_VERSION = 'v2.0.0-razorpay-settlement';

export const PASS3_SYSTEM_PROMPT = `You are ReconcileAI's Tier-3 Senior Forensic Settlement Auditor specializing in payment gateway settlement reconciliation.
Your task is to analyze Razorpay settlement line items against merchant internal ledger orders, unpack multi-order batch credits, and forensicly diagnose all amount variances (MDR fee, 18% GST on MDR, refunds, partial settlements, rounding, unrecorded orders).

CRITICAL AUDIT INSTRUCTIONS:
1. Output MUST be strictly valid JSON.
2. DO NOT output any markdown code blocks, backticks (\`\`\` or \`\`\`json), explanations, or preamble before or after the JSON.
3. Your output must parse directly with JSON.parse().
4. Every decision must provide a concise 1-2 sentence rationale citing specific field values (order IDs, gross amounts, MDR fees, GST amounts, or refund adjustments).
5. If matching a candidate, "match_ledger_id" MUST be one of the provided candidate ledger IDs.
6. Categorize the variance explicitly using one of:
   - "mdr_fee": Merchant Discount Rate fee deducted (~2% of gross amount).
   - "gst_on_mdr": 18% GST charged on top of the MDR fee (critical for GST Input Tax Credit / ITC claiming).
   - "refund_deduction": A customer refund or chargeback processed in this settlement cycle.
   - "rounding": Minor sub-rupee rounding differences.
   - "partial_settlement": Order settled across multiple settlement batches.
   - "unrecorded": Genuinely no matching merchant internal order found.
   - "unknown": Ambiguous, corrupted, or unresolvable discrepancy.
`;

/**
 * Zod schema for individual Settlement Variance reasoning item
 */
export const Pass3ItemSchema = z.object({
  payment_id: z.string().optional(),
  order_id: z.string().optional(),
  bank_record_id: z.string().nullable().optional(),
  settlement_id: z.string().nullable().optional(),
  decision: z.enum(['match', 'exception']),
  match_ledger_id: z.string().nullable().optional(),
  category: z
    .enum([
      'mdr_fee',
      'gst_on_mdr',
      'refund_deduction',
      'rounding',
      'partial_settlement',
      'unrecorded',
      'unknown',
      'duplicate',
      'timing_lag',
      'bank_fee',
    ])
    .nullable()
    .optional(),
  confidence: z.number().min(0).max(1),
  rationale: z.string().min(5),
  variance_breakdown: z
    .object({
      mdr_fee: z.number().optional(),
      gst_on_mdr: z.number().optional(),
      refund: z.number().optional(),
      rounding: z.number().optional(),
    })
    .optional(),
});

/**
 * Zod schema for batch Pass 3 reasoning response
 */
export const Pass3BatchResponseSchema = z.object({
  evaluations: z.array(Pass3ItemSchema),
});

/**
 * Builds the user prompt payload for a batch of settlement line items with candidate ledger orders.
 *
 * @param {Array<{ lineItem: object, settlement: object, candidates: Array<object> }>} batchItems
 * @returns {string}
 */
export function buildPass3UserPrompt(batchItems) {
  const formattedItems = batchItems.map((item, idx) => {
    const li = item.lineItem || item.bank || {};
    const setl = item.settlement || {};
    const candidates = item.candidates || [];

    const candidateLines = candidates.length > 0
      ? candidates
          .map(
            (c, cIdx) =>
              `    [Candidate ${cIdx + 1}] ID: "${c.id || c._id}", Order ID: "${c.order_id || c.invoice_ref || ''}", Amount: ₹${c.amount}, Date: "${c.date ? new Date(c.date).toISOString().split('T')[0] : 'N/A'}", Payee/Customer: "${c.payee || ''}"`
          )
          .join('\n')
      : '    (No ledger candidates found within +/- 15% gross amount and +/- 14 days window)';

    return `Item ${idx + 1}:
  Settlement Line Item:
    Payment ID: "${li.payment_id || li.id || 'N/A'}"
    Order ID: "${li.order_id || ''}"
    Settlement Batch: "${li.settlement_id || setl.settlement_id || 'N/A'}"
    Type: "${li.type || 'payment'}"
    Gross Amount: ₹${li.amount || 0}
    Fee (MDR): ₹${li.fee || 0}
    Tax (18% GST): ₹${li.tax || 0}
    Net Settled: ₹${li.net_amount || (li.credit || 0) - (li.debit || 0)}
    Narration / Ref: "${li.narration || li.utr_ref || ''}"
    Settled Date: "${li.settled_at || li.date ? new Date(li.settled_at || li.date).toISOString().split('T')[0] : 'N/A'}"
  Candidate Ledger Orders (${candidates.length}):
${candidateLines}`;
  });

  return `Analyze the following ${batchItems.length} Razorpay settlement line items and candidate merchant ledger records. Diagnose exact variance categories (MDR, GST, refunds, unrecorded) and output strict JSON.

JSON Contract:
{
  "evaluations": [
    {
      "payment_id": "pay_xxx",
      "order_id": "order_xxx",
      "bank_record_id": "BNK-xxx" (if applicable),
      "decision": "match" | "exception",
      "match_ledger_id": "LED-xxx" (required if decision is "match", null otherwise),
      "category": "mdr_fee" | "gst_on_mdr" | "refund_deduction" | "rounding" | "partial_settlement" | "unrecorded" | "unknown" (required if decision is "exception"),
      "confidence": 0.0 to 1.0,
      "rationale": "Concise 1-2 sentence explanation citing exact amounts, MDR%, GST, and order IDs.",
      "variance_breakdown": {
        "mdr_fee": 0.00,
        "gst_on_mdr": 0.00,
        "refund": 0.00,
        "rounding": 0.00
      }
    }
  ]
}

Items to analyze:
${formattedItems.join('\n\n')}
`;
}
