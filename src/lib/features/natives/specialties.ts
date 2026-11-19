// The specialties practised in the field (rules §9): a specimen hunt for zoologists and geologists,
// preaching for missionaries, treatment for doctors. Pure functions over the 'specialty' stream.
import { orList, span } from './discovery';
import type { Terrain } from '$features/map/manifest';
import { capital, hasPart, terrainName, type Roll } from '$features/map/generate';
import { d6, type RngState } from '$lib/game/random';

/** Die results that find a zoological specimen: by terrain (composites take both parts), 1 with a river or oasis. */
export function zoologyFinds(terrain: Terrain, water: boolean): number[] {
  const out = new Set<number>();
  if (hasPart(terrain, 'lake')) out.add(1);
  if (hasPart(terrain, 'veldt') || hasPart(terrain, 'swamp')) [2, 3].forEach((n) => out.add(n));
  if (hasPart(terrain, 'jungle')) [2, 3, 4].forEach((n) => out.add(n));
  if (hasPart(terrain, 'mountain')) [4, 5].forEach((n) => out.add(n));
  if (hasPart(terrain, 'desert')) out.add(6);
  if (water) out.add(1);
  return [...out].sort((a, b) => a - b);
}

/** Die results that find a geological specimen; never in a lake; 6 with a river. */
export function geologyFinds(terrain: Terrain, river: boolean): number[] {
  const out = new Set<number>();
  if (terrain === 'lake') return [];
  if ((terrain === 'swamp' || terrain === 'jungle' || terrain === 'jungle-swamp')) out.add(1);
  if (terrain === 'jungle-mountain' || terrain === 'veldt') [1, 2].forEach((n) => out.add(n));
  if (terrain === 'mountain') [1, 2, 3, 4].forEach((n) => out.add(n));
  if (terrain === 'desert') [1, 2, 3].forEach((n) => out.add(n));
  if (river) out.add(6);
  return [...out].sort((a, b) => a - b);
}

export function study(rng: RngState, specialty: 'zoology' | 'geology', terrain: Terrain, river: boolean, oasis: boolean): { rng: RngState; rolls: Roll[]; found: boolean; needed: string; summary: string } {
  const finds = specialty === 'zoology' ? zoologyFinds(terrain, river || oasis) : geologyFinds(terrain, river);
  const r = d6(rng, 'specialty', { what: 'Any specimen? Roll a D6', hint: finds.length ? `${span(finds)} finds one in ${terrainName(terrain)}${(specialty === 'zoology' ? river || oasis : river) ? ' on water' : ''}` : 'nothing to find here, whatever the die', label: 'Specimen?', result: ([v]) => (finds.includes(v) ? '=> A specimen is found' : '=> None') });
  const found = finds.includes(r.value);
  // What the die needed goes on the line (prompt 56), so the verdict is read against it.
  return { rng: r.state, rolls: [{ label: specialty, value: r.value }], found, needed: finds.length ? finds.join(', ') : 'none here', summary: found ? `a ${specialty === 'zoology' ? 'zoological' : 'geological'} specimen is found` : `no ${specialty === 'zoology' ? 'zoological' : 'geological'} specimen here` };
}

export interface PreachResult {
  rng: RngState;
  rolls: Roll[];
  attitude: number;
  /** Poisoning attempts the chief and witch doctor make (rules §9). */
  poisonAttempts: number;
  summary: string;
}

/** The missionary preaches: one die (rules §9). */
export function preach(rng: RngState): PreachResult {
  const table: Record<number, [number, number, string]> = {
    1: [0, 0, 'the natives jeer and taunt'],
    2: [1, 0, 'the natives ignore him'],
    3: [2, 0, 'the natives listen respectfully'],
    4: [3, 2, 'the natives applaud; the chief and the witch doctor each try poison'],
    5: [4, 1, 'the witch doctor asks to be baptised; the chief tries poison'],
    6: [5, 0, 'the chief asks to be baptised']
  };
  const r = d6(rng, 'specialty', { what: 'Preaching: Roll a D6', hint: 'the tribe’s attitude rises by the die less 1; 4 and 5 bring poison attempts', label: 'Preaching', result: ([v]) => `=> ${capital(table[v][2])}${table[v][0] ? ` (attitude +${table[v][0]})` : ''}` });
  const [attitude, poisonAttempts, text] = table[r.value];
  return { rng: r.state, rolls: [{ label: 'preaching', value: r.value }], attitude, poisonAttempts, summary: `${text}${attitude ? ` (attitude +${attitude})` : ''}` };
}

export interface TreatResult extends PreachResult {
  explorerDies: boolean;
  explorerSick: boolean;
  points: number;
}

/** The doctor treats the tribe: one die, −1 without the chief's permission (in captivity) (rules §9). */
export function treat(rng: RngState, captive: boolean): TreatResult {
  const r = d6(rng, 'specialty', { what: 'Treatment: Roll a D6', hint: `${captive ? '−1 in captivity: ' : ''}1 a fatal disease, 2 the explorer falls sick, 3 the epidemic spreads, 4 nothing, 5 minor cases, 6 major cases`, label: 'Treatment', result: ([d]) => { const x = d - (captive ? 1 : 0); return `${captive ? `${d} − 1 = ${x} ` : ''}=> ${x <= 1 ? 'A fatal disease' : x === 2 ? 'The explorer falls sick' : x === 3 ? 'The epidemic spreads' : x === 4 ? 'Nothing to treat' : x === 5 ? 'Minor cases treated' : 'Major cases treated'}`; } });
  const v = r.value - (captive ? 1 : 0);
  const base = { rng: r.state, rolls: [{ label: 'medicine', value: r.value }], attitude: 0, poisonAttempts: 0, explorerDies: false, explorerSick: false, points: 0 };
  if (v <= 1) return { ...base, explorerDies: true, summary: 'the explorer contracts a strange disease and dies' };
  if (v === 2) return { ...base, explorerSick: true, summary: 'the explorer falls sick' };
  if (v === 3) return { ...base, attitude: -1, poisonAttempts: 1, summary: 'the epidemic is not halted; the chief tries poison (attitude −1)' };
  if (v === 4) return { ...base, summary: 'no significant cases to treat' };
  if (v === 5) return { ...base, attitude: 1, poisonAttempts: 1, points: 1, summary: 'many minor cases treated; the witch doctor tries poison (attitude +1)' };
  return { ...base, attitude: 2, poisonAttempts: 2, points: 2, summary: 'several major cases treated; the witch doctor tries poison twice (attitude +2)' };
}
