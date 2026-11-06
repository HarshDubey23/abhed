import { govMutate, json } from '@/lib/api';
import { tokensFrom } from '@/lib/approver-auth';
import { cancelCommit, tenantOfCommit } from '@/lib/engine';
import { packFor } from '@/lib/sectors';

export const dynamic = 'force-dynamic';

/** A signed-in approver of this company cancels a refund during its window. Agent keys do not work here. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const tenant = tenantOfCommit(id);
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const me = tokensFrom(req, body).find((t) => t.tenant === tenant);
  if (!me) return json({ error: `Sign in as a ${packFor(tenant).company.replace(' (fictional)', '')} approver first.`, needSignIn: true, tenant }, 401);
  return govMutate((w) => ({ status: cancelCommit(w, id, me.humanId, String(body.note ?? '')).status }), { tenant, view: false });
}
