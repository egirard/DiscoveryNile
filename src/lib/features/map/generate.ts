// Exploration rules as pure functions over the serialisable PRNG: the lost check (rules §7.2)
// and basic terrain generation (rules §7.3). Every roll is returned so the table can show it.
import { d6, type RngState } from '$lib/game/random';
import { DIRECTIONS, neighbour, type Direction, type HexId } from './hex';
import { hexAt, isLand, type Terrain } from './manifest';

export interface Roll {
  label: string;
  value: number;
}

export interface Modifier {
  label: string;
  value: number;
}

/** What is known about a hex for generation: pre-printed or already generated terrain. */
export type TerrainLookup = (id: HexId) => Terrain | null | undefined;

export const basicOf = (t: Terrain): 'desert' | 'mountain' | 'swamp' | 'jungle' | 'veldt' | 'lake' =>
  t === 'jungle-swamp' || t === 'jungle-mountain' ? 'jungle' : t;
export const hasPart = (t: Terrain | null | undefined, part: 'jungle' | 'swamp' | 'mountain' | 'desert' | 'lake' | 'veldt'): boolean =>
  !!t && (t === part || t.split('-').includes(part));

// ---- Becoming lost -------------------------------------------------------------------------

export interface LostCheckInput {
  /** Terrain of the hex being left. */
  from: Terrain | null;
  /** Following a river out of the hex: which way. */
  river: 'downstream' | 'upstream' | null;
  /** A guide hired in the hex being left (never lost), or in a hex adjacent to it (+1). */
  guide: 'home' | 'adjacent' | null;
  /** The explorer is sick, wounded or starving (−1). */
  ailing: boolean;
}

export interface LostCheckResult {
  lost: boolean;
  /** No roll was needed: following a river downstream, or a guide from this very hex. */
  automatic: boolean;
  rolls: Roll[];
  modifiers: Modifier[];
  total: number;
}

export function terrainLostModifier(from: Terrain | null): Modifier {
  if (hasPart(from, 'jungle') && (hasPart(from, 'swamp') || hasPart(from, 'mountain'))) return { label: 'jungle with swamp or mountain', value: -5 };
  if (hasPart(from, 'jungle')) return { label: 'jungle', value: -3 };
  if (hasPart(from, 'swamp') || hasPart(from, 'mountain')) return { label: from!, value: -2 };
  return { label: from ?? 'open country', value: -1 };
}

export function lostCheck(rng: RngState, input: LostCheckInput): { rng: RngState; result: LostCheckResult } {
  if (input.river === 'downstream') return { rng, result: { lost: false, automatic: true, rolls: [], modifiers: [{ label: 'following the river downstream', value: 0 }], total: 1 } };
  if (input.guide === 'home') return { rng, result: { lost: false, automatic: true, rolls: [], modifiers: [{ label: 'guide from this hex', value: 0 }], total: 1 } };
  const r = d6(rng);
  const modifiers: Modifier[] = [input.river === 'upstream' ? { label: 'following the river upstream', value: -1 } : terrainLostModifier(input.from)];
  if (input.guide === 'adjacent') modifiers.push({ label: 'guide from a neighbouring hex', value: 1 });
  if (input.ailing) modifiers.push({ label: 'sick, wounded or starving', value: -1 });
  const total = r.value + modifiers.reduce((a, m) => a + m.value, 0);
  return { rng: r.state, result: { lost: total <= 0, automatic: false, rolls: [{ label: 'lost check', value: r.value }], modifiers, total } };
}

// ---- Basic terrain -------------------------------------------------------------------------

export interface TerrainResult {
  terrain: Terrain;
  rolls: Roll[];
  /** Copied from the neighbour in this direction, or rolled on the random table. */
  copiedFrom: Direction | null;
}

const RANDOM_TABLE: Record<number, 'desert' | 'mountain' | 'swamp' | 'jungle' | 'veldt' | 'lake'> = { 1: 'desert', 2: 'mountain', 3: 'swamp', 4: 'jungle', 5: 'veldt', 6: 'lake' };

/**
 * Basic terrain for a blank hex (rules §7.3): copy a mapped neighbour in a rolled direction
 * (two tries), else the random table with its desert/jungle notes and the composite roll.
 */
export function generateTerrain(rng: RngState, id: HexId, lookup: TerrainLookup): { rng: RngState; result: TerrainResult } {
  const rolls: Roll[] = [];
  const known = (d: Direction): Terrain | null => {
    const n = neighbour(id, d);
    if (!isLand(n)) return null;
    return lookup(n) ?? null;
  };
  for (let attempt = 1; attempt <= 2; attempt++) {
    const r = d6(rng);
    rng = r.state;
    rolls.push({ label: `direction (try ${attempt})`, value: r.value });
    const t = known(r.value as Direction);
    if (t) return { rng, result: { terrain: t, rolls, copiedFrom: r.value as Direction } };
  }
  const neighboursKnown = DIRECTIONS.map(known);
  const anyJungle = neighboursKnown.some((t) => hasPart(t, 'jungle'));
  const anyDesert = neighboursKnown.some((t) => hasPart(t, 'desert'));
  const r = d6(rng);
  rng = r.state;
  rolls.push({ label: 'random terrain', value: r.value });
  let basic = RANDOM_TABLE[r.value];
  if (basic === 'desert' && anyJungle) basic = 'veldt'; // note A
  if (basic === 'jungle' && anyDesert) basic = 'veldt'; // note B
  let terrain: Terrain = basic;
  if (basic === 'jungle') {
    const c = d6(rng);
    rng = c.state;
    rolls.push({ label: 'jungle composite', value: c.value });
    if (c.value === 3) terrain = 'jungle-swamp';
    if (c.value === 2) terrain = 'jungle-mountain';
  } else if ((basic === 'swamp' || basic === 'mountain') && !anyDesert) {
    const c = d6(rng);
    rng = c.state;
    rolls.push({ label: 'jungle composite', value: c.value });
    if (c.value === 4) terrain = basic === 'swamp' ? 'jungle-swamp' : 'jungle-mountain';
  }
  return { rng, result: { terrain, rolls, copiedFrom: null } };
}

/** Terrain of a hex: generated if known, else pre-printed. */
export function terrainLookup(generated: Record<string, { terrain: Terrain } | undefined>): TerrainLookup {
  return (id) => generated[id]?.terrain ?? hexAt(id)?.terrain ?? null;
}

/** Can an expedition on foot stand in this terrain? (rules §7.1) */
export function passableOnFoot(t: Terrain | null): boolean {
  return !(t === 'lake' || t === 'swamp' || t === 'jungle-swamp');
}
