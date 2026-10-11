import { auditPdf } from '@/lib/audit-pdf';
import { appendLedger } from '@/lib/engine';
import { packFor } from '@/lib/sectors';
import { mutate } from '@/lib/store';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/** One click: the full audit report as a PDF. The download itself is recorded in the ledger. */
export async function GET(req: Request) {
  const by = (new URL(req.url).searchParams.get('by') ?? 'Auditor').slice(0, 40);
  const { world } = await mutate((w) => {
    appendLedger(w, { ts: Date.now(), actorType: 'human', actorId: 'auditor', actorName: by, action: 'audit_export', params: { format: 'pdf' }, decision: 'INFO', reason: `${by} downloaded the audit report (${w.ledger.length + 1} records).` });
    return null;
  });
  const bytes = await auditPdf(world, { requestedBy: by });
  const name = `kavach-audit-${packFor(world.sector).id}-${new Date().toISOString().slice(0, 10)}.pdf`;
  return new Response(Buffer.from(bytes), {
    headers: { 'content-type': 'application/pdf', 'content-disposition': `attachment; filename="${name}"`, 'cache-control': 'no-store' },
  });
}
