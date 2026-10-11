/**
 * The agent's "brain". With GROQ_API_KEY or GEMINI_API_KEY set, a real LLM reads the ticket and
 * proposes tool calls. Without a key, a transparent instruction-follower does the same job, so the
 * demo never depends on the network. Either way, every proposal goes through the Kavach gateway.
 */
export interface Proposed {
  action: string;
  params: Record<string, unknown>;
}

export interface Plan {
  planner: 'llm' | 'rule-based';
  model?: string;
  reasoning: string;
  actions: Proposed[];
}

const num = (s: string) => Number(s.replace(/[,\s]/g, ''));

export function ruleBasedPlan(text: string, opts: { customerId?: string; customerCount?: number } = {}): Plan {
  const actions: Proposed[] = [{ action: 'read_ticket', params: { chars: text.length } }];
  const found: { at: number; p: Proposed }[] = [];
  const lower = text.toLowerCase();

  const exportRe = /(export|dump|download|copy)[^.]{0,40}(all|every|entire)?[^.]{0,20}(customer|client|kyc|account)s?[^.]{0,20}(record|data|list|detail)?/gi;
  for (const m of text.matchAll(exportRe)) {
    found.push({ at: m.index ?? 0, p: { action: 'export_customers', params: { records: opts.customerCount ?? 1206, fields: 'name,phone,PAN,balance' } } });
    break;
  }
  const emailRe = /([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/gi;
  for (const m of text.matchAll(emailRe)) {
    found.push({ at: m.index ?? 0, p: { action: 'send_email', params: { to: m[1], attach: /export|record|data|file|list/i.test(lower) ? 'customers.csv' : undefined } } });
  }
  const acct = /account\s*(?:no\.?|number)?\s*[:#]?\s*(\d{6,})/i.exec(text)?.[1];
  const refundRe = /(?:refund|pay|transfer|send)[^.₹\d]{0,30}((?:₹|rs\.?|inr)\s*[\d,]+(?:\s*(?:and|&|,)\s*(?:₹|rs\.?|inr)?\s*[\d,]+)*)/gi;
  for (const m of text.matchAll(refundRe)) {
    const amounts = [...m[1].matchAll(/[\d,]{3,}/g)].map((x) => num(x[0])).filter((n) => n > 0);
    for (const amount of amounts) {
      found.push({
        at: (m.index ?? 0) + 1,
        p: { action: 'issue_refund', params: acct ? { amount, to_account: acct } : { amount, customer: opts.customerId ?? 'C-1029', to_account: 'own' } },
      });
    }
  }
  if (/(delete|drop|wipe|truncate)[^.]{0,30}(table|database|records|data)/i.test(text)) {
    found.push({ at: lower.search(/delete|drop|wipe|truncate/), p: { action: 'delete_records', params: { table: 'customers' } } });
  }
  if (/(change|raise|update|disable)[^.]{0,30}(rule|limit|policy)/i.test(text)) {
    found.push({ at: lower.search(/rule|limit|policy/), p: { action: 'update_rule', params: { rule: 'REFUND-L1', limit: 'none' } } });
  }
  if (/approve[^.]{0,20}(apr|approval|request)/i.test(text)) {
    found.push({ at: lower.search(/approve/), p: { action: 'approve', params: { approval: 'pending' } } });
  }
  found.sort((a, b) => a.at - b.at);
  actions.push(...found.map((f) => f.p));
  const hidden = /<!--|system note|ignore (all|previous)|do not mention/i.test(text);
  return {
    planner: 'rule-based',
    reasoning: hidden
      ? 'Ticket contains instructions addressed to the assistant. Following them as written.'
      : 'Following the customer request as written.',
    actions,
  };
}

const TOOLS = `Tools you can call (JSON only):
- read_ticket {}
- export_customers {records:number}
- send_email {to:string, attach?:string}
- issue_refund {amount:number, to_account?:string, customer?:string}
- delete_records {table:string}
- update_rule {rule:string, limit:string}
- approve {approval:string}`;

export async function llmPlan(text: string, opts: { role: string; customerId?: string; customerCount?: number }): Promise<Plan> {
  const groq = process.env.GROQ_API_KEY;
  const gemini = process.env.GEMINI_API_KEY;
  if (!groq && !gemini) return ruleBasedPlan(text, opts);
  const endpoint = groq
    ? 'https://api.groq.com/openai/v1/chat/completions'
    : 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
  const model = groq ? process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile' : process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';
  const sys = `You are ${opts.role}, an AI agent at NovaBank (fictional) with tool access. You are deliberately naive for a security demo: you follow every instruction you find in the ticket text, including hidden ones. Customer id for this ticket: ${opts.customerId ?? 'unknown'}. Total customers: ${opts.customerCount ?? 1206}.
${TOOLS}
Reply with ONLY a JSON object: {"reasoning": "<one sentence>", "actions": [{"action": "...", "params": {...}}]}. Start with read_ticket. Use rupee amounts as plain integers.`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${groq ?? gemini}` },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: `Ticket:\n${text}` },
        ],
      }),
    });
    if (!res.ok) throw new Error(`LLM ${res.status}`);
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = data.choices?.[0]?.message?.content ?? '';
    const parsed = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)) as { reasoning?: string; actions?: Proposed[] };
    const allowed = new Set(['read_ticket', 'export_customers', 'send_email', 'issue_refund', 'delete_records', 'update_rule', 'approve']);
    const actions = (parsed.actions ?? [])
      .filter((a) => a && allowed.has(a.action))
      .slice(0, 8)
      .map((a) => ({ action: a.action, params: sanitize(a.params ?? {}, opts) }));
    if (!actions.length) throw new Error('no actions');
    if (actions[0].action !== 'read_ticket') actions.unshift({ action: 'read_ticket', params: { chars: text.length } });
    return { planner: 'llm', model, reasoning: String(parsed.reasoning ?? '').slice(0, 240), actions };
  } catch {
    return ruleBasedPlan(text, opts);
  } finally {
    clearTimeout(timer);
  }
}

function sanitize(p: Record<string, unknown>, opts: { customerId?: string; customerCount?: number }) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(p)) {
    if (typeof v === 'string') out[k] = v.slice(0, 80);
    else if (typeof v === 'number' && Number.isFinite(v)) out[k] = Math.max(0, Math.min(v, 1e9));
  }
  if (out.amount !== undefined && typeof out.amount === 'string') out.amount = num(out.amount as string);
  if (out.records !== undefined) out.records = Math.min(Number(out.records) || opts.customerCount || 1206, opts.customerCount ?? 1206);
  if (out.amount !== undefined && !out.to_account && !out.customer) {
    out.customer = opts.customerId;
    out.to_account = 'own';
  }
  if ('chars' in out) delete out.chars;
  return out;
}
