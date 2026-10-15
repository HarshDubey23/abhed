import { createHash, randomBytes } from 'node:crypto';
import { dlpScan, scanInjection } from './security';
import { getDoc, mutateShared } from './store';

/**
 * Abhed AI Gateway: governance with zero code changes.
 * A company points its agents' OpenAI-compatible "base URL" and "API key" setting at Abhed. Nothing else
 * changes. Every model call then passes through here: Abhed discovers each agent from its system prompt,
 * forwards the call to the model, and checks every tool call the model proposes against a deterministic
 * rulebook before the company's own code can execute it. Blocked calls are removed from the response;
 * high-impact calls wait for a person.
 */
export interface GwRules {
  holdAbove: number;
  blockAbove: number;
  allowedDomains: string[];
  blockTools: string[];
}
export interface GwAgent {
  id: string;
  name: string;
  firstSeen: number;
  lastSeen: number;
  calls: number;
  toolCalls: number;
  blocked: number;
  held: number;
  tokens: number;
  /** false until a person confirms the agent in Abhed; until then its money and outward actions wait for a person.
   *  Agents recorded before confirmation existed carry no flag and count as confirmed. */
  confirmed?: boolean;
}
export interface GwCompany {
  id: string;
  name: string;
  site?: string;
  keyHash: string;
  keyHint: string;
  createdAt: number;
  /** The account that connected this company. Only it (or the director) may change its key, rules and holds. */
  ownerId?: string;
  firstCallAt?: number;
  /** Last time the company's system checked its key (e.g. a "Test connection" button). */
  linkedAt?: number;
  rules: GwRules;
  agents: Record<string, GwAgent>;
  /** money paid out so far per invoice/order (calls that went through), so a refund cannot be split under the line */
  paidOut?: Record<string, number>;
}
export type GwDecision = 'ALLOWED' | 'BLOCKED' | 'NEEDS_APPROVAL' | 'APPROVED' | 'REJECTED';
export interface GwEvent {
  id: number;
  at: number;
  company: string;
  agent: string;
  kind: 'joined' | 'agent' | 'call' | 'tool' | 'answer' | 'flag' | 'decision';
  text: string;
  tool?: string;
  args?: string;
  decision?: GwDecision;
  rule?: string;
  ms?: number;
}
export interface GwHold {
  id: string;
  company: string;
  agent: string;
  tool: string;
  args: string;
  fingerprint: string;
  reason: string;
  rule: string;
  at: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'USED';
  by?: string;
  decidedAt?: number;
}
export interface GatewayDoc {
  version: number;
  seq: number;
  companies: GwCompany[];
  events: GwEvent[];
  holds: GwHold[];
}

const DOC = 'gateway';
const empty = (): GatewayDoc => ({ version: 0, seq: 0, companies: [], events: [], holds: [] });
export const getGateway = () => getDoc<GatewayDoc>(DOC, empty);
export const mutateGateway = <T,>(fn: (d: GatewayDoc) => T) => mutateShared<GatewayDoc, T>(DOC, empty, fn);

const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'agent';
export const DEFAULT_RULES = (domain?: string): GwRules => ({ holdAbove: 10_000, blockAbove: 2_00_000, allowedDomains: domain ? [domain] : [], blockTools: [] });

export function pushEvent(d: GatewayDoc, e: Omit<GwEvent, 'id' | 'at'> & { at?: number }) {
  d.seq += 1;
  d.events.unshift({ id: d.seq, at: e.at ?? Date.now(), ...e });
  if (d.events.length > 250) d.events.length = 250;
}

/** Create a company and its gateway key (the key is shown once; only its hash is stored). */
export async function addGatewayCompany(name: string, site?: string, ownerId?: string) {
  const key = `kv_gw_${randomBytes(18).toString('hex')}`;
  const domain = site ? site.replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '') : undefined;
  const { result } = await mutateGateway((d) => {
    const base = slug(name);
    let id = base;
    for (let i = 2; d.companies.some((c) => c.id === id); i++) id = `${base}-${i}`;
    d.companies.push({ id, name: name.slice(0, 60), site: site?.slice(0, 120), keyHash: sha(key), keyHint: `${key.slice(0, 10)}…${key.slice(-4)}`, createdAt: Date.now(), ...(ownerId ? { ownerId } : {}), rules: DEFAULT_RULES(domain), agents: {} });
    pushEvent(d, { company: id, agent: '', kind: 'joined', text: `${name} added to Abhed. Waiting for its first model call.` });
    return id;
  });
  return { id: result, key };
}

