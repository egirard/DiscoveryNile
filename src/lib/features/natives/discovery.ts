// Discovery of natives (rules §7.7) as pure functions over the seeded dice.
import type { Terrain } from '$features/map/manifest';
import { PORTS } from '$features/map/manifest';
import { hasPart, type Roll } from '$features/map/generate';
import { distance, type HexId } from '$features/map/hex';
import { dice, type RngState } from '$lib/game/random';

/** Two-dice totals that find natives: by terrain (composites take both parts), plus 7 with a river or oasis (RQ-6). */
export function nativesOn(terrain: Terrain, water: boolean): number[] {
  const out = new Set<number>();
  if (hasPart(terrain, 'lake')) [2, 3].forEach((n) => out.add(n));
  if (hasPart(terrain, 'veldt') || hasPart(terrain, 'swamp') || hasPart(terrain, 'jungle')) [2, 3, 4].forEach((n) => out.add(n));
  if (hasPart(terrain, 'mountain')) [5, 6].forEach((n) => out.add(n));
  if (water) out.add(7);
  return [...out].sort((a, b) => a - b);
}

export function distanceToNearestPort(hex: HexId): number {
  return Math.min(...PORTS.map((p) => distance(hex, p.hex)));
}

export interface DiscoveryResult {
  rolls: Roll[];
  found: boolean;
  /** Product of three dice, the greatest capped at the distance to the nearest port of entry. */
  warriors: number;
}

export function discoverNatives(rng: RngState, terrain: Terrain, water: boolean, hex: HexId): { rng: RngState; result: DiscoveryResult } {
  const on = nativesOn(terrain, water);
  if (on.length === 0) return { rng, result: { rolls: [], found: false, warriors: 0 } };
  const two = dice(rng, 2, 'natives', { what: 'for natives', hint: `natives on ${on.join(', ')}` });
  rng = two.state;
  const rolls: Roll[] = two.values.map((value) => ({ label: 'natives', value }));
  const found = on.includes(two.values[0] + two.values[1]);
  if (!found) return { rng, result: { rolls, found, warriors: 0 } };
  const cap = distanceToNearestPort(hex);
  const three = dice(rng, 3, 'natives', { what: 'for the warriors', hint: `the product, the largest die no more than ${cap}` });
  rng = three.state;
  three.values.forEach((value) => rolls.push({ label: 'warriors', value }));
  const sorted = [...three.values].sort((a, b) => b - a);
  sorted[0] = Math.min(sorted[0], cap);
  return { rng, result: { rolls, found, warriors: sorted[0] * sorted[1] * sorted[2] } };
}
