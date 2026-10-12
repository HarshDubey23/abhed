'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

type Agent = { id: string; name: string; job: string; status: string; online: boolean; lastSeen: number | null };
type Note = { at: number; text: string; tone: 'info' | 'ok' | 'warn' };
type Act = { seq: number; ts: number; actor: string; action: string; decision: string; reason: string; rule?: string; ms?: number };
type Company = {
  tenant: string;
  company: string;
  industry: string;
  since: number | null;
  site: { url: string; name: string; at: number } | null;
  timeline: Note[];
  agents: Agent[];
  activity: Act[];
  pending: { id: string; summary: string }[];
  rules: { id: string; says: string }[];
};
type State = { pending: { code: string; exp: number } | null; log: Note[]; companies: Company[] };

const DECISION: Record<string, [string, string]> = {
  ALLOWED: ['allow', 'Allowed'],
  EXECUTED: ['allow', 'Executed'],
  NEEDS_APPROVAL: ['human', 'To a person'],
  BLOCKED: ['block', 'Stopped'],
  PAUSED: ['block', 'Paused'],
  INFO: ['muted', 'Logged'],
};
const clock = (ts: number) => new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
const host = (u?: string) => (u ?? '').replace(/^https?:\/\//, '');

export default function ConnectPage() {
  const [s, setS] = useState<State | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [joined, setJoined] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const known = useRef<Set<string> | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    let alive = true;
    const tick = async () => {
      try {
        const j = (await (await fetch('/api/connect', { cache: 'no-store' })).json()) as State;
        if (!alive) return;
        const ids = new Set(j.companies.map((c) => c.tenant));
        if (known.current) {
          const fresh = [...ids].find((id) => !known.current!.has(id));
          if (fresh) {
            setJoined(fresh);
            setOpen(fresh);
          }
        }
        known.current = ids;
        setS(j);
      } catch {
        /* keep the last frame */
      }
      if (alive) setTimeout(tick, 1500);
    };
    void tick();
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    const r = await fetch('/api/connect', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    setBusy(false);
    if (!r.ok) window.alert(((await r.json().catch(() => ({}))) as { error?: string }).error ?? 'Failed');
    return r.ok;
  }
  const withPin = async (label: string, body: Record<string, unknown>) => {
    const pin = window.prompt(`${label}\nPIN:`);
    if (pin) return post({ ...body, pin });
    return false;
  };

  const left = s?.pending ? Math.max(0, Math.round((s.pending.exp - now) / 1000)) : 0;
  const j = joined ? s?.companies.find((c) => c.tenant === joined) : null;

  return (
    <main className="page cn">
      <header className="page-head">
        <div>
          <div className="kicker">Connect</div>
          <h1 className="page-title">
            Add a company. <em>Watch it come alive.</em>
          </h1>
          <p className="page-sub">Abhed knows nothing about a company until its website pairs.</p>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          disabled={busy}
          onClick={async () => {
            if (await withPin('Reset the demo: only NovaBank stays in Abhed.', { action: 'reset' })) {
              setJoined(null);
              setOpen(null);
              known.current = null;
            }
          }}
        >
          Reset demo
        </button>
      </header>

      <div className="cn-grid">
        <section className="panel cn-add">
          {j ? (
            <div className="cn-joined">
              <span className="cn-tick">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              </span>
              <div className="cn-label ok">Joined just now</div>
              <div className="cn-name">{j.company}</div>
              <div className="dim">{host(j.site?.url)}</div>
              <ul className="cn-check">
                <li className="done">Website paired with a one-time code</li>
                <li className="done">{j.industry} rulebook applied · {j.rules.length} deterministic rules</li>
                {j.agents.map((a) => (
                  <li key={a.id} className={a.online ? 'done' : 'wait'}>
                    {a.name} {a.online ? 'online' : 'coming online…'}
                  </li>
                ))}
              </ul>
              <div className="row" style={{ gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
                <Link className="btn btn-solid" href="/fleet">
                  Live monitor
                </Link>
                <button className="btn btn-ghost" onClick={() => setJoined(null)}>
                  Add another
                </button>
              </div>
            </div>
          ) : s?.pending ? (
            <>
              <div className="cn-label">Pairing code</div>
              <div className="cn-code" aria-label={`Pairing code ${s.pending.code.split('').join(' ')}`}>
                {s.pending.code.split('').map((ch, i) => (
                  <span key={i} style={{ animationDelay: `${i * 0.06}s` }}>
                    {ch}
                  </span>
                ))}
              </div>
              <div className="cn-wait">
                <span className="live-dot" style={{ background: 'var(--human)' }} /> Waiting for a website · {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
              </div>
              <p className="cn-copy">Enter it on the company’s website, in its admin.</p>
              <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void post({ action: 'code' })}>
                New code
              </button>
            </>
          ) : (
            <>
              <div className="cn-label">Add a company</div>
              <p className="cn-copy">Generate a one-time code and give it to the company’s admin. Their website introduces itself; their agents come online here.</p>
              <button className="btn btn-solid cn-go" disabled={busy} onClick={() => void post({ action: 'code' })}>
                Generate pairing code
              </button>
            </>
          )}
          {s && s.log.length > 0 && (
            <details className="cn-log">
              <summary>Activity · {s.log.length}</summary>
              {s.log.map((n, i) => (
                <div key={i} className={`cn-note t-${n.tone}`}>
                  <span className="mono dim">{clock(n.at)}</span>
                  <span>{n.text}</span>
                </div>
              ))}
            </details>
          )}
        </section>

        <section className="cn-list">
          <div className="cn-list-h">
            In Abhed <span className="dim">{s ? s.companies.length : '…'}</span>
          </div>
          {s && s.companies.length === 0 && <div className="panel dim">No companies yet.</div>}
          {s?.companies.map((c) => {
            const on = c.agents.filter((a) => a.online).length;
            const isOpen = open === c.tenant;
            return (
              <article key={c.tenant} className={`panel cn-co ${isOpen ? 'open' : ''} ${joined === c.tenant ? 'fresh' : ''}`}>
                <button className="cn-row" onClick={() => setOpen(isOpen ? null : c.tenant)} aria-expanded={isOpen}>
                  <span className="cn-av">{c.company[0]}</span>
                  <span className="cn-row-m">
                    <b>{c.company}</b>
                    <span className="dim">
                      {c.industry} · {host(c.site?.url) || 'setup'}
                    </span>
                  </span>
                  <span className={`cn-on ${on ? 'yes' : ''}`}>
                    <i /> {on}/{c.agents.length} online
                  </span>
                  <span className="cn-chev" aria-hidden="true">
                    ›
                  </span>
                </button>
                {isOpen && (
                  <div className="cn-detail">
                    <div className="cn-sec">
                      <div className="cn-sec-h">Agents</div>
                      {c.agents.map((a) => (
                        <div key={a.id} className={`cn-agent ${a.online ? 'on' : ''}`}>
                          <b>{a.name}</b>
                          <span className="dim">{a.job}</span>
                          <span className="cn-hb">
                            <i />
                            {a.online ? `${Math.max(0, Math.round((now - (a.lastSeen ?? now)) / 1000))}s ago` : 'off'}
                          </span>
                        </div>
                      ))}
                    </div>
                    <details className="cn-sec">
                      <summary className="cn-sec-h">Rulebook · {c.rules.length} deterministic rules</summary>
                      {c.rules.map((r) => (
                        <div key={r.id} className="cn-rule">
                          <span className="mono">{r.id}</span> {r.says}
                        </div>
                      ))}
                      <Link className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} href="/rules">
                        Add the company’s own rule
                      </Link>
                    </details>
                    <div className="cn-sec">
                      <div className="cn-sec-h">Live</div>
                      {c.pending.map((p) => (
                        <Link key={p.id} href={`/approve/${p.id}`} className="cn-pend">
                          <span className="chip chip-human">Waiting for a person</span> {p.summary}
                        </Link>
                      ))}
                      {c.activity.length === 0 && c.timeline.length === 0 && <div className="dim">Nothing yet.</div>}
                      {c.activity.slice(0, 6).map((a) => (
                        <div key={a.seq} className="cn-act">
                          <span>
                            <b>{a.actor}</b> {a.action.replace(/_/g, ' ')}
                          </span>
                          <span className={`chip chip-${(DECISION[a.decision] ?? ['muted'])[0]}`}>{(DECISION[a.decision] ?? ['', a.decision])[1]}</span>
                        </div>
                      ))}
                      {c.timeline.slice(0, 5).map((n, i) => (
                        <div key={i} className={`cn-note t-${n.tone}`}>
                          <span className="mono dim">{clock(n.at)}</span>
                          <span>{n.text}</span>
                        </div>
                      ))}
                    </div>
                    <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                      {c.site && (
                        <a className="btn btn-ghost btn-sm" href={c.site.url} target="_blank" rel="noreferrer">
                          Open website ↗
                        </a>
                      )}
                      <button className="btn btn-ghost btn-sm btn-danger" disabled={busy} onClick={() => void withPin(`Remove ${c.company} from Abhed? Its data is wiped and its agents are cut off.`, { action: 'remove', tenant: c.tenant })}>
                        Remove company
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
