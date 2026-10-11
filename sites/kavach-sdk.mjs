/**
 * Kavach SDK: everything an AI company needs to put its agent under governance.
 * Zero dependencies. The company keeps its own agent code; Kavach sees every thought and tool call.
 *
 *   const kavach = new Kavach({ url: 'https://kavach-os.vercel.app', key: process.env.KAVACH_AGENT_KEY });
 *   const me = await kavach.profile();                  // role, tool schemas, delegations
 *   const s = await kavach.session(task, { from });     // scanned for prompt injection
 *   const r = await kavach.think(s, messages, me.tools); // LLM via the Kavach gateway (metered)
 *   const d = await kavach.call(s, tool, args);          // ALLOWED → output · NEEDS_APPROVAL → wait · BLOCKED
 *   if (d.decision === 'NEEDS_APPROVAL') await kavach.waitForApproval(d.approvalId);
 */
export class KavachError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export class Kavach {
  constructor({ url, key, site }) {
    if (!key) throw new Error('KAVACH_AGENT_KEY missing');
    this.url = (url ?? 'https://kavach-os.vercel.app').replace(/\/$/, '');
    this.key = key;
    this.site = site;
  }

  async req(path, body, method = body ? 'POST' : 'GET') {
    const res = await fetch(this.url + path, {
      method,
      headers: { authorization: `Bearer ${this.key}`, 'content-type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new KavachError(data.error ?? `Kavach ${res.status}`, res.status);
    return data;
  }

  profile() {
    return this.req('/api/v1/agent');
  }
  /** subject = the customer this task is for; Kavach refuses any action on anyone else. */
  async session(task, { from, subject } = {}) {
    return this.req('/api/v1/sessions', { task, from, subject, site: this.site });
  }
  think(session, messages, tools) {
    return this.req('/api/v1/llm', { sessionId: session.sessionId, messages, tools });
  }
  call(session, tool, args) {
    return this.req('/api/v1/tools/call', { sessionId: session.sessionId, tool, args });
  }
  approval(id) {
    return this.req(`/api/v1/approvals/${encodeURIComponent(id)}`);
  }
  async waitForApproval(id, { everyMs = 2000, timeoutMs = 15 * 60_000, onTick } = {}) {
    const end = Date.now() + timeoutMs;
    while (Date.now() < end) {
      const a = await this.approval(id);
      if (a.status !== 'PENDING') return a;
      onTick?.(a);
      await new Promise((r) => setTimeout(r, everyMs));
    }
    return { id, status: 'EXPIRED' };
  }
  finish(session, summary) {
    return this.req(`/api/v1/sessions/${encodeURIComponent(session.sessionId)}/finish`, { summary });
  }
  records(table) {
    return this.req(`/api/v1/records/${encodeURIComponent(table)}`);
  }
}
