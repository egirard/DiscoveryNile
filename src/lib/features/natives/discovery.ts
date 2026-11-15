// Discovery of natives (rules §7.7) as pure functions over the seeded dice.
import type { Terrain } from '$features/map/manifest';
import { PORTS } from '$features/map/manifest';
import { hasPart, type Roll } from '$features/map/generate';
import { distance, type HexId } from '$features/map/hex';
import { dice, noting, type RngState } from '$lib/game/random';

/** Two-dice totals that find natives: by terrain (composites take both parts), plus 7 with a river or oasis (RQ-6). */
export function nativesOn(terrain: Terrain, water: boolean): number[] {
  const out = new Set<number>();
  if (hasPart(terrain, 'lake')) [2, 3].forEach((n) => out.add(n));
  if (hasPart(terrain, 'veldt') || hasPart(terrain, 'swamp') || hasPart(terrain, 'jungle')) [2, 3, 4].forEach((n) => out.add(n));
  if (hasPart(terrain, 'mountain')) [5, 6].forEach((n) => out.add(n));
  if (water) out.add(7);
  return [...out].sort((a, b) => a - b);
}

/** "2, 3 or 4": the totals a check passes on, as a hint says them. */
export const orList = (ns: number[]): string => (ns.length < 2 ? ns.join('') : `${ns.slice(0, -1).join(', ')} or ${ns.at(-1)}`);

export function distanceToNearestPort(hex: HexId): number {
  return Math.min(...PORTS.map((p) => distance(hex, p.hex)));
}

/** The nearest port of entry by name, for the line that explains the warriors' cap (prompt 56). */
export function nearestPort(hex: HexId): { name: string; distance: number } {
  let best = PORTS[0], d = distance(hex, PORTS[0].hex);
  for (const p of PORTS) { const n = distance(hex, p.hex); if (n < d) { best = p; d = n; } }
  return { name: best.name, distance: d };
}

export interface DiscoveryResult {
  rolls: Roll[];
  /** The two-dice totals that find natives here, as the log notes them ("2, 3, 4"). */
  needed: string;
  found: boolean;
  /** Product of three dice, the greatest capped at the distance to the nearest port of entry. */
  warriors: number;
  /** The verdict with its arithmetic (prompt 56): "no natives (3 + 3 = 6)", "natives on 3: a tribe of 12 warriors, 3 × 4 × 1, the 5 cut to 1 for the distance to Mombasa". */
  summary: string;
}

export function discoverNatives(rng: RngState, terrain: Terrain, water: boolean, hex: HexId): { rng: RngState; result: DiscoveryResult } {
  const on = nativesOn(terrain, water);
  if (on.length === 0) return { rng, result: { rolls: [], needed: 'none here', found: false, warriors: 0, summary: 'no natives: none in a dry desert' } };
  const two = dice(rng, 2, 'natives', { what: 'for natives', hint: `a total of ${orList(on)} finds natives in ${terrain.replace(/-/g, ' ')}${water ? ' on water' : ''}; anything else, none`, result: ([a, b]) => `${a} + ${b} = ${a + b}: ${on.includes(a + b) ? 'natives' : 'no natives'}` });
  rng = two.state;
  const rolls: Roll[] = two.values.map((value) => ({ label: 'natives', value }));
  const sum = two.values[0] + two.values[1];
  const found = on.includes(sum);
  const needed = on.join(', ');
  if (!found) return { rng, result: { rolls, needed, found, warriors: 0, summary: `no natives (${two.values[0]} + ${two.values[1]} = ${sum})` } };
  const port = nearestPort(hex);
  const cap = port.distance;
  // The warriors asked for at the table: the two dice that found the tribe go with the ask, explained (prompt 56).
  const three = noting(() => dice(rng, 3, 'natives', { what: 'for the warriors', hint: `the three dice multiplied; the largest counts no more than ${cap}, the hex${cap === 1 ? '' : 'es'} to ${port.name}`, result: (vs) => { const s = [...vs].sort((x, y) => y - x); const top = Math.min(s[0], cap); return `${top} × ${s[1]} × ${s[2]} = ${top * s[1] * s[2]} warriors${s[0] > cap ? `, the ${s[0]} cut to ${cap}` : ''}`; } }), { making: () => ({ kind: 'natives', rolls: [...rolls], needed, outcome: `natives on ${sum}: a tribe is here, its warriors next` }) });
  rng = three.state;
  three.values.forEach((value) => rolls.push({ label: 'warriors', value }));
  const sorted = [...three.values].sort((a, b) => b - a);
  const largest = sorted[0];
  sorted[0] = Math.min(sorted[0], cap);
  const warriors = sorted[0] * sorted[1] * sorted[2];
  // The dice as they count, in the order thrown, the largest cut to the cap where it lay.
  const counted = [...three.values];
  counted[counted.indexOf(largest)] = sorted[0];
  const cut = largest > cap ? `, the ${largest} cut to ${cap}, the hex${cap === 1 ? '' : 'es'} to ${port.name}` : '';
  return { rng, result: { rolls, needed, found, warriors, summary: `natives on ${sum}: a tribe of ${warriors} warriors, ${counted.join(' × ')}${cut}` } };
}
