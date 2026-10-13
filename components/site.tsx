'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { AbhedMark } from './mark';

export type SiteAccount = { id: string; email: string; name: string; company: string | null; role: string | null; created_at: string; last_login_at?: string | null };

/** The signed-in person (or null), read once from the session cookie on the server. */
export function useAccount() {
  const [account, setAccount] = useState<SiteAccount | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j: { account: SiteAccount | null }) => live && setAccount(j.account))
      .catch(() => live && setAccount(null));
    return () => {
      live = false;
    };
  }, []);
  return [account, setAccount] as const;
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');

const LINKS = [
  ['/about', 'About'],
  ['/story', 'How it works'],
  ['/business', 'Pricing'],
  ['/faq', 'FAQ'],
  ['/contact', 'Contact'],
] as const;

export function SiteNav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [account] = useAccount();
  const ref = useRef<HTMLElement>(null);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    const close = (e: Event) => {
      if (open && ref.current && !(e.target instanceof Node && ref.current.contains(e.target))) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);
  return (
    <header className={`st-nav ${open ? 'open' : ''}`} ref={ref}>
      <div className="st-nav-in">
        <Link href="/" className="st-brand" aria-label="Abhed home">
          <AbhedMark size={24} />
          <span>Abhed</span>
        </Link>
        <nav className="st-links" aria-label="Site">
          {LINKS.map(([href, label]) => (
            <Link key={href} href={href} className={path === href ? 'on' : ''}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="st-right">
          {account ? (
            <Link href="/account" className="st-avatar" title={`${account.name} · your account`} aria-label="Your account">
              {initials(account.name)}
            </Link>
          ) : (
            <Link href="/login" className="st-signin">
              Sign in
            </Link>
          )}
          <Link href="/fleet" className="st-pill">
            Open Abhed
          </Link>
          <button className="st-burger" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="st-menu" onClick={() => setOpen((v) => !v)}>
            <i />
            <i />
          </button>
        </div>
      </div>
      <div className="st-menu" id="st-menu" hidden={!open}>
        {LINKS.map(([href, label]) => (
          <Link key={href} href={href} className={path === href ? 'on' : ''}>
            {label}
          </Link>
        ))}
        <div className="st-menu-foot">
          {account ? <Link href="/account">Your account</Link> : <Link href="/login">Sign in</Link>}
          {!account && <Link href="/signup">Create an account</Link>}
          <Link href="/fleet" className="st-pill">
            Open Abhed
          </Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="st-foot">
      <div className="st-foot-in">
        <div className="st-foot-brand">
          <Link href="/" className="st-brand" aria-label="Abhed home">
            <AbhedMark size={24} />
            <span>Abhed</span>
          </Link>
          <p>The accountability layer for AI agents. One gate for every action, a person for the big ones, a ledger no one can edit.</p>
        </div>
        <div className="st-foot-cols">
          <div>
            <h4>Product</h4>
            <Link href="/demo">Live demo</Link>
            <Link href="/fleet">Fleet</Link>
            <Link href="/connect">Connect a company</Link>
            <Link href="/story">How it works</Link>
            <Link href="/business">Pricing</Link>
          </div>
          <div>
            <h4>Company</h4>
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/faq">FAQ</Link>
            <Link href="/readiness">Roadmap</Link>
          </div>
          <div>
            <h4>Account</h4>
            <Link href="/login">Sign in</Link>
            <Link href="/signup">Create an account</Link>
            <Link href="/approver">Approver app</Link>
          </div>
          <div>
            <h4>Legal</h4>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/security">Security</Link>
          </div>
        </div>
      </div>
      <div className="st-foot-word" aria-hidden="true">
        अभेद
      </div>
      <div className="st-foot-base">
        <span>© 2026 Abhed · a working prototype built for CodeX 3.0</span>
        <span>Companies shown in the demo are fictional.</span>
      </div>
    </footer>
  );
}

type FeedRow = { seq: number; ts: number; company: string; actor: string; action: string; decision: string; ruleRef?: string };
const WORD: Record<string, string> = { ALLOWED: 'allowed', EXECUTED: 'executed', NEEDS_APPROVAL: 'sent to a person', BLOCKED: 'refused' };
const TONE: Record<string, string> = { ALLOWED: 'ok', EXECUTED: 'ok', NEEDS_APPROVAL: 'hold', BLOCKED: 'no' };

/** The last few real decisions, refreshed every few seconds. */
export function LiveFeed({ rows = 4 }: { rows?: number }) {
  const [feed, setFeed] = useState<FeedRow[] | null>(null);
  const [now, setNow] = useState(0);
  useEffect(() => {
    let live = true;
    const pull = () =>
      fetch('/api/fleet', { cache: 'no-store' })
        .then((r) => r.json())
        .then((f: { now: number; feed: FeedRow[] }) => {
          if (!live) return;
          setNow(f.now);
          setFeed(f.feed.filter((x) => WORD[x.decision]).slice(0, rows));
        })
        .catch(() => live && setFeed((v) => v ?? []));
    void pull();
    const t = setInterval(pull, 6000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, [rows]);
  const ago = (ts: number) => {
    const s = Math.max(1, Math.round((now - ts) / 1000));
    return s < 60 ? `${s}s` : s < 3600 ? `${Math.round(s / 60)}m` : `${Math.round(s / 3600)}h`;
  };
  if (!feed) return <div className="st-feed muted">Connecting to the live ledger…</div>;
  if (!feed.length) return <div className="st-feed muted">Quiet right now. Every decision appears here as it happens.</div>;
  return (
    <ul className="st-feed" aria-live="polite">
      {feed.map((r) => (
        <li key={`${r.company}-${r.seq}`}>
          <i className={TONE[r.decision]} />
          <span>
            <b>{r.actor}</b> {r.action.replace(/_/g, ' ')} · {WORD[r.decision]}
          </span>
          <em>{ago(r.ts)}</em>
        </li>
      ))}
    </ul>
  );
}
