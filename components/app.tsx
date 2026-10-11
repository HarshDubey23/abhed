'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { View } from '@/lib/view';
import { KavachMark } from './mark';

type FullView = View & { store?: string; llm?: boolean; error?: string };

interface Ctx {
  view: FullView | null;
  run: (type: string, payload?: Record<string, unknown>) => Promise<{ ok: boolean; result?: unknown; error?: string }>;
  busy: string | null;
  toast: (text: string, tone?: string) => void;
}

const WorldCtx = createContext<Ctx | null>(null);
export const useWorld = () => {
  const c = useContext(WorldCtx);
  if (!c) throw new Error('useWorld outside provider');
  return c;
};

function directorKey() {
  try {
    const url = new URL(window.location.href);
    const k = url.searchParams.get('key');
    if (k) localStorage.setItem('kavach-key', k);
    return localStorage.getItem('kavach-key') ?? '';
  } catch {
    return '';
  }
}

export function WorldProvider({ children }: { children: React.ReactNode }) {
  const [view, setView] = useState<FullView | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toastMsg, setToast] = useState<{ text: string; tone: string; id: number } | null>(null);
  const versionRef = useRef(-1);

  const toast = useCallback((text: string, tone = 'info') => {
    const id = Date.now();
    setToast({ text, tone, id });
    setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 5200);
  }, []);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch('/api/state', { cache: 'no-store' });
        const v = (await r.json()) as FullView;
        if (alive && !v.error) {
          versionRef.current = v.version;
          setView(v);
        }
      } catch {
        /* keep last view */
      }
    };
    load();
    const t = setInterval(load, 1300);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const run = useCallback(
    async (type: string, payload: Record<string, unknown> = {}) => {
      setBusy(type);
      try {
        const r = await fetch('/api/command', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-director-key': directorKey() },
          body: JSON.stringify({ type, ...payload }),
        });
        const data = (await r.json()) as { result?: unknown; error?: string; view?: FullView };
        if (data.view) setView((old) => ({ ...(old ?? {}), ...data.view! }) as FullView);
        if (!r.ok) {
          toast(data.error ?? 'Refused', 'block');
          return { ok: false, error: data.error };
        }
        return { ok: true, result: data.result };
      } catch (e) {
        toast('Network error', 'block');
        return { ok: false, error: String(e) };
      } finally {
        setBusy(null);
      }
    },
    [toast],
  );

  return (
    <WorldCtx.Provider value={{ view, run, busy, toast }}>
      {children}
      {toastMsg && (
        <div className="toast" style={{ borderColor: `var(--${toastMsg.tone === 'info' ? 'border' : toastMsg.tone})` }}>
          {toastMsg.text}
        </div>
      )}
    </WorldCtx.Provider>
  );
}

const NAV = [
  { href: '/command', label: 'Command Center' },
  { href: '/twin', label: 'Twin Universe' },
  { href: '/incidents', label: 'Incidents' },
  { href: '/ledger', label: 'Ledger' },
  { href: '/rules', label: 'Rulebook' },
];

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <WorldProvider>
      <div className="grain" />
      <ShellInner>{children}</ShellInner>
    </WorldProvider>
  );
}

function ShellInner({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { view } = useWorld();
  return (
    <div className="shell">
      <header className="topbar">
        <Link href="/" className="logo" aria-label="Kavach home">
          <KavachMark />
          <span>
            Kavach<span className="logo-suffix">.os</span>
          </span>
        </Link>
        <nav className="nav" aria-label="Primary">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={`pill ${path?.startsWith(n.href) ? 'active' : ''}`}>
              {n.label}
              {n.href === '/command' && view && view.kpi.waiting > 0 && <span style={{ color: 'var(--human)' }}>· {view.kpi.waiting}</span>}
              {n.href === '/incidents' && view && view.kpi.openIncidents > 0 && <span style={{ color: 'var(--block)' }}>· {view.kpi.openIncidents}</span>}
            </Link>
          ))}
        </nav>
        <div className="topbar-right">
          <span className="row muted" style={{ fontSize: 12 }}>
            <span className="live-dot" style={view?.verify.valid === false ? { background: 'var(--block)', boxShadow: '0 0 10px var(--block)' } : undefined} />
            {view ? (view.verify.valid ? `ledger intact · ${view.ledgerTotal}` : `ledger broken at #${view.verify.firstBadSeq}`) : 'connecting…'}
          </span>
          <span className="chip chip-muted" title="NovaBank and every person in it are fictional">NovaBank · fictional</span>
        </div>
      </header>
      {children}
      <DemoDock />
    </div>
  );
}

