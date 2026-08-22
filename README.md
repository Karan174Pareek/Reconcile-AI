# ReconcileAI

An intelligent finance reconciliation system that automatically matches bank transactions against internal ledger records — and clearly flags what it can't, instead of guessing.

Built for the **Razorpay AI Buildathon 2026** (*Finance Controller track*).

🎥 **Demo Video Recording**: [**`docs/demo-recording.webm`**](./docs/demo-recording.webm)  
🎬 **5-Minute Pitch Script**: [**`DEMO_SCRIPT.md`**](./DEMO_SCRIPT.md)

---

## The Problem

Every business that moves money faces the same weekly chore: checking whether the bank statement actually matches the books. In most companies, this is still done manually — someone opens two spreadsheets and eyeballs which rows correspond to which. For a business processing a few hundred transactions a week, that's hours of repetitive work, and it fails in predictable ways:

- A payment settles in the bank a few days after it's recorded internally
- A customer pays in two installments instead of one, looking like a mismatch
- Bank fees appear on the statement with no corresponding ledger entry
- The same transaction accidentally gets recorded twice
- Sometimes something is genuinely missing and needs a human to investigate

Manually catching all of this, every week, at scale, is the real bottleneck — not because it's hard to understand, but because it's tedious, detail-heavy, and easy to get wrong.

---

## The Solution

ReconcileAI automates this process end to end. Given a bank statement and a ledger, it identifies what matches, what doesn't, and why — and it does this without pretending everything reconciles perfectly, which is often the tell-tale sign of a naive system.

### How it works, in three stages:

1. **Exact matching** — transactions with identical amounts and reference numbers are matched instantly, at zero extra cost. This resolves the majority of cases in milliseconds.
2. **Smart approximate matching** — transactions that are close in amount, near in date, and similar in description (accounting for timing lags and minor variations) are matched with a calculated confidence score.
3. **AI-assisted investigation** — whatever remains genuinely ambiguous after the first two stages gets reasoned through individually: is it a duplicate? A bank fee? A refund? Or a real gap that needs a person to look at it? Each is categorized with a clear explanation, not just marked red.

### On top of this, the system includes:

- **A query interface** — instead of scrolling through spreadsheets, you can ask directly: *"Why is this transaction still unresolved?"* or *"Show me all the bank fees this week"* and get an answer pulled from the actual data.
- **A human approval step for any action** — if the system identifies something it can help resolve (like drafting a follow-up email about a missing invoice), it prepares the draft but never sends anything or changes any record without a person explicitly approving it first.
- **A complete audit trail** — every match and every decision is logged and traceable, so nothing is a black box.

---

## 📸 Screenshots & Interface Walkthrough

### 1. Live Pipeline Dashboard & Real-Time Stepper
*Real-time Socket.io multi-pass progress stepper (Pass 1 Exact → Pass 2 Fuzzy → Pass 3 Claude AI), ticker cards, and live activity stream console.*

![Live Pipeline Dashboard](./docs/screenshots/dashboard.png)

---

### 2. Interactive Exception Queue & Forensic AI Reasoning
*Side-by-side transaction inspection showing Bank details vs ERP ledger candidates, Claude's cited rationales, confidence scores, and manual mapping controls.*

![Exception Queue](./docs/screenshots/exception-queue.png)

---

### 3. Conversational Forensic Agent Chat (Tool-Use Stream)
*Slide-over drawer streaming Server-Sent Events (SSE) responses, executing read-only MongoDB tool calls (`query_exceptions`, `get_record_by_id`) with cited record IDs.*

![Forensic Agent Chat](./docs/screenshots/agent-chat.png)

---

### 🎥 End-to-End Demo Video
*A full, unhurried 5-minute walkthrough of the 3-pass pipeline, conversational forensic chat, and human-in-the-loop remediation approval.*

📹 [**Watch High-Resolution Demo Recording (`docs/demo-recording.webm`)**](./docs/demo-recording.webm)

---

## Results

Tested against a 525-transaction synthetic dataset modeled on realistic business patterns:

| Metric | Result |
| :--- | :--- |
| **Transactions processed** | **525** |
| **Automatically matched (exact)** | **350 (66.7%)** |
| **Automatically matched (approximate)** | **105 (20.0%)** |
| **Resolved via investigation** | **25 (4.8%)** |
| **Flagged for human review** | **45 (8.6%)** |
| **Overall resolution rate** | **91.4%** |
| **Processing time (automated stages)** | **~70 ms** |

> **The 8.6% flagged for review is intentional, not a limitation to hide** — a reconciliation tool that claims 100% accuracy on messy real-world data is a red flag, not an achievement. Those cases are exactly the ones that should reach a human.

---

## Key Features

- **Live processing dashboard** — watch the reconciliation run in real time, stage by stage
- **Exception queue** — review flagged transactions side by side with the system's reasoning
- **Conversational query interface** — ask questions about the reconciliation run in plain language
- **Human-in-the-loop approvals** — every proposed action requires explicit sign-off before it takes effect
- **Full audit log** — an unchangeable record of every match and every decision, for accountability

---

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS
- **Backend:** Node.js, Express, Socket.io (*real-time updates*)
- **Database:** MongoDB
- **Reasoning layer:** Claude API, used specifically for the cases that simple rule-based matching can't confidently resolve — not as a blanket solution for the whole pipeline

---

## Engineering Approach

A few decisions worth calling out, because they reflect how this was actually built:

1. **The system does the cheap, fast work itself, and only escalates the genuinely hard cases.** Routing everything through an AI model would be slow, expensive, and unreliable for a task that's mostly simple arithmetic. Roughly 87% of this dataset resolves without any AI call at all.
2. **Every action that affects real data or communicates externally requires human approval.** The system can propose, draft, and investigate — it cannot act unilaterally.
3. **Failures are surfaced, not hidden.** If a matching step or an API call fails, the affected record is flagged for review rather than silently dropped or force-matched.
4. **The audit log cannot be edited or deleted, even by the system itself** — it's structurally append-only, which is what makes the *"everything is traceable"* claim actually true rather than just asserted.

---

## Getting Started

```bash
# 1. Clone the repository
git clone https://github.com/Karan174Pareek/Reconcile-AI.git
cd Reconcile-AI

# 2. Configure environment variables
cp server/.env.example server/.env
# Add your own Claude API key and MongoDB URI

# 3. Install dependencies
npm install --prefix server
npm install --prefix client

# 4. Generate a sample benchmark dataset
npm run seed --prefix server

# 5. Start development servers
npm run dev --prefix server
npm run dev --prefix client
```

---

## Documentation

Detailed design docs are in [**`/docs`**](./docs) — [product requirements](./docs/prd.md), [system architecture](./docs/architecture.md), [database schema](./docs/database.md), [API contracts](./docs/api.md), [security considerations](./docs/security.md), and [error-handling strategy](./docs/error-handling.md).

---

## About

Built by **Karan** — 4th-year BCA student at MAKAUT, co-founder of Ignitia Digital. This project reflects how I approach engineering problems: understand the real-world workflow first, design for the failure cases before the happy path, and build systems that are honest about their limitations rather than ones that look impressive on the surface.

[**GitHub**](https://github.com/Karan174Pareek) · [**LinkedIn**](https://www.linkedin.com/in/karan174pareek)
