import { sameOrigin, tokenFrom, updateProfile } from '@/lib/accounts';
import { json } from '@/lib/api';
import { bad, body } from '@/lib/auth-route';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!sameOrigin(req)) return bad('Cross-site request refused.', 403);
  const token = tokenFrom(req);
  if (!token) return bad('Sign in first.', 401);
  const b = await body(req);
  const r = await updateProfile(token, { name: String(b.name ?? ''), company: String(b.company ?? ''), role: String(b.role ?? '') });
  return r.ok ? json({ account: r.account }) : bad(r.error, r.status);
}
