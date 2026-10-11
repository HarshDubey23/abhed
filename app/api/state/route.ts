import { json } from '@/lib/api';
import { getLive, getWorld, storeKind } from '@/lib/store';
import { buildView } from '@/lib/view';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [w, live] = await Promise.all([getWorld(), getLive()]);
    const { approvers, ...rest } = live;
    const safeApprovers = Object.fromEntries(Object.entries(approvers).map(([k, a]) => [k, { name: a.name, lastSeen: a.lastSeen, push: a.push, device: a.device }]));
    return json({
      ...buildView(w),
      live: { ...rest, approvers: safeApprovers },
      store: storeKind(),
      llm: Boolean(process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY),
      push: Boolean(process.env.VAPID_PUBLIC_KEY),
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'state error' }, 500);
  }
}
