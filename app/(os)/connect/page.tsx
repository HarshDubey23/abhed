'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

type Agent = { id: string; name: string; job: string; status: string; online: boolean; lastSeen: number | null };
type Item = { at: number; text: string; tone: 'info' | 'ok' | 'warn' };
type Act = { seq: number; ts: number; actor: string; action: string; decision: string; reason: string; rule?: string; ms?: number };
type Company = {
  tenant: string;
  company: string;
  status: 'connected' | 'waiting' | 'disconnected';
  code: string | null;
  codeExp: number | null;
  since: number | null;
  site: { url: string; name: string; at: number } | null;
  timeline: Item[];
  agents: Agent[];
  activity: Act[];
  pending: { id: string; summary: string }[];
};

const SITE: Record<string, string> = {
  banking: 'novabank-agents.onrender.com',
  healthcare: 'sanjeevani-agents.onrender.com',
  ecommerce: 'bazaar-agents.onrender.com',
};
const STATUS: Record<Company['status'], [string, string]> = {
  connected: ['allow', 'Connected'],
  waiting: ['human', 'Waiting for website'],
  disconnected: ['muted', 'Not connected'],
};
const DECISION: Record<string, [string, string]> = {
  ALLOWED: ['allow', 'Allowed'],
  EXECUTED: ['allow', 'Executed'],
  NEEDS_APPROVAL: ['human', 'Sent to a person'],
  BLOCKED: ['block', 'Stopped'],
  PAUSED: ['block', 'Agent paused'],
  INFO: ['muted', 'Logged'],
};
const clock = (ts: number) => new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
const ago = (ts: number | null, now: number) => (ts ? `${Math.max(0, Math.round((now - ts) / 1000))}s ago` : 'never');

