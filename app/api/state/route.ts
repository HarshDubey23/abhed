import { json } from '@/lib/api';
import { getWorld, storeKind } from '@/lib/store';
import { buildView } from '@/lib/view';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const w = await getWorld();
    return json({ ...buildView(w), store: storeKind(), llm: Boolean(process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY) });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'state error' }, 500);
  }
}
