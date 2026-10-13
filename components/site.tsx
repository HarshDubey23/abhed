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
  ['/about', 'About us'],
  ['/story', 'How it works'],
  ['/faq', 'FAQ'],
  ['/contact', 'Contact us'],
] as const;

/** Dark by default; the choice is remembered on this device. Works before and after sign-in. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
  }, []);
  const flip = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('abhed-theme', next);
    } catch {
      /* private mode */
    }
  };
  return (
    <button className="theme-btn" onClick={flip} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} title={theme === 'dark' ? 'Light theme' : 'Dark theme'}>
      {theme === 'dark' ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
        </svg>
      )}
    </button>
  );
}


/** The bar everyone sees before signing in: the same on every public page. */
export function PublicNav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLElement>(null);
  // On the sign-in pages, keep where the visitor was heading when they switch between the two.
  const [carry, setCarry] = useState('');
  useEffect(() => {
    setOpen(false);
    const next = new URLSearchParams(window.location.search).get('next');
    setCarry(next && /^\/(login|signup)$/.test(path) ? `?next=${encodeURIComponent(next)}` : '');
  }, [path]);
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
          <ThemeToggle />
          <Link href={`/login${carry}`} className={`st-signin ${path === '/login' ? 'on' : ''}`}>
            Sign in
          </Link>
          <Link href={`/signup${carry}`} className="st-pill">
            Get started
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
          <Link href={`/login${carry}`}>Sign in</Link>
          <Link href={`/signup${carry}`} className="st-pill">
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}

/** Every public page: the same bar, the page, the same footer. */
export function PublicChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="st">
      <PublicNav />
      {children}
      <SiteFooter />
    </div>
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
