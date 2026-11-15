// Exploration rules as pure functions over the serialisable PRNG: the lost check (rules §7.2)
// and basic terrain generation (rules §7.3). Every roll is returned so the table can show it.
import { type DieSource, d6, type RngState } from '$lib/game/random';
import { needText } from '$features/dice/prompt';
import { DIRECTIONS, neighbour, type Direction, type HexId } from './hex';
import { hexAt, isLand, type Terrain } from './manifest';

export interface Roll {
  label: string;
  value: number;
  /** The throw the die came from when it was rolled at the table (PROMPTS.md, prompt 37): tap the die to set its face. */
  from?: DieSource;
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
  /** What the die had to show: "2+", "any", "none" (the log's note, prompt 20). */
  needed: string;
  rolls: Roll[];
  modifiers: Modifier[];
  total: number;
}

export function terrainLostModifier(from: Terrain | null): Modifier {
  if (hasPart(from, 'jungle') && (hasPart(from, 'swamp') || hasPart(from, 'mountain'))) return { label: 'leaving jungle with swamp or mountain', value: -5 };
  if (hasPart(from, 'jungle')) return { label: 'leaving jungle', value: -3 };
  if (hasPart(from, 'swamp') || hasPart(from, 'mountain')) return { label: `leaving ${from!}`, value: -2 };
  return { label: `leaving ${from ?? 'open country'}`, value: -1 };
}

/** A number as the table writes it: a true minus sign before a negative, "−1". */
export const num = (n: number): string => (n < 0 ? `−${Math.abs(n)}` : `${n}`);

/** A modifier as the table writes it, the number first so a label ending in a number cannot run into it: "−1 leaving veldt". */
export const modifierText = (m: Modifier): string => `${m.value > 0 ? '+' : m.value < 0 ? '−' : ''}${m.value === 0 ? '' : `${Math.abs(m.value)} `}${m.label}`;

/** The lost check's hint: what moves the die, what it must show, and what being lost costs. */
export function lostHint(modifiers: Modifier[]): string {
  const bonus = modifiers.reduce((a, m) => a + m.value, 0);
  const need = 1 - bonus;
  const why = modifiers.map(modifierText).join(', ');
  const verdict = need <= 1 ? 'any roll finds the way' : need > 6 ? 'no roll finds the way: lost, and the turn ends here' : `${need}+ finds the way; less is lost, and the turn ends here`;
  return `${why}: ${verdict}`;
}

export function lostCheck(rng: RngState, input: LostCheckInput): { rng: RngState; result: LostCheckResult } {
  if (input.river === 'downstream') return { rng, result: { lost: false, automatic: true, needed: 'no roll', rolls: [], modifiers: [{ label: 'following the river downstream', value: 0 }], total: 1 } };
  if (input.guide === 'home') return { rng, result: { lost: false, automatic: true, needed: 'no roll', rolls: [], modifiers: [{ label: 'guide from this hex', value: 0 }], total: 1 } };
  const modifiers: Modifier[] = [input.river === 'upstream' ? { label: 'following the river upstream', value: -1 } : terrainLostModifier(input.from)];
  if (input.guide === 'adjacent') modifiers.push({ label: 'guide from a neighbouring hex', value: 1 });
  if (input.ailing) modifiers.push({ label: 'sick, wounded or starving', value: -1 });
  const bonus = modifiers.reduce((a, m) => a + m.value, 0);
  // Lost on a total of 0 or less: the die must reach 1 − the modifiers.
  const r = d6(rng, 'main', { what: 'to see if you are lost', hint: lostHint(modifiers), result: ([v]) => `${bonus ? `${v} ${bonus > 0 ? '+' : '−'} ${Math.abs(bonus)} = ${num(v + bonus)}: ` : ''}${v + bonus <= 0 ? 'lost, the turn ends here' : 'not lost'}` });
  const total = r.value + bonus;
  return { rng: r.state, result: { lost: total <= 0, automatic: false, needed: needText(1 - bonus), rolls: [{ label: 'lost check', value: r.value }], modifiers, total } };
}

// ---- Basic terrain -------------------------------------------------------------------------

export interface TerrainResult {
  terrain: Terrain;
  rolls: Roll[];
  /** Copied from the neighbour in this direction, or rolled on the random table. */
  copiedFrom: Direction | null;
  /** How the terrain came about, die by die (prompt 56): "nothing mapped in direction 6, rolled again; veldt copied from the neighbour in direction 2". */
  notes: string[];
}

const RANDOM_TABLE: Record<number, 'desert' | 'mountain' | 'swamp' | 'jungle' | 'veldt' | 'lake'> = { 1: 'desert', 2: 'mountain', 3: 'swamp', 4: 'jungle', 5: 'veldt', 6: 'lake' };

/**
 * Basic terrain for a blank hex (rules §7.3): copy a mapped neighbour in a rolled direction
 * (two tries), else the random table with its desert/jungle notes and the composite roll.
 */