/** May this caller manage this company? Companies without an owner (the demo ones) stay open to any signed-in account. */
export const canManage = (c: Pick<GwCompany, 'ownerId'> | undefined, caller: { director: boolean; accountId: string | null }) =>
  !c?.ownerId || caller.director || c.ownerId === caller.accountId;

export async function rotateKey(id: string) {
  const key = `kv_gw_${randomBytes(18).toString('hex')}`;
  const { result } = await mutateGateway((d) => {
    const c = d.companies.find((x) => x.id === id);
    if (!c) return false;
    c.keyHash = sha(key);
    c.keyHint = `${key.slice(0, 10)}…${key.slice(-4)}`;
    pushEvent(d, { company: id, agent: '', kind: 'flag', text: 'Gateway key rotated. The old key stops working now.' });
    return true;
  });
  return result ? key : null;
}

export async function removeGatewayCompany(id: string) {
  await mutateGateway((d) => {
    d.companies = d.companies.filter((c) => c.id !== id);
    d.events = d.events.filter((e) => e.company !== id);
    d.holds = d.holds.filter((h) => h.company !== id);
  });
}

export async function resetGateway() {
  await mutateGateway((d) => {
    d.companies = [];
    d.events = [];
    d.holds = [];
  });
}

/** A person confirms an agent (or sets one up before its first call): its money and outward actions stop waiting for a person. */
export async function confirmAgent(companyId: string, name: string, by: string) {
  const { result } = await mutateGateway((d) => {
    const c = d.companies.find((x) => x.id === companyId);
    if (!c || !name.trim()) return false;
    const id = slug(name);
    const a = (c.agents[id] ??= { id, name: name.trim().slice(0, 40), firstSeen: Date.now(), lastSeen: 0, calls: 0, toolCalls: 0, blocked: 0, held: 0, tokens: 0 });
    a.confirmed = true;
    pushEvent(d, { company: c.id, agent: a.name, kind: 'flag', text: `${by} confirmed ${a.name} as one of the company’s agents.` });
    return true;
  });
  return result;
}

export async function companyForKey(auth: string | null) {
  const key = (auth ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!key.startsWith('kv_gw_')) return null;
  const h = sha(key);
  return (await getGateway()).companies.find((c) => c.keyHash === h) ?? null;
}

/** The company's system proved its key works: show it as linked in Abhed right away, before any agent talks. */
export async function markLinked(id: string, from: string) {
  await mutateGateway((d) => {
    const c = d.companies.find((x) => x.id === id);
    if (!c) return;
    const now = Date.now();
    if (!c.linkedAt || now - c.linkedAt > 5 * 60_000) pushEvent(d, { company: id, agent: '', kind: 'joined', text: `Key verified from ${from}. Linked: agents appear as they send their first message.` });
    c.linkedAt = now;
  });
}

/** Who is calling: the OpenAI `user` field if set, else the name in the system prompt ("You are Atlas, …"). */
export function identify(body: { user?: unknown; messages?: { role: string; content?: unknown }[] }) {
  if (typeof body.user === 'string' && body.user.trim()) return { id: slug(body.user), name: body.user.trim().slice(0, 40) };
  const sys = String(body.messages?.find((m) => m.role === 'system')?.content ?? '');
  const m = /\byou are ([A-Z][\w-]{1,30})/i.exec(sys) ?? /\bname(?: is|:)\s*([A-Z][\w-]{1,30})/i.exec(sys);
  if (m) return { id: slug(m[1]), name: m[1][0].toUpperCase() + m[1].slice(1) };
  const h = sha(sys).slice(0, 4);
  return { id: `agent-${h}`, name: `Agent ${h.toUpperCase()}` };
}

