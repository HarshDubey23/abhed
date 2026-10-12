import { adminKeyFor } from './agentapi';
import { appendLedger } from './engine';
import { keyFor } from './live';
import { packFor } from './sectors';
import { getWorld, mutate, mutateLive, TENANTS, type Tenant } from './store';
import type { Connection, World } from './types';

/**
 * Live connection of a company's website to Abhed.
 * Abhed issues a one-time pairing code; the website's admin enters it; the website receives its agent
 * keys at runtime and its agents come online under governance. While a company is not connected,
 * Abhed refuses its agent and admin keys (fail-closed), so "disconnect" really cuts the agents off.
 */
export const CODE_TTL_MS = 10 * 60_000;
export const ONLINE_MS = 30_000;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const conn = (w: World): Connection => w.connection ?? { status: 'connected', timeline: [] };
const note = (c: Connection, text: string, tone: Connection['timeline'][number]['tone'] = 'info', at = Date.now()) => {
  c.timeline.push({ at, text, tone });
  if (c.timeline.length > 40) c.timeline.splice(0, c.timeline.length - 40);
};
const record = (w: World, action: string, reason: string, params: Record<string, unknown> = {}) =>
  appendLedger(w, { actorType: 'system', actorId: 'abhed-connect', actorName: 'Abhed · Connect', action, params, decision: 'INFO', reason });

export function newCode() {
  let s = '';
  for (let i = 0; i < 6; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}

/** Issue a pairing code for a company (a new code replaces the old one). */
export function issueCode(w: World, now = Date.now()) {
  const c = (w.connection = conn(w));
  c.code = newCode();
  c.codeExp = now + CODE_TTL_MS;
  if (c.status !== 'connected') c.status = 'waiting';
  note(c, `Pairing code issued, valid for ${CODE_TTL_MS / 60_000} minutes`, 'info', now);
  return c.code;
}

export function disconnect(w: World, by = 'Company admin', now = Date.now()) {
  const c = (w.connection = conn(w));
  const was = c.site?.url;
  c.status = 'disconnected';
  c.code = undefined;
  c.codeExp = undefined;
  c.site = undefined;
  c.since = undefined;
  c.seen = {};
  note(c, `Disconnected by ${by}. Agent keys refused from now on.`, 'warn', now);
  record(w, 'disconnect_site', `${packFor(w.sector).company} website disconnected by ${by}${was ? ` (${was})` : ''}. Its agent keys are refused until it pairs again.`);
}

/** The website redeems a code: Abhed marks the company connected and hands over its agent keys. */
export async function pair(code: string, site: { url: string; name: string }) {
  const want = code.trim().toUpperCase();
  if (!/^[A-Z2-9]{6}$/.test(want)) return { ok: false as const, status: 400, error: 'A pairing code is 6 letters and digits.' };
  for (const t of TENANTS) {
    const w0 = await getWorld(t);
    const c0 = conn(w0);
    if (c0.code !== want) continue;
    if ((c0.codeExp ?? 0) < Date.now()) return { ok: false as const, status: 410, error: 'This code has expired. Generate a new one in Abhed → Connect.' };
    const { result } = await mutate((w) => {
      const c = (w.connection = conn(w));
      const now = Date.now();
      c.status = 'connected';
      c.code = undefined;
      c.codeExp = undefined;
      c.since = now;
      c.seen = {};
      c.site = { url: site.url.slice(0, 120), name: site.name.slice(0, 60), at: now };
      note(c, `Website paired: ${c.site.url}`, 'ok', now);
      const r = record(w, 'connect_site', `${packFor(w.sector).company} website ${c.site.url} connected to Abhed with a one-time pairing code. Its agents are governed from this record on.`, { site: c.site.url });
      return { seq: r.seq };
    }, t);
    const pack = packFor(t);
    const keys = Object.fromEntries(Object.keys(pack.agentTools).map((id) => [id, keyFor(id)]));
    return { ok: true as const, tenant: t as Tenant, company: pack.company, keys, adminKey: adminKeyFor(t), record: result.seq };
  }
  return { ok: false as const, status: 404, error: 'No company is waiting for this code. Check the code in Abhed → Connect.' };
}

/** Website heartbeat for one agent: shows it online in Abhed; the first one after pairing is noted. */
export async function heartbeat(tenant: Tenant, agentId: string, site: string) {
  const now = Date.now();
  await mutateLive((l) => {
    const cur = l.runtimes[agentId];
    l.runtimes[agentId] = {
      agentId,
      host: site.slice(0, 40) || 'website',
      pid: 0,
      runtime: 'website',
      startedAt: cur?.startedAt ?? now,
      lastSeen: now,
      task: cur?.task,
      lastThought: cur?.lastThought,
      lastDecision: cur?.lastDecision,
      model: cur?.model,
      tokensToday: cur?.tokensToday ?? 0,
      llmCostToday: cur?.llmCostToday ?? 0,
      calls: cur?.calls ?? 0,
    };
  }, tenant);
  const w0 = await getWorld(tenant);
  if (conn(w0).seen?.[agentId]) return;
  await mutate((w) => {
    const c = (w.connection = conn(w));
    c.seen ??= {};
    if (c.seen[agentId]) return;
    c.seen[agentId] = now;
    const a = w.agents.find((x) => x.id === agentId);
    note(c, `${a?.name ?? agentId} came online on ${site || 'the website'}`, 'ok', now);
  }, tenant);
}

// instance-local cache so every agent call doesn't reload the world just to check the link
const cache = new Map<string, { status: Connection['status']; at: number }>();
export async function isConnected(tenant: Tenant) {
  const hit = cache.get(tenant);
  if (hit && Date.now() - hit.at < 3000) return hit.status === 'connected';
  const status = conn(await getWorld(tenant)).status;
  cache.set(tenant, { status, at: Date.now() });
  return status === 'connected';
}
export const forgetConnection = (tenant: string) => cache.delete(tenant);
