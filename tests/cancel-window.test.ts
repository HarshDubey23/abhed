import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cancelCommit, decideApproval, gateway, GovError, tick, verifyLedger } from '@/lib/engine';
import { ruleBasedPlan } from '@/lib/planner';
import { applyRexRun, REX_TICKET } from '@/lib/scenarios';
import { seedWorld } from '@/lib/seed';
import type { ActionReq, World } from '@/lib/types';

const WINDOW = 60_000;
const NOW = 1_760_000_100_000;
const APPROVED_AT = NOW + 1000;
const fresh = () => seedWorld(1_760_000_000_000);
// refunds that really moved money since the test began: the seed has its own history
const moneyMoved = (w: World) => w.ledger.filter((r) => r.ts >= NOW && r.action === 'issue_refund' && (r.decision === 'ALLOWED' || r.decision === 'EXECUTED'));
const spent = (w: World) => w.agents.find((a) => a.id === 'rex')!.spentToday;

/** Rex's seeded ₹40,000 refund, approved by a person. */
function approved() {
  const w = fresh();
  const res = applyRexRun(w, ruleBasedPlan(REX_TICKET, { customerId: 'C-1029' }), NOW);
  const held = spent(w);
  const ap = w.approvals.find((a) => a.id === res.approvalId)!;
  decideApproval(w, ap.id, { decision: 'approve', name: 'Dr. Judge', actionHash: ap.actionHash, decisionMs: 9000, evidenceViewed: true }, APPROVED_AT);
  return { w, ap, held };
}