export function generateTerrain(rng: RngState, id: HexId, lookup: TerrainLookup): { rng: RngState; result: TerrainResult } {
  const rolls: Roll[] = [];
  const notes: string[] = [];
  const known = (d: Direction): Terrain | null => {
    const n = neighbour(id, d);
    if (!isLand(n)) return null;
    return lookup(n) ?? null;
  };
  for (let attempt = 1; attempt <= 2; attempt++) {
    const r = d6(rng, 'main', { what: `for the direction of the terrain to copy${attempt === 2 ? ', once more' : ''}`, hint: `a mapped neighbour that way is copied; nothing mapped there and ${attempt === 1 ? 'the die is rolled once more' : 'the terrain table decides'}`, result: ([v]) => { const there = known(v as Direction); return there ? `${there.replace(/-/g, ' ')}, copied from direction ${v}` : `nothing mapped in direction ${v}: ${attempt === 1 ? 'rolled once more' : 'the terrain table next'}`; } });
    rng = r.state;
    rolls.push({ label: `direction (try ${attempt})`, value: r.value });
    const t = known(r.value as Direction);
    if (t) {
      notes.push(`${t} copied from the neighbour in direction ${r.value}`);
      return { rng, result: { terrain: t, rolls, copiedFrom: r.value as Direction, notes } };
    }
    notes.push(attempt === 1 ? `nothing mapped in direction ${r.value}, rolled again` : `nothing mapped in direction ${r.value} either`);
  }
  const neighboursKnown = DIRECTIONS.map(known);
  const anyJungle = neighboursKnown.some((t) => hasPart(t, 'jungle'));
  const anyDesert = neighboursKnown.some((t) => hasPart(t, 'desert'));
  const r = d6(rng, 'main', { what: 'for the terrain', hint: `1 desert${anyJungle ? ' (veldt here, beside jungle)' : ''}, 2 mountain, 3 swamp, 4 jungle${anyDesert ? ' (veldt here, beside desert)' : ''}, 5 veldt, 6 lake`, result: ([v]) => (RANDOM_TABLE[v] === 'desert' && anyJungle ? 'desert, but veldt beside jungle' : RANDOM_TABLE[v] === 'jungle' && anyDesert ? 'jungle, but veldt beside desert' : RANDOM_TABLE[v]) });
  rng = r.state;
  rolls.push({ label: 'random terrain', value: r.value });
  let basic = RANDOM_TABLE[r.value];
  const rolled = basic;
  if (basic === 'desert' && anyJungle) basic = 'veldt'; // note A
  if (basic === 'jungle' && anyDesert) basic = 'veldt'; // note B
  notes.push(basic === rolled ? `${r.value} on the table: ${basic}` : `${r.value} on the table: ${rolled}, but veldt beside ${rolled === 'desert' ? 'jungle' : 'desert'}`);
  let terrain: Terrain = basic;
  if (basic === 'jungle') {
    const c = d6(rng, 'main', { what: 'for what the jungle hides', hint: '2 adds mountain, 3 adds swamp, anything else jungle alone', result: ([v]) => (v === 3 ? 'swamp in the jungle' : v === 2 ? 'mountain in the jungle' : 'nothing more: jungle alone') });
    rng = c.state;
    rolls.push({ label: 'jungle composite', value: c.value });
    if (c.value === 3) terrain = 'jungle-swamp';
    if (c.value === 2) terrain = 'jungle-mountain';
    notes.push(c.value === 3 ? '3: swamp in the jungle' : c.value === 2 ? '2: mountain in the jungle' : `${c.value}: the jungle hides nothing`);
  } else if ((basic === 'swamp' || basic === 'mountain') && !anyDesert) {
    const c = d6(rng, 'main', { what: `for jungle in the ${basic}`, hint: `4 adds jungle, anything else ${basic} alone`, result: ([v]) => (v === 4 ? `jungle in the ${basic}` : `no jungle: ${basic} alone`) });
    rng = c.state;
    rolls.push({ label: 'jungle composite', value: c.value });
    if (c.value === 4) terrain = basic === 'swamp' ? 'jungle-swamp' : 'jungle-mountain';
    notes.push(c.value === 4 ? `4: jungle in the ${basic}` : `${c.value}: no jungle in the ${basic}`);
  }
  return { rng, result: { terrain, rolls, copiedFrom: null, notes } };
}

/** Terrain of a hex: generated if known, else pre-printed. */
export function terrainLookup(generated: Record<string, { terrain: Terrain } | undefined>): TerrainLookup {
  return (id) => generated[id]?.terrain ?? hexAt(id)?.terrain ?? null;
}

/** Can an expedition on foot stand in this terrain? (rules §7.1) */
export function passableOnFoot(t: Terrain | null): boolean {
  return !(t === 'lake' || t === 'swamp' || t === 'jungle-swamp');
}
