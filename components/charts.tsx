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

export interface Slice {
  label: string;
  value: number;
  color: string;
}

/** Donut with total in the middle and a legend with shares. */
export function Donut({ slices, label, size = 132 }: { slices: Slice[]; label: string; size?: number }) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const R = 52,
    r = 34,
    c = 64;
  let a = -Math.PI / 2;
  const pt = (ang: number, rad: number) => `${(c + rad * Math.cos(ang)).toFixed(2)} ${(c + rad * Math.sin(ang)).toFixed(2)}`;
  const arcs = slices
    .filter((s) => s.value > 0)
    .map((s) => {
      const b = a + (2 * Math.PI * s.value) / Math.max(1, total);
      const large = b - a > Math.PI ? 1 : 0;
      const d = s.value === total ? null : `M${pt(a, R)} A${R} ${R} 0 ${large} 1 ${pt(b, R)} L${pt(b, r)} A${r} ${r} 0 ${large} 0 ${pt(a, r)}Z`;
      a = b;
      return { s, d };
    });
  return (
    <div className="row" style={{ gap: 14, alignItems: 'center' }}>
      <svg viewBox="0 0 128 128" width={size} height={size} role="img" aria-label={`${label}: ${slices.map((s) => `${s.label} ${s.value}`).join(', ')}`}>
        {!total && <circle cx={c} cy={c} r={43} fill="none" stroke="var(--border-soft)" strokeWidth={18} />}
        {arcs.map(({ s, d }) =>
          d ? (
            <path key={s.label} d={d} fill={s.color}>
              <title>
                {s.label}: {s.value}
              </title>
            </path>
          ) : (
            <circle key={s.label} cx={c} cy={c} r={43} fill="none" stroke={s.color} strokeWidth={18} />
          ),
        )}
        <text x={c} y={62} textAnchor="middle" fill="#fff" fontSize={20} fontWeight={600}>
          {total}
        </text>
        <text x={c} y={78} textAnchor="middle" fill="var(--muted)" fontSize={9}>
          {label}
        </text>
      </svg>
      <div style={{ minWidth: 0 }}>
        {slices.map((s) => (
          <div key={s.label} style={{ fontSize: 12, margin: '3px 0', whiteSpace: 'nowrap' }}>
            <i style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, background: s.color, marginRight: 6 }} />
            {s.label} <b>{s.value}</b> {total ? <span className="muted">{Math.round((s.value / total) * 100)}%</span> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Horizontal bars with labels and values. */
export function HBars({ items, color = 'var(--info)' }: { items: { label: string; value: number; color?: string; note?: string }[]; color?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (!items.length) return <div className="muted">Nothing yet.</div>;
  return (
    <div>
      {items.map((i) => (
        <div key={i.label} style={{ margin: '7px 0' }}>
          <div className="row between" style={{ fontSize: 12 }}>
            <span>
              {i.label} {i.note && <span className="muted">{i.note}</span>}
            </span>
            <b>{i.value}</b>
          </div>
          <div className="bar" style={{ height: 7 }}>
            <span style={{ width: `${(i.value / max) * 100}%`, background: i.color ?? color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export const PALETTE = ['#ff6363', '#ffb547', '#8fb8ff', '#b4a6ff', '#6fe0b4', '#e8c66a'];