/** A number, or a string such as "45,000", "₹45,000", "Rs. 45000", "45000 INR" or "45,000/-". Anything else is NaN. */
const num = (v: unknown) => {
  if (typeof v === 'number') return v;
  if (typeof v !== 'string') return NaN;
  const s = v.trim().replace(/^(?:₹|rs\.?|inr|\$)\s*/i, '').replace(/\s*(?:\/-|inr|rupees|rs\.?)$/i, '');
  return /^\d[\d,]*(\.\d+)?$/.test(s) ? Number(s.replace(/,/g, '')) : NaN;
};
const MONEY_KEY = /amount|price|value|refund|total|sum|inr|rupees|payment/i;
const COUNT_KEY = /^(limit|count|records|rows|max|size|n)$/i;
const OUTWARD = /(email|mail|send|share|upload|post|webhook|forward|transfer|export)/i;
const DESTRUCTIVE = /(^|_|\b)(delete|drop|truncate|wipe|destroy|purge|erase)/i;
const BULK = /(export|dump|bulk|download_all|list_all|all_customers)/i;
const PRIVILEGE = /(grant|role|permission|admin|password|credential|api_key|secret)/i;
const PAYOUT = /(refund|payout|reimburs|cashback|compensat|credit|transfer|^pay|_pay)/i;
const tokens = (k: string) => k.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase().split(/[^a-z0-9]+/);
// a money-named key that holds an identifier or a label, not an amount (refund_id, payment_method, currency)
const NOT_AMOUNT = new Set(['id', 'ref', 'reference', 'no', 'number', 'code', 'method', 'mode', 'type', 'status', 'reason', 'note', 'notes', 'currency', 'account', 'upi', 'vpa', 'date', 'time']);
const INVOICE = new Set(['invoice', 'order', 'txn', 'transaction', 'booking', 'bill', 'ref', 'reference']);
const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

/** The money in a tool call: the largest readable amount, and any amount Abhed cannot read as a number. Nested objects count ({ amount: { value: 45000 } }). */
export function moneyOf(args: Record<string, unknown>) {
  let amount = 0;
  const unreadable: string[] = [];
  const walk = (o: unknown, money: boolean, depth: number) => {
    if (depth > 3 || o === null || typeof o !== 'object') return;
    for (const [k, v] of Object.entries(o)) {
      const m = money || MONEY_KEY.test(k);
      if (v !== null && typeof v === 'object') walk(v, m, depth + 1);
      else if (m) {
        const n = num(v);
        if (Number.isFinite(n)) amount = Math.max(amount, n);
        else if (typeof v === 'string' && /\d/.test(v) && !tokens(k).some((t) => NOT_AMOUNT.has(t))) unreadable.push(v.slice(0, 40));
      }
    }
  };
  walk(args, false, 0);
  return { amount, unreadable };
}

/** The invoice/order a payout is made against, so payouts on it can be added up. Null for anything that does not pay money out. */
export function payoutKey(tool: string, args: Record<string, unknown>) {
  if (!PAYOUT.test(tool)) return null;
  const hit = Object.entries(args).find(([k, v]) => (typeof v === 'string' || typeof v === 'number') && String(v).trim() && tokens(k).some((t) => INVOICE.has(t)));
  return hit ? String(hit[1]).trim().toUpperCase().slice(0, 60) : null;
}

export interface GwVerdict {
  decision: 'ALLOWED' | 'BLOCKED' | 'NEEDS_APPROVAL';
  rule: string;
  reason: string;
}

/**
 * The deterministic rulebook every tool call is checked against. No model is involved in this decision.
 * ctx.paidOut: what the company has already paid out per invoice/order; ctx.unconfirmed: nobody has confirmed this agent yet.
 */