export default function ConnectPage() {
  const [list, setList] = useState<Company[] | null>(null);
  const [tenant, setTenant] = useState('healthcare');
  const [one, setOne] = useState<Company | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [flash, setFlash] = useState(false);
  const prev = useRef<string | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('tenant');
    if (q) setTenant(q);
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const [all, me] = await Promise.all([fetch('/api/connect', { cache: 'no-store' }).then((r) => r.json()), fetch(`/api/connect?tenant=${tenant}`, { cache: 'no-store' }).then((r) => r.json())]);
        if (!alive) return;
        setList((all as { companies: Company[] }).companies);
        const c = me as Company;
        if (prev.current && prev.current !== 'connected' && c.status === 'connected') {
          setFlash(true);
          setTimeout(() => setFlash(false), 2400);
        }
        prev.current = c.status;
        setOne(c);
      } catch {
        /* keep the last frame */
      }
      if (alive) setTimeout(tick, 1500);
    };
    prev.current = null;
    void tick();
    return () => {
      alive = false;
    };
  }, [tenant]);

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    const r = await fetch('/api/connect', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tenant, ...body }) });
    setBusy(false);
    if (!r.ok) window.alert(((await r.json().catch(() => ({}))) as { error?: string }).error ?? 'Failed');
  }

  const c = one?.tenant === tenant ? one : null;
  const left = c?.codeExp ? Math.max(0, Math.round((c.codeExp - now) / 1000)) : 0;
  const online = c?.agents.filter((a) => a.online).length ?? 0;
  const feed = c
    ? [
        ...c.timeline.map((t) => ({ key: `t${t.at}${t.text}`, at: t.at, kind: 'note' as const, t })),
        ...c.activity.filter((a) => a.action !== 'connect_site' && a.action !== 'disconnect_site').map((a) => ({ key: `a${a.seq}`, at: a.ts, kind: 'act' as const, a })),
      ].sort((x, y) => y.at - x.at)
    : [];

  return (
    <main className="page cn">
      <header className="page-head">
        <div>
          <div className="kicker">Connect · live</div>
          <h1 className="page-title">
            Connect a company. <em>Watch its agents come online.</em>
          </h1>
          <p className="page-sub">A company’s website runs its own AI agents. Abhed gives it a one-time code; the company’s admin enters it; from that second every action those agents take goes through Abhed. Disconnect, and their keys are refused.</p>
        </div>
      </header>

      <section className="cn-cos">
        {(list ?? []).map((x) => (
          <button key={x.tenant} className={`cn-co ${x.tenant === tenant ? 'on' : ''}`} onClick={() => setTenant(x.tenant)}>
            <span className="cn-co-h">
              <b>{x.company.replace(' (fictional)', '')}</b>
              <span className={`chip chip-${STATUS[x.status][0]}`}>{STATUS[x.status][1]}</span>
            </span>
            <span className="cn-co-s">{x.site?.url.replace(/^https?:\/\//, '') ?? SITE[x.tenant]}</span>
            <span className="cn-co-s">{x.status === 'connected' ? `${x.agents.filter((a) => a.online).length} of ${x.agents.length} agents online` : 'agents switched off'}</span>
          </button>
        ))}
      </section>

      {c && (
        <div className="cn-main">
          <section className={`panel cn-stage ${flash ? 'flash' : ''}`}>
            {c.status === 'connected' ? (
              <>
                <div className="cn-big-ok">
                  <span className="cn-tick">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                  </span>
                  <div>
                    <div className="cn-label">Connected</div>
                    <div className="cn-site">{c.site?.url.replace(/^https?:\/\//, '') ?? SITE[c.tenant]}</div>
                    <div className="dim">since {c.since ? clock(c.since) : '—'} · {online} of {c.agents.length} agents online</div>
                  </div>
                </div>
                <div className="row" style={{ gap: 10, flexWrap: 'wrap', marginTop: 22 }}>
                  <a className="btn btn-solid" href={c.site?.url ?? `https://${SITE[c.tenant]}`} target="_blank" rel="noreferrer">
                    Open the website ↗
                  </a>
                  <Link className="btn btn-ghost" href="/approver">
                    Approver app
                  </Link>
                  <button
                    className="btn btn-ghost"
                    disabled={busy}
                    onClick={() => {
                      const pin = window.prompt(`PIN to disconnect ${c.company.replace(' (fictional)', '')}`);
                      if (pin) void post({ action: 'disconnect', pin });
                    }}
                  >
                    Disconnect
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="cn-label">{c.code ? 'Pairing code' : 'Not connected'}</div>
                {c.code ? (
                  <>
                    <div className="cn-code" aria-label={`Pairing code ${c.code.split('').join(' ')}`}>
                      {c.code.split('').map((ch, i) => (
                        <span key={i} style={{ animationDelay: `${i * 0.06}s` }}>
                          {ch}
                        </span>
                      ))}
                    </div>
                    <div className="cn-wait">
                      <span className="live-dot" style={{ background: 'var(--human)' }} /> Waiting for the website · code valid {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
                    </div>
                    <ol className="cn-steps">
                      <li>
                        Open <b>{SITE[c.tenant]}/admin</b> and sign in (PIN <b>2468</b>)
                      </li>
                      <li>Type this code and press Connect</li>
                      <li>Watch the agents come online on the right</li>
                    </ol>
                    <div className="row" style={{ gap: 10, marginTop: 18 }}>
                      <a className="btn btn-solid" href={`https://${SITE[c.tenant]}/admin`} target="_blank" rel="noreferrer">
                        Open its admin ↗
                      </a>
                      <button className="btn btn-ghost" disabled={busy} onClick={() => void post({ action: 'code' })}>
                        New code
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="cn-copy">{c.company.replace(' (fictional)', '')}’s website is running, but its AI agents are switched off: Abhed refuses their keys until the company pairs. Generate a one-time code and give it to the company’s admin.</p>
                    <button className="btn btn-solid cn-go" disabled={busy} onClick={() => void post({ action: 'code' })}>
                      Generate pairing code
                    </button>
                  </>
                )}
              </>
            )}

            <div className="cn-agents">
              <div className="panel-title">
                <span>
                  <b>Agents</b> · heartbeat every 10 s
                </span>
              </div>
              {c.agents.map((a) => (
                <div key={a.id} className={`cn-agent ${a.online ? 'on' : ''}`}>
                  <span className="cn-av">{a.name[0]}</span>
                  <span>
                    <b>{a.name}</b>
                    <span className="dim">{a.job}</span>
                  </span>
                  <span className="cn-hb">
                    <i />
                    {a.online ? `online · ${ago(a.lastSeen, now)}` : c.status === 'connected' ? 'connecting…' : 'off'}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <aside className="panel cn-feed">
            <div className="panel-title">
              <span>
                <b>Live</b> · connection and governed actions
              </span>
              <span className="live-dot" />
            </div>
            {c.pending.length > 0 && (
              <div className="cn-pending">
                {c.pending.map((p) => (
                  <Link key={p.id} href={`/approve/${p.id}`} className="cn-pend">
                    <span className="chip chip-human">Waiting for a person</span> {p.summary} →
                  </Link>
                ))}
              </div>
            )}
            {feed.length === 0 && <p className="dim">Nothing yet. Generate a code to begin.</p>}
            {feed.map((f) =>
              f.kind === 'note' ? (
                <div key={f.key} className={`cn-note t-${f.t.tone}`}>
                  <span className="mono dim">{clock(f.at)}</span>
                  <span>{f.t.text}</span>
                </div>
              ) : (
                <div key={f.key} className="cn-act">
                  <div className="row between">
                    <span>
                      <b>{f.a.actor}</b> {f.a.action.replace(/_/g, ' ')}
                    </span>
                    <span className={`chip chip-${(DECISION[f.a.decision] ?? ['muted'])[0]}`}>{(DECISION[f.a.decision] ?? ['', f.a.decision])[1]}</span>
                  </div>
                  <div className="dim cn-why">
                    {f.a.reason}
                    {f.a.rule ? <span className="mono"> · {f.a.rule}</span> : null}
                    {f.a.ms != null ? <span className="mono"> · {f.a.ms.toFixed(2)} ms</span> : null}
                    <span className="mono"> · #{f.a.seq}</span>
                  </div>
                </div>
              ),
            )}
          </aside>
        </div>
      )}
    </main>
  );
}
