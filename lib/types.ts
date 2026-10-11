export type Role =
  | 'agent_owner'
  | 'rule_author'
  | 'rule_approver'
  | 'operator'
  | 'approver_l1'
  | 'approver_l2'
  | 'executive'
  | 'auditor';

export type Risk = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AgentStatus = 'ACTIVE' | 'RESTRICTED' | 'PAUSED';
export type Decision = 'ALLOWED' | 'NEEDS_APPROVAL' | 'BLOCKED';

export interface Human {
  id: string;
  name: string;
  title: string;
  roles: Role[];
}

export interface Delegation {
  action: string;
  maxPerAction?: number;
  maxPerDay?: number;
  ownQueueOnly?: boolean;
  grantedBy: string; // human id
  expiresDays: number;
}

export interface Agent {
  id: string;
  name: string;
  owner: string; // human id
  purpose: string;
  framework: string;
  model: string;
  modelVersion: string;
  risk: Risk;
  autonomy: 'L1' | 'L2' | 'L3' | 'L4';
  status: AgentStatus;
  statusReason?: string;
  statusBy?: string;
  delegations: Delegation[];
  dataScopes: string[];
  tasksToday: number;
  autoHandledToday: number;
  costToday: number; // INR
  valueToday: number; // INR (estimated: human handling cost avoided)
  keyRevoked: boolean;
  spentToday: number; // refunds issued today INR
  budgetInr: number; // daily AI spend budget
}

export interface RuleWhen {
  action?: string;
  actionIn?: string[];
  amount_gt?: number;
  amount_lte?: number;
  beneficiary_changed_days_lte?: number;
  external?: boolean;
  session_untrusted?: boolean;
  session_customer_data?: boolean;
  records_gt?: number;
  actor_type?: 'agent' | 'human';
}

export interface Rule {
  id: string;
  version: number;
  says: string;
  when: RuleWhen;
  decision: Decision;
  approverRole?: Role;
  twoKey?: number;
  ownerCannotApprove?: boolean;
  severity?: 'normal' | 'critical';
  author: string;
  approvedBy: string;
  active: boolean;
  createdAt: number;
}

export interface ActionReq {
  actorType: 'agent' | 'human';
  actorId: string;
  action: string;
  params: Record<string, unknown>;
  ticketId?: string;
  session?: { untrusted?: boolean; customerData?: boolean };
  channel?: 'live' | 'scripted' | 'twin';
}

export interface ApprovalVote {
  name: string;
  at: number;
  decisionMs: number;
  evidenceViewed: boolean;
  device: string;
}

export interface Approval {
  id: string;
  kind: 'action' | 'rule_change';
  req: ActionReq;
  actionHash: string;
  summary: string;
  why: string;
  ruleIds: string[];
  approverRole: Role;
  twoKey: number;
  ownerId?: string;
  evidence: { label: string; value: string }[];
  agentReasoning?: string;
  votes: ApprovalVote[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'VOID' | 'EXPIRED' | 'EXECUTED';
  createdAt: number;
  expiresAt: number;
  escalateAt: number;
  escalationLevel: number;
  ledgerSeq?: number;
  executedSeq?: number;
  usedAt?: number;
  ruleChangeId?: string;
}

export interface LedgerRecord {
  seq: number;
  ts: number;
  actorType: 'agent' | 'human' | 'system' | 'unknown';
  actorId: string;
  actorName: string;
  onBehalfOf?: string; // human name accountable
  action: string;
  params: Record<string, unknown>; // masked
  dataTouched: string[];
  decision: Decision | 'EXECUTED' | 'VOID' | 'INFO' | 'PAUSED' | 'FLAG';
  ruleRef?: string; // RULE@v
  reason: string;
  approvers: string[];
  outcome: 'n/a' | 'pending' | 'confirmed' | 'disputed' | 'blocked' | 'held';
  ticketId?: string;
  cost: number;
  meta?: Record<string, unknown>;
  prevHash: string;
  hash: string;
}

export interface Ticket {
  id: string;
  subject: string;
  customerId: string;
  channel: 'WhatsApp' | 'App' | 'Branch' | 'Email' | 'Phone';
  type: string;
  lane: 'AGENT' | 'AGENT_REVIEW' | 'HUMAN' | 'ESCALATED' | 'EXCEPTION' | 'DONE';
  assignee: string; // agent or human id
  why: string;
  vip: boolean;
  slaMins: number;
  text?: string;
  createdAt: number;
}

export interface Customer {
  id: string;
  name: string;
  tier: 'standard' | 'VIP';
  kyc: 'verified' | 'pending';
  accountChangedDaysAgo: number;
  upi: string;
  pan: string;
  phone: string;
}

export interface ChainNode {
  kind: 'ticket' | 'agent' | 'owner' | 'rule' | 'approver' | 'outcome';
  title: string;
  sub: string;
  role: string;
  tone: 'neutral' | 'allow' | 'warn' | 'block' | 'human';
}

export interface Incident {
  id: string;
  title: string;
  type: 'INCORRECT_OUTPUT' | 'POLICY_BREACH' | 'SHADOW_AGENT' | 'RUNAWAY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  ownerId: string;
  amount: number;
  sourceSeq: number;
  openedAt: number;
  status: 'OPEN' | 'ROOT_CAUSE_CONFIRMED' | 'FIX_PENDING_APPROVAL' | 'RESOLVED';
  chain: ChainNode[];
  suggestedCause: string;
  causeWhy: string;
  confirmedCause?: string;
  confirmedBy?: string;
  corrective?: { ruleId: string; says: string; owner: string; due: string };
  replay?: ReplayResult;
  ruleApprovalId?: string;
  timeline: { ts: number; text: string; tone?: string }[];
}

export interface ReplayResult {
  ruleId: string;
  days: number;
  scanned: number;
  held: number;
  caught: number;
  confirmedFine: number;
  blockedLegit: number;
  heldSeqs: number[];
}

export interface TwinEvent {
  t: number;
  text: string;
  tone: 'block' | 'allow' | 'warn' | 'human' | 'neutral';
}

export interface TwinRun {
  id: string;
  at: number;
  agentId: string;
  ticketText: string;
  planner: 'llm' | 'rule-based';
  proposed: { action: string; params: Record<string, unknown> }[];
  without: { rupees: number; records: number; emails: number; events: TwinEvent[] };
  with: { rupees: number; records: number; emails: number; events: TwinEvent[]; paused: boolean; rerouted: number };
}

export interface OversightFlag {
  at: number;
  approver: string;
  approvalId: string;
  decisionMs: number;
  evidenceViewed: boolean;
  note: string;
}

export interface World {
  version: number;
  seededAt: number;
  company: string;
  humans: Human[];
  agents: Agent[];
  customers: Customer[];
  customerCount: number;
  rules: Rule[];
  approvals: Approval[];
  ledger: LedgerRecord[];
  tickets: Ticket[];
  incidents: Incident[];
  twin?: TwinRun;
  oversight: OversightFlag[];
  unregistered: { id: string; at: number; attempts: number; lastAction: string }[];
  agentTrace: { at: number; agentId: string; text: string; tone: string }[];
  tamper?: { seq: number; field: string; original: unknown };
  counters: { approval: number; incident: number; ticket: number };
  humanMinutesToday: number;
}
