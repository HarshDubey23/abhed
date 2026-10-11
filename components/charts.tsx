'use client';

export function SpeedChart({ points }: { points: { t: number; auto: number; held: number; blocked: number; p95: number }[] }) {
  const W = 520,
    H = 150,
    pad = 22;
  const max = Math.max(1, ...points.map((p) => p.auto + p.held + p.blocked));
  const maxMs = Math.max(1, ...points.map((p) => p.p95));
  const bw = (W - pad * 2) / Math.max(1, points.length);
  const y = (v: number) => H - pad - (v / max) * (H - pad * 2);
  const ym = (v: number) => H - pad - (v / maxMs) * (H - pad * 2);
  const line = points.map((p, i) => (p.p95 ? `${pad + i * bw + bw / 2},${ym(p.p95)}` : null)).filter(Boolean).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }} role="img" aria-label="Agent actions over time by outcome, with gateway latency">
      {points.map((p, i) => {
        const x = pad + i * bw + 1;
        const a = y(p.auto),
          h = y(p.auto + p.held),
          b = y(p.auto + p.held + p.blocked);
        return (
          <g key={i}>
            <rect x={x} y={a} width={bw - 2} height={H - pad - a} fill="var(--allow)" opacity={0.85} />
            <rect x={x} y={h} width={bw - 2} height={a - h} fill="var(--human)" />
            <rect x={x} y={b} width={bw - 2} height={h - b} fill="var(--block)" />
          </g>
        );
      })}
      {line && <polyline points={line} fill="none" stroke="#fff" strokeWidth={1.4} strokeDasharray="3 3" opacity={0.7} />}
      <text x={pad} y={12} fill="var(--muted)" fontSize={10}>
        {max} actions
      </text>
      <text x={W - pad} y={12} fill="var(--muted)" fontSize={10} textAnchor="end">
        p95 {maxMs.toFixed(1)} ms
      </text>
      <line x1={pad} x2={W - pad} y1={H - pad} y2={H - pad} stroke="var(--border)" />
    </svg>
  );
}
