import type { Terrain } from './manifest';

export interface HexFeatures {
  river?: boolean;
  oasis?: boolean;
}

/**
 * Points for publishing a mapped hex (rules §12, "Areas Mapped"). Composite terrain scores in
 * every category it belongs to; a river adds one and an oasis two. The rulebook lists no value
 * for mountain terrain, so it scores nothing on its own (RQ-14); peaks score as superlatives.
 */
export function terrainPoints(terrain: Terrain | null, features: HexFeatures = {}): number {
  const base: Record<Terrain, number> = {
    desert: 1,
    veldt: 1,
    lake: 1,
    jungle: 2,
    swamp: 2,
    mountain: 0,
    'jungle-swamp': 4,
    'jungle-mountain': 2
  };
  let points = terrain ? base[terrain] : 0;
  if (features.river) points += 1;
  if (features.oasis) points += 2;
  return points;
}
