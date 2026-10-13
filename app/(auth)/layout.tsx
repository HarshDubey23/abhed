import Link from 'next/link';
import { LiveFeed } from '@/components/site';
import { AbhedMark } from '@/components/mark';

/** Sign in and sign up: the form on one side, the live system on the other. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="au">
      <aside className="au-side">
        <Link href="/" className="au-brand" aria-label="Abhed home">
          <AbhedMark size={26} />
          <span>Abhed</span>
        </Link>
        <div className="au-side-mid">
          <p className="au-side-k">Live from the gate</p>
          <h2>
            Every action,
            <br />
            signed &amp; sealed.
          </h2>
          <LiveFeed rows={4} />
        </div>
        <p className="au-side-foot">
          No account needed to try it: <Link href="/demo">open the live demo</Link>.
        </p>
      </aside>
      <main className="au-main">{children}</main>
    </div>
  );
}
