'use client';

import { useRouter } from 'next/navigation';
import { use, useCallback, useEffect, useRef, useState } from 'react';
import { KavachMark } from '@/components/mark';
import type { Approval } from '@/lib/types';
import { authHeader, saveToken } from '@/lib/approver-client';
import GazeVideo from '../gaze-video';
import '../approve.css';

interface Payload {
  approval: Approval & { currentHash: string; assigneeNames?: string[] };
  tenant: string;
  company: string;
  me: { id: string; name: string; title: string; roles: string[]; can: { ok: boolean; why?: string } } | null;
  agent: { name: string; framework: string; model: string; risk: string; ownerName: string; purpose: string } | null;
  proposer: string | null;
  ownerName: string | null;
  now: number;
}

type Tab = 'why' | 'evidence' | 'reasoning' | 'fingerprint';
const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;


function Icon({ kind }: { kind: 'shield' | 'clock' | 'print' }) {
  if (kind === 'clock')
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  if (kind === 'print')
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
        <path d="M12 3a8 8 0 0 0-8 8v2M20 11a8 8 0 0 0-5-7.4M8 20.5A12 12 0 0 1 7 11a5 5 0 0 1 10 0c0 2 0 4-.6 6M12 11v3a14 14 0 0 1-1.5 7M16.3 20a20 20 0 0 0 .7-3" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <g transform="rotate(-30 12 12)">
        <circle cx="7.3" cy="3.2" r="1.45" />
        <rect x="5.5" y="4.7" width="3.6" height="14.6" rx="1.8" />
        <rect x="14.9" y="4.7" width="3.6" height="14.6" rx="1.8" />
        <circle cx="16.7" cy="20.8" r="1.45" />
      </g>
    </svg>
  );
}

