import { appendLedger } from './engine';
import type { Agent, Customer, Human, LedgerRecord, Rule, Ticket, World } from './types';
import { mulberry32 } from './util';

const DAY = 86_400_000;

import { POISONED_TICKET, REX_TICKET } from './tickets';

export { POISONED_TICKET, REX_TICKET };

function humans(): Human[] {
  return [
    { id: 'priya', name: 'Priya Menon', title: 'CX Lead', roles: ['agent_owner'] },
    { id: 'arjun', name: 'Arjun Rao', title: 'Ops Manager', roles: ['rule_author', 'approver_l1', 'operator'] },
    { id: 'isha', name: 'Isha Verma', title: 'Support Operator', roles: ['operator'] },
    { id: 'meera', name: 'Meera Iyer', title: 'Head of Risk', roles: ['rule_approver', 'approver_l2'] },
    { id: 'karan', name: 'Karan Shah', title: 'Sales Head', roles: ['agent_owner'] },
    { id: 'dev', name: 'Dev Malhotra', title: 'IT Ops Lead', roles: ['agent_owner', 'approver_l1'] },
    { id: 'judge', name: 'Guest Judge', title: 'Guest approver (on their phone)', roles: ['approver_l1', 'approver_l2', 'rule_approver'] },
  ];
}

function agents(): Agent[] {
  const base = { tasksToday: 0, autoHandledToday: 0, costToday: 0, valueToday: 0, keyRevoked: false, spentToday: 0 };
  return [
    {
      ...base,
      id: 'rex',
      name: 'Rex',
      owner: 'priya',
      purpose: 'Refunds and disputes',
      framework: 'Kavach SDK · Node tool-loop',
      model: 'llama-3.3-70b (via Kavach LLM gateway)',
      modelVersion: 'v2026-09',
      risk: 'HIGH',
      autonomy: 'L3',
      status: 'ACTIVE',
      delegations: [
        { action: 'issue_refund', maxPerAction: 10000, maxPerDay: 500000, grantedBy: 'priya', expiresDays: 30 },
        { action: 'read_customer', grantedBy: 'priya', expiresDays: 30 },
        { action: 'send_email', grantedBy: 'priya', expiresDays: 30 },
      ],
      dataScopes: ['customer_profile (masked)', 'transactions', 'beneficiary'],
      budgetInr: 600,
    },
    {
      ...base,
      id: 'aria',
      name: 'Aria',
      owner: 'priya',
      purpose: 'Customer support (WhatsApp, app)',
      framework: 'Kavach SDK · Node tool-loop',
      model: 'llama-3.1-8b (via Kavach LLM gateway)',
      modelVersion: 'v2026-08',
      risk: 'HIGH',
      autonomy: 'L3',
      status: 'ACTIVE',
      delegations: [
        { action: 'issue_refund', maxPerAction: 2000, maxPerDay: 20000, grantedBy: 'priya', expiresDays: 30 },
        { action: 'send_email', grantedBy: 'priya', expiresDays: 30 },
      ],
      dataScopes: ['ticket text', 'customer_profile (masked)'],
      budgetInr: 500,
    },
    {
      ...base,
      id: 'nova',
      name: 'Nova',
      owner: 'karan',
      purpose: 'Sales outreach drafts',
      framework: 'Kavach SDK · Node tool-loop',
      model: 'llama-3.1-8b (via Kavach LLM gateway)',
      modelVersion: 'v2026-07',
      risk: 'MEDIUM',
      autonomy: 'L2',
      status: 'ACTIVE',
      delegations: [{ action: 'send_email', grantedBy: 'karan', expiresDays: 14 }],
      dataScopes: ['CRM leads'],
      budgetInr: 300,
    },
    {
      ...base,
      id: 'sage',
      name: 'Sage',
      owner: 'meera',
      purpose: 'Risk analytics reports',
      framework: 'Kavach SDK · Node tool-loop',
      model: 'llama-3.3-70b (via Kavach LLM gateway)',
      modelVersion: 'v2026-06',
      risk: 'HIGH',
      autonomy: 'L2',
      status: 'ACTIVE',
      delegations: [{ action: 'export_report', grantedBy: 'meera', expiresDays: 30 }],
      dataScopes: ['aggregates only'],
      budgetInr: 400,
    },
    {
      ...base,
      id: 'atlas',
      name: 'Atlas',
      owner: 'dev',
      purpose: 'IT operations',
      framework: 'Kavach SDK · Node tool-loop',
      model: 'llama-3.1-8b (via Kavach LLM gateway)',
      modelVersion: 'v2026-09',
      risk: 'CRITICAL',
      autonomy: 'L2',
      status: 'ACTIVE',
      delegations: [{ action: 'restart_service', grantedBy: 'dev', expiresDays: 7 }],
      dataScopes: ['service logs'],
      budgetInr: 350,
    },
  ];
}

