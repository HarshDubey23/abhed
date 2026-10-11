'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ago, Chip, hhmm, Qr, useWorld } from '@/components/app';
import { SpeedChart } from '@/components/charts';

type Step = { at: number; kind: string; text?: string; action?: string; decision?: string; reason?: string; ruleRef?: string; approvalId?: string; gatewayMs?: number; params?: Record<string, unknown> };
type Agent = { id: string; name: string; onSite?: boolean; owner: string; status: string; statusReason?: string; purpose?: string; actions: number; auto: number; held: number; blocked: number; tokens: number; costInr: number; valueInr: number; riskScore: number; llmCalls: number };
type Series = { bucketMs: number; points: { t: number; auto: number; held: number; blocked: number; p95ms: number | null }[] };
interface Fleet {
  now: number;
  llm: boolean;
  companies: {
    tenant: string;
    company: string;
    label: string;
    site: string;
    agents: Agent[];
    mix: { total: number; auto: number; held: number; blocked: number; autoPct: number | null; heldPct: number | null };
    speed: { measured: number; p50ms: number | null; p95ms: number | null };
    human: { decided: number; pending: number; medianWaitS: number | null };
    series: Series;
    reasons: { rule: string; says: string; count: number }[];
    integrity: { ledger: boolean; chain: boolean; blocks: number; records: number };
    incidents: number;
  }[];
  sessions: { id: string; company: string; tenant: string; agentId: string; agentName: string; owner: string; command: string; by: string; status: string; planner: string; model?: string; tokens: number; costInr: number; steps: Step[]; updatedAt: number; pendingApprovalId?: string; injection?: string[] }[];
  pending: { id: string; tenant: string; company: string; summary: string; why: string; approverRole: string; twoKey: number; votes: string[]; createdAt: number }[];
  decided: { id: string; company: string; summary: string; status: string; by: string; at: number; waitS: number }[];
  feed: { seq: number; ts: number; company: string; actor: string; action: string; decision: string; reason: string; ruleRef?: string; ms?: number; approvers: string[]; desc?: string }[];
  security: { at: number; kind: string; detail: string; owasp: string; severity: string; company: string }[];
  approvers: { name: string; online: boolean; push: boolean; device: string }[];
}

const TONE: Record<string, string> = { banking: '#f5c451', healthcare: '#3ee0a1', ecommerce: '#ff8a2a' };
const short = (c: string) => c.replace(' (fictional)', '');