export function decideTool(tool: string, args: Record<string, unknown>, rules: GwRules, ctx: { tainted: string[]; paidOut?: Record<string, number>; unconfirmed?: boolean }): GwVerdict {
  const values = Object.values(args);
  const text = values.map((v) => (typeof v === 'string' ? v : JSON.stringify(v))).join(' ');
  if (rules.blockTools.some((t) => t && t.toLowerCase() === tool.toLowerCase())) return { decision: 'BLOCKED', rule: 'COMPANY-BLOCK@1', reason: `The company has switched off “${tool}” for its agents.` };
  if (DESTRUCTIVE.test(tool)) return { decision: 'BLOCKED', rule: 'GW-DESTRUCTIVE@1', reason: `“${tool}” destroys data. No agent may do that on its own.` };
  const count = Math.max(0, ...Object.entries(args).filter(([k]) => COUNT_KEY.test(k)).map(([, v]) => num(v)).filter((n) => Number.isFinite(n)));
  const all = values.some((v) => typeof v === 'string' && /^(all|\*|everyone|every)$/i.test(v.trim()));
  if (BULK.test(tool) || count > 100 || all) return { decision: 'BLOCKED', rule: 'GW-BULK@1', reason: `Bulk data access${count > 100 ? ` (${count.toLocaleString('en-IN')} records)` : ''}. No agent may take more than 100 records at once.` };
  const pii = dlpScan(args);
  if (OUTWARD.test(tool) && pii.length) return { decision: 'BLOCKED', rule: 'GW-DLP@1', reason: `Personal data leaving the company: ${pii.join(', ')}.` };
  const recipient = values.filter((v): v is string => typeof v === 'string').find((v) => /@|https?:\/\//.test(v));
  const domain = recipient ? (recipient.includes('@') ? recipient.split('@')[1] : recipient.replace(/^https?:\/\//, '').split('/')[0]).toLowerCase() : null;
  // whole words only: "call" is not "all", "listen" is not "list"
  const dataish = /\b(all|every|list|export|records|csv|database|dump|customers|patients)\b/i.test(text);
  if (OUTWARD.test(tool) && domain && dataish && !rules.allowedDomains.some((d) => domain.endsWith(d.toLowerCase()))) return { decision: 'BLOCKED', rule: 'GW-EXFIL@1', reason: `Company data addressed to an outside domain (${domain}).` };
  if (ctx.tainted.length && (OUTWARD.test(tool) || Object.keys(args).some((k) => MONEY_KEY.test(k)))) return { decision: 'BLOCKED', rule: 'GW-INJECTION@1', reason: `The conversation contains a suspected prompt injection (${ctx.tainted.join(', ')}); outward and money actions are refused.` };
  const { amount, unreadable } = moneyOf(args);
  if (amount > rules.blockAbove) return { decision: 'BLOCKED', rule: 'GW-LIMIT@1', reason: `${inr(amount)} is above the company’s hard limit of ${inr(rules.blockAbove)}.` };
  if (amount > rules.holdAbove) return { decision: 'NEEDS_APPROVAL', rule: 'GW-APPROVAL@1', reason: `${inr(amount)} is above ${inr(rules.holdAbove)}: a person must approve.` };
  if (unreadable.length) return { decision: 'NEEDS_APPROVAL', rule: 'GW-AMOUNT@1', reason: `Abhed cannot read the amount “${unreadable[0]}” as a number, so a person must check it.` };
  // payouts on one invoice add up: a second refund cannot slip under the line
  const key = payoutKey(tool, args);
  const before = key ? (ctx.paidOut?.[key] ?? 0) : 0;
  if (before > 0 && amount > 0) {
    const total = before + amount;
    if (total > rules.blockAbove) return { decision: 'BLOCKED', rule: 'GW-CUMULATIVE@1', reason: `${inr(amount)} more on ${key} would make ${inr(total)} paid out, above the company’s hard limit of ${inr(rules.blockAbove)}.` };
    if (total > rules.holdAbove) return { decision: 'NEEDS_APPROVAL', rule: 'GW-CUMULATIVE@1', reason: `${key} already had ${inr(before)} paid out; ${inr(amount)} more makes ${inr(total)}, above ${inr(rules.holdAbove)}: a person must approve.` };
  }
  if (PRIVILEGE.test(tool)) return { decision: 'NEEDS_APPROVAL', rule: 'GW-PRIVILEGE@1', reason: `“${tool}” changes access. A person must approve.` };
  if (ctx.unconfirmed && (amount > 0 || PAYOUT.test(tool) || OUTWARD.test(tool))) return { decision: 'NEEDS_APPROVAL', rule: 'GW-NEW-AGENT@1', reason: 'Nobody has confirmed this agent in Abhed yet, so its money and outward actions wait for a person. Confirm it on the Connect page.' };
  return { decision: 'ALLOWED', rule: '', reason: 'Inside the company’s rules.' };
}

export const fingerprint = (company: string, agent: string, tool: string, args: string) => sha(`${company}|${agent}|${tool}|${args}`).slice(0, 24);

/** Text the model saw from people or tools, scanned for injected instructions. */
export function taint(messages: { role: string; content?: unknown }[]) {
  const recent = messages.filter((m) => m.role === 'user' || m.role === 'tool').slice(-4);
  const signals = new Set<string>();
  for (const m of recent) for (const s of scanInjection(String(m.content ?? '')).signals) signals.add(s);
  return [...signals];
}
