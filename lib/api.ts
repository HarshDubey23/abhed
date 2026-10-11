import { NextResponse } from 'next/server';
import { GovError } from './engine';
import { mutate } from './store';
import type { World } from './types';
import { buildView } from './view';

export const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { 'cache-control': 'no-store' } });

/** Run a governed mutation. Gov errors still persist side effects (e.g. a VOID record) and return 4xx. */
export async function govMutate<T>(fn: (w: World) => T) {
  try {
    const { world, result } = await mutate((w) => {
      try {
        return { ok: true as const, value: fn(w) };
      } catch (e) {
        if (e instanceof GovError) return { ok: false as const, error: e.message, status: e.status };
        throw e;
      }
    });
    if (!result.ok) return json({ error: result.error, view: buildView(world) }, result.status);
    return json({ result: result.value, view: buildView(world) });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Unexpected error' }, 500);
  }
}

export function directorAllowed(req: Request) {
  const need = process.env.DIRECTOR_KEY;
  if (!need) return true;
  return req.headers.get('x-director-key') === need;
}
