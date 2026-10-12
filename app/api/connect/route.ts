import { json } from '@/lib/api';
import { conn, disconnect, forgetConnection, issueCode, ONLINE_MS } from '@/lib/connect';
import { packFor } from '@/lib/sectors';
import { getLive, getWorld, isTenant, mutate, TENANTS } from '@/lib/store';
import type { World } from '@/lib/types';

export const dynamic = 'force-dynamic';

const ON_SITE: Record<string, string[]> = { banking: ['rex', 'aria'], healthcare: ['rxa', 'claimy'], ecommerce: ['shoppy', 'pricer'] };

async function view(w: World) {
  const c = conn(w);
  const live = await getLive(w.sector);
  const now = Date.now();
  const ids = ON_SITE[w.sector] ?? [];
  const agents = ids.map((id) => {
    const a = w.agents.find((x) => x.id === id);
    const rt = live.runtimes[id];
    return { id, name: a?.name ?? id, job: a?.purpose ?? '', status: a?.status ?? 'ACTIVE', online: c.status === 'connected' && !!rt && rt.runtime === 'website' && now - rt.lastSeen < ONLINE_MS, lastSeen: rt?.lastSeen ?? null };
  });
  const names = new Set(agents.map((a) => a.name));
  const activity = c.since
    ? w.ledger
        .filter((r) => r.ts >= c.since! && (names.has(r.actorName) || r.actorId === 'abhed-connect'))
        .slice(-12)
        .reverse()
        .map((r) => ({ seq: r.seq, ts: r.ts, actor: r.actorName, action: r.action, decision: r.decision, reason: r.reason, rule: r.ruleRef, ms: r.perf?.gatewayMs }))
    : [];
  const pending = w.approvals.filter((a) => a.status === 'PENDING' && c.since && a.createdAt >= c.since).map((a) => ({ id: a.id, summary: a.summary }));
  return {
    tenant: w.sector,
    company: packFor(w.sector).company,
    status: c.status,
    code: c.status !== 'disconnected' && c.code && (c.codeExp ?? 0) > now ? c.code : null,
    codeExp: c.codeExp ?? null,
    since: c.since ?? null,
    site: c.site ?? null,
    timeline: [...c.timeline].reverse(),
    agents,
    activity,
    pending,
  };
}

/** Connection state of every company (or one with ?tenant=). */
export async function GET(req: Request) {
  const t = new URL(req.url).searchParams.get('tenant');
  if (t && isTenant(t)) return json(await view(await getWorld(t)));
  const worlds = await Promise.all(TENANTS.map((x) => getWorld(x)));
  return json({ companies: await Promise.all(worlds.map(view)) });
}

/** { action: 'code', tenant } issues a pairing code · { action: 'disconnect', tenant, pin } cuts the website off. */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const t = String(b.tenant ?? '');
  if (!isTenant(t)) return json({ error: 'Pick a company' }, 400);
  if (b.action === 'code') {
    const { result } = await mutate((w) => issueCode(w), t);
    forgetConnection(t);
    return json({ code: result });
  }
  if (b.action === 'disconnect') {
    if (String(b.pin ?? '') !== (process.env.ADMIN_PIN ?? '2468')) return json({ error: 'Wrong PIN' }, 403);
    await mutate((w) => disconnect(w, 'the Abhed operator'), t);
    forgetConnection(t);
    return json({ ok: true });
  }
  return json({ error: 'Unknown action' }, 400);
}
