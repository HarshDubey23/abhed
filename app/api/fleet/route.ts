import { json } from '@/lib/api';
import { nameOf } from '@/lib/engine';
import { buildInsights } from '@/lib/insights';
import { llmAvailable } from '@/lib/llm';
import { packFor } from '@/lib/sectors';
import { getLive, getWorld, TENANTS } from '@/lib/store';

export const dynamic = 'force-dynamic';

/** The agents that serve customers on each company's own website (the others are internal agents). */
const ON_SITE: Record<string, string[]> = { banking: ['rex', 'aria'], healthcare: ['rxa', 'claimy'], ecommerce: ['shoppy', 'pricer'] };

const SITES: Record<string, string> = {
  banking: process.env.SITE_URL_BANKING ?? 'https://novabank-agents.onrender.com',
  healthcare: process.env.SITE_URL_HEALTHCARE ?? 'https://sanjeevani-agents.onrender.com',
  ecommerce: process.env.SITE_URL_ECOMMERCE ?? 'https://bazaar-agents.onrender.com',
};

/** Every company Abhed governs, live: agents, sessions, approvals, decisions, speed. */
export async function GET() {
  const now = Date.now();
  const [worlds, phones] = await Promise.all([Promise.all(TENANTS.map((t) => getWorld(t))), getLive('banking')]);
  const companies = worlds.map((w) => {
    const pack = packFor(w.sector);
    const ins = buildInsights(w, now);
    const siteAgents = new Set(Object.keys(pack.agentTools));
    return {
      tenant: w.sector,
      company: pack.company,
      label: pack.label,
      site: SITES[w.sector],
      agents: ins.agents
        .filter((a) => siteAgents.has(a.id))
        .map((a) => ({ ...a, onSite: (ON_SITE[w.sector] ?? []).includes(a.id), purpose: w.agents.find((x) => x.id === a.id)?.purpose, statusReason: w.agents.find((x) => x.id === a.id)?.statusReason }))
        .sort((a, b) => Number(b.onSite) - Number(a.onSite)),
      mix: ins.mix,
      speed: ins.speed,
      human: ins.human,
      series: ins.series,
      reasons: ins.reasons.slice(0, 5),
      blockReasons: ins.blockReasons,
      approvals: w.approvals.reduce<Record<string, number>>((m, a) => ((m[a.hold && a.status === 'PENDING' ? 'ON HOLD' : a.status] = (m[a.hold && a.status === 'PENDING' ? 'ON HOLD' : a.status] ?? 0) + 1), m), {}),
      people: w.humans.length,
      integrity: { ledger: ins.integrity.ledger.valid, chain: ins.integrity.chain.valid, blocks: ins.integrity.chain.blocks, records: w.ledger.length },
      incidents: w.incidents.filter((i) => i.status !== 'RESOLVED').length,
    };
  });
  const sessions = worlds
    .flatMap((w) =>
      (w.runs ?? []).map(({ llm: _l, queue: _q, ...r }) => ({
        ...r,
        company: packFor(w.sector).company,
        tenant: w.sector,
        agentName: w.agents.find((a) => a.id === r.agentId)?.name ?? r.agentId,
        owner: nameOf(w, w.agents.find((a) => a.id === r.agentId)?.owner ?? ''),
        steps: r.steps.slice(-14),
      })),
    )
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 12);
  const pending = worlds.flatMap((w) =>
    w.approvals
      .filter((a) => a.status === 'PENDING')
      .map((a) => ({ id: a.id, tenant: w.sector, company: packFor(w.sector).company, summary: a.summary, why: a.why, approverRole: a.approverRole, twoKey: a.twoKey, votes: a.votes.map((v) => v.name), createdAt: a.createdAt, runId: a.runId })),
  );
  const decided = worlds
    .flatMap((w) => w.approvals.filter((a) => a.votes.length && a.status !== 'PENDING').map((a) => ({ id: a.id, company: packFor(w.sector).company, summary: a.summary, status: a.status, by: a.votes.map((v) => `${v.name} (${v.device}, ${Math.round(v.decisionMs / 100) / 10}s)`).join(' + '), at: a.votes[a.votes.length - 1].at, waitS: Math.round((a.votes[a.votes.length - 1].at - a.createdAt) / 1000) })))
    .sort((a, b) => b.at - a.at)
    .slice(0, 8);
  const feed = worlds
    .flatMap((w) =>
      w.ledger
        .slice(-40)
        .filter((r) => !r.meta?.sample)
        .map((r) => ({ seq: r.seq, ts: r.ts, company: packFor(w.sector).company, tenant: w.sector, actor: r.actorName, action: r.action, decision: r.decision, reason: r.reason, ruleRef: r.ruleRef, ms: r.perf?.gatewayMs, approvers: r.approvers, desc: r.meta?.desc })),
    )
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 40);
  const security = worlds.flatMap((w) => (w.security ?? []).slice(0, 10).map((s) => ({ ...s, company: packFor(w.sector).company }))).sort((a, b) => b.at - a.at).slice(0, 10);
  const approvers = Object.values(phones.approvers).map((a) => ({ name: a.name, online: now - a.lastSeen < 60_000, push: a.push, device: a.device }));
  return json({ now, llm: llmAvailable(), companies, sessions, pending, decided, feed, security, approvers });
}