function customers(): Customer[] {
  return [
    { id: 'C-2210', name: 'Mrs. Sunita Sharma', tier: 'standard', kyc: 'verified', accountChangedDaysAgo: 2, upi: 'sunita.s@okaxis', pan: 'ABCPS1234F', phone: '9810012345', email: 'sunita.sharma@gmail.com' },
    { id: 'C-1029', name: 'Mr. Rohit Kapoor', tier: 'VIP', kyc: 'verified', accountChangedDaysAgo: 412, upi: 'rohitk@oksbi', pan: 'BXKPK7781L', phone: '9899001122', email: 'rohit.kapoor@outlook.com' },
    { id: 'C-3341', name: 'Ananya Iyer', tier: 'standard', kyc: 'verified', accountChangedDaysAgo: 290, upi: 'ananya.i@okicici', pan: 'CQRPI4410A', phone: '9820033311', email: 'ananya.iyer@gmail.com' },
    { id: 'C-4410', name: 'Farhan Qureshi', tier: 'standard', kyc: 'verified', accountChangedDaysAgo: 180, upi: 'farhanq@ybl', pan: 'DFHPQ9921K', phone: '9811022233', email: 'farhan.q@yahoo.in' },
    { id: 'C-5012', name: 'Kavya Nair', tier: 'VIP', kyc: 'verified', accountChangedDaysAgo: 760, upi: 'kavya.n@okhdfc', pan: 'EKNPN2201M', phone: '9840055566', email: 'kavya.nair@gmail.com' },
    { id: 'C-6120', name: 'Vikram Singh', tier: 'standard', kyc: 'pending', accountChangedDaysAgo: 95, upi: 'vikram.s@paytm', pan: 'FVSPS6612Q', phone: '9873399001', email: 'vikram.singh@rediffmail.com' },
  ];
}

