'use client';

import { useState } from 'react';

const PROBLEMS = [
  ['Agents act with human permissions, without human accountability', 'An agent can refund, prescribe, re-price or email customers. When it goes wrong, nobody can say who allowed it.'],
  ['All-or-nothing control', 'Either every action needs a person (agents become useless) or none do (one bad action costs lakhs). Teams need checkpoints only where impact is high.'],
  ['Hallucinated actions', 'A model refunds ₹48,000 when the debit was ₹40,000, or refills a drug that was never prescribed. Text guardrails don’t catch wrong numbers.'],
  ['Prompt injection and data leaks', 'A hidden line in a customer message can make an agent export records. The model can’t be trusted to resist.'],
  ['Shadow and runaway agents', 'Unregistered scripts call production APIs; a looping agent repeats the same action 200 times.'],
  ['Audit trails anyone can edit', 'Logs in a database the company controls prove nothing to a regulator or a court.'],
  ['No view of cost, risk and value', 'Finance can’t see what each agent costs in tokens, what it saved, or how risky it is.'],
  ['Every company has different rules', 'A bank, a hospital and a marketplace need different policies, and those policies change every quarter.'],
  ['Regulation is arriving', 'EU AI Act Art. 14 (human oversight), India’s DPDP Act 2023 and RBI’s FREE-AI framework (2025) all expect provable oversight of automated decisions.'],
];

const COMPETITORS: [string, string, string, string, string, string, string][] = [
  // name, focus, runtime action gate, human approval on phone, grounding/hallucination, tamper-proof trail, vendor-neutral
  ['Abhed', 'Runtime governance for agent actions', '✓ every tool call', '✓ hash-bound, two-key, escalation', '✓ vs system of record', '✓ signed Merkle + Bitcoin anchor', '✓ any model / framework'],
  ['IBM watsonx.governance', 'Model lifecycle, risk & compliance', 'partial', '—', 'model evaluation', 'factsheets', 'mostly IBM stack'],
  ['AWS Bedrock AgentCore', 'Agent runtime, identity, policy on AWS', '✓ policy on tool calls', '—', '—', 'CloudTrail', 'AWS'],
  ['Microsoft Entra Agent ID / Agent 365', 'Identity and management of agents', 'identity & access', '—', '—', 'Purview audit', 'Microsoft 365'],
  ['ServiceNow AI Control Tower', 'Enterprise AI inventory & workflows', 'partial', 'workflow approvals', '—', 'platform logs', 'ServiceNow'],
  ['Guardrail libraries (NeMo Guardrails, Guardrails AI, Lakera)', 'Filter LLM inputs/outputs', 'text only', '—', 'format checks', '—', '✓'],
  ['Credo AI / Holistic AI', 'AI policy & compliance documentation', '—', '—', '—', 'assessments', '✓'],
];

// Benchmarked Oct 2026: AWS AgentCore Policy ≈ $0.025 per 1,000 checks, Microsoft Agent 365 $15/user/month,
// IBM watsonx.governance ≈ $3.5k–6.5k/month (third-party estimates), Langfuse free → $199 → $2,499/month.
// Indian buyers pay 40–60% of US list prices and prefer flat yearly plans.
const TIERS = {
  pilot: { name: 'Pilot', fee: 0, agents: 2, actions: 10000 },
  starter: { name: 'Starter', fee: 9999, agents: 5, actions: 100000 },
  growth: { name: 'Growth', fee: 49999, agents: 25, actions: 1000000 },
  enterprise: { name: 'Enterprise', fee: 199999, agents: 100, actions: 5000000 },
};
const RISK = { low: 1, medium: 1.5, high: 2 };
const A = 1000; // ₹ per extra agent per month, before risk multiplier
const C_OVER = 0.005; // ₹ per governed action above the plan (₹5 per 1,000)
// checkpoints and phone approvals are never metered: a company should never pay more for being careful

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

