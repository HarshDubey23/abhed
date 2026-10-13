/** People shown on the About page. Add teammates here; nothing else needs to change. */
export const TEAM: { name: string; role: string; note: string; areas: string[] }[] = [
  {
    name: 'Harsh Dubey',
    role: 'AI security, guardrails & backend',
    note: 'Built the gate every agent action passes through: the rulebook, the guardrails against prompt injection and unsafe actions, the gateway that companies connect their agents to, and the backend behind it.',
    areas: ['AI security', 'Guardrails', 'Gateway & connections', 'Backend'],
  },
  {
    name: 'Naitik Gupta',
    role: 'Frontend, testing & deployment',
    note: 'Shaped the screens people actually use, from the fleet monitor to the approver app, tested every flow so a demo never breaks in front of a judge, and shipped it live to production.',
    areas: ['Frontend', 'UI', 'Testing', 'Deployment'],
  },
  {
    name: 'Naman Verma',
    role: 'Backend & presentation',
    note: 'Worked on the backend services and data flow, and turned the system into the deck that explains it in a few minutes.',
    areas: ['Backend', 'APIs', 'Pitch deck'],
  },
  {
    name: 'Riya Mishra',
    role: 'Research & architecture',
    note: 'Researched how AI agents fail in real companies and how regulators expect accountability, and drew the architecture that puts a gate between the agent’s decision and the action.',
    areas: ['Research', 'System architecture', 'Compliance'],
  },
  {
    name: 'Manshi Chaudhary',
    role: 'Market, go-to-market & pricing',
    note: 'Mapped the market gap, who buys agent governance and why now, and built the go-to-market plan and the per-agent, risk-based pricing behind it.',
    areas: ['Market gap analysis', 'Go-to-market', 'Pricing'],
  },
];
export const UPDATED = '13 October 2026';
