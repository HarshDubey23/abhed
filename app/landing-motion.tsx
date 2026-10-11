'use client';

import { useEffect } from 'react';

/** Entrance-animation fallback + mobile menu, as in the reference landing. */
export function LandingMotion() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('.appear, .lp-photo'));
    els.forEach((el) => el.addEventListener('animationend', () => el.classList.add('is-in'), { once: true }));
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const running = els.some((el) => el.getAnimations?.().some((a) => a.playState === 'running' || a.playState === 'finished'));
        if (!running) els.forEach((el) => el.classList.add('is-in'));
      });
    });

    const burger = document.querySelector<HTMLButtonElement>('.lp-burger');
    const setOpen = (open: boolean) => {
      document.body.classList.toggle('menu-open', open);
      burger?.setAttribute('aria-expanded', String(open));
      burger?.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };
    const onBurger = () => setOpen(!document.body.classList.contains('menu-open'));
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const mq = window.matchMedia('(min-width: 901px)');
    const onMq = () => mq.matches && setOpen(false);
    const links = Array.from(document.querySelectorAll('.lp-nav a'));
    const close = () => setOpen(false);
    burger?.addEventListener('click', onBurger);
    window.addEventListener('keydown', onKey);
    mq.addEventListener('change', onMq);
    links.forEach((l) => l.addEventListener('click', close));
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      burger?.removeEventListener('click', onBurger);
      window.removeEventListener('keydown', onKey);
      mq.removeEventListener('change', onMq);
      links.forEach((l) => l.removeEventListener('click', close));
      document.body.classList.remove('menu-open');
    };
  }, []);
  return null;
}
