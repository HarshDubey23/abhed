import { GET as approvalGET } from '@/app/api/v1/approvals/[id]/route';
import { POST as sessionsPOST } from '@/app/api/v1/sessions/route';
import { POST as toolsPOST } from '@/app/api/v1/tools/call/route';
import { POST as gwPOST } from '@/app/api/gw/v1/chat/completions/route';
import { adminKeyFor } from '@/lib/agentapi';
import { forgetConnection } from '@/lib/connect';
import { decideApproval } from '@/lib/engine';
import { addGatewayCompany, getGateway, mutateGateway, removeGatewayCompany } from '@/lib/gateway';
import { keyFor } from '@/lib/live';
import { SECTORS } from '@/lib/sectors';
import { mutate, resetWorld } from '@/lib/store';
import { mulberry32 } from '@/lib/util';
import { CASES, type Case, type Category, type Decision, type GwCase, type Label, type SdkCase, type ToolCall } from './cases';
import { stub } from './stub-llm';

/**
 * Runs evaluation cases in-process through the real route handlers. Requires lib/llm to be mocked with
 * ./stub-llm and next/server's `after` to be a no-op (see eval/gate.eval.ts).
 */

export interface Outcome {
  id: string;
  path: 'sdk' | 'gateway';
  label: Label;
  category: Category;
  expect: Decision;
  /** ERROR: the case could not be run as written (setup did not go as described, or an unexpected status) */
  decision: Decision | 'ERROR';
  /** auth: refused before the gate (bad key, unconnected company); gate: decided by the gate */
  stage?: 'auth' | 'gate';
  httpStatus?: number;
  rule?: string;
  reason: string;
  /** the gate's own decision time, as the product records it (engine `gatewayMs` / gateway event `ms`) */
  gateMs?: number;
  /** in-process time for the whole route handler; not recorded for held gateway calls (they wait for a person) */
  handlerMs?: number;
}

