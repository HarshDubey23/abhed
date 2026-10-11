'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { KavachMark } from '@/components/mark';
import GazeVideo from '../approve/gaze-video';
import '../approve/approve.css';

interface Pending {
  id: string;
  company?: string;
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

export default function ApproverPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [onDuty, setOnDuty] = useState(false);
  const [pending, setPending] = useState<Pending[]>([]);
  const [recent, setRecent] = useState<{ id: string; status: string; summary: string; by: string }[]>([]);
  const [push, setPush] = useState<'unsupported' | 'off' | 'on' | 'denied' | 'ios-install'>('off');
  const [autoOpen, setAutoOpen] = useState(true);
  const [note, setNote] = useState<string | null>(null);
  const seen = useRef<Set<string> | null>(null);
  const sub = useRef<PushSubscriptionJSON | null>(null);

  useEffect(() => {
    try {
      const n = localStorage.getItem('kavach-approver');
      if (n) setName(n);
      if (localStorage.getItem('kavach-on-duty') === '1' && n) setOnDuty(true);
      if (localStorage.getItem('kavach-auto-open') === '0') setAutoOpen(false);
    } catch {
      /* private mode */
    }
    const ios = /iPhone|iPad/i.test(navigator.userAgent);
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) setPush(ios && !standalone ? 'ios-install' : 'unsupported');
    else if (Notification.permission === 'denied') setPush('denied');
    else if (Notification.permission === 'granted') setPush('on');
  }, []);

  const presence = useCallback(async () => {
    if (!name.trim()) return;
    await fetch('/api/approver/presence', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), device: /iPhone|Android/i.test(navigator.userAgent) ? (/iPhone/i.test(navigator.userAgent) ? 'iPhone' : 'Android') : 'browser', subscription: sub.current }),
    }).catch(() => undefined);
  }, [name]);

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

  // re-attach an existing push subscription silently
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
        const d = (await (await fetch('/api/approver/inbox', { cache: 'no-store' })).json()) as { pending: Pending[]; recent: typeof recent };
        if (!alive) return;
        const mine = d.pending.filter((p) => !p.votes.some((v) => v.toLowerCase() === name.trim().toLowerCase()));
        setPending(mine);
        setRecent(d.recent);
        if (seen.current === null) {
          seen.current = new Set(mine.map((p) => p.id)); // don't jump on what was already waiting
          return;
        }
        const fresh = mine.filter((p) => !seen.current!.has(p.id));
        fresh.forEach((p) => seen.current!.add(p.id));
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
  }, [onDuty, name, autoOpen, router]);

  const goOnDuty = async () => {
    if (!name.trim()) {
      setNote('type your name first. it goes into the audit trail.');
      return;
    }
    try {
      localStorage.setItem('kavach-approver', name.trim());
      localStorage.setItem('kavach-on-duty', '1');
    } catch {
      /* ignore */
    }
    setNote(null);
    setOnDuty(true);
    beep(); // unlocks audio on iOS after a tap
    if (push === 'off') await enablePush();
  };

  return (
    <footer className="ap" aria-label="Approver">
      <GazeVideo />
      <div className="ap-jobs">
        <span className="ap-tag">{onDuty ? `on duty · ${pending.length} waiting` : 'approver phone'}</span>
        <span className="ap-headline ap-job-title">
          {onDuty ? (
            pending.length ? (
              <>
                {pending.length} {pending.length === 1 ? 'agent needs' : 'agents need'}
                <br />a person
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
          <div className="ap-nav ap-facts" style={{ marginTop: '1.3vw' }}>
            {pending.map((p) => (
              <button key={p.id} onClick={() => router.push(`/approve/${p.id}?from=approver`)} style={{ textDecoration: 'underline', textUnderlineOffset: '0.25em' }}>
                {p.company ? `${p.company.replace(' (fictional)', '').toLowerCase()} · ` : ''}
                {p.actor.toLowerCase()} · {p.kind === 'rule_change' ? 'rule change' : (p.summary.split('→')[1]?.trim() ?? (p.amount ? inr(p.amount) : '')).slice(0, 44)} →
              </button>
            ))}
            {!pending.length && <span style={{ opacity: 0.6 }}>nothing waiting. agents are inside their limits.</span>}
            {recent.slice(0, 3).map((r) => (
              <span key={r.id} style={{ opacity: 0.55 }}>
                {r.id} {r.status.toLowerCase()}
                {r.by ? ` by ${r.by}` : ''}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="ap-logo" role="img" aria-label="Kavach">
        <span className="ap-wordmark">
          <KavachMark /> kavach
        </span>
      </div>

      <div className="ap-contact">
        <span className="ap-tag">{onDuty ? (push === 'on' ? 'buzz: on' : 'buzz: while open') : 'your name'}</span>
        {!onDuty ? (
          <>
            <input className="ap-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="your name (goes into the audit trail)" maxLength={40} autoComplete="name" aria-label="Your name" />
            <div className="ap-contact-links">
              <button onClick={goOnDuty}>go on duty →</button>
            </div>
            <p className="ap-note">*when an AI agent tries something risky, it lands here.</p>
          </>
        ) : (
          <>
            <div className="ap-contact-links">
              <span className="ap-headline">{name.trim().toLowerCase()}</span>
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
            </div>
            <p className="ap-note">
              {push === 'ios-install'
                ? '*iphone: share → add to home screen, open from there for buzz.'
                : push === 'denied'
                  ? '*notifications blocked; keep this page open.'
                  : '*keep this open. new requests open by themselves.'}
            </p>
          </>
        )}
        {note && <p className="ap-err">{note}</p>}
      </div>
    </footer>
  );
}
