import { adminGet, adminPost } from '@/lib/admin-route';
import { consoleCaller, signInFirst } from '@/lib/api';
import { currentTenant } from '@/lib/store';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Same admin operations from the Abhed console, for the company selected in the top bar. Signed-in accounts only. */
export async function GET(req: Request) {
  if (!(await consoleCaller(req))) return signInFirst();
  return adminGet(req, await currentTenant(new URL(req.url).searchParams.get('tenant') ?? undefined));
}
export async function POST(req: Request) {
  if (!(await consoleCaller(req))) return signInFirst();
  return adminPost(req, await currentTenant(new URL(req.url).searchParams.get('tenant') ?? undefined));
}