export default function BusinessPage() {
  const [tier, setTier] = useState<keyof typeof TIERS>('growth');
  const [agents, setAgents] = useState({ low: 5, medium: 7, high: 8 });
  const [actions, setActions] = useState(800000);
  const [llm, setLlm] = useState(0);

  const T = TIERS[tier];
  const totalAgents = agents.low + agents.medium + agents.high;
  // extra agents are charged from the riskiest down, because risk is what governance costs
  let extra = Math.max(0, totalAgents - T.agents);
  let agentFee = 0;
  for (const k of ['high', 'medium', 'low'] as const) {
    const n = Math.min(extra, agents[k]);
    agentFee += n * A * RISK[k];
    extra -= n;
  }
  const over = Math.max(0, actions - T.actions);
  const overFee = over * C_OVER;
  const llmFee = llm * 1.1;
  const bill = T.fee + agentFee + overFee + llmFee;

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">
            The problem, the price, <em>the field</em>
          </h1>
          <p className="page-sub">Abhed is sold as a flat plan for predictability, with a free Pilot to test on your own data. Usage grows only with the number of agents, how risky they are, and volume. Checkpoints and phone approvals are never charged.</p>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 14 }}>
        <div className="panel-title">
          <span>
            <b>Major problems</b> companies hit when agents start doing real work
          </span>
        </div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
          {PROBLEMS.map(([t, d], i) => (
            <div key={t} style={{ borderTop: '1px solid var(--border-soft)', paddingTop: 10 }}>
              <div className="mono dim" style={{ fontSize: 11 }}>
                0{i + 1}
              </div>
              <div style={{ fontWeight: 500, margin: '2px 0 4px' }}>{t}</div>
              <div className="muted" style={{ fontSize: 12.5 }}>
                {d}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', marginBottom: 14, alignItems: 'start' }}>
        <div className="panel">
          <div className="panel-title">
            <span>
              <b>Usage formula</b> · monthly bill
            </span>
          </div>
          <div className="price-eq">
            Bill = P<sub>plan</sub>
            <br />
            &nbsp;&nbsp;+ Σ<sub>extra agents i</sub> ₹1,000 × r<sub>i</sub>
            <br />
            &nbsp;&nbsp;+ ₹5 per 1,000 governed actions above the plan
            <br />
            &nbsp;&nbsp;+ ₹0 for checkpoints and phone approvals, always
            <br />
            &nbsp;&nbsp;+ LLM tokens at cost + 10% (optional; or bring your own key)
          </div>
          <table className="table" style={{ marginTop: 10, fontSize: 12.5 }}>
            <tbody>
              <tr>
                <td className="mono">P</td>
                <td>Pilot free (2 agents, 10,000 actions) · Starter ₹9,999 (5 agents, 1 lakh) · Growth ₹49,999 (25 agents, 10 lakh) · Enterprise ₹1,99,999 (100 agents, 50 lakh, private cloud or on-premise)</td>
              </tr>
              <tr>
                <td className="mono">r</td>
                <td>Risk of an extra agent: 1.0 read-only (₹1,000) · 1.5 writes inside limits (₹1,500) · 2.0 money, health data or prices (₹2,000)</td>
              </tr>
              <tr>
                <td className="mono">₹0</td>
                <td>Checkpoints, phone approvals, escalations, audit PDFs and the signed ledger are never metered</td>
              </tr>
              <tr>
                <td className="mono">GST</td>
                <td>Prices exclude 18% GST. Yearly billing: pay for 10 months, get 12</td>
              </tr>
            </tbody>
          </table>
          <p className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>
            Why this shape: Indian buyers prefer a predictable flat plan, so the plan covers almost everything. Usage only grows with agents and volume, never with safety: a company should never pay more because a person checked something. For scale, AWS AgentCore Policy lists about $0.025 per 1,000 checks, Microsoft Agent 365 $15 per user a month, and third-party estimates put IBM watsonx.governance at $3,500–6,500 a month.
          </p>
        </div>

        <div className="panel">
          <div className="panel-title">
            <span>
              <b>Calculator</b>
            </span>
          </div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
            <label className="field" style={{ gridColumn: 'span 3' }}>
              Plan
              <select value={tier} onChange={(e) => setTier(e.target.value as keyof typeof TIERS)}>
                {Object.entries(TIERS).map(([k, t]) => (
                  <option key={k} value={k}>
                    {t.name} · {inr(t.fee)}/mo · {t.agents} agents · {t.actions.toLocaleString('en-IN')} actions
                  </option>
                ))}
              </select>
            </label>
            {(['low', 'medium', 'high'] as const).map((k) => (
              <label key={k} className="field">
                {k} risk agents
                <input inputMode="numeric" value={agents[k]} onChange={(e) => setAgents({ ...agents, [k]: Math.max(0, Number(e.target.value.replace(/\D/g, '')) || 0) })} />
              </label>
            ))}
            <label className="field" style={{ gridColumn: 'span 3' }}>
              Governed actions / month
              <input inputMode="numeric" value={actions} onChange={(e) => setActions(Math.max(0, Number(e.target.value.replace(/\D/g, '')) || 0))} />
            </label>
            <label className="field" style={{ gridColumn: 'span 3' }}>
              LLM tokens through the gateway (₹ at cost)
              <input inputMode="numeric" value={llm} onChange={(e) => setLlm(Math.max(0, Number(e.target.value.replace(/\D/g, '')) || 0))} />
            </label>
          </div>
          <table className="table" style={{ marginTop: 12 }}>
            <tbody>
              <Row k={`Platform (${T.name})`} v={T.fee} />
              <Row k={`Extra agents: ${Math.max(0, totalAgents - T.agents)} (risk-weighted)`} v={agentFee} />
              <Row k={`Actions above the plan: ${over.toLocaleString('en-IN')} × ₹0.005`} v={overFee} />
              <Row k="Checkpoints and phone approvals (unlimited)" v={0} />
              <Row k="LLM gateway (cost + 10%)" v={llmFee} />
              <tr>
                <td>
                  <b>Monthly bill</b>
                </td>
                <td className="r">
                  <b style={{ fontSize: 20 }}>{inr(bill)}</b>
                </td>
              </tr>
            </tbody>
          </table>
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            {totalAgents} agents · {inr(bill / Math.max(1, totalAgents))} per agent · ₹{(bill / Math.max(1, actions)).toFixed(3)} per governed action · {inr(bill * 10)} a year on yearly billing (+18% GST). One stopped ₹40,000 wrong refund covers {bill > 0 ? `${Math.round((40000 / bill) * 100)}%` : 'all'} of this bill.
          </div>
        </div>
      </div>

      <div className="panel" style={{ overflowX: 'auto' }}>
        <div className="panel-title">
          <span>
            <b>How Abhed compares</b> · positioning from public product descriptions
          </span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Main focus</th>
              <th>Gate on each agent action</th>
              <th>Human approval on phone</th>
              <th>Hallucination / grounding</th>
              <th>Tamper-proof trail</th>
              <th>Vendor-neutral</th>
            </tr>
          </thead>
          <tbody>
            {COMPETITORS.map((c, i) => (
              <tr key={c[0]} style={i === 0 ? { background: 'rgba(111, 224, 180, 0.05)' } : undefined}>
                {c.map((x, j) => (
                  <td key={j} style={{ fontWeight: j === 0 ? 500 : 400, color: j > 1 && x.startsWith('✓') ? 'var(--allow)' : j > 1 && x === '—' ? 'var(--muted-2)' : undefined, fontSize: 12.5 }}>
                    {x}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>
          The large platforms govern models, identities or their own cloud. Guardrail libraries filter text. Abhed governs the business action itself, for any model and any framework: the refund, the prescription, the price. It names the person who allowed it, and the proof sits outside the company’s own database. That is the gap.
        </p>
      </div>
    </main>
  );
}

function Row({ k, v }: { k: string; v: number }) {
  return (
    <tr>
      <td className="muted" style={{ fontSize: 12.5 }}>
        {k}
      </td>
      <td className="r">{inr(v)}</td>
    </tr>
  );
}