export default function FleetPage() {
  const { run, toast } = useWorld();
  const [f, setF] = useState<Fleet | null>(null);
  const [origin, setOrigin] = useState('');
  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/fleet', { cache: 'no-store' });
      if (r.ok) setF(await r.json());
    } catch {
      /* keep last */
    }
  }, []);
  useEffect(() => {
    setOrigin(window.location.origin);
    load();
    const t = setInterval(load, 1200);
    return () => clearInterval(t);
  }, [load]);

  if (!f) return <main className="page muted">Connecting to the fleet…</main>;
  const all = f.companies.flatMap((c) => c.agents);
  const tot = f.companies.reduce((s, c) => ({ total: s.total + c.mix.total, auto: s.auto + c.mix.auto, held: s.held + c.mix.held, blocked: s.blocked + c.mix.blocked }), { total: 0, auto: 0, held: 0, blocked: 0 });
  const p95 = Math.max(0, ...f.companies.map((c) => c.speed.p95ms ?? 0));
  const p50s = f.companies.map((c) => c.speed.p50ms).filter((x): x is number => x !== null);
  const waits = f.companies.map((c) => c.human.medianWaitS).filter((x): x is number => x !== null);
  const points = f.companies[0]?.series.points.map((p, i) => ({
    t: p.t,
    auto: f.companies.reduce((s, c) => s + (c.series.points[i]?.auto ?? 0), 0),
    held: f.companies.reduce((s, c) => s + (c.series.points[i]?.held ?? 0), 0),
    blocked: f.companies.reduce((s, c) => s + (c.series.points[i]?.blocked ?? 0), 0),
    p95: Math.max(0, ...f.companies.map((c) => c.series.points[i]?.p95ms ?? 0)),
  })) ?? [];
  const act = async (tenant: string, type: string, agentId: string) => {
    const r = await run(type, { tenant, agentId, by: 'judge', reason: type === 'pause' ? 'Paused from the fleet dashboard' : 'Reviewed and resumed from the fleet dashboard' });
    if (r.ok) toast(`${agentId} ${type === 'pause' ? 'paused: key revoked' : 'resumed'}`, type === 'pause' ? 'block' : 'allow');
    load();
  };

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">
            The <em>Fleet</em>, live
          </h1>
          <p className="page-sub">
            {f.companies.length} companies · {all.length} governed AI agents · {all.filter((a) => a.onSite).length} of them serve customers live on the companies’ own websites, each plugged in with one Kavach key. Every thought, tool call, approval and pause shows up here as it happens.
          </p>
        </div>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <span className={`chip ${f.llm ? 'chip-allow' : 'chip-warn'}`}>{f.llm ? 'LLM gateway live · gpt-oss-120b' : 'LLM offline'}</span>
          <span className="chip chip-info">
            {f.approvers.filter((a) => a.online).length} approver phone{f.approvers.filter((a) => a.online).length === 1 ? '' : 's'} on duty
          </span>
          <a className="btn btn-ghost btn-sm" href="/api/audit?by=Judge" download>
            ⤓ Audit report (PDF)
          </a>
          <Link className="btn btn-solid btn-sm" href="/approver">
            Be an approver on your phone
          </Link>
        </div>
      </div>

      <div className="kpis" style={{ gridTemplateColumns: 'repeat(6, minmax(0, 1fr))' }}>
        <Kpi label="Agent actions decided" value={tot.total.toLocaleString('en-IN')} note="measured on this deployment" />
        <Kpi label="Ran on their own" value={tot.total ? `${Math.round((tot.auto / tot.total) * 100)}%` : '—'} note={`${tot.auto} low-impact actions`} color="var(--allow)" />
        <Kpi label="Asked a person" value={tot.total ? `${Math.round((tot.held / tot.total) * 100)}%` : '—'} note={`${tot.held} high-impact only`} color="var(--human)" />
        <Kpi label="Refused" value={String(tot.blocked)} note="policy, grounding, DLP" color="var(--block)" />
        <Kpi label="Gateway decision" value={p50s.length ? `${Math.max(...p50s).toFixed(1)} ms` : '—'} note={`p95 ${p95 ? p95.toFixed(1) : '—'} ms · security adds ~nothing`} />
        <Kpi label="Human wait (median)" value={waits.length ? `${Math.max(...waits)} s` : '—'} note={`${f.pending.length} waiting now`} />
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', marginBottom: 14 }}>
        {f.companies.map((c) => (
          <div key={c.tenant} className="panel" style={{ borderTop: `2px solid ${TONE[c.tenant]}` }}>
            <div className="row between" style={{ marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 500, letterSpacing: '-0.02em' }}>{short(c.company)}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {c.label} · {c.integrity.records} ledger records · {c.integrity.blocks} signed block{c.integrity.blocks === 1 ? '' : 's'} {c.integrity.ledger && c.integrity.chain ? '✓' : '✕'}
                </div>
              </div>
              <a className="btn btn-ghost btn-sm" href={c.site} target="_blank" rel="noopener">
                Open site ↗
              </a>
            </div>
            {c.agents.map((a) => (
              <div key={a.id} className="row between" style={{ padding: '7px 0', borderTop: '1px solid var(--border-soft)', gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div className="row" style={{ gap: 6 }}>
                    <b style={{ fontWeight: 500 }}>{a.name}</b>
                    <Chip d={a.status} />
                    {a.onSite && <span className="chip chip-info">on website</span>}
                  </div>
                  <div className="muted" style={{ fontSize: 11.5 }}>
                    {a.purpose} · owner {a.owner}
                  </div>
                  <div className="dim" style={{ fontSize: 11 }}>
                    {a.actions} actions · {a.held} asked · {a.blocked} refused · {a.tokens.toLocaleString('en-IN')} tokens · ₹{a.costInr.toFixed(2)} · risk {a.riskScore}
                  </div>
                  {a.status === 'PAUSED' && <div style={{ fontSize: 11, color: 'var(--block)' }}>{a.statusReason}</div>}
                </div>
                {a.status === 'PAUSED' ? (
                  <button className="btn btn-ghost btn-sm" onClick={() => act(c.tenant, 'resume', a.id)}>
                    Resume
                  </button>
                ) : (
                  <button className="btn btn-ghost btn-sm btn-danger" onClick={() => act(c.tenant, 'pause', a.id)}>
                    Pause
                  </button>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1.35fr) minmax(0, 1fr)', alignItems: 'start' }}>
        <div className="panel">
          <div className="panel-title">
            <span>
              <b>Agents at work</b> · live sessions from the company sites
            </span>
            <span>{f.sessions.filter((s) => s.status === 'running' || s.status === 'waiting').length} active</span>
          </div>
          {!f.sessions.length && <div className="muted">No sessions yet. Open a company site and ask its agent something.</div>}
          {f.sessions.map((s) => (
            <div key={`${s.tenant}-${s.id}`} className="panel" style={{ marginBottom: 10, padding: 12, borderColor: s.status === 'waiting' ? 'color-mix(in srgb, var(--human) 60%, transparent)' : s.status === 'paused' ? 'color-mix(in srgb, var(--block) 60%, transparent)' : undefined }}>
              <div className="row between" style={{ gap: 8 }}>
                <div className="row" style={{ gap: 8, minWidth: 0 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 4, background: TONE[s.tenant], flex: 'none' }} />
                  <b style={{ fontWeight: 500 }}>{s.agentName}</b>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {short(s.company)} · {s.id} · for {s.by}
                  </span>
                </div>
                <span className={`chip chip-${s.status === 'done' ? 'allow' : s.status === 'waiting' ? 'human' : s.status === 'running' ? 'info' : 'block'}`}>{s.status === 'running' ? 'working' : s.status}</span>
              </div>
              <div style={{ margin: '6px 0 8px', fontSize: 13.5 }}>“{s.command.replace(/<!--[\s\S]*-->/, '⟨hidden instruction⟩').slice(0, 180)}”</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {s.steps.map((st, i) => (
                  <div key={i} style={{ fontSize: 12, display: 'grid', gridTemplateColumns: '58px 1fr auto', gap: 8, alignItems: 'baseline', color: st.kind === 'thought' ? 'var(--muted)' : undefined }}>
                    <span className="mono dim">{hhmm(st.at)}</span>
                    <span style={{ minWidth: 0 }}>
                      {st.kind === 'thought' && <i>💭 {st.text?.slice(0, 160)}</i>}
                      {st.kind === 'action' && (
                        <>
                          <span className="mono">{st.action}</span> <span className="dim mono">{JSON.stringify(st.params ?? {}).slice(0, 80)}</span>
                          {st.decision !== 'ALLOWED' && <div className="muted">{st.reason?.slice(0, 160)}</div>}
                        </>
                      )}
                      {st.kind === 'result' && <span>{st.text}</span>}
                      {st.kind === 'security' && <span style={{ color: 'var(--warn)' }}>🛡 {st.text}</span>}
                      {st.kind === 'final' && <span>💬 {st.text?.slice(0, 220)}</span>}
                    </span>
                    <span>{st.decision ? <Chip d={st.decision} /> : null} {st.gatewayMs !== undefined && <span className="mono dim">{st.gatewayMs}ms</span>}</span>
                  </div>
                ))}
              </div>
              <div className="dim" style={{ fontSize: 11, marginTop: 6 }}>
                {s.model ?? s.planner} · {s.tokens.toLocaleString('en-IN')} tokens · ₹{s.costInr.toFixed(3)} · owner {s.owner} · {ago(s.updatedAt, f.now)}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {f.pending.map((p) => (
            <div key={p.id} className="panel waiting">
              <div className="panel-title">
                <span>
                  <b style={{ color: 'var(--human)' }}>Waiting for a person</b> · {short(p.company)}
                </span>
                <span className="mono">{p.id}</span>
              </div>
              <div className="row" style={{ gap: 14, alignItems: 'flex-start' }}>
                <div style={{ width: 120, flex: 'none' }}>{origin && <Qr url={`${origin}/approve/${p.id}`} />}</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 500 }}>{p.summary}</div>
                  <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>
                    {p.why}
                  </div>
                  <div className="dim" style={{ fontSize: 11.5, marginTop: 6 }}>
                    {p.approverRole.replace('_', ' ')}
                    {p.twoKey > 1 ? ` · two people (${p.votes.length}/${p.twoKey})` : ''} · asked {ago(p.createdAt, f.now)} · scan to decide
                  </div>
                  <Link className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} href={`/approve/${p.id}`} target="_blank">
                    Open approval ↗
                  </Link>
                </div>
              </div>
            </div>
          ))}

          <div className="panel">
            <div className="panel-title">
              <span>
                <b>Speed vs control</b> · every agent action, by outcome
              </span>
              <span>{f.companies[0]?.series.bucketMs === 120_000 ? 'last hour' : 'last 24 h'}</span>
            </div>
            <SpeedChart points={points} />
            <div className="row" style={{ gap: 14, fontSize: 11.5, marginTop: 6 }} >
              <span style={{ color: 'var(--allow)' }}>■ ran on its own</span>
              <span style={{ color: 'var(--human)' }}>■ asked a person</span>
              <span style={{ color: 'var(--block)' }}>■ refused</span>
              <span className="muted">— gateway p95 (ms)</span>
            </div>
          </div>

          <div className="panel">
            <div className="panel-title">
              <span>
                <b>Who approved what</b> · accountability
              </span>
            </div>
            {!f.decided.length && <div className="muted">No approvals decided yet.</div>}
            {f.decided.map((d) => (
              <div key={d.id} style={{ padding: '6px 0', borderTop: '1px solid var(--border-soft)', fontSize: 12.5 }}>
                <div className="row between">
                  <span>
                    <span className="mono">{d.id}</span> · {d.summary}
                  </span>
                  <Chip d={d.status} />
                </div>
                <div className="muted" style={{ fontSize: 11.5 }}>
                  {short(d.company)} · by {d.by} · waited {d.waitS}s
                </div>
              </div>
            ))}
          </div>

          <div className="panel">
            <div className="panel-title">
              <span>
                <b>Decision stream</b> · all companies
              </span>
              <Link href="/ledger" className="muted">
                ledger →
              </Link>
            </div>
            <div className="feed" style={{ maxHeight: 330 }}>
              {f.feed.map((r) => (
                <div key={`${r.company}-${r.seq}`} className="feed-row" style={{ gridTemplateColumns: '58px 92px 1fr auto' }}>
                  <span className="mono dim">{hhmm(r.ts)}</span>
                  <span className="muted" style={{ fontSize: 11 }}>
                    {short(r.company)}
                  </span>
                  <span className="what" title={r.reason}>
                    <b style={{ fontWeight: 500 }}>{r.actor}</b> · {r.desc ?? r.action}
                    {r.approvers?.length ? ` · ✓ ${r.approvers.join(' + ')}` : ''}
                  </span>
                  <Chip d={r.decision} />
                </div>
              ))}
            </div>
          </div>

          {f.security.length > 0 && (
            <div className="panel">
              <div className="panel-title">
                <span>
                  <b>Security events</b>
                </span>
                <Link href="/security" className="muted">
                  security →
                </Link>
              </div>
              {f.security.map((s, i) => (
                <div key={i} style={{ padding: '5px 0', borderTop: '1px solid var(--border-soft)', fontSize: 12 }}>
                  <span className={`chip chip-${s.severity === 'critical' || s.severity === 'high' ? 'block' : 'warn'}`}>{s.severity}</span> {s.kind} · {short(s.company)}
                  <div className="muted" style={{ fontSize: 11.5 }}>
                    {s.owasp} · {s.detail.slice(0, 140)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function Kpi({ label, value, note, color }: { label: string; value: string; note: string; color?: string }) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={color ? { color } : undefined}>
        {value}
      </div>
      <div className="kpi-note">{note}</div>
    </div>
  );
}
