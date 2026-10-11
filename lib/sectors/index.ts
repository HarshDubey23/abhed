import { banking } from './banking';
import { ecommerce } from './ecommerce';
import { healthcare } from './healthcare';
import type { World } from '../types';
import { hijackedPlan, type SectorId, type SectorPack } from './types';

export const SECTORS: Record<SectorId, SectorPack> = { banking, healthcare, ecommerce };
export const packFor = (id: string | undefined): SectorPack => SECTORS[(id as SectorId) ?? 'banking'] ?? banking;

/** Offline planner: follows embedded instructions like a naive model would, otherwise the pack's own plan. */
export function offlinePlanFor(pack: SectorPack, agentId: string, input: Parameters<SectorPack['offlinePlan']>[1], w: World) {
  return hijackedPlan(input.text, w, pack) ?? pack.offlinePlan(agentId, input, w);
}
export type { SectorId, SectorPack } from './types';
