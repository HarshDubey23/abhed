'use client';

import { useId } from 'react';

/** The Abhed mark: an angular bolt with two bright notches (silver, no colour). */
export function AbhedMark({ size = 22 }: { size?: number }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg width={(size * 31.5) / 48.5} height={size} viewBox="0 0 31.5 48.5" aria-hidden="true">
      <defs>
        <linearGradient id={`m${id}`} x1="8" y1="0" x2="34.1" y2="28.9" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#9e9e9e" />
          <stop offset=".28" stopColor="#a6a6a6" />
          <stop offset=".34" stopColor="#a3a3a3" />
          <stop offset=".4" stopColor="#3a3a3a" />
          <stop offset=".55" stopColor="#414141" />
          <stop offset=".6" stopColor="#7a7a7a" />
          <stop offset=".68" stopColor="#8e8e8e" />
          <stop offset=".8" stopColor="#a9a9a9" />
          <stop offset=".95" stopColor="#c4c4c4" />
          <stop offset="1" stopColor="#cccccc" />
        </linearGradient>
      </defs>
      <path d="M21.5 0 L21.5 19.5 L31.5 19.5 L31.5 29 L10 48.5 L10 28.5 L0.5 28.5 L0.5 18.5 Z" fill={`url(#m${id})`} />
      <rect x="0.5" y="18.5" width="9" height="10" fill="#fdfdfd" />
      <rect x="22" y="19.5" width="9.5" height="9.5" fill="#fdfdfd" />
    </svg>
  );
}
