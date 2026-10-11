'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import { KavachMark } from '@/components/mark';
import type { Approval } from '@/lib/types';
import GazeVideo from '../gaze-video';
import '../approve.css';

interface Payload {
  approval: Approval & { currentHash: string };
  agent: { name: string; framework: string; model: string; risk: string; ownerName: string; purpose: string } | null;
  proposer: string | null;
  ownerName: string | null;
  now: number;
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

export default function ApprovePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<Payload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [evOpen, setEvOpen] = useState(false);
  const [evViewed, setEvViewed] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ status: string; votes: number; twoKey: number; executedSeq: number | null } | null>(null);
  const [now, setNow] = useState(Date.now());
  const openedAt = useRef<number | null>(null);
  const shownHash = useRef<string | null>(null);

  useEffect(() => {
    try {
      setName(localStorage.getItem('kavach-approver') ?? '');
    } catch {
      /* private mode */
    }
  }, []);

  const load = useCallback(async () => {
    const r = await fetch(`/api/approvals/${id}`, { cache: 'no-store' });
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

  const decide = async (decision: 'approve' | 'reject') => {
    if (!data) return;
    const who = name.trim();
    if (!who) {
      setErr('Type your name first. It goes into the audit trail.');
      return;
    }
    try {
      localStorage.setItem('kavach-approver', who);
    } catch {
      /* ignore */
    }
    setSending(true);
    setErr(null);
    const decisionMs = Math.round(performance.now() - (openedAt.current ?? performance.now()));
    const r = await fetch(`/api/approvals/${id}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ decision, name: who, actionHash: shownHash.current, decisionMs, evidenceViewed: evViewed, device: /iPhone|Android/i.test(navigator.userAgent) ? 'phone' : 'browser' }),
    });
    const d = (await r.json()) as { result?: typeof result; error?: string };
    setSending(false);
    if (!r.ok) setErr(d.error ?? 'Refused');
    else setResult(d.result ?? null);
    void load();
  };

  const ap = data?.approval;
  const p = (ap?.req.params ?? {}) as Record<string, unknown>;
  const amount = typeof p.amount === 'number' ? p.amount : null;
  const secs = ap ? Math.max(0, Math.round((ap.expiresAt - now) / 1000)) : 0;
  const isRule = ap?.kind === 'rule_change';
  const headline = !ap
    ? 'loading…'
    : isRule
      ? 'a rule wants to go live'
      : amount !== null
        ? `approve a ${inr(amount)} refund?`
        : `approve ${ap.req.action.replace(/_/g, ' ')}?`;

  const myVote = ap?.votes.find((v) => v.name.toLowerCase() === name.trim().toLowerCase());
  const done = result || (ap && ap.status !== 'PENDING');

  return (
    <main className="ap">
      <GazeVideo />

      <div className="ap-logo">
        <span className="ap-wordmark">
          <KavachMark size={30} /> kavach
        </span>
      </div>

      <section className="ap-left">
        <span className={`ap-tag ${done ? '' : 'saffron'}`}>{done ? 'recorded in the ledger' : `waiting for you · ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`}</span>
        <span className="ap-head" style={{ display: 'block' }}>
          {done && ap ? (
            ap.status === 'EXECUTED' || ap.status === 'APPROVED' ? (
              <>
                approved.
                <br />
                your name is on it.
              </>
            ) : ap.status === 'PENDING' && myVote ? (
              <>
                key 1 of {ap.twoKey} turned.
                <br />
                waiting for a second person.
              </>
            ) : (
              <>
                {ap.status.toLowerCase()}.
                <br />
                nothing moved.
              </>
            )
          ) : (
            <>
              {headline}
              <br />
              {isRule ? 'it needs a second person' : 'a person has to decide'}
            </>
          )}
        </span>

        {ap && !done && (
          <div className="ap-card">
            <div className="ap-k">1 · what will happen</div>
            {amount !== null && <div className="ap-big">{inr(amount)}</div>}
            <div className="ap-v">{ap.summary}</div>
          </div>
        )}

        {ap && done && (
          <div className="ap-card ap-done">
            <div className="ap-k">ledger</div>
            <div className="ap-v">
              {ap.status === 'EXECUTED'
                ? `Executed once, for exactly this action. Approved by ${ap.votes.map((v) => v.name).join(' + ')}${ap.executedSeq ? ` · record #${ap.executedSeq}` : ''}.`
                : ap.status === 'PENDING'
                  ? `${ap.votes.length} of ${ap.twoKey} keys. Two-key means two different people.`
                  : `This approval is ${ap.status.toLowerCase()}. If the agent changes even one rupee, it needs a new approval.`}
            </div>
            {ap.votes.map((v) => (
              <div className="ap-note" key={v.name + v.at}>
                {v.name} · decided in {(v.decisionMs / 1000).toFixed(1)} s · evidence {v.evidenceViewed ? 'opened' : 'not opened'}
                {!v.evidenceViewed && v.decisionMs < 4000 ? ' · Kavach flagged a possible rubber-stamp' : ''}
              </div>
            ))}
            <div className="ap-mono" style={{ marginTop: 10 }}>
              action fingerprint {ap.actionHash}
            </div>
          </div>
        )}

        {ap && !done && (
          <>
            <div className="ap-card">
              <div className="ap-k">your name (goes into the audit trail)</div>
              <input className="ap-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Dr. Anita Rao" maxLength={40} autoComplete="name" />
              <div className="ap-actions">
                <button className="ap-btn yes" disabled={sending} onClick={() => decide('approve')}>
                  Approve
                </button>
                <button className="ap-btn no" disabled={sending} onClick={() => decide('reject')}>
                  Reject
                </button>
              </div>
              <div className="ap-note">Approves only this exact action, once, before the timer runs out.</div>
            </div>
          </>
        )}
        {err && <div className="ap-err">{err}</div>}
      </section>

      <section className="ap-right">
        {ap && (
          <>
            <span className="ap-tag">{isRule ? 'governed rule change' : 'why a person is needed'}</span>
            <div className="ap-card">
              <div className="ap-k">2 · why you</div>
              <div className="ap-v">{ap.why}</div>
              <div className="ap-note">
                {ap.ruleIds.join(' · ') || 'no rule covers this high-impact action'} · needs {ap.approverRole.replace('_', ' ')}
                {ap.twoKey > 1 ? ` × ${ap.twoKey}` : ''}
                {data?.ownerName ? ` · ${data.ownerName} can’t approve this one` : ''}
              </div>
            </div>
            <div className="ap-card">
              <div className="ap-k">3 · evidence (facts first, before the agent’s opinion)</div>
              <button
                className="ap-ev-toggle"
                onClick={() => {
                  setEvOpen(!evOpen);
                  setEvViewed(true);
                }}
              >
                {evOpen ? 'hide evidence' : `show evidence (${ap.evidence.length})`}
              </button>
              {evOpen &&
                ap.evidence.map((e) => (
                  <div className="ap-ev-row" key={e.label}>
                    <span>{e.label}</span>
                    <span>{e.value}</span>
                  </div>
                ))}
            </div>
            {ap.agentReasoning && (
              <div className="ap-card">
                <div className="ap-k">4 · agent’s reasoning (untrusted)</div>
                <div className="ap-v" style={{ opacity: 0.75 }}>
                  “{ap.agentReasoning}”
                </div>
              </div>
            )}
            {data?.agent && (
              <div className="ap-note">
                {data.agent.name} · {data.agent.framework} · owner {data.agent.ownerName} · risk {data.agent.risk.toLowerCase()}
              </div>
            )}
            {data?.proposer && <div className="ap-note">proposed by {data.proposer}</div>}
          </>
        )}
        {!ap && !err && <div className="ap-note">fetching the approval card…</div>}
      </section>
    </main>
  );
}
