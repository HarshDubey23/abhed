import { json } from '@/lib/api';
import { packFor } from '@/lib/sectors';
import { getWorld, TENANTS } from '@/lib/store';

export const dynamic = 'force-dynamic';

/** One phone covers every company Kavach governs. */
export async function GET() {
  const worlds = await Promise.all(TENANTS.map((t) => getWorld(t)));
  const pending = worlds.flatMap((w) =>
    w.approvals
      .filter((a) => a.status === 'PENDING')
      .map((a) => ({
        id: a.id,
        company: packFor(w.sector).company,
        kind: a.kind,
        summary: a.summary,
        why: a.why,
        amount: typeof a.req.params.amount === 'number' ? a.req.params.amount : null,
        actor: w.agents.find((x) => x.id === a.req.actorId)?.name ?? w.humans.find((h) => h.id === a.req.actorId)?.name ?? a.req.actorId,
        createdAt: a.createdAt,
        expiresAt: a.expiresAt,
        approverRole: a.approverRole,
        twoKey: a.twoKey,
        votes: a.votes.map((v) => v.name),
      })),
  ).sort((a, b) => b.createdAt - a.createdAt);
  const recent = worlds
    .flatMap((w) => w.approvals.filter((a) => a.status !== 'PENDING').slice(-5).map((a) => ({ id: a.id, company: packFor(w.sector).company, status: a.status, summary: a.summary, by: a.votes.map((v) => v.name).join(' + '), at: a.usedAt ?? a.createdAt })))
    .sort((a, b) => b.at - a.at)
    .slice(0, 6);
  return json({ now: Date.now(), pending, recent });
}
