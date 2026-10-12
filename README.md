# Abhed: the accountability OS for a workforce of people and AI agents

> Every agent has an owner. Every action has a human name on it. Big actions wait for a person.
> Every outcome is tracked. Even the rules can't change without a second person.

CodeX 3.0 · Hack Arena · **PS5: AI Agent Governance and Human Accountability Operating System**.
NovaBank and everyone in it are fictional.

**Round 1 material:** [ideation deck (15 pages)](docs/Abhed_Round1_Ideation.pdf) · [visual deck with live screenshots](docs/Abhed_Round1_Deck.pdf) · [10-page solution brief](docs/Abhed_Solution_Brief.pdf) · [pricing note](docs/Abhed_Pricing_Note.pdf) · [live demo script](DEMO_SCRIPT.md)

## What it does (PS5, line by line)

| PS5 asks for | Abhed | Where you see it |
|---|---|---|
| Registry: owner, purpose, permitted actions, data access, risk | Agent passports: delegations from a named human, data scopes, model version, autonomy | Command Center → click an agent |
| Role-based permissions, policy rules, approval checkpoints | Plain-English versioned rules (block wins; unknown high-impact → a person); roles matrix; approvals **bound to a SHA-256 of the exact action** | Rulebook · phone approval |
| Unified activity trail | One append-only, hash-chained ledger for humans + agents: what, data touched, on whose behalf, rule@version, approvers, outcome | Ledger |
| Human-vs-agent allocation, escalation, exceptions | Work board lanes with a reason on every card; unanswered approvals escalate L1 → L2 → exec; paused agent's tickets move to people | Command Center · work board |
| Risk / cost / usage / value dashboard + pause/restrict | KPIs and agent P&L computed from the ledger; Pause (revokes the agent's key) and Restrict | Command Center |
| Audit-ready reports + accountability chain | Incident Room: chain (responsible vs accountable), suggested root cause + human confirm, Replay of the fix over 30 days, governed rule change, printable audit report | Incidents → Export audit report |
| Expected demo | Rex asks ₹40,000 → held → judge approves on their phone → ledger → poisoned ticket → blocked → **auto-paused** | Demo keys 1–3 |

### The wow, and the real problem behind each

- **The judge approves on their own phone (QR).** The approval covers only that exact action. If the agent changes ₹1, the hash changes and the approval is void. *(Replit agent ignored "no changes without approval", Jul 2025.)*
- **Rubber-stamp detection.** Approve in under 4 s without opening the evidence and Abhed flags you. It governs the humans too. *(Anthropic reports users accept 93% of permission prompts. EU AI Act Art. 14 asks for awareness of automation bias.)*
- **Twin Universe.** The same poisoned WhatsApp ticket runs in two worlds. Without Abhed: ₹4,85,000 refunded and 1,206 records exported. With Abhed: ₹0, the agent is auto-paused and its 14 tickets move to people. **Judges can write their own attack.** *(EchoLeak CVE-2025-32711; the Supabase MCP "lethal trifecta", Jul 2025.)*
- **Mrs. Sharma's ₹8,000.** The AI followed every rule and was still wrong. The chain separates **responsible** (Rex) from **accountable** (Priya, who owns the delegation, and Arjun + Meera, who own the rule). Replay shows the new rule would have held 4 refunds: 1 caught and 3 fine. Activating the rule needs a second person, on the phone again. *(Moffatt v. Air Canada, 2024: the company is liable for its AI's output.)*
- **Kill switch outside the model.** Pause revokes the agent's key at the gateway, so the agent can't argue with it. *(OpenClaw ignored "STOP", Feb 2026.)*
- **Tamper-evident ledger.** An insider edits a row in the database and Verify points to the exact record. *(EU AI Act Art. 12 logging.)*
- **Shadow agents + runaway breaker.** Unregistered agents are refused fail-closed. The same call repeated 5× in 2 minutes trips an automatic pause.

## Demo (3 minutes)

Open `/command`. The demo dock at the bottom has keys `1`–`8` and `R` to reset (press `.` to hide the dock). Start the live agents first (see Live mode).

