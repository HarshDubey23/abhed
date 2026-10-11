import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { Kavach } from './kavach-sdk.mjs';
import { runAgent } from './agent.mjs';
import { SITES } from './sites.mjs';
import { page } from './page.mjs';

/**
 * A company website with its own AI agents. The agents are this company's code; they plug into
 * Kavach with one key each (env KAVACH_KEYS = {"agentId":"kv_live_…"}) and the SDK in kavach-sdk.mjs.
 */
const SITE = SITES[process.env.SITE ?? 'novabank'];
if (!SITE) throw new Error(`Unknown SITE ${process.env.SITE}`);
const KAVACH_URL = (process.env.KAVACH_URL ?? 'https://kavach-os.vercel.app').replace(/\/$/, '');
const KEYS = JSON.parse(process.env.KAVACH_KEYS ?? '{}');
const PORT = Number(process.env.PORT ?? 4000);

const clients = Object.fromEntries(SITE.agents.filter((a) => KEYS[a.id]).map((a) => [a.id, new Kavach({ url: KAVACH_URL, key: KEYS[a.id], site: SITE.brand })]));
const profiles = new Map();
async function profileOf(id) {
  if (!profiles.has(id) || Date.now() - profiles.get(id).at > 60_000) profiles.set(id, { at: Date.now(), p: await clients[id].profile() });
  return profiles.get(id).p;
}

const tasks = new Map(); // id → { events, status, agent }
function newTask(agent) {
  const id = randomUUID().slice(0, 8);
  const t = { id, agent, status: 'working', events: [], createdAt: Date.now() };
  tasks.set(id, t);
  if (tasks.size > 200) tasks.delete(tasks.keys().next().value);
  return t;
}

const send = (res, code, body, type = 'application/json') => {
  res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(type === 'application/json' ? JSON.stringify(body) : body);
};
const readBody = (req) =>
  new Promise((resolve) => {
    let d = '';
    req.on('data', (c) => (d += c.length + d.length > 20000 ? '' : c));
    req.on('end', () => {
      try {
        resolve(JSON.parse(d || '{}'));
      } catch {
        resolve({});
      }
    });
  });

async function data() {
  const any = Object.values(clients)[0];
  if (!any) return { error: 'No agent keys configured' };
  const out = {};
  await Promise.all(SITE.tables.map(async (t) => (out[t] = await any.records(t).catch(() => []))));
  const statuses = {};
  await Promise.all(Object.keys(clients).map(async (id) => (statuses[id] = (await profileOf(id).catch(() => null))?.agent ?? null)));
  return { ...out, agents: statuses };
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (req.method === 'GET' && url.pathname === '/') return send(res, 200, page(SITE, KAVACH_URL), 'text/html; charset=utf-8');
    if (url.pathname === '/health') return send(res, 200, { ok: true, site: SITE.brand, agents: Object.keys(clients) });
    if (url.pathname === '/api/data') return send(res, 200, await data());
    if (req.method === 'POST' && url.pathname === '/api/task') {
      const b = await readBody(req);
      const agent = SITE.agents.find((a) => a.id === b.agent) ?? SITE.agents[0];
      if (!clients[agent.id]) return send(res, 503, { error: `${agent.name} has no Kavach key` });
      const text = String(b.text ?? '').trim().slice(0, 1200);
      if (text.length < 3) return send(res, 400, { error: 'Type a message' });
      const t = newTask(agent.id);
      const kavach = clients[agent.id];
      const emit = (e) => t.events.push({ at: Date.now(), ...e });
      (async () => {
        try {
          const profile = await profileOf(agent.id);
          const context = SITE.context(b.customer ?? null, agent.id);
          await runAgent({ kavach, profile, task: text, from: b.customerName || SITE.brand, subject: b.customer?.id, context, emit });
        } catch (e) {
          emit({ type: 'error', text: e.message });
        } finally {
          t.status = 'done';
        }
      })();
      return send(res, 200, { id: t.id });
    }
    const m = /^\/api\/task\/([\w-]+)$/.exec(url.pathname);
    if (m) {
      const t = tasks.get(m[1]);
      return t ? send(res, 200, t) : send(res, 404, { error: 'not found' });
    }
    send(res, 404, { error: 'not found' });
  } catch (e) {
    send(res, 500, { error: e.message });
  }
});
server.listen(PORT, () => console.log(`${SITE.brand} on :${PORT} → governed by ${KAVACH_URL} (${Object.keys(clients).join(', ') || 'no keys'})`));
