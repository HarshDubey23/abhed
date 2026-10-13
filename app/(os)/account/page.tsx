'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { initials, useAccount } from '@/components/site';

const ROLES = ['Operator', 'Approver', 'Developer', 'Compliance', 'Founder or executive', 'Student or researcher'];
const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

export default function AccountPage() {
  const router = useRouter();
  const [account, setAccount] = useAccount();
  const [f, setF] = useState({ name: '', company: '', role: ROLES[0] });
  const [state, setState] = useState<{ busy?: boolean; error?: string; saved?: boolean }>({});
  useEffect(() => {
    if (account) setF({ name: account.name, company: account.company ?? '', role: account.role ?? ROLES[0] });
  }, [account]);

  if (account === undefined) return <main className="page muted">Loading your account…</main>;
  if (!account)
    return (
      <main className="page">
        <div className="acct-empty panel">
          <p className="kicker">Your account</p>
          <h1 className="page-title">
            You’re not signed in. <em>Nothing is locked.</em>
          </h1>
          <p className="page-sub">The demo, Break Abhed and the fleet are open to everyone. An account keeps your details for when you connect your own company.</p>
          <div className="row" style={{ gap: 10, marginTop: 22, flexWrap: 'wrap' }}>
            <Link className="btn btn-solid" href="/login?next=/account">
              Sign in
            </Link>
            <Link className="btn btn-ghost" href="/signup?next=/account">
              Create an account
            </Link>
          </div>
        </div>
      </main>
    );

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setState({ busy: true });
    const r = await fetch('/api/auth/profile', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(f) }).catch(() => null);
    const j = r ? ((await r.json().catch(() => ({}))) as { account?: typeof account; error?: string }) : { error: 'You seem to be offline.' };
    if (r?.ok && j.account) {
      setAccount(j.account);
      setState({ saved: true });
    } else setState({ error: j.error ?? 'Could not save.' });
  };
  const signOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
    setAccount(null);
    router.replace('/');
    router.refresh();
  };

  return (
    <main className="page">
      <div className="page-head">
        <div className="acct-head">
          <span className="acct-av" aria-hidden="true">
            {initials(account.name)}
          </span>
          <div>
            <p className="kicker">Your account</p>
            <h1 className="page-title">
              Hi, {account.name.split(' ')[0]}. <em>Welcome to Abhed.</em>
            </h1>
          </div>
        </div>
        <button className="btn btn-ghost" onClick={signOut}>
          Sign out
        </button>
      </div>

      <div className="acct-grid">
        <form className="panel acct-form" onSubmit={save}>
          <div className="panel-title">
            <span>
              <b>Profile</b>
            </span>
          </div>
          <label className="field">
            Name
            <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} minLength={2} maxLength={80} required autoComplete="name" />
          </label>
          <label className="field">
            Email
            <input value={account.email} readOnly disabled />
          </label>
          <div className="acct-two">
            <label className="field">
              Company
              <input value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} maxLength={80} autoComplete="organization" />
            </label>
            <label className="field">
              Role
              <select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
                {[...new Set([f.role, ...ROLES])].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
          </div>
          {state.error && (
            <p className="acct-msg bad" role="alert">
              {state.error}
            </p>
          )}
          {state.saved && (
            <p className="acct-msg ok" role="status">
              Saved.
            </p>
          )}
          <div>
            <button className="btn btn-solid" disabled={state.busy}>
              {state.busy ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>

        <div className="acct-side">
          <div className="panel">
            <div className="panel-title">
              <span>
                <b>Account</b>
              </span>
            </div>
            <dl className="acct-dl">
              <dt>Member since</dt>
              <dd>{when(account.created_at)}</dd>
              <dt>Last sign-in</dt>
              <dd>{when(account.last_login_at)}</dd>
              <dt>Session</dt>
              <dd>This device, for 7 days</dd>
            </dl>
          </div>
          <div className="panel">
            <div className="panel-title">
              <span>
                <b>Next steps</b>
              </span>
            </div>
            <nav className="acct-links">
              <Link href="/connect">
                <b>Connect a company</b>
                <span>Point your agents at Abhed with a base URL and a key</span>
              </Link>
              <Link href="/approver">
                <b>Become an approver</b>
                <span>Sign big moves from your phone</span>
              </Link>
              <Link href="/fleet">
                <b>Watch the fleet</b>
                <span>Every governed action, live</span>
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </main>
  );
}
