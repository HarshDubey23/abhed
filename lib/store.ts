import { tick } from './engine';
import { seedWorld } from './seed';
import type { World } from './types';

/**
 * State lives in one place so the laptop and the judge's phone always see the same world.
 * - SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY set → a single row in Postgres (works on serverless).
 * - otherwise → process memory (local dev, tests, single-instance hosts).
 * Writes use optimistic concurrency on `version`.
 */

interface Backend {
  load(): Promise<World | null>;
  save(world: World, expectedVersion: number): Promise<boolean>;
}

const g = globalThis as unknown as { __kavachWorld?: World };

const memory: Backend = {
  async load() {
    return g.__kavachWorld ? structuredClone(g.__kavachWorld) : null;
  },
  async save(world, expected) {
    const cur = g.__kavachWorld;
    if (cur && cur.version !== expected) return false;
    g.__kavachWorld = structuredClone(world);
    return true;
  },
};

function supabase(url: string, key: string, table: string): Backend {
  const headers = { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' };
  return {
    async load() {
      const res = await fetch(`${url}/rest/v1/${table}?id=eq.main&select=world`, { headers, cache: 'no-store' });
      if (!res.ok) throw new Error(`state load ${res.status}`);
      const rows = (await res.json()) as { world: World }[];
      return rows[0]?.world ?? null;
    },
    async save(world, expected) {
      if (expected < 0) {
        const res = await fetch(`${url}/rest/v1/${table}`, {
          method: 'POST',
          headers: { ...headers, prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify({ id: 'main', version: world.version, world }),
        });
        return res.ok;
      }
      const res = await fetch(`${url}/rest/v1/${table}?id=eq.main&version=eq.${expected}`, {
        method: 'PATCH',
        headers: { ...headers, prefer: 'return=representation' },
        body: JSON.stringify({ version: world.version, world }),
      });
      if (!res.ok) throw new Error(`state save ${res.status}`);
      const rows = (await res.json()) as unknown[];
      return rows.length === 1;
    },
  };
}

function backend(): Backend {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) return supabase(url.replace(/\/$/, ''), key, process.env.KAVACH_TABLE ?? 'kavach_state');
  return memory;
}

export const storeKind = () => (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? 'postgres' : 'memory');

export async function getWorld(): Promise<World> {
  const b = backend();
  let w = await b.load();
  if (!w) {
    w = seedWorld();
    await b.save(w, -1);
  }
  // lazy clock for escalations / expiry
  const probe = structuredClone(w);
  if (tick(probe)) {
    return mutate((x) => {
      tick(x);
      return null;
    }).then((r) => r.world);
  }
  return w;
}

export async function mutate<T>(fn: (w: World) => T): Promise<{ world: World; result: T }> {
  const b = backend();
  for (let attempt = 0; attempt < 5; attempt++) {
    let w = await b.load();
    let expected = w ? w.version : -1;
    if (!w) {
      w = seedWorld();
      expected = -1;
    }
    const result = fn(w);
    w.version = (expected < 0 ? 0 : expected) + 1;
    if (await b.save(w, expected)) return { world: w, result };
    await new Promise((r) => setTimeout(r, 40 + Math.random() * 80));
  }
  throw new Error('Busy: too many concurrent writes, try again');
}

export async function resetWorld(): Promise<World> {
  const b = backend();
  const cur = await b.load();
  const w = seedWorld();
  w.version = (cur?.version ?? 0) + 1;
  if (cur) {
    const ok = await b.save(w, cur.version);
    if (!ok) return resetWorld();
  } else await b.save(w, -1);
  return w;
}