export function Chip({ d }: { d: string }) {
  const map: Record<string, [string, string]> = {
    ALLOWED: ['allow', 'Allowed'],
    EXECUTED: ['allow', 'Executed'],
    NEEDS_APPROVAL: ['human', 'Waiting for a person'],
    BLOCKED: ['block', 'Blocked'],
    VOID: ['block', 'Void'],
    PAUSED: ['block', 'Paused'],
    FLAG: ['warn', 'Oversight flag'],
    INFO: ['ledger', 'Logged'],
    ACTIVE: ['allow', 'Active'],
    RESTRICTED: ['warn', 'Restricted'],
    PENDING: ['human', 'Waiting'],
    APPROVED: ['allow', 'Approved'],
    REJECTED: ['block', 'Rejected'],
    EXPIRED: ['muted', 'Expired'],
    disputed: ['block', 'Disputed'],
    confirmed: ['allow', 'Confirmed'],
    pending: ['warn', 'Pending'],
    blocked: ['muted', 'Prevented'],
    held: ['human', 'Held'],
  };
  const [tone, label] = map[d] ?? ['muted', d];
  return <span className={`chip chip-${tone}`}>{label}</span>;
}

export function Qr({ url }: { url: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    QRCode.toDataURL(url, { margin: 0, width: 360, errorCorrectionLevel: 'M', color: { dark: '#000000', light: '#ffffff' } }).then(setSrc);
  }, [url]);
  return <div className="qr">{src && <img src={src} alt={`QR code for ${url}`} />}</div>;
}

export const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
export const hhmm = (ts: number) => new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
export const ago = (ts: number, now: number) => {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
};

function DemoDock() {
  const { view, run, busy, toast } = useWorld();
  const router = useRouter();
  const [hidden, setHidden] = useState(false);

  const steps = useCallback(
    () => ({
      '1': async () => {
        router.push('/command');
        const r = await run('rex_run');
        if (r.ok) toast('Rex’s ₹40,000 refund is held. Scan the QR to approve.', 'human');
      },
      '2': async () => {
        const ap = view?.approvals.find((a) => a.req.actorId === 'rex' && a.req.action === 'issue_refund' && (a.status === 'EXECUTED' || a.status === 'PENDING'));
        if (!ap) return toast('Run step 1 first', 'warn');
        const r = await run('reuse', { approvalId: ap.id, delta: 1 });
        if (r.ok) toast(String((r.result as { reason?: string })?.reason ?? 'Refused'), 'block');
      },
      '3': async () => {
        router.push('/twin?autorun=1');
      },
      '4': async () => {
        if (!view?.sharmaSeq) return;
        const r = await run('dispute', { seq: view.sharmaSeq, by: 'isha' });
        if (r.ok) router.push(`/incidents/${String(r.result)}`);
      },
      '5': async () => {
        await run('tamper');
        router.push('/ledger?verify=1');
      },
      '6': async () => {
        await run('rogue');
        toast('Unregistered agent tried to export 1,206 records: blocked fail-closed.', 'block');
      },
      '7': async () => {
        await run('runaway');
        toast('Nova looped the same call: circuit breaker paused it.', 'block');
      },
      r: async () => {
        await run('reset');
        toast('Demo reset: NovaBank re-seeded (seed 42).', 'info');
        router.push('/command');
      },
    }),
    [view, run, router, toast],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '.') return setHidden((h) => !h);
      const fn = (steps() as Record<string, () => Promise<void>>)[e.key.toLowerCase()];
      if (fn) {
        e.preventDefault();
        void fn();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [steps]);

  if (hidden) return null;
  const s = steps() as Record<string, () => Promise<void>>;
  const items: [string, string][] = [
    ['1', 'Rex asks ₹40,000'],
    ['2', 'Rex tries ₹40,001'],
    ['3', 'Twin Universe'],
    ['4', 'Mrs. Sharma disputes'],
    ['5', 'Tamper → Verify'],
    ['6', 'Shadow agent'],
    ['7', 'Runaway loop'],
  ];
  return (
    <div className="dock" role="toolbar" aria-label="Demo director">
      <span className="badge-k" style={{ padding: '0 6px' }}>Demo</span>
      {items.map(([k, label]) => (
        <button key={k} className="dock-step" onClick={() => void s[k]()} disabled={Boolean(busy)}>
          <kbd>{k}</kbd>
          {label}
        </button>
      ))}
      <span className="dock-sep" />
      <button className="dock-step" onClick={() => void s.r()} disabled={Boolean(busy)}>
        <kbd>R</kbd>Reset
      </button>
      <button className="dock-step" onClick={() => setHidden(true)} title="Hide (press . to toggle)">
        ✕
      </button>
    </div>
  );
}
