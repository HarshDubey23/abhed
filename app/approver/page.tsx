'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { KavachMark } from '@/components/mark';
import { authHeader, readTokens, saveToken } from '@/lib/approver-client';
import GazeVideo from '../approve/gaze-video';
import '../approve/approve.css';

interface Pending {
  id: string;
  tenant: string;
  company?: string;
  hold: { by: string; note?: string } | null;
  assignees: string[];
  assignedToMe: boolean;
  canDecide: boolean | null;
  cannotWhy?: string;
  escalationLevel: number;
  kind: string;
  summary: string;
  why: string;
  amount: number | null;
  actor: string;
  createdAt: number;
  expiresAt: number;
  approverRole: string;
  twoKey: number;
  votes: string[];
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

function b64ToUint8(base64: string) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const b = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

function beep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.18].forEach((t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.15);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.16);
    });
  } catch {
    /* no audio */
  }
}

type View = 'queue' | 'hold' | 'above' | 'history' | 'profile';
interface Profile {
  tenant: string;
  company: string;
  person: { id: string; name: string; title: string; roles: string[] };
  stats: { decisions: number; approved: number; rejected: number; held: number; escalated: number; medianSeconds: number | null; rubberStamps: number; ownsAgents: string[]; recent: { id: string; summary: string; status: string; at: number; seconds: number; device: string }[] };
}
const short = (c?: string) => (c ?? '').replace(' (fictional)', '').toLowerCase();

