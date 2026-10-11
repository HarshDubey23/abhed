import { json } from '@/lib/api';
import { getWorld } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const w = await getWorld();
  const pending = w.approvals
    .filter((a) => a.status === 'PENDING')
    .map((a) => ({
      id: a.id,
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
    }));
  const recent = w.approvals
    .filter((a) => a.status !== 'PENDING')
    .slice(-5)
    .reverse()
    .map((a) => ({ id: a.id, status: a.status, summary: a.summary, by: a.votes.map((v) => v.name).join(' + ') }));
  return json({ now: Date.now(), pending, recent });
}
