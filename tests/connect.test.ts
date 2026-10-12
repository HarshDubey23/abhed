import { describe, expect, it } from 'vitest';
import { conn, disconnect, forgetConnection, isConnected, issueCode, pair } from '../lib/connect';
import { getWorld, mutate, resetWorld, withTenant } from '../lib/store';

describe('Connect a website live', () => {
  it('starts NovaBank connected and the other two disconnected', async () => {
    for (const t of ['banking', 'healthcare', 'ecommerce'] as const) await withTenant(t, () => resetWorld({ sector: t, history: false }));
    expect(conn(await getWorld('banking')).status).toBe('connected');
    expect(conn(await getWorld('healthcare')).status).toBe('disconnected');
    forgetConnection('healthcare');
    expect(await isConnected('healthcare')).toBe(false);
  });

  it('pairs with a one-time code, hands over keys, and writes it to the ledger', async () => {
    const { result: code } = await mutate((w) => issueCode(w), 'ecommerce');
    expect(code).toMatch(/^[A-Z2-9]{6}$/);
    expect(conn(await getWorld('ecommerce')).status).toBe('waiting');
    const r = await pair(code.toLowerCase(), { url: 'https://bazaar.example', name: 'Bazaar.in' });
    if (!r.ok) throw new Error(r.error);
    expect(r.tenant).toBe('ecommerce');
    expect(Object.keys(r.keys)).toContain('shoppy');
    expect(r.adminKey).toMatch(/^kv_admin_/);
    const w = await getWorld('ecommerce');
    expect(conn(w).status).toBe('connected');
    expect(w.ledger.at(-1)?.action).toBe('connect_site');
    forgetConnection('ecommerce');
    expect(await isConnected('ecommerce')).toBe(true);
    const again = await pair(code, { url: 'https://evil.example', name: 'x' });
    expect(again.ok).toBe(false);
  });

  it('refuses the keys again after a disconnect', async () => {
    await mutate((w) => disconnect(w, 'test'), 'ecommerce');
    forgetConnection('ecommerce');
    expect(await isConnected('ecommerce')).toBe(false);
    expect((await getWorld('ecommerce')).ledger.at(-1)?.action).toBe('disconnect_site');
  });
});