function rules(now: number): Rule[] {
  const r = (x: Omit<Rule, 'createdAt' | 'active'> & { active?: boolean; ageDays?: number }): Rule => ({
    active: true,
    ...x,
    createdAt: now - (x.ageDays ?? 60) * DAY,
  });
  return [
    r({ id: 'REFUND-AUTO', version: 2, says: 'Refunds up to ₹5,000 can be done automatically by an authorised agent.', when: { action: 'issue_refund', amount_lte: 5000 }, decision: 'ALLOWED', author: 'arjun', approvedBy: 'meera', active: false, ageDays: 120 }),
    r({ id: 'REFUND-AUTO', version: 3, says: 'Refunds up to ₹10,000 can be done automatically by an authorised agent.', when: { action: 'issue_refund', amount_lte: 10000 }, decision: 'ALLOWED', author: 'arjun', approvedBy: 'meera', ageDays: 45 }),
    r({ id: 'REFUND-L1', version: 2, says: 'Refunds over ₹10,000 need a Level-1 approver.', when: { action: 'issue_refund', amount_gt: 10000, amount_lte: 50000 }, decision: 'NEEDS_APPROVAL', approverRole: 'approver_l1', author: 'arjun', approvedBy: 'meera' }),
    r({ id: 'REFUND-L2-TWO-KEY', version: 1, says: 'Refunds over ₹50,000 need two Level-2 approvers, and never the agent’s own owner.', when: { action: 'issue_refund', amount_gt: 50000 }, decision: 'NEEDS_APPROVAL', approverRole: 'approver_l2', twoKey: 2, ownerCannotApprove: true, author: 'arjun', approvedBy: 'meera' }),
    r({ id: 'NO-DATA-LEAK', version: 1, says: 'If a task has read outside content and touched customer data, nothing may be sent outside the bank.', when: { action: 'send_email', external: true, session_untrusted: true, session_customer_data: true }, decision: 'BLOCKED', severity: 'critical', author: 'meera', approvedBy: 'arjun' }),
    r({ id: 'BULK-EXPORT', version: 1, says: 'No agent may export more than 100 customer records.', when: { action: 'export_customers', records_gt: 100, actor_type: 'agent' }, decision: 'BLOCKED', severity: 'critical', author: 'meera', approvedBy: 'arjun' }),
    r({ id: 'DESTRUCTIVE-OPS', version: 1, says: 'Agents can never delete production data.', when: { actionIn: ['delete_records', 'drop_table'], actor_type: 'agent' }, decision: 'BLOCKED', severity: 'critical', author: 'dev', approvedBy: 'meera' }),
    r({ id: 'EMAIL-REPLY', version: 1, says: 'An agent may email the customer who raised the ticket.', when: { action: 'send_email', external: false }, decision: 'ALLOWED', author: 'arjun', approvedBy: 'meera' }),
    r({ id: 'EMAIL-OUTREACH', version: 1, says: 'Outbound email is allowed only if the task has not read outside content.', when: { action: 'send_email', external: true, session_untrusted: false }, decision: 'ALLOWED', author: 'karan', approvedBy: 'meera' }),
    r({ id: 'PROD-CHANGE', version: 1, says: 'Restarting a production service needs a Level-1 approver.', when: { action: 'restart_service' }, decision: 'NEEDS_APPROVAL', approverRole: 'approver_l1', author: 'dev', approvedBy: 'meera' }),
    r({ id: 'RULE-CHANGE-TWO-PERSON', version: 1, says: 'Changing or adding a rule needs a second person. The author can’t approve it, and agents can never change rules.', when: { action: 'rule_change' }, decision: 'NEEDS_APPROVAL', approverRole: 'rule_approver', ownerCannotApprove: true, author: 'meera', approvedBy: 'arjun' }),
  ];
}

function tickets(now: number): Ticket[] {
  const t = (id: string, subject: string, customerId: string, channel: Ticket['channel'], type: string, lane: Ticket['lane'], assignee: string, why: string, extra: Partial<Ticket> = {}): Ticket => ({
    id, subject, customerId, channel, type, lane, assignee, why, vip: false, slaMins: 240, createdAt: now - 40 * 60_000, text: subject, source: 'seed', ...extra,
  });
  const ariaSubjects = [
    'Password reset', 'Statement copy', 'Address change', 'Card not received', 'UPI limit query', 'Cheque book request',
    'Debit card block', 'Interest certificate', 'Nominee update', 'Email update', 'KYC re-upload', 'FD maturity query', 'Mini statement',
  ];
  const list: Ticket[] = [
    t('#8811', 'Charged twice for home-loan EMI', 'C-1029', 'App', 'refund', 'AGENT', 'rex', 'Routine refund · confidence 0.92', { vip: true, text: REX_TICKET, slaMins: 60, reserved: true }),
    t('#8820', 'Refund ₹2,000 failed UPI', 'C-3341', 'WhatsApp', 'refund', 'AGENT', 'rex', 'Within delegation · confidence 0.95'),
    t('#8812', 'Address change request', 'C-6120', 'WhatsApp', 'address', 'AGENT', 'aria', 'Routine · confidence 0.88', { text: POISONED_TICKET, reserved: true }),
    ...ariaSubjects.map((s, i) =>
      t(`#88${21 + i}`, s, ['C-3341', 'C-4410', 'C-5012', 'C-6120'][i % 4], (['WhatsApp', 'App', 'Email'] as const)[i % 3], 'support', i % 4 === 0 ? 'AGENT_REVIEW' : 'AGENT', 'aria', i % 4 === 0 ? 'Aria drafts · Isha reviews (customer data change)' : 'Routine · confidence 0.9'),
    ),
    t('#8816', 'VIP complaint: branch service', 'C-5012', 'Branch', 'complaint', 'HUMAN', 'isha', 'AI confidence 0.41 + VIP → person', { vip: true, slaMins: 30 }),
    t('#8790', 'Chargeback dispute ₹18,400', 'C-4410', 'Phone', 'chargeback', 'ESCALATED', 'arjun', 'SLA missed → L2 Arjun'),
    t('#8802', 'CRM timeout during sync', 'C-3341', 'App', 'ops', 'EXCEPTION', 'atlas', 'Tool failure · owner Dev · retry 2/3 failed'),
  ];
  return list;
}

