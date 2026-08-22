# ReconcileAI — Security & Compliance Architecture

## 1. Security Posture by Default
ReconcileAI is built with a zero-trust financial architecture designed to prevent unauthorized financial mutations, hallucinated actions, or data leaks.

---

## 2. Immutability & Audit Trail
- **Schema-Enforced Immutability**: The `AuditLog` Mongoose schema uses pre-hooks blocking `updateOne`, `updateMany`, `deleteOne`, `deleteMany`, `findOneAndUpdate`, `replaceOne`, `findOneAndReplace`, and `findOneAndDelete`.
- **Comprehensive Logging**: Every deterministic match, AI batch reasoning, agent tool invocation, inline edit, and human decision is timestamped and recorded.

---

## 3. Read-Only Scoped Tool Execution
- **Zero Mutation via Agent**: The `agentToolRouter` only implements read-only MongoDB queries.
- **Run-Id Bounding**: Every database query is strictly parameterized and filtered by the active `run_id`, preventing cross-run or cross-tenant data leakage.

---

## 4. Human-in-the-Loop (HITL) Action Guardrail
- **No Unapproved Side Effects**: The system never sends external emails or posts ledger journal adjustments automatically.
- **Sandboxed Execution**: Auto-generated draft actions remain in `pending_approval` until an authorized human analyst reviews, optionally edits, and explicitly clicks "Approve".

---

## 5. Production Hardening Roadmap
1. **Envelope Encryption**: AWS KMS envelope encryption for sensitive tenant credentials at rest.
2. **Rate Limiting**: Redis-backed rate limiting on all public API endpoints.
3. **Multi-Tenant Role-Based Access Control (RBAC)**: Fine-grained permissions distinguishing `Analyst`, `Controller`, and `Auditor` roles.
