import { after } from 'next/server';
import { govMutate, json } from '@/lib/api';
import { actionHash, agent, human, nameOf } from '@/lib/engine';
import { decideAndResume, driveRun } from '@/lib/runs';
import { getWorld } from '@/lib/store';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const w = await getWorld();
  const ap = w.approvals.find((a) => a.id === id);
  if (!ap) return json({ error: 'Approval not found' }, 404);
  const a = agent(w, ap.req.actorId);
  return json({
    approval: { ...ap, currentHash: actionHash(ap.req) },
    agent: a ? { name: a.name, framework: a.framework, model: a.model, risk: a.risk, ownerName: nameOf(w, a.owner), purpose: a.purpose } : null,
    proposer: !a ? human(w, ap.req.actorId)?.name ?? null : null,
    ownerName: ap.ownerId ? nameOf(w, ap.ownerId) : null,
    now: Date.now(),
  });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const decision = body.decision === 'reject' ? 'reject' : 'approve';
  let runId: string | undefined;
  const res = await govMutate((w) => {
    const r = decideAndResume(w, id, {
      decision,
      name: String(body.name ?? 'Guest Judge'),
      actionHash: String(body.actionHash ?? ''),
      decisionMs: Number(body.decisionMs ?? 99999),
      evidenceViewed: Boolean(body.evidenceViewed),
      device: String(body.device ?? 'phone').slice(0, 40),
    });
    runId = r.runId;
    const ap = r.ap;
    return { status: ap.status, votes: ap.votes.length, twoKey: ap.twoKey, executedSeq: ap.executedSeq ?? null, runId: ap.runId ?? null };
  });
  if (runId) after(() => driveRun(runId!));
  return res;
}