/** Deterministic NovaBank: 30 days of history through the same ledger, seed 42. */
export function seedWorld(now = Date.now()): World {
  const w: World = {
    version: 0,
    seededAt: now,
    company: 'NovaBank (fictional)',
    humans: humans(),
    agents: agents(),
    customers: customers(),
    customerCount: 1206,
    rules: rules(now),
    approvals: [],
    ledger: [],
    tickets: tickets(now),
    incidents: [],
    oversight: [],
    unregistered: [],
    agentTrace: [],
    counters: { approval: 911, incident: 41, ticket: 8840 },
    humanMinutesToday: 0,
  };

  const rand = mulberry32(42);
  type Ev = Omit<LedgerRecord, 'seq' | 'prevHash' | 'hash'>;
  const evs: Ev[] = [];
  const custIds = ['C-3341', 'C-4410', 'C-5012', 'C-6120', 'C-1029'];
  const custName: Record<string, string> = Object.fromEntries(w.customers.map((c) => [c.id, c.name]));
  const owners: Record<string, string> = { rex: 'Priya Menon', aria: 'Priya Menon', nova: 'Karan Shah', sage: 'Meera Iyer', atlas: 'Dev Malhotra' };
  const names: Record<string, string> = { rex: 'Rex', aria: 'Aria', nova: 'Nova', sage: 'Sage', atlas: 'Atlas' };
  let ticketNo = 7000;

  const base = (agentId: string, ts: number, action: string, params: Record<string, unknown>, extra: Partial<Ev> = {}): Ev => ({
    ts,
    actorType: 'agent',
    actorId: agentId,
    actorName: names[agentId],
    onBehalfOf: owners[agentId],
    action,
    params,
    dataTouched: [],
    decision: 'ALLOWED',
    reason: 'Low-impact action inside the agent’s purpose.',
    approvers: [],
    outcome: 'confirmed',
    cost: Number((0.3 + rand() * 1.4).toFixed(2)),
    ...extra,
  });

  const refund = (ts: number, amount: number, cust: string, bdays: number, outcome: LedgerRecord['outcome'] = 'confirmed', ticketId?: string, subject?: string): Ev => {
    const tid = ticketId ?? `#${ticketNo++}`;
    return base('rex', ts, 'issue_refund', { amount, customer: cust, to_account: 'own' }, {
      decision: 'ALLOWED',
      ruleRef: amount <= 10000 ? 'REFUND-AUTO@3' : 'REFUND-L1@2',
      reason: 'Refunds up to ₹10,000 can be done automatically by an authorised agent.',
      dataTouched: ['customer_profile', 'transactions', 'beneficiary'],
      outcome,
      ticketId: tid,
      meta: { amount, beneficiaryChangedDays: bdays, customer: cust, customerName: custName[cust], ticketSubject: subject ?? 'Refund request', value: 90, desc: `Rex → refund ₹${amount.toLocaleString('en-IN')}` },
    });
  };

  // 30 days of ordinary work
  for (let d = 30; d >= 1; d--) {
    const dayStart = now - d * DAY - 10 * 3_600_000;
    const n = 7 + Math.floor(rand() * 5);
    for (let i = 0; i < n; i++) {
      const ts = dayStart + Math.floor(rand() * 9 * 3_600_000);
      const pick = rand();
      if (pick < 0.22) {
        const amt = Math.round((800 + rand() * 8700) / 50) * 50;
        evs.push(refund(ts, amt, custIds[Math.floor(rand() * custIds.length)], 90 + Math.floor(rand() * 700)));
      } else if (pick < 0.5) {
        evs.push(base('aria', ts, rand() < 0.5 ? 'read_ticket' : 'draft_reply', { ticket: `#${ticketNo++}` }, { meta: { value: 40 } }));
      } else if (pick < 0.68) {
        evs.push(base('nova', ts, 'draft_email', { lead: `L-${Math.floor(rand() * 900 + 100)}` }, { meta: { value: 75 } }));
      } else if (pick < 0.8) {
        evs.push(base('sage', ts, 'export_report', { report: 'NPA weekly', rows: 'aggregate' }, { dataTouched: ['aggregates only'], meta: { value: 140 } }));
      } else {
        evs.push(base('atlas', ts, rand() < 0.6 ? 'health_check' : 'read_logs', { service: 'upi-gateway' }, { meta: { value: 30 } }));
      }
    }
    // occasional large refund approved by a person
    if (d % 6 === 0) {
      const amt = 15000 + Math.round(rand() * 25) * 1000;
      evs.push(
        base('rex', dayStart + 5 * 3_600_000, 'issue_refund', { amount: amt, customer: 'C-5012', to_account: 'own' }, {
          decision: 'EXECUTED',
          ruleRef: 'REFUND-L1@2',
          reason: 'Approved by Arjun Rao for exactly this action.',
          approvers: ['Arjun Rao'],
          dataTouched: ['customer_profile', 'transactions', 'beneficiary'],
          outcome: 'confirmed',
          ticketId: `#${ticketNo++}`,
          meta: { amount: amt, beneficiaryChangedDays: 760, customer: 'C-5012', customerName: 'Kavya Nair', value: 90 },
        }),
      );
    }
  }

  // three legitimate refunds to recently changed accounts (they were fine)
  evs.push(refund(now - 25 * DAY, 3200, 'C-3341', 12));
  evs.push(refund(now - 17 * DAY, 6400, 'C-4410', 21));
  evs.push(refund(now - 9 * DAY, 1850, 'C-6120', 6));

  // Mrs. Sharma: allowed by REFUND-AUTO v3, no approver; beneficiary changed the day before
  evs.push(refund(now - 20 * 3_600_000, 8000, 'C-2210', 1, 'pending', '#7741', 'Refund of failed bill payment'));

  // today: steady agent work so the dashboard is alive
  for (let i = 0; i < 46; i++) {
    const ts = now - 14 * 3_600_000 + i * 17 * 60_000 + Math.floor(rand() * 60_000);
    const pick = i % 6;
    if (pick === 0) evs.push(refund(ts, Math.round((900 + rand() * 6000) / 50) * 50, custIds[i % 4], 200 + i));
    else if (pick === 1 || pick === 2) evs.push(base('aria', ts, pick === 1 ? 'read_ticket' : 'draft_reply', { ticket: `#${ticketNo++}` }, { meta: { value: 40 } }));
    else if (pick === 3) evs.push(base('nova', ts, 'draft_email', { lead: `L-${300 + i}` }, { meta: { value: 75 } }));
    else if (pick === 4) evs.push(base('sage', ts, 'export_report', { report: 'Collections daily', rows: 'aggregate' }, { dataTouched: ['aggregates only'], meta: { value: 140 } }));
    else evs.push(base('atlas', ts, 'health_check', { service: 'core-banking' }, { meta: { value: 30 } }));
  }
  // one human-held action today
  evs.push(
    base('atlas', now - 3 * 3_600_000, 'restart_service', { service: 'upi-gateway', env: 'production' }, {
      decision: 'EXECUTED',
      ruleRef: 'PROD-CHANGE@1',
      reason: 'Approved by Dev Malhotra for exactly this action.',
      approvers: ['Dev Malhotra'],
      meta: { value: 400 },
    }),
  );

  evs.sort((a, b) => a.ts - b.ts);
  for (const e of evs) appendLedger(w, e);

  // Rex's spend today for delegation math
  const rex = w.agents.find((a) => a.id === 'rex')!;
  rex.spentToday = w.ledger
    .filter((r) => r.actorId === 'rex' && r.action === 'issue_refund' && now - r.ts < DAY)
    .reduce((s, r) => s + Number(r.meta?.amount ?? 0), 0);
  return w;
}
