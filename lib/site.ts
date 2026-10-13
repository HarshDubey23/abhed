/** People shown on the About page. Add teammates here; nothing else needs to change. */
export const TEAM: { name: string; role: string; note: string; did: string[]; areas: string[] }[] = [
  {
    name: 'Harsh Dubey',
    role: 'AI security, guardrails & backend',
    note: 'Owns the part of Abhed that says yes or no. Every action an agent wants to take passes through the gate he built, and the decision is made by rules, not by another model that could be talked out of them.',
    did: [
      'The deterministic rulebook and the gateway that checks every tool call in about a millisecond',
      'Guardrails against prompt injection, bulk data export, destructive and privilege-changing actions',
      'The no-code AI gateway: companies connect with only a base URL and a key',
      'The backend: accounts, sessions, the hash-chained ledger and the APIs behind every screen',
    ],
    areas: ['AI security', 'Guardrails', 'Gateway & connections', 'Backend'],
  },
  {
    name: 'Naitik Gupta',
    role: 'Frontend, testing & deployment',
    note: 'Makes Abhed something a person can actually use, and makes sure it keeps working. Built the screens judges and companies see, tested each flow end to end, and put the whole system live.',
    did: [
      'The fleet monitor, command center, connect page and the approver app people use on their phones',
      'Light and dark themes, phone layouts and the checks that keep text from overlapping on any screen',
      'End-to-end tests of the demo flows: a held refund, an approval on the phone, a blocked export',
      'Deployment of the app and the three demo company websites',
    ],
    areas: ['Frontend', 'UI', 'Testing', 'Deployment'],
  },
  {
    name: 'Naman Verma',
    role: 'Backend & presentation',
    note: 'Works on how data moves between the agents, the gate and the people who approve, and explains the system so that anyone can follow it in a few minutes.',
    did: [
      'Backend services and APIs for agents, approvals and the company websites',
      'The data flow from an agent’s request to a recorded decision',
      'The presentation deck: the problem, how Abhed works and the live demo story',
    ],
    areas: ['Backend', 'APIs', 'Pitch deck'],
  },
  {
    name: 'Riya Mishra',
    role: 'Research & architecture',
    note: 'Started from the question of where AI agents actually go wrong in companies, and designed the architecture so the gate sits exactly where an agent’s decision turns into an action.',
    did: [
      'Research on real failure modes of AI agents: wrong amounts, hidden instructions, data leaving the company',
      'What accountability regulators and auditors expect, and how the ledger proves it',
      'The system architecture: gateway, rulebook, human approval and tamper-evident records',
    ],
    areas: ['Research', 'System architecture', 'Compliance'],
  },
  {
    name: 'Manshi Chaudhary',
    role: 'Market, go-to-market & pricing',
    note: 'Answers who needs Abhed, why now and what they would pay. Turned the product into a business case that a bank, a hospital or an online store can say yes to.',
    did: [
      'Market gap analysis: what existing AI governance tools miss and who is left without one',
      'The go-to-market plan: first customers, sectors and how a pilot starts',
      'The pricing model: per agent each month, by risk level, so the price grows with the value',
    ],
    areas: ['Market gap analysis', 'Go-to-market', 'Pricing'],
  },
];
export const UPDATED = '13 October 2026';