export default function ApprovePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<Payload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [people, setPeople] = useState<{ id: string; name: string; title: string }[]>([]);
  const [who, setWho] = useState('');
  const [pin, setPin] = useState('');
  const [note, setNote] = useState('');
  const [tab, setTab] = useState<Tab>('why');
  const [evViewed, setEvViewed] = useState(false);
  const [sending, setSending] = useState(false);
  const [now, setNow] = useState(Date.now());
  const router = useRouter();
  const [fromApprover, setFromApprover] = useState(false);
  const openedAt = useRef<number | null>(null);
  const shownHash = useRef<string | null>(null);

  useEffect(() => {
    setFromApprover(new URLSearchParams(window.location.search).get('from') === 'approver');
  }, []);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/approvals/${id}`, { cache: 'no-store', headers: authHeader() });
      const d = (await r.json()) as Payload & { error?: string };
      if (!r.ok) {
        setErr(d.error ?? 'Not found');
        return;
      }
      setData(d);
      if (openedAt.current === null) {
        openedAt.current = performance.now();
        shownHash.current = d.approval.actionHash; // the exact action this person is looking at
      }
    } catch {
      /* keep last */
    }
  }, [id]);

  useEffect(() => {
    void load();
    const t = setInterval(load, 2500);
    const c = setInterval(() => setNow(Date.now()), 500);
    return () => {
      clearInterval(t);
      clearInterval(c);
    };
  }, [load]);

  const choose = (t: Tab) => {
    setTab(t);
    if (t === 'evidence') setEvViewed(true);
  };

  // people of this company who can sign in to decide
  useEffect(() => {
    if (!data || data.me || people.length) return;
    fetch('/api/approver/people')
      .then((r) => r.json())
      .then((all: { tenant: string; people: { id: string; name: string; title: string }[] }[]) => {
        const list = all.find((c) => c.tenant === data.tenant)?.people ?? [];
        setPeople(list);
        setWho((w) => w || list.find((p) => p.id === 'judge')?.id || list[0]?.id || '');
      })
      .catch(() => undefined);
  }, [data, people.length]);

  const signIn = async () => {
    if (!data) return;
    setSending(true);
    setErr(null);
    const r = await fetch('/api/approver/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tenant: data.tenant, humanId: who, pin }) });
    const d = (await r.json()) as { token?: string; error?: string };
    setSending(false);
    if (!r.ok || !d.token) return setErr((d.error ?? 'could not sign in').toLowerCase());
    saveToken(data.tenant, d.token);
    setPin('');
    void load();
  };

  const decide = async (decision: 'approve' | 'reject' | 'hold' | 'release' | 'escalate') => {
    if (!data) return;
    setSending(true);
    setErr(null);
    const decisionMs = Math.round(performance.now() - (openedAt.current ?? performance.now()));
    const r = await fetch(`/api/approvals/${id}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeader() },
      body: JSON.stringify({
        decision,
        note,
        actionHash: shownHash.current,
        decisionMs,
        evidenceViewed: evViewed,
        device: /iPhone|Android/i.test(navigator.userAgent) ? 'phone' : 'browser',
      }),
    });
    const d = (await r.json()) as { error?: string; needSignIn?: boolean };
    setSending(false);
    if (d.needSignIn) saveToken(data.tenant, null);
    if (!r.ok) setErr((d.error ?? 'refused').toLowerCase());
    setNote('');
    void load();
  };

  const ap = data?.approval;
  const p = (ap?.req.params ?? {}) as Record<string, unknown>;
  const amount = typeof p.amount === 'number' ? p.amount : null;
  const secs = ap ? Math.max(0, Math.round((ap.expiresAt - now) / 1000)) : 0;
  const clock = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  const isRule = ap?.kind === 'rule_change';
  const actor = data?.agent?.name ?? data?.proposer ?? 'someone';
  const me = data?.me ?? null;
  const myVote = ap?.votes.find((v) => (me ? v.approverId === me.id || v.name === me.name : false));
  const pending = ap?.status === 'PENDING' && !myVote;
  const done = ap && !pending;

  // back to duty after a decision when this card was opened from the approver phone
  useEffect(() => {
    if (!done || !fromApprover) return;
    const t = setTimeout(() => router.push('/approver'), 4500);
    return () => clearTimeout(t);
  }, [done, fromApprover, router]);

  const title = !ap ? (
    err ? (
      <>
        this card
        <br />
        isn’t here
      </>
    ) : (
      <>
        opening
        <br />
        the card…
      </>
    )
  ) : ap.status === 'EXECUTED' || ap.status === 'APPROVED' ? (
    <>
      approved.
      <br />
      your name is on it.
    </>
  ) : ap.status === 'PENDING' && myVote ? (
    <>
      key {ap.votes.length} of {ap.twoKey} turned.
      <br />
      one more person.
    </>
  ) : ap.status !== 'PENDING' ? (
    <>
      {ap.status.toLowerCase()}.
      <br />
      nothing moved.
    </>
  ) : isRule ? (
    <>
      a new rule wants
      <br />
      to go live
    </>
  ) : amount !== null ? (
    <>
      {actor.toLowerCase()} wants to refund
      <br />
      {inr(amount)}
    </>
  ) : (
    <>
      {actor.toLowerCase()} wants to
      <br />
      {ap.req.action.replace(/_/g, ' ')}
    </>
  );

  const tabs: [Tab, string][] = [
    ['why', 'why you'],
    ['evidence', 'evidence'],
    ['reasoning', 'agent’s reasoning'],
    ['fingerprint', 'fingerprint'],
  ];

  return (
    <footer className="ap" aria-label="Approval">
      <GazeVideo />

      <div className="ap-jobs">
        <span className="ap-tag">{!ap ? 'kavach approval' : done ? 'recorded in the ledger' : `waiting for you · ${clock}`}</span>
        <span className="ap-headline ap-job-title">{title}</span>

        {ap && !done && (
          <>
            <div className="ap-nav">
              {tabs.map(([k, label]) => (
                <button key={k} aria-pressed={tab === k} onClick={() => choose(k)}>
                  {label}
                </button>
              ))}
            </div>
            <div className="ap-detail">
              {tab === 'why' && (
                <>
                  <div>{ap.summary}.</div>
                  <div style={{ marginTop: '0.6em' }}>{ap.why}</div>
                  <div style={{ marginTop: '0.6em', opacity: 0.6 }}>
                    {data?.company.replace(' (fictional)', '')} · {ap.ruleIds.join(' · ') || 'no rule covers this high-impact action'} · needs {ap.approverRole.replace('_', ' ')}
                    {ap.twoKey > 1 ? ` × ${ap.twoKey}` : ''}
                    {ap.assigneeNames?.length ? ` · routed to ${ap.assigneeNames.join(', ')}` : ''}
                  </div>
                  {ap.hold && (
                    <div style={{ marginTop: '0.6em' }}>
                      on hold by {ap.hold.by}
                      {ap.hold.note ? `: “${ap.hold.note}”` : ''}
                    </div>
                  )}
                  {ap.history?.length ? (
                    <div style={{ marginTop: '0.6em', opacity: 0.6 }}>
                      {ap.history.slice(-3).map((h) => (
                        <div key={h.at}>
                          {h.by} {h.what}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </>
              )}
              {tab === 'evidence' &&
                ap.evidence.map((e) => (
                  <div className="ap-detail-row" key={e.label}>
                    <span>{e.label}</span>
                    <span>{e.value}</span>
                  </div>
                ))}
              {tab === 'reasoning' && (
                <div>
                  <span style={{ opacity: 0.6 }}>untrusted, shown after the facts: </span>“{ap.agentReasoning ?? (isRule ? 'a person proposed this, not an agent.' : 'no reasoning given.')}”
                </div>
              )}
              {tab === 'fingerprint' && (
                <div>
                  this approval is bound to the exact action. change one rupee and it’s void.
                  <div className="ap-mono" style={{ marginTop: '0.6em', opacity: 0.7 }}>
                    {ap.actionHash}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {ap && done && (
          <div className="ap-nav ap-facts">
            {ap.status === 'EXECUTED' && ap.executedSeq && <span>record #{ap.executedSeq}</span>}
            {ap.votes.map((v) => (
              <span key={v.name + v.at}>
                {v.name} · {(v.decisionMs / 1000).toFixed(1)} s · evidence {v.evidenceViewed ? 'opened' : 'not opened'}
              </span>
            ))}
            <span>{ap.summary}</span>
          </div>
        )}
      </div>

      <div className="ap-logo" role="img" aria-label="Kavach">
        <span className="ap-wordmark">
          <KavachMark /> kavach
        </span>
      </div>

      <div className="ap-contact">
        <span className="ap-tag">{done ? 'ledger' : 'your call'}</span>
        {ap && pending && !me ? (
          <>
            <p className="ap-note" style={{ marginTop: 0 }}>
              sign in as a {data?.company.replace(' (fictional)', '').toLowerCase()} approver. your decision is signed with your identity.
            </p>
            <select className="ap-name" value={who} onChange={(e) => setWho(e.target.value)} aria-label="Who are you">
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.title}
                </option>
              ))}
            </select>
            <input className="ap-name" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="your PIN" inputMode="numeric" type="password" aria-label="PIN" />
            <div className="ap-contact-links">
              <button disabled={sending || pin.length < 4 || !who} onClick={signIn}>
                sign in →
              </button>
            </div>
          </>
        ) : ap && pending && me ? (
          <>
            <p className="ap-note" style={{ marginTop: 0 }}>
              signed in as {me.name.toLowerCase()} · {me.title.toLowerCase()}{' '}
              <button style={{ textDecoration: 'underline', background: 'none', border: 0, color: 'inherit', cursor: 'pointer', font: 'inherit' }} onClick={() => { saveToken(data!.tenant, null); void load(); }}>
                switch
              </button>
            </p>
            {me.can.ok ? (
              <div className="ap-contact-links">
                <button disabled={sending} onClick={() => decide('approve')}>
                  approve it →
                </button>
                <button disabled={sending} onClick={() => decide('reject')}>
                  reject it*
                </button>
              </div>
            ) : (
              <p className="ap-err">{me.can.why?.toLowerCase()}</p>
            )}
            <input className="ap-name" value={note} onChange={(e) => setNote(e.target.value.slice(0, 160))} placeholder="note (optional, for hold or escalate)" aria-label="Note" />
            <div className="ap-contact-links" style={{ fontSize: '0.8em' }}>
              {ap.hold ? (
                <button disabled={sending} onClick={() => decide('release')}>
                  release hold
                </button>
              ) : (
                <button disabled={sending || !me.can.ok} onClick={() => decide('hold')}>
                  hold ⏸
                </button>
              )}
              {ap.approverRole !== 'executive' && ap.kind !== 'rule_change' && (
                <button disabled={sending} onClick={() => decide('escalate')}>
                  escalate ↑
                </button>
              )}
            </div>
            <p className="ap-note">*approves only this exact action, once, before the timer ends.</p>
          </>
        ) : (
          <>
            <div className="ap-headline ap-contact-links">
              <span>{ap?.status === 'EXECUTED' ? 'executed once ✓' : ap?.status === 'PENDING' ? 'waiting for key 2' : 'nothing executed'}</span>
              <span>exact action only*</span>
            </div>
            <p className="ap-note">
              {ap?.votes.some((v) => !v.evidenceViewed && v.decisionMs < 4000)
                ? '*kavach noticed a fast approval without evidence. it governs humans too.'
                : '*every action has a human name on it. yours is now one of them.'}
            </p>
          </>
        )}
        {err && <p className="ap-err">{err}</p>}
        {fromApprover && (
          <div className="ap-contact-links">
            <button onClick={() => router.push('/approver')}>{done ? 'back to duty →' : '← all requests'}</button>
          </div>
        )}
        <div className="ap-socials">
          <span aria-label="Kavach">
            <Icon kind="shield" />
          </span>
          <span aria-label="Expires">
            <Icon kind="clock" />
          </span>
          <span aria-label="Fingerprint">
            <Icon kind="print" />
          </span>
        </div>
      </div>
    </footer>
  );
}