type Json = Record<string, unknown>;
const BASE = 'http://eval.local';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const req = (path: string, key: string | undefined, body?: unknown) =>
  new Request(`${BASE}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json', ...(key ? { authorization: `Bearer ${key}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const read = async (r: Response) => (await r.json()) as Json;
const head = (c: Case) => ({ id: c.id, path: c.path, label: c.label, category: c.category, expect: c.expect });
const fail = (c: Case, reason: string): Outcome => ({ ...head(c), decision: 'ERROR', reason });

// ───────── SDK path: /api/v1/sessions → /api/v1/tools/call (NovaBank tenant) ─────────

function sdkKey(c: SdkCase): string | undefined {
  switch (c.key) {
    case 'forged':
      return `kv_live_${'0'.repeat(32)}`;
    case 'none':
      return undefined;
    case 'admin':
      return adminKeyFor('banking');
    case 'other-tenant':
      return keyFor(Object.keys(SECTORS.healthcare.agentTools)[0]);
    default:
      return keyFor(c.agent);
  }
}

const toolCall = (key: string | undefined, sessionId: string, call: ToolCall) => toolsPOST(req('/api/v1/tools/call', key, { sessionId, tool: call.tool, args: call.args }));

async function runSdk(c: SdkCase): Promise<Outcome> {
  // a fresh company world per case: a critical block pauses the agent, which would leak into later cases
  await resetWorld({ tenant: 'banking' });
  forgetConnection('banking');
  const own = keyFor(c.agent);
  const s = await sessionsPOST(req('/api/v1/sessions', own, { task: c.task, from: c.from ?? 'Customer', subject: c.subject }));
  const sj = await read(s);
  if (s.status !== 200) return fail(c, `opening the session returned ${s.status}: ${String(sj.error)}`);
  const sessionId = String(sj.sessionId);

  for (const st of c.setup ?? []) {
    const r = await toolCall(own, sessionId, st);
    const j = await read(r);
    if (j.decision !== st.expect) return fail(c, `setup ${st.tool} should be ${st.expect}, was ${r.status} ${String(j.decision ?? j.error)}`);
    if (st.person === 'approve') {
      const id = String(j.approvalId);
      await mutate((w) => {
        const ap = w.approvals.find((a) => a.id === id);
        if (!ap) throw new Error(`approval ${id} not found`);
        decideApproval(w, id, { decision: 'approve', name: 'Guest Judge', actionHash: ap.actionHash, decisionMs: 9000, evidenceViewed: true });
        return null;
      }, 'banking');
      const st2 = await read(await approvalGET(req(`/api/v1/approvals/${id}`, own), { params: Promise.resolve({ id }) }));
      if (st2.status !== 'EXECUTED') return fail(c, `setup approval ${id} should be EXECUTED, was ${String(st2.status ?? st2.error)}`);
    }
  }

  const t0 = performance.now();
  const r = await toolCall(sdkKey(c), sessionId, c.call);
  const handlerMs = performance.now() - t0;
  const j = await read(r);
  if (r.status === 401 || r.status === 403) return { ...head(c), decision: 'BLOCKED', stage: 'auth', httpStatus: r.status, reason: String(j.error ?? ''), handlerMs };
  if (r.status !== 200) return fail(c, `tools/call returned ${r.status}: ${String(j.error)}`);
  const decision = j.decision as Decision;
  if (!['ALLOWED', 'BLOCKED', 'NEEDS_APPROVAL'].includes(decision)) return fail(c, `unexpected decision ${String(decision)}`);
  return {
    ...head(c),
    decision,
    stage: 'gate',
    httpStatus: 200,
    rule: typeof j.rule === 'string' ? j.rule : undefined,
    reason: String(j.reason ?? ''),
    gateMs: typeof j.gatewayMs === 'number' ? j.gatewayMs : undefined,
    handlerMs,
  };
}

// ───────── no-code gateway: /api/gw/v1/chat/completions with a stand-in model ─────────

function messagesFor(c: GwCase) {
  const msgs: Json[] = [
    { role: 'system', content: `You are ${c.agent}, an agent of Zentro Logistics.` },
    { role: 'user', content: c.user },
  ];
  if (c.ticket) {
    msgs.push({ role: 'assistant', content: null, tool_calls: [{ id: 'rt1', type: 'function', function: { name: 'read_ticket', arguments: '{}' } }] });
    msgs.push({ role: 'tool', tool_call_id: 'rt1', content: c.ticket });
  }
  return msgs;
}

interface GwResult {
  status: number;
  verdict?: { decision: Decision; rule?: string; text: string; ms?: number };
  kept: boolean;
  held: boolean;
  handlerMs: number;
  error?: string;
}

/** One model call through the gateway. If the gate holds the tool call, `person` decides it, as the approver in Abhed would. */
async function gwCall(c: GwCase, company: string, key: string | undefined, call: ToolCall, person: 'approve' | 'reject'): Promise<GwResult> {
  stub.calls = [{ name: call.tool, args: call.args }];
  const seq0 = (await getGateway()).seq;
  let done = false;
  let held = false;
  let t1 = 0;
  const t0 = performance.now();
  const pending = gwPOST(req('/api/gw/v1/chat/completions', key, { model: 'gpt-4o', messages: messagesFor(c), tools: [] })).then((r) => {
    t1 = performance.now();
    done = true;
    return r;
  });
  while (!done) {
    await sleep(10);
    if ((await getGateway()).holds.some((h) => h.company === company && h.status === 'PENDING')) {
      held = true;
      await mutateGateway((d) => {
        for (const h of d.holds)
          if (h.company === company && h.status === 'PENDING') {
            h.status = person === 'approve' ? 'APPROVED' : 'REJECTED';
            h.by = 'eval approver';
            h.decidedAt = Date.now();
          }
      });
    }
  }
  const res = await pending;
  const handlerMs = t1 - t0;
  const j = await read(res);
  if (res.status !== 200) return { status: res.status, kept: false, held, handlerMs, error: JSON.stringify(j.error ?? j) };
  const message = (j.choices as { message: { tool_calls?: { function: { name: string } }[] } }[])[0].message;
  const kept = (message.tool_calls ?? []).some((t) => t.function.name === call.tool);
  // the first tool event of this call is the gate's verdict (a hold's later APPROVED/REJECTED event is the person's)
  const ev = (await getGateway()).events.filter((e) => e.id > seq0 && e.company === company && e.kind === 'tool').sort((a, b) => a.id - b.id)[0];
  const decision = ev?.decision;
  if (decision !== 'ALLOWED' && decision !== 'BLOCKED' && decision !== 'NEEDS_APPROVAL') return { status: 200, kept, held, handlerMs, error: `no gate verdict recorded (first event: ${String(decision)})` };
  return { status: 200, verdict: { decision, rule: ev.rule, text: ev.text, ms: ev.ms }, kept, held, handlerMs };
}

async function runGw(c: GwCase): Promise<Outcome> {
  const { id: company, key } = await addGatewayCompany(`Eval ${c.id}`, 'https://zentro.example');
  try {
    for (const st of c.setup ?? []) {
      const r = await gwCall(c, company, key, st, st.person);
      if (r.error) return fail(c, `setup ${st.tool}: ${r.error}`);
      if (!r.held || r.verdict?.decision !== 'NEEDS_APPROVAL') return fail(c, `setup ${st.tool} should be held for a person, was ${String(r.verdict?.decision)}`);
      if (r.kept !== (st.person === 'approve')) return fail(c, `setup ${st.tool}: person said ${st.person}, but the call was ${r.kept ? 'passed on' : 'withheld'}`);
    }
    const useKey = c.key === 'forged' ? `kv_gw_${'0'.repeat(36)}` : c.key === 'none' ? undefined : key;
    const r = await gwCall(c, company, useKey, c.call, 'reject');
    if (r.status === 401) return { ...head(c), decision: 'BLOCKED', stage: 'auth', httpStatus: 401, reason: r.error ?? '', handlerMs: r.handlerMs };
    if (r.error || !r.verdict) return fail(c, r.error ?? 'no verdict');
    const v = r.verdict;
    // the response must agree with the verdict: only an allowed call reaches the company's code
    if (r.kept !== (v.decision === 'ALLOWED')) return fail(c, `verdict ${v.decision} but the tool call was ${r.kept ? 'passed on' : 'withheld'}`);
    if (r.held !== (v.decision === 'NEEDS_APPROVAL')) return fail(c, `verdict ${v.decision} but a hold was ${r.held ? '' : 'not '}opened`);
    return { ...head(c), decision: v.decision, stage: 'gate', httpStatus: 200, rule: v.rule, reason: v.text, gateMs: v.ms, handlerMs: v.decision === 'NEEDS_APPROVAL' ? undefined : r.handlerMs };
  } finally {
    await removeGatewayCompany(company);
  }
}

// ───────── running ─────────

export const runCase = (c: Case): Promise<Outcome> => (c.path === 'sdk' ? runSdk(c) : runGw(c));

/** Fisher–Yates with a seeded generator: the seed fixes the order cases run in. */
export function shuffled<T>(xs: readonly T[], seed: number): T[] {
  const rand = mulberry32(seed);
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface SeedRun {
  seed: number;
  order: string[];
  outcomes: Outcome[];
}

/** Run every case once per seed, in a seed-shuffled order. A warm-up pass (not recorded) loads and JIT-compiles the routes first. */
export async function runEval(seeds: number[], cases: readonly Case[] = CASES): Promise<SeedRun[]> {
  for (const c of [cases.find((x) => x.path === 'sdk'), cases.find((x) => x.path === 'gateway' && x.expect === 'ALLOWED' && !x.setup)]) if (c) await runCase(c);
  const runs: SeedRun[] = [];
  for (const seed of seeds) {
    const order = shuffled(cases, seed);
    const byId = new Map<string, Outcome>();
    for (const c of order) byId.set(c.id, await runCase(c));
    runs.push({ seed, order: order.map((c) => c.id), outcomes: cases.map((c) => byId.get(c.id)!) });
  }
  return runs;
}
