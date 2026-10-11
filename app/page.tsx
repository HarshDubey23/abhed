import Link from 'next/link';
import { KavachMark } from '@/components/mark';
import { LandingMotion } from './landing-motion';
import './landing.css';

const HERO_VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260818_072341_50851634-bbc3-4c33-9acc-7647d4db44aa.mp4';

const d = (s: string) => ({ '--d': s }) as React.CSSProperties;

export default function Landing() {
  return (
    <div className="lp">
      <div className="grain" />
      <div className="lp-photo" aria-hidden="true">
        <video src={HERO_VIDEO} autoPlay muted loop playsInline preload="auto" />
      </div>
      <div className="lp-page">
        <div className="lp-backdrop" />
        <header className="lp-header">
          <Link href="/" className="lp-logo appear appear--scale" style={d('0.08s')} aria-label="Kavach">
            <KavachMark />
            <span>
              Kavach<span className="logo-suffix">.os</span>
            </span>
          </Link>
          <nav id="site-nav" className="lp-nav" aria-label="Primary">
            <Link href="/fleet" className="pill appear appear--scale" style={d('0.16s')}>
              Live Fleet
            </Link>
            <Link href="/command" className="pill appear appear--soft" style={d('0.28s')}>
              Command Center
            </Link>
            <Link href="/integrate" className="pill appear appear--scale" style={d('0.40s')}>
              Integrate
            </Link>
            <Link href="/ledger" className="pill appear appear--soft" style={d('0.52s')}>
              Ledger
            </Link>
          </nav>
          <div className="row" style={{ justifySelf: 'end', gap: 8 }}>
            <Link href="/fleet" className="btn btn-solid lp-cta appear appear--scale" style={d('0.34s')}>
              Watch agents live
            </Link>
            <button className="lp-burger appear appear--scale" style={d('0.34s')} aria-controls="site-nav" aria-expanded="false" aria-label="Open menu">
              <span className="bars">
                <span />
                <span />
                <span />
              </span>
            </button>
          </div>
        </header>

        <main className="lp-hero" id="top">
          <div className="lp-copy">
            <span className="lp-badge appear appear--pop" style={d('0.22s')}>
              <svg viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
                <path d="M12 2.6C12.55 2.6 12.88 3.15 13.08 4.7c.62 4.7 1.52 5.6 6.22 6.22 1.55.2 2.1.53 2.1 1.08s-.55.88-2.1 1.08c-4.7.62-5.6 1.52-6.22 6.22-.2 1.55-.53 2.1-1.08 2.1s-.88-.55-1.08-2.1c-.62-4.7-1.52-5.6-6.22-6.22C3.15 12.88 2.6 12.55 2.6 12s.55-.88 2.1-1.08c4.7-.62 5.6-1.52 6.22-6.22C11.12 3.15 11.45 2.6 12 2.6Z" />
              </svg>
              Workforce Accountability OS
            </span>
            <h1>
              <span className="lp-line">
                <span className="appear appear--mask" style={d('0.42s')}>
                  Every <em>AI agent</em> has
                </span>
              </span>
              <span className="lp-line">
                <span className="appear appear--mask" style={d('0.62s')}>
                  a human name on it.
                </span>
              </span>
            </h1>
            <p className="lp-lede appear appear--soft" style={{ ...d('0.82s'), animationDuration: '1.25s' }}>
              One registry, one rulebook and one tamper-evident ledger for a workforce of people and AI agents. Big actions wait for a person. Every outcome is traced to someone.
            </p>
            <div className="lp-actions">
              <Link href="/fleet" className="btn btn-solid appear appear--btn" style={d('0.96s')}>
                Watch agents live
              </Link>
              <Link href="/integrate" className="btn btn-ghost appear appear--side" style={d('1.10s')}>
                Plug in your agents
              </Link>
            </div>
          </div>
        </main>

        <footer className="lp-stats">
          <div className="lp-stat appear appear--stat" style={d('1.12s')}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <defs>
                <linearGradient id="pl" x1="3" y1="2" x2="14" y2="22" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#fff" stopOpacity="0.38" />
                  <stop offset="1" stopColor="#3a3a3a" stopOpacity="0.62" />
                </linearGradient>
                <linearGradient id="pr" x1="13" y1="2" x2="24" y2="22" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#3a3a3a" stopOpacity="0.38" />
                  <stop offset="1" stopColor="#fff" stopOpacity="0.62" />
                </linearGradient>
              </defs>
              <rect x="3.4" y="2.6" width="7.2" height="18.8" rx="3.6" fill="url(#pl)" />
              <rect x="13.4" y="2.6" width="7.2" height="18.8" rx="3.6" fill="url(#pr)" />
              <rect x="9.2" y="10.9" width="5.6" height="2.2" rx="1.1" fill="#4a4a4a" />
            </svg>
            Every action through one gateway
          </div>
          <div className="lp-stat appear appear--stat" style={d('1.28s')}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="2.4" y="2.4" width="19.2" height="19.2" rx="6.2" fill="#fff" />
              <path d="M12 7.1v7.4M8.15 12.35L12 16.2l3.85-3.85" stroke="#111" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
            Approvals bound to the exact action
          </div>
          <div className="lp-stat appear appear--stat" style={d('1.44s')}>
            <svg className="wide" viewBox="0 0 40 22" aria-hidden="true">
              <circle cx="10.2" cy="11" r="9.2" fill="#2b2b2b" />
              <ellipse cx="10.2" cy="12.1" rx="4.15" ry="3.7" fill="#f4f4f4" />
              <path d="M5.6 6.2 7.4 3.6 8.4 7Z M14.8 6.2 13 3.6 12 7Z" fill="#2b2b2b" />
              <circle cx="8.7" cy="11.6" r="0.7" fill="#1a1a1a" />
              <circle cx="11.7" cy="11.6" r="0.7" fill="#1a1a1a" />
              <circle cx="20.2" cy="11" r="9.2" fill="#ffffff" />
              <circle cx="17.6" cy="9.6" r="1.7" fill="#111" />
              <circle cx="22.8" cy="9.6" r="1.7" fill="#111" />
              <ellipse cx="20.2" cy="12.6" rx="1" ry="0.7" fill="#111" />
              <path d="M17.6 14.6c1.5 1.4 3.7 1.4 5.2 0" stroke="#111" strokeWidth="1.2" fill="none" strokeLinecap="round" />
              <circle cx="30.2" cy="11" r="9.2" fill="#f26b1d" />
              <text x="30.2" y="15.1" fontSize="12.5" textAnchor="middle" fill="#fff" fontFamily="Inter" fontWeight="700">
                k
              </text>
            </svg>
            People and agents, one ledger
          </div>
        </footer>
      </div>
      <LandingMotion />
    </div>
  );
}
