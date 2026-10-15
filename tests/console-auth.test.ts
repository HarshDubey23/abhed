import { afterEach, describe, expect, it } from 'vitest';
import { signUp } from '../lib/accounts';
import { human } from '../lib/engine';
import { getGateway } from '../lib/gateway';
import { hashPin } from '../lib/people';
import { getWorld } from '../lib/store';

const admin = await import('../app/api/admin/route');
const command = await import('../app/api/command/route');
const gateway = await import('../app/api/gateway/route');
const connect = await import('../app/api/connect/route');

async function session(email: string) {
  const r = await signUp({ email, password: 'long enough pw', name: 'Console Tester' });
  if (!r.ok) throw new Error(r.error);
  return r.token;
}
const req = (path: string, opts: { token?: string; body?: unknown; origin?: string; director?: string } = {}) =>
  new Request(`http://abhed.test${path}`, {
    method: opts.body === undefined ? 'GET' : 'POST',
    headers: {
      'content-type': 'application/json',
      host: 'abhed.test',
      ...(opts.token ? { cookie: `abhed_session=${opts.token}` } : {}),
      ...(opts.origin ? { origin: opts.origin } : {}),
      ...(opts.director ? { 'x-director-key': opts.director } : {}),
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });

afterEach(() => {
  delete process.env.DIRECTOR_KEY;
});

describe('Console APIs need a signed-in account', () => {
  it('refuses an anonymous PIN reset on the admin API, so no one can take over an approver', async () => {
    const w = await getWorld('banking');
    const exec = w.humans.find((h) => h.roles.includes('approver_l2'))!;
    const res = await admin.POST(req('/api/admin?tenant=banking', { body: { op: 'person.upsert', person: { id: exec.id, name: exec.name, roles: exec.roles, pin: '0000' } } }));
    expect(res.status).toBe(401);
    expect(human(await getWorld('banking'), exec.id)?.pin).not.toBe(hashPin(exec.id, '0000'));
    expect((await admin.GET(req('/api/admin?tenant=banking'))).status).toBe(401);
  });

  it('lets a signed-in account use the admin panel, but not from another site', async () => {
    const token = await session('console-admin@example.com');
    expect((await admin.GET(req('/api/admin?tenant=banking', { token }))).status).toBe(200);
    const cross = await admin.POST(req('/api/admin?tenant=banking', { token, origin: 'https://evil.example', body: { op: 'agent.pause', id: 'rex' } }));
    expect(cross.status).toBe(401);
  });

  it('refuses anonymous demo commands such as a presenter approval or a reset', async () => {
    expect((await command.POST(req('/api/command', { body: { type: 'presenter_approve', approvalId: 'AP-1' } }))).status).toBe(401);
    expect((await command.POST(req('/api/command', { body: { type: 'reset' } }))).status).toBe(401);
    const token = await session('console-cmd@example.com');
    // signed in: the request reaches the command switch
    expect((await command.POST(req('/api/command', { token, body: { type: 'no_such_command' } }))).status).toBe(400);
  });

  it('keeps a locked deployment locked: with DIRECTOR_KEY set, an account is not enough', async () => {
    process.env.DIRECTOR_KEY = 'director-secret';
    const token = await session('console-locked@example.com');
    expect((await command.POST(req('/api/command', { token, body: { type: 'no_such_command' } }))).status).toBe(401);
    expect((await command.POST(req('/api/command', { director: 'director-secret', body: { type: 'no_such_command' } }))).status).toBe(400);
  });

  it('refuses anonymous pairing codes', async () => {
    expect((await connect.POST(req('/api/connect', { body: { action: 'code' } }))).status).toBe(401);
  });
});

describe('No-code companies belong to the account that connected them', () => {
  it('only the owner can rotate the key, change rules or remove the company', async () => {
    expect((await gateway.GET(req('/api/gateway'))).status).toBe(401);
    expect((await gateway.POST(req('/api/gateway', { body: { action: 'add', name: 'Anon Co' } }))).status).toBe(401);

    const owner = await session('gw-owner@example.com');
    const added = await gateway.POST(req('/api/gateway', { token: owner, body: { action: 'add', name: 'Owned Co', site: 'owned.example' } }));
    expect(added.status).toBe(200);
    const { id, key } = (await added.json()) as { id: string; key: string };
    expect(key).toMatch(/^kv_gw_/);

    const stranger = await session('gw-stranger@example.com');
    const steal = await gateway.POST(req('/api/gateway', { token: stranger, body: { action: 'rotate', id } }));
    expect(steal.status).toBe(403);
    expect(await steal.text()).not.toMatch(/kv_gw_/);
    expect((await gateway.POST(req('/api/gateway', { token: stranger, body: { action: 'rules', id, holdAbove: 99_999_999 } }))).status).toBe(403);
    expect((await gateway.POST(req('/api/gateway', { token: stranger, body: { action: 'remove', id, pin: '2468' } }))).status).toBe(403);

    const rotated = await gateway.POST(req('/api/gateway', { token: owner, body: { action: 'rotate', id } }));
    expect(rotated.status).toBe(200);
    expect(((await rotated.json()) as { key: string }).key).not.toBe(key);

    // the listing never shows who owns what, nor the key hash
    const list = await gateway.GET(req('/api/gateway', { token: stranger }));
    expect(list.status).toBe(200);
    expect(await list.text()).not.toMatch(/ownerId|keyHash/);
    expect((await getGateway()).companies.find((c) => c.id === id)?.ownerId).toBeTruthy();
  });
});
