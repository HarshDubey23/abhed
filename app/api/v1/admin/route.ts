import { resolveAdmin } from '@/lib/agentapi';
import { adminGet, adminPost } from '@/lib/admin-route';
import { json } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** The company's own admin panel talks to Kavach with a company admin key (never exposed to browsers). */
export async function GET(req: Request) {
  const t = resolveAdmin(req.headers.get('authorization'));
  return t ? adminGet(req, t) : json({ error: 'Company admin key required' }, 401);
}
export async function POST(req: Request) {
  const t = resolveAdmin(req.headers.get('authorization'));
  return t ? adminPost(req, t) : json({ error: 'Company admin key required' }, 401);
}
