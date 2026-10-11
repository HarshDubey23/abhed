import { json } from '@/lib/api';
import { getWorld, storeKind } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const w = await getWorld();
  return json({ ok: true, ledger_rows: w.ledger.length, store: storeKind(), scenario: 'novabank-v1' });
}
