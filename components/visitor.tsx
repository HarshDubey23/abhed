'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { inr, useWorld } from './app';

/**
 * A small visitor drops by now and then: a smiling π, Σ, ∞ or agent bot flies in, loops, shakes its head,
 * says one true thing about the live system, does a barrel roll and leaves. It never blocks the page: it lives
 * in a fixed layer, only the character itself takes a click (which sends it off), and it stays away entirely
 * for people who prefer reduced motion. All movement uses the independent `translate`/`rotate` properties.
 */
type Kind = 'pi' | 'sigma' | 'inf' | 'bot';
const GLYPH: Record<Kind, string> = { pi: 'π', sigma: 'Σ', inf: '∞', bot: '</>' };
const KINDS: Kind[] = ['pi', 'sigma', 'inf', 'bot'];

export function Visitor({ first = 6000, every = [38000, 64000] }: { first?: number; every?: [number, number] }) {
  const { view } = useWorld();
  const facts = useRef<Record<Kind, string>>({ pi: '', sigma: '', inf: '', bot: '' });
  const [kind, setKind] = useState<Kind | null>(null);
  const [say, setSay] = useState('');
  const [blink, setBlink] = useState(false);
  const el = useRef<HTMLDivElement>(null);
  const anim = useRef<Animation | null>(null);
  const timers = useRef<number[]>([]);
  const turn = useRef(Math.floor(Math.random() * KINDS.length));

  // what each visitor will say comes from the live view, so the joke is always true
  useEffect(() => {
    const k = view?.kpi;
    facts.current = {
      pi: k && k.actionsToday ? `π here! ${Math.round(k.autoPct ?? 0)}% of today’s ${k.actionsToday} actions ran on their own.` : 'π here! Every action gets checked. Irrationally fast.',
      sigma: k && k.damagePrevented ? `Σ of money stopped at the gate: ${inr(k.damagePrevented)}.` : 'Σ says: sum of edits nobody noticed = 0.',
      inf: view ? `∞ patience, ${view.ledgerTotal} ledger records, 0 edited.` : '∞ records, none of them editable.',
      bot: k ? (k.waiting ? `Beep. ${k.waiting} big move${k.waiting === 1 ? '' : 's'} waiting for a person.` : 'Beep. Nothing waiting. Everyone inside their limits.') : 'Beep. Governed and proud.',
    };
  }, [view]);

  const clear = () => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  };
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  const fly = useCallback(() => {
    if (document.hidden || anim.current) return;
    const k = KINDS[turn.current++ % KINDS.length];
    setKind(k);
    setSay('');
    requestAnimationFrame(() => {
      const node = el.current;
      if (!node) return;
      const W = window.innerWidth;
      const H = window.innerHeight;
      const fromLeft = Math.random() < 0.5;
      const sx = fromLeft ? -120 : W + 40;
      const ex = fromLeft ? W + 40 : -120;
      const sy = H * (0.25 + Math.random() * 0.35);
      const cx = W * (fromLeft ? 0.62 : 0.3);
      const cy = Math.max(110, H * 0.32);
      const loop = Array.from({ length: 7 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2;
        return { translate: `${cx + Math.sin(a) * 56}px ${cy - 56 + Math.cos(a) * 56}px`, rotate: `${(i / 6) * 360}deg` };
      });
      const frames: Keyframe[] = [
        { translate: `${sx}px ${sy}px`, rotate: '0deg', scale: '0.8', offset: 0 },
        { translate: `${cx}px ${cy}px`, rotate: fromLeft ? '12deg' : '-12deg', scale: '1', offset: 0.14, easing: 'ease-out' },
        ...loop.map((f, i) => ({ ...f, offset: 0.16 + (i / 6) * 0.14 })),
        { translate: `${cx}px ${cy}px`, rotate: '-14deg', offset: 0.34 },
        { translate: `${cx}px ${cy}px`, rotate: '14deg', offset: 0.37 },
        { translate: `${cx}px ${cy}px`, rotate: '-10deg', offset: 0.4 },
        { translate: `${cx}px ${cy}px`, rotate: '0deg', offset: 0.43 },
        { translate: `${cx}px ${cy - 10}px`, rotate: '0deg', offset: 0.55 },
        { translate: `${cx}px ${cy + 6}px`, rotate: '3deg', offset: 0.66 },
        { translate: `${cx}px ${cy - 6}px`, rotate: '-3deg', offset: 0.74 },
        { translate: `${cx}px ${cy - 30}px`, rotate: '0deg', scale: '1.08', offset: 0.79 },
        { translate: `${cx}px ${cy - 30}px`, rotate: '360deg', scale: '1', offset: 0.86 },
        { translate: `${ex}px ${cy - 120}px`, rotate: fromLeft ? '380deg' : '340deg', scale: '0.7', offset: 1, easing: 'ease-in' },
      ];
      anim.current = node.animate(frames, { duration: 10500, easing: 'ease-in-out', fill: 'forwards' });
      later(() => setBlink(true), 3200);
      later(() => setBlink(false), 3380);
      later(() => setSay(facts.current[k]), 4400);
      later(() => setSay(''), 8100);
      later(() => setBlink(true), 6400);
      later(() => setBlink(false), 6560);
      anim.current.onfinish = () => {
        anim.current = null;
        clear();
        setKind(null);
      };
    });
  }, []);

  // a click sends it off early, with a wave
  const shoo = () => {
    const node = el.current;
    if (!node || !anim.current) return;
    const cur = getComputedStyle(node).translate || '0px 0px';
    anim.current.cancel();
    clear();
    setSay('bye!');
    const out = node.animate(
      [
        { translate: cur, rotate: '0deg' },
        { translate: cur, rotate: '-20deg', offset: 0.2 },
        { translate: `${cur.split(' ')[0]} -160px`, rotate: '200deg', scale: '0.6' },
      ],
      { duration: 900, easing: 'ease-in', fill: 'forwards' },
    );
    anim.current = out;
    out.onfinish = () => {
      anim.current = null;
      setSay('');
      setKind(null);
    };
  };

  // timing comes in as plain numbers so a parent re-render (the live view polls) never resets the schedule
  const [lo, hi] = every;
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let t = 0;
    const next = (ms: number) => {
      t = window.setTimeout(() => {
        fly();
        next(lo + Math.random() * (hi - lo));
      }, ms);
    };
    next(first);
    return () => {
      clearTimeout(t);
      clear();
      anim.current?.cancel();
      anim.current = null;
    };
  }, [first, lo, hi, fly]);

  if (!kind) return <div ref={el} className="vz" aria-hidden="true" />;
  return (
    <div ref={el} className={`vz on vz-${kind}`} aria-hidden="true" onClick={shoo} title="Say bye">
      {say && <div className="vz-say">{say}</div>}
      <svg className="vz-body" viewBox="0 0 96 96" width="76" height="76">
        <ellipse className="vz-wing l" cx="14" cy="50" rx="11" ry="6" />
        <ellipse className="vz-wing r" cx="82" cy="50" rx="11" ry="6" />
        <circle cx="48" cy="52" r="30" className="vz-skin" />
        <text x="48" y="40" textAnchor="middle" className="vz-glyph">
          {GLYPH[kind]}
        </text>
        <g className={`vz-eyes ${blink ? 'shut' : ''}`}>
          <circle cx="38" cy="52" r="6.2" fill="#fff" />
          <circle cx="58" cy="52" r="6.2" fill="#fff" />
          <circle cx="39.4" cy="53" r="2.8" fill="#0b0b0b" />
          <circle cx="59.4" cy="53" r="2.8" fill="#0b0b0b" />
        </g>
        <circle cx="30" cy="63" r="3.6" fill="#ff8fab" opacity="0.7" />
        <circle cx="66" cy="63" r="3.6" fill="#ff8fab" opacity="0.7" />
        <path d="M39 64.5c5 5.5 13 5.5 18 0" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
    </div>
  );
}