1. **`1`**: Rex (refunds agent) reads VIP ticket #8811 and asks to refund ₹40,000. It's held because Priya delegated only ₹10,000. A **QR code** appears. The judge scans it, types their name and approves. Their name lands in the ledger.
2. **`2`**: Rex tries to reuse the approval for ₹40,001. Refused: different fingerprint, and the approval is single-use.
3. **`3`**: Twin Universe. ₹4,85,000 vs ₹0. Aria is auto-paused and 14 tickets move to Isha and Arjun.
4. **`4`**: Mrs. Sharma disputes the ₹8,000 refund. The chain builds node by node. Confirm "Policy gap", Replay (4 held / 1 caught / 3 fine), then Activate rule. A **second QR** appears, and the judge approves the rule change.
5. **`5`**: Tamper → Verify turns red at the exact record → Restore.
6. Close: "Want to try to hack it?" → Twin Universe → *Write your own attack*.

Fallbacks: every step also has an on-screen button. "Approve here (fallback)" approves on the laptop if the phone or network fails.

## Live mode: real agents, real phones (the part that proves it isn't a slideshow)

```bash
npm run agents -- --url https://kavach-os.vercel.app      # add --rogue for a shadow agent
```

- **Five agents run as real processes** on any laptop (`agents/run.mjs`). Each holds **only an Abhed key**. They ask Abhed for work (`/api/agent/next`), think through the **Abhed LLM gateway** (`/api/agent/think`, metered in ₹ and tokens, budget-capped), and act only through the **tool gateway** (`/api/agent/act`). They have no bank credentials and no LLM provider key.
- **A customer simulator** sends realistic NovaBank traffic: failed UPI refunds, duplicate EMI debits, card blocks, PagerDuty alerts, CRM leads, report requests. Abhed classifies and routes each message (legal/fraud language → a person; VIP → agent + review; paused agent → a person).
- **Judges become customers:** scan the "be a customer" QR (`/support`), type any complaint, and watch an agent handle it step by step on their phone.
- **Judges become approvers:** scan the "go on duty" QR (`/approver`). From then on, every high-risk action (a refund over ₹10,000, a production restart, a rule change) **opens on their phone by itself**, with a vibration and sound. On Android/desktop Chrome it also arrives as a **push notification** (on iPhone: Add to Home Screen first). Over ₹50,000 needs **two different phones** (two-key).
- **Kill switch is real:** press Pause on the live floor and the agent's terminal prints "⛔ Abhed revoked my key". Its next call is refused at the gateway and its open tickets move to people.
- **Prompt injection, live:** press `8` (or send a message with hidden instructions from `/support`). The real Aria follows them, Abhed blocks the export, auto-pauses Aria, and opens an incident.
- Without `GROQ_API_KEY`/`GEMINI_API_KEY` the agents use a transparent offline planner, and the UI says so. With a key, they plan with a real LLM.

## Architecture

One Next.js app (TypeScript). Every action, from an agent, a human, or a rule change, goes through **one gateway**:

```
identity → live human delegation → rules (block wins) → checkpoint (hash-bound, expiring, two-key) → execute → ledger (masked, hash-chained) → monitor (auto-pause, circuit breaker)
```

- `lib/engine.ts`: gateway, rules, approvals, ledger, pause/restrict, incidents, replay, tamper/verify
- `lib/planner.ts`: the agents' brain. With `GROQ_API_KEY` or `GEMINI_API_KEY` set, a real LLM proposes tool calls. Without one, an offline instruction-follower proposes them. Either way, every call hits the gateway.
- `lib/store.ts`: shared state (Supabase Postgres row with optimistic concurrency, or in-memory locally), so laptop and phone see one world
- `lib/seed.ts`: deterministic NovaBank: 5 agents, 7 people, 30 days of history (seed 42)
- `tests/engine.test.ts`: 18 acceptance tests (A1–A11: hash-bound approval, ₹1 void, twin ₹4,85,000 / 1,206 / 14 re-routed, replay 4/1/3, tamper at exact seq, two-key, escalation, shadow agent, runaway)

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # 18 acceptance tests
```

Environment (see `.env.example`): `SUPABASE_URL` + `SUPABASE_KEY` for shared state; `GROQ_API_KEY` / `GEMINI_API_KEY` for a live LLM planner; `DIRECTOR_KEY` to lock the demo controls on a public URL.

## Honest limits

- Tools are simulated adapters. Refunds don't move real money.
- The rule engine is our own (~250 lines, deterministic, explainable). In production, Cedar or OPA would plug in at the same point.
- Framework mapping (RBI FREE-AI, EU AI Act Art. 12/14, OWASP Agentic Top 10, DPDP) means "maps to", not "compliant".
