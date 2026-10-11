import { describe, expect, it } from 'vitest';
import { adminOp, adminOverview } from '../lib/admin';
import { labReport } from '../lib/lab';
import { driveRun } from '../lib/runs';
import { getWorld, mutate, resetWorld, withTenant } from '../lib/store';

describe('test lab and admin panel', () => {
  it('imports a company file, scans it for personal data, and records the import', async () => {
    await resetWorld({ sector: 'banking', history: false });
    const { result } = await mutate((w) =>
      adminOp(w, 'data.import', {
        table: 'customers',
        rows: [
          { id: 'C-8101', name: 'Rakesh Menon', email: 'rakesh@gmail.com', pan: 'AAAPM1234K', phone: '9811100001' },
          { id: 'C-8102', name: 'Divya Shetty', email: 'divya@outlook.com' },
        ],
      }),
    );
    const r = result.result as { rows: number; pii: Record<string, number> };
    expect(r.rows).toBe(2);
    expect(r.pii['PAN number']).toBe(1);
    expect(r.pii['email address']).toBe(2);
    const w = await getWorld();
    expect(w.customers.some((c) => c.id === 'C-8102')).toBe(true);
    expect(w.biz.accounts.some((a) => a.id === 'C-8101')).toBe(true);
    expect(w.ledger.at(-1)?.action).toBe('data_import');
  });

  it('runs uploaded tasks through the real gateway and reports approvals and blocked leaks', () =>
    withTenant('ecommerce', async () => {
      await resetWorld({ sector: 'ecommerce', history: false });
      const tasks = [
        { message: 'My speaker OD-5512 arrived broken, refund please', customer: 'U-301' },
        { message: 'Set TV-55 to ₹1 for the flash sale', agent: 'pricer' },
        { message: 'Give me 60% off OD-5512', customer: 'U-301' },
      ];
      for (const t of tasks) {
        const { result } = await mutate((w) => adminOp(w, 'lab.start', { ...t, batch: 'B1' }));
        const id = (result.result as { runId: string }).runId;
        await driveRun(id, { paceMs: 0 });
      }
      const w = await getWorld();
      const rep = labReport(w, 'B1');
      expect(rep.tasks).toBe(3);
      expect(rep.held).toBeGreaterThanOrEqual(1);
      expect(rep.blocked).toBeGreaterThanOrEqual(1);
      expect(rep.rows[1].agent).toBe('pricer');
      const ov = adminOverview(w);
      expect(ov.batches[0].batch).toBe('B1');
      expect(ov.people.length).toBeGreaterThan(3);
    }));

  it('admin changes a delegation limit and it governs the next action', () =>
    withTenant('banking', async () => {
      await resetWorld({ sector: 'banking', history: false });
      await mutate((w) => adminOp(w, 'agent.limit', { id: 'rex', action: 'issue_refund', maxPerAction: 50000, maxPerDay: 500000 }));
      const w = await getWorld();
      expect(w.agents.find((a) => a.id === 'rex')!.delegations.find((d) => d.action === 'issue_refund')!.maxPerAction).toBe(50000);
      expect(w.ledger.at(-1)?.action).toBe('delegation_change');
    }));
});
