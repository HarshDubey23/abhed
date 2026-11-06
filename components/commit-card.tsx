'use client';

import { useEffect, useState } from 'react';
import { authHeader } from '@/lib/approver-client';

export interface WaitingCommit {
  id: string;
  summary: string;
  commitAt: number;
  status?: string;
  company?: string;
  canCancel?: boolean;
  cancelledBy?: string;
}

/** A refund waiting out its cancel window: the time left, and the one button that stops it. */
export function CommitCard({ commit, onDone }: { commit: WaitingCommit; onDone?: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, Math.ceil((commit.commitAt - now) / 1000));
  const cancel = async () => {
    setBusy(true);
    setErr(null);
    const r = await fetch(`/api/commits/${commit.id}`, { method: 'POST', headers: { 'content-type': 'application/json', ...authHeader() }, body: JSON.stringify({}) });
    const d = (await r.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!r.ok) setErr((d.error ?? 'could not cancel').toLowerCase());
    onDone?.();
  };
  return (
    <section className="ax-card" role="status" data-commit={commit.id}>
      <div className="ax-card-t">
        <span>{commit.company ? `${commit.company.replace(' (fictional)', '')} · waiting to commit` : 'Waiting to commit'}</span>
        <span className="mono" data-commit-left>
          {left} s
        </span>
      </div>
      <p className="ax-sub" style={{ marginTop: 0 }}>
        {commit.summary}
      </p>
      <p className="ax-p">No money has moved. It commits when the time runs out, unless you cancel it.</p>
      {err && (
        <p className="ax-p" style={{ color: 'var(--hold)' }}>
          {err}
        </p>
      )}
      <button className="ax-btn danger" disabled={busy || left === 0 || commit.canCancel === false} onClick={cancel} style={{ width: '100%', marginTop: 12 }}>
        Cancel this refund
      </button>
    </section>
  );
}