export default function ApproverPage() {
  const router = useRouter();
  const [onDuty, setOnDuty] = useState(false);
  const [pending, setPending] = useState<Pending[]>([]);
  const [recent, setRecent] = useState<{ id: string; company: string; status: string; summary: string; by: string }[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [companies, setCompanies] = useState<{ tenant: string; company: string; people: { id: string; name: string; title: string }[] }[]>([]);
  const [tenant, setTenant] = useState('banking');
  const [who, setWho] = useState('judge');
  const [pin, setPin] = useState('');
  const [view, setView] = useState<View>('queue');
  const [push, setPush] = useState<'unsupported' | 'off' | 'on' | 'denied' | 'ios-install'>('off');
  const [autoOpen, setAutoOpen] = useState(true);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const seen = useRef<Set<string> | null>(null);
  const sub = useRef<PushSubscriptionJSON | null>(null);
  const names = profiles.map((p) => p.person.name);
  const label = [...new Set(names)].join(' / ');

  const loadProfiles = useCallback(async () => {
    const r = await fetch('/api/approver/me', { headers: authHeader(), cache: 'no-store' }).catch(() => null);
    if (!r?.ok) return [];
    const d = (await r.json()) as { profiles: Profile[] };
    setProfiles(d.profiles);
    return d.profiles;
  }, []);

  useEffect(() => {
    void loadProfiles().then((ps) => {
      try {
        if (ps.length && localStorage.getItem('kavach-on-duty') === '1') setOnDuty(true);
        if (localStorage.getItem('kavach-auto-open') === '0') setAutoOpen(false);
      } catch {
        /* private mode */
      }
    });
    fetch('/api/approver/people')
      .then((r) => r.json())
      .then(setCompanies)
      .catch(() => undefined);
    const ios = /iPhone|iPad/i.test(navigator.userAgent);
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) setPush(ios && !standalone ? 'ios-install' : 'unsupported');
    else if (Notification.permission === 'denied') setPush('denied');
    else if (Notification.permission === 'granted') setPush('on');
  }, [loadProfiles]);

  const presence = useCallback(async () => {
    if (!label) return;
    await fetch('/api/approver/presence', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: label, device: /iPhone|Android/i.test(navigator.userAgent) ? (/iPhone/i.test(navigator.userAgent) ? 'iPhone' : 'Android') : 'browser', subscription: sub.current }),
    }).catch(() => undefined);
  }, [label]);

  const enablePush = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setPush(perm === 'denied' ? 'denied' : 'off');
        return;
      }
      const { publicKey } = (await (await fetch('/api/push')).json()) as { publicKey: string | null };
      if (!publicKey) {
        setNote('push keys are not configured on the server; this page still buzzes while open.');
        setPush('on');
        return;
      }
      const existing = await reg.pushManager.getSubscription();
      const s = existing ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToUint8(publicKey) }));
      sub.current = s.toJSON();
      setPush('on');
      await presence();
    } catch (e) {
      setNote(`notifications unavailable here (${e instanceof Error ? e.message : 'error'}). keep this page open; it will buzz.`);
    }
  }, [presence]);

  useEffect(() => {
    if (!onDuty || push !== 'on' || sub.current) return;
    navigator.serviceWorker
      ?.register('/sw.js')
      .then((reg) => reg.pushManager.getSubscription())
      .then((s) => {
        if (s) {
          sub.current = s.toJSON();
          void presence();
        }
      })
      .catch(() => undefined);
  }, [onDuty, push, presence]);

  useEffect(() => {
    if (!onDuty) return;
    void presence();
    const t = setInterval(presence, 10_000);
    return () => clearInterval(t);
  }, [onDuty, presence]);

  useEffect(() => {
    if (!onDuty) return;
    let alive = true;
    const load = async () => {
      try {
        const d = (await (await fetch('/api/approver/inbox', { cache: 'no-store', headers: authHeader() })).json()) as { pending: Pending[]; recent: typeof recent };
        if (!alive) return;
        const open = d.pending.filter((p) => !p.votes.some((v) => names.includes(v)));
        setPending(open);
        setRecent(d.recent);
        const mine = open.filter((p) => p.canDecide && !p.hold);
        if (seen.current === null) {
          seen.current = new Set(open.map((p) => p.id)); // don't jump on what was already waiting
          return;
        }
        const fresh = mine.filter((p) => !seen.current!.has(p.id));
        open.forEach((p) => seen.current!.add(p.id));
        if (fresh.length) {
          navigator.vibrate?.([220, 90, 220, 90, 320]);
          beep();
          if (autoOpen && document.visibilityState === 'visible') router.push(`/approve/${fresh[0].id}?from=approver`);
        }
      } catch {
        /* keep last */
      }
    };
    void load();
    const t = setInterval(load, 1500);
    return () => {
      alive = false;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onDuty, label, autoOpen, router]);

  const signIn = async () => {
    setBusy(true);
    setNote(null);
    const r = await fetch('/api/approver/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tenant, humanId: who, pin }) });
    const d = (await r.json()) as { token?: string; error?: string };
    setBusy(false);
    if (!r.ok || !d.token) return setNote((d.error ?? 'could not sign in').toLowerCase());
    saveToken(tenant, d.token);
    setPin('');
    await loadProfiles();
    try {
      localStorage.setItem('kavach-on-duty', '1');
    } catch {
      /* ignore */
    }
    setOnDuty(true);
    beep(); // unlocks audio on iOS after a tap
    if (push === 'off') await enablePush();
  };

  const signOutAll = () => {
    for (const t of Object.keys(readTokens())) saveToken(t, null);
    try {
      localStorage.setItem('kavach-on-duty', '0');
    } catch {
      /* ignore */
    }
    setProfiles([]);
    setOnDuty(false);
    seen.current = null;
  };

  const queue = pending.filter((p) => p.canDecide && !p.hold);
  const held = pending.filter((p) => p.hold);
  const above = pending.filter((p) => p.canDecide === false);
  const people = companies.find((c) => c.tenant === tenant)?.people ?? [];
  const row = (p: Pending) => (
    <button key={p.id} onClick={() => router.push(`/approve/${p.id}?from=approver`)} style={{ textDecoration: 'underline', textUnderlineOffset: '0.25em' }}>
      {p.assignedToMe ? '★ ' : ''}
      {short(p.company)} · {p.actor.toLowerCase()} · {p.kind === 'rule_change' ? 'rule change' : (p.summary.split('→')[1]?.trim() ?? (p.amount ? inr(p.amount) : '')).slice(0, 40)}
      {p.hold ? ` · held by ${p.hold.by.toLowerCase()}` : ''}
      {p.escalationLevel ? ` · ↑${p.approverRole.replace('approver_', '').replace('_', ' ')}` : ''} →
    </button>
  );
  const views: [View, string][] = [
    ['queue', `for you (${queue.length})`],
    ['hold', `on hold (${held.length})`],
    ['above', `above your level (${above.length})`],
    ['history', 'decided'],
    ['profile', 'profile'],
  ];

  return (
    <footer className="ap" aria-label="Approver">
      <GazeVideo />
      <div className="ap-jobs">
        <span className="ap-tag">{onDuty ? `on duty · ${queue.length} for you` : 'approver phone'}</span>
        <span className="ap-headline ap-job-title">
          {onDuty ? (
            queue.length ? (
              <>
                {queue.length} {queue.length === 1 ? 'agent needs' : 'agents need'}
                <br />
                you
              </>
            ) : (
              <>
                you’re on duty.
                <br />
                agents will ask you.
              </>
            )
          ) : (
            <>
              be the human
              <br />
              in the loop
            </>
          )}
        </span>
        {onDuty && (
          <>
            <div className="ap-nav" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: '0.4vw 1.2vw' }}>
              {views.map(([k, l]) => (
                <button key={k} aria-pressed={view === k} onClick={() => setView(k)}>
                  {l}
                </button>
              ))}
            </div>
            <div className="ap-nav ap-facts" style={{ marginTop: '1.1vw' }}>
              {view === 'queue' && (queue.length ? queue.map(row) : <span style={{ opacity: 0.6 }}>nothing waiting for you. agents are inside their limits.</span>)}
              {view === 'hold' && (held.length ? held.map(row) : <span style={{ opacity: 0.6 }}>nothing parked.</span>)}
              {view === 'above' &&
                (above.length ? (
                  above.map((p) => (
                    <span key={p.id} style={{ opacity: 0.75 }}>
                      {short(p.company)} · {p.summary.slice(0, 60)} · needs {p.approverRole.replace('_', ' ')}
                      <button style={{ marginLeft: 8, textDecoration: 'underline' }} onClick={() => router.push(`/approve/${p.id}?from=approver`)}>
                        view →
                      </button>
                    </span>
                  ))
                ) : (
                  <span style={{ opacity: 0.6 }}>nothing above your authority.</span>
                ))}
              {view === 'history' &&
                recent.map((r) => (
                  <span key={r.id} style={{ opacity: 0.75 }}>
                    {r.id} · {short(r.company)} · {r.status.toLowerCase()}
                    {r.by ? ` by ${r.by.toLowerCase()}` : ''}
                  </span>
                ))}
              {view === 'profile' &&
                profiles.map((p) => (
                  <span key={p.tenant} style={{ display: 'block', marginBottom: '0.6vw' }}>
                    <b>{p.person.name}</b> · {p.person.title} · {short(p.company)}
                    <br />
                    <span style={{ opacity: 0.7 }}>
                      authority: {p.person.roles.join(', ').replace(/_/g, ' ')}
                      <br />
                      {p.stats.approved} approved · {p.stats.rejected} rejected · {p.stats.held} held · {p.stats.escalated} escalated · median {p.stats.medianSeconds ?? '—'} s
                      {p.stats.rubberStamps ? ` · ${p.stats.rubberStamps} fast approvals flagged` : ''}
                      {p.stats.ownsAgents.length ? <><br />owns agents: {p.stats.ownsAgents.join(', ')}</> : null}
                    </span>
                  </span>
                ))}
            </div>
          </>
        )}
      </div>

      <div className="ap-logo" role="img" aria-label="Kavach">
        <span className="ap-wordmark">
          <KavachMark /> kavach
        </span>
      </div>

      <div className="ap-contact">
        <span className="ap-tag">{onDuty ? (push === 'on' ? 'buzz: on' : 'buzz: while open') : 'sign in'}</span>
        {(!onDuty || view === 'profile') && (
          <>
            <select className="ap-name" value={tenant} onChange={(e) => { setTenant(e.target.value); setWho(companies.find((c) => c.tenant === e.target.value)?.people.find((p) => p.id === 'judge')?.id ?? ''); }} aria-label="Company">
              {companies.map((c) => (
                <option key={c.tenant} value={c.tenant}>
                  {c.company.replace(' (fictional)', '')}
                </option>
              ))}
            </select>
            <select className="ap-name" value={who} onChange={(e) => setWho(e.target.value)} aria-label="Who are you">
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.title}
                </option>
              ))}
            </select>
            <input className="ap-name" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="PIN (from your company admin)" inputMode="numeric" type="password" aria-label="PIN" />
            <div className="ap-contact-links">
              <button disabled={busy || pin.length < 4 || !who} onClick={signIn}>
                {onDuty ? 'add this company →' : 'go on duty →'}
              </button>
            </div>
            <p className="ap-note">*one phone can cover several companies. each decision is signed with your identity.</p>
          </>
        )}
        {onDuty && (
          <>
            <div className="ap-contact-links">
              <span className="ap-headline">{label.toLowerCase()}</span>
              {push === 'off' && <button onClick={enablePush}>turn on buzz →</button>}
              <button
                onClick={() => {
                  setAutoOpen(!autoOpen);
                  try {
                    localStorage.setItem('kavach-auto-open', autoOpen ? '0' : '1');
                  } catch {
                    /* ignore */
                  }
                }}
              >
                auto-open: {autoOpen ? 'on' : 'off'}
              </button>
              <button onClick={signOutAll}>sign out</button>
            </div>
            <p className="ap-note">
              {profiles.map((p) => short(p.company)).join(' · ')}
              <br />
              {push === 'ios-install' ? '*iphone: share → add to home screen, open from there for buzz.' : push === 'denied' ? '*notifications blocked; keep this page open.' : '*keep this open. new requests open by themselves.'}
            </p>
          </>
        )}
        {note && <p className="ap-err">{note}</p>}
      </div>
    </footer>
  );
}