describe('Refund cancel window', () => {
  beforeEach(() => vi.stubEnv('ABHED_COMMIT_WINDOW_SECONDS', String(WINDOW / 1000)));
  afterEach(() => vi.unstubAllEnvs());

  it('moves no money until the window ends, then commits exactly once', () => {
    const { w, ap, held } = approved();
    expect(ap.status).toBe('APPROVED');
    expect(moneyMoved(w)).toHaveLength(0);
    const c = w.commits!.find((x) => x.id === ap.commitId)!;
    expect(c.status).toBe('WAITING');
    expect(c.commitAt).toBe(APPROVED_AT + WINDOW);
    expect(spent(w)).toBe(held + 40_000);
    expect(ap.output).toMatchObject({ status: 'WAITING_TO_COMMIT', commitId: c.id });

    expect(tick(w, c.commitAt - 1)).toBe(false);
    expect(moneyMoved(w)).toHaveLength(0);

    expect(tick(w, c.commitAt)).toBe(true);
    expect(c.status).toBe('COMMITTED');
    expect(ap.status).toBe('EXECUTED');
    expect(moneyMoved(w)).toHaveLength(1);
    expect(moneyMoved(w)[0]).toMatchObject({ approvers: ['Dr. Judge'], ruleRef: 'REFUND-L1@2' });
    expect(moneyMoved(w)[0].params.amount).toBe(40_000);
    expect(ap.executedSeq).toBe(moneyMoved(w)[0].seq);
    expect(spent(w)).toBe(held + 40_000);

    expect(tick(w, c.commitAt + 5000)).toBe(false);
    expect(moneyMoved(w)).toHaveLength(1);
    expect(verifyLedger(w).valid).toBe(true);
  });

  it('lets a person cancel, moves no money, and records each step on the ledger in order', () => {
    const { w, ap, held } = approved();
    const id = ap.commitId!;
    const c = cancelCommit(w, id, 'isha', 'Customer called: wrong account', NOW + 5000);
    expect(c).toMatchObject({ status: 'CANCELLED', cancelledBy: 'Isha Verma' });
    expect(ap.status).toBe('VOID');
    expect(spent(w)).toBe(held);

    tick(w, NOW + 10 * WINDOW);
    expect(moneyMoved(w)).toHaveLength(0);

    const steps = w.ledger.filter((r) => r.meta?.commitId === id);
    expect(steps.map((r) => [r.action, r.decision])).toEqual([['commit_scheduled', 'INFO'], ['commit_cancelled', 'VOID']]);
    expect(steps[1].seq).toBeGreaterThan(steps[0].seq);
    expect(steps[1]).toMatchObject({ actorType: 'human', actorName: 'Isha Verma', outcome: 'blocked' });
    expect(steps[1].reason).toContain('wrong account');
    expect(verifyLedger(w).valid).toBe(true);
  });

  it('refuses a cancel once the window is over, and the refund still commits once', () => {
    const { w, ap } = approved();
    const id = ap.commitId!;
    const c = w.commits!.find((x) => x.id === id)!;
    expect(() => cancelCommit(w, id, 'isha', '', c.commitAt)).toThrow(GovError);
    expect(c.status).toBe('COMMITTED');
    expect(moneyMoved(w)).toHaveLength(1);
    expect(() => cancelCommit(w, id, 'isha', '', c.commitAt + 1)).toThrow(/already committed/);
    expect(moneyMoved(w)).toHaveLength(1);
  });

  it('refuses a cancel from an agent id', () => {
    const { w, ap } = approved();
    expect(() => cancelCommit(w, ap.commitId!, 'rex', '', NOW + 2000)).toThrow(/no longer registered/);
    expect(w.commits!.find((x) => x.id === ap.commitId)!.status).toBe('WAITING');
  });

  it('refuses a second cancel without counting the budget twice', () => {
    const { w, ap, held } = approved();
    cancelCommit(w, ap.commitId!, 'isha', '', NOW + 2000);
    expect(() => cancelCommit(w, ap.commitId!, 'isha', '', NOW + 3000)).toThrow(/already cancelled/);
    expect(spent(w)).toBe(held);
  });

  it('voids the refund if the agent was paused during the window', () => {
    const { w, ap } = approved();
    w.agents.find((a) => a.id === 'rex')!.status = 'PAUSED';
    tick(w, NOW + 10 * WINDOW);
    expect(moneyMoved(w)).toHaveLength(0);
    expect(w.commits!.find((x) => x.id === ap.commitId)!.status).toBe('CANCELLED');
    expect(ap.status).toBe('VOID');
    expect(w.ledger.some((r) => r.action === 'commit_void' && r.decision === 'VOID')).toBe(true);
  });

  describe('a refund the rules allow on their own', () => {
    const refund = (amount: number): ActionReq => ({ actorType: 'agent', actorId: 'rex', action: 'issue_refund', params: { customer: 'C-3341', amount, to_account: 'own' }, ticketId: 'T-1', channel: 'live' });
    const allowed = (w: World, amount: number, now = NOW) => {
      const res = gateway(w, refund(amount), { now });
      expect(res.decision).toBe('ALLOWED');
      return res;
    };

    it('has no window when small', () => {
      const w = fresh();
      allowed(w, 2_000);
      expect(w.commits ?? []).toHaveLength(0);
      expect(moneyMoved(w)).toHaveLength(1);
    });

    it('waits when large, and a retry joins the one already waiting', () => {
      const w = fresh();
      // the refund is grounded against the system of record, so the failed debit must be this size
      const debit = (w.biz.txns as { customer: string; status: string; amount: number }[]).find((t) => t.customer === 'C-3341' && ['duplicate', 'failed'].includes(t.status))!;
      debit.amount = 6_000;
      const first = allowed(w, 6_000);
      expect(first.output).toMatchObject({ status: 'WAITING_TO_COMMIT' });
      const second = allowed(w, 6_000, NOW + 1000);
      expect(second.output).toMatchObject({ commitId: (first.output as { commitId: string }).commitId });
      expect(w.commits).toHaveLength(1);
      expect(moneyMoved(w)).toHaveLength(0);
      tick(w, NOW + 2 * WINDOW);
      expect(moneyMoved(w)).toHaveLength(1);
    });
  });

  it('is off when the window is set to zero', () => {
    vi.stubEnv('ABHED_COMMIT_WINDOW_SECONDS', '0');
    const { w, ap } = approved();
    expect(ap.status).toBe('EXECUTED');
    expect(w.commits ?? []).toHaveLength(0);
  });
});
