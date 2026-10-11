import { packFor } from './sectors';
import type { World } from './types';

import { POISONED_TICKET, REX_TICKET } from './tickets';

export { POISONED_TICKET, REX_TICKET };

/**
 * A fresh company for one sector. With `history`, 30 days of clearly-labelled sample history are added
 * (needed for Replay); without it, the ledger starts empty and every number comes from live activity.
 */
export function seedWorld(now = Date.now(), opts: { sector?: string; history?: boolean } = {}): World {
  const pack = packFor(opts.sector);
  const w: World = {
    version: 0,
    seededAt: now,
    company: pack.company,
    sector: pack.id,
    biz: {},
    blocks: [],
    security: [],
    humans: [],
    agents: [],
    customers: [],
    customerCount: 0,
    rules: [],
    approvals: [],
    ledger: [],
    tickets: [],
    incidents: [],
    oversight: [],
    unregistered: [],
    agentTrace: [],
    counters: { approval: 911, incident: 41, ticket: 8840 },
    humanMinutesToday: 0,
  };
  pack.seed(w, now, { history: opts.history ?? pack.id === 'banking' });
  return w;
}
