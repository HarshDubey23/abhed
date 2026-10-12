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

const TIERS = {
  starter: { name: 'Starter', fee: 15000, agents: 5, actions: 50000 },
  growth: { name: 'Growth', fee: 75000, agents: 25, actions: 500000 },
  enterprise: { name: 'Enterprise', fee: 250000, agents: 100, actions: 3000000 },
};
const RISK = { low: 1, medium: 1.5, high: 2.5 };
const A = 2000; // ₹ per extra agent per month, before risk multiplier
const C_LOW = 0.02; // ₹ per low-impact action above quota
const C_HIGH = 2; // ₹ per high-impact action checkpointed
const C_APPR = 10; // ₹ per human approval routed to a phone

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

export default function BusinessPage() {
  const [tier, setTier] = useState<keyof typeof TIERS>('growth');
  const [agents, setAgents] = useState({ low: 10, medium: 12, high: 8 });
  const [actions, setActions] = useState(800000);
  const [highPct, setHighPct] = useState(4);
  const [apprPct, setApprPct] = useState(40);
  const [llm, setLlm] = useState(60000);

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
  const high = Math.round((actions * highPct) / 100);
  const low = actions - high;
  const lowFee = Math.max(0, low - T.actions) * C_LOW;
  const highFee = high * C_HIGH;
  const approvals = Math.round((high * apprPct) / 100);
  const apprFee = approvals * C_APPR;
  const llmFee = llm * 1.1;
  const bill = T.fee + agentFee + lowFee + highFee + apprFee + llmFee;

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">
            The problem, the price, <em>the field</em>
          </h1>
          <p className="page-sub">Abhed is sold as a hybrid: a platform subscription for predictability, plus usage that grows with the number of agents, how risky they are, and how much high-impact work they do.</p>
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
            Bill = P<sub>tier</sub>
            <br />
            &nbsp;&nbsp;+ Σ<sub>extra agents i</sub> A × r<sub>i</sub>
            <br />
            &nbsp;&nbsp;+ c<sub>low</sub> × max(0, N<sub>low</sub> − Q<sub>tier</sub>)
            <br />
            &nbsp;&nbsp;+ c<sub>high</sub> × N<sub>high</sub>
            <br />
            &nbsp;&nbsp;+ c<sub>appr</sub> × N<sub>approvals</sub>
            <br />
            &nbsp;&nbsp;+ 1.10 × LLM tokens at cost (optional gateway)
          </div>
          <table className="table" style={{ marginTop: 10, fontSize: 12.5 }}>
            <tbody>
              <tr>
                <td className="mono">P, Q</td>
                <td>Platform fee and included low-impact actions: Starter ₹15,000 (5 agents, 50k), Growth ₹75,000 (25 agents, 5 lakh), Enterprise ₹2,50,000 (100 agents, 30 lakh)</td>
              </tr>
              <tr>
                <td className="mono">A × r</td>
                <td>₹2,000 per agent above the plan × risk multiplier r: low 1.0 (read-only), medium 1.5 (writes inside limits), high 2.5 (money, health data, prices)</td>
              </tr>
              <tr>
                <td className="mono">c_low</td>
                <td>₹0.02 per low-impact governed action above the quota (reads, in-limit writes)</td>
              </tr>
              <tr>
                <td className="mono">c_high</td>
                <td>₹2 per high-impact action evaluated at a checkpoint (grounding, DLP, rules, hash)</td>
              </tr>
              <tr>
                <td className="mono">c_appr</td>
                <td>₹10 per human approval routed (push to phone, evidence pack, escalation, two-key)</td>
              </tr>
            </tbody>
          </table>
          <p className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>
            Why hybrid, not pure subscription or pure usage: the platform fee covers the fixed cost (rulebook, registry, audit, anchoring) and gives finance a predictable base. Usage is priced on what actually costs us and creates value for the customer: risky agents and high-impact actions. Cheap reads stay nearly free, so governing everything never punishes speed.
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
            <label className="field">
              Actions / month
              <input inputMode="numeric" value={actions} onChange={(e) => setActions(Math.max(0, Number(e.target.value.replace(/\D/g, '')) || 0))} />
            </label>
            <label className="field">
              High-impact %
              <input inputMode="numeric" value={highPct} onChange={(e) => setHighPct(Math.min(100, Math.max(0, Number(e.target.value) || 0)))} />
            </label>
            <label className="field">
              of those, need a person %
              <input inputMode="numeric" value={apprPct} onChange={(e) => setApprPct(Math.min(100, Math.max(0, Number(e.target.value) || 0)))} />
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
              <Row k={`Low-impact above quota: ${Math.max(0, low - T.actions).toLocaleString('en-IN')} × ₹0.02`} v={lowFee} />
              <Row k={`High-impact checkpoints: ${high.toLocaleString('en-IN')} × ₹2`} v={highFee} />
              <Row k={`Phone approvals: ${approvals.toLocaleString('en-IN')} × ₹10`} v={apprFee} />
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
            {totalAgents} agents · {inr(bill / Math.max(1, totalAgents))} per agent · {(bill / Math.max(1, actions)).toFixed(3)} ₹ per governed action. One prevented ₹40,000 wrong refund pays for {Math.max(0, Math.floor(40000 / Math.max(1, bill / Math.max(1, actions))))} governed actions.
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
