// Rivers, oases, cataracts and peaks for a newly mapped hex (rules §7.4–7.5), as pure functions
// over the serialisable PRNG. The caller supplies what is known about every hex; the result says
// what to record for the new hex, and every roll is returned so the table can show it.
import { d6, dice, type DiceAsk, type RngState } from '$lib/game/random';
import { DIRECTIONS, neighbour, opposite, type Direction, type HexId } from './hex';
import { isLand, riverEdges, type Terrain } from './manifest';
import { hasPart, type Roll } from './generate';

/** A river course through a hex: where water enters from and where it leaves toward. */
export interface RiverCourse {
  /** Directions the river arrives from (upstream). A direction may point at an unexplored hex. */
  in: Direction[];
  /** Direction the river leaves toward (downstream), or null when the hex is where it ends. */
  out: Direction | null;
  /** The river rises here (blue dot). */
  source: boolean;
  cataract: boolean;
  /** Recorded only when 400 ft or more. */
  waterfallFeet: number | null;
}

export interface HexKnowledge {
  terrain: Terrain | null;
  /** Mapped in play (as opposed to blank). Pre-printed hexes count as mapped. */
  mapped: boolean;
  river: RiverCourse | null;
  /** A pre-printed river end whose continuation has not been mapped yet. */
  needsContinuation: boolean;
}

export type Knowledge = (id: HexId) => HexKnowledge | null; // null: not on the board

export const isWater = (t: Terrain | null): boolean => t === 'lake' || t === 'swamp' || t === 'jungle-swamp';

export interface RiverResult {
  terrain: Terrain;
  river: RiverCourse | null;
  oasis: boolean;
  peakFeet: number | null;
  rolls: Roll[];
  notes: string[];
}

/** Pre-printed river edges as a course (downstream edge → out, upstream edges → in). */
export function printedCourse(id: HexId): RiverCourse | null {
  const edges = riverEdges(id);
  if (!edges.length) return null;
  const out = edges.find((e) => e.downstream)?.direction ?? null;
  return { in: edges.filter((e) => !e.downstream).map((e) => e.direction), out, source: false, cataract: false, waterfallFeet: null };
}

/**
 * Resolve the water features of `id` after its basic terrain is known. `know` describes the
 * neighbours. `seat` is unused here but kept for symmetry with the reducer.
 */
export function resolveWater(rng: RngState, id: HexId, terrain: Terrain, know: Knowledge): { rng: RngState; result: RiverResult } {
  const rolls: Roll[] = [];
  const notes: string[] = [];
  const roll = (label: string, ask: DiceAsk = { what: `for ${label}` }) => {
    const r = d6(rng, 'main', ask);
    rng = r.state;
    rolls.push({ label, value: r.value });
    return r.value;
  };
  const nb = (d: Direction) => {
    const n = neighbour(id, d);
    return isLand(n) ? know(n) : null;
  };
  // Mountain peaks (rules §7.5): whenever mountain terrain is discovered.
  let peakFeet: number | null = null;
  if (hasPart(terrain, 'mountain')) {
    const r = dice(rng, 3, 'main', { what: "for the mountain's height", hint: 'the product plus 100, in hundreds of feet; over 15,000 ft is a recorded peak' });
    rng = r.state;
    r.values.forEach((v, i) => rolls.push({ label: `peak die ${i + 1}`, value: v }));
    const hundreds = r.values.reduce((a, b) => a * b, 1) + 100;
    const product = r.values.join(' × ');
    if (hundreds > 150) {
      peakFeet = hundreds * 100;
      notes.push(`a peak of ${peakFeet.toLocaleString('en-US')} ft (${product} + 100 hundred ft, a record over 15,000)`);
    } else notes.push(`a mountain of ${(hundreds * 100).toLocaleString('en-US')} ft (${product} + 100 hundred ft, no record under 15,000)`);
  }

  // Water hexes have no visible river course (rules §7.4); rivers that reach them simply end there.
  if (isWater(terrain)) return { rng, result: { terrain, river: null, oasis: false, peakFeet, rolls, notes } };

  // Rivers known to flow OUT of the new hex: a neighbour expects water from here.
  const outflows: Direction[] = [];
  const inflows: Direction[] = [];
  for (const d of DIRECTIONS) {
    const n = nb(d);
    if (!n) continue;
    const back = opposite(d);
    if (n.river?.in.includes(back)) outflows.push(d);
    else if (n.needsContinuation) outflows.push(d);
    if (n.river?.out === back) inflows.push(d);
  }
  const candidate = (d: Direction): boolean => {
    const n = nb(d);
    if (!n) return false;
    if (!n.mapped) return terrain !== 'desert'; // rivers cross desert only to explored neighbours
    return isWater(n.terrain) && !outflows.includes(d) && !inflows.includes(d);
  };

  let river: RiverCourse | null = null;
  if (outflows.length >= 2) {
    // Several rivers leave here: it must be a lake, a swamp or a jungle-swamp.
    const v = roll('lake, swamp or jungle-swamp', { what: 'for the water two rivers leave from', hint: '1–2 lake, 3–4 swamp, 5–6 jungle-swamp' });
    const water: Terrain = v <= 2 ? 'lake' : v <= 4 ? 'swamp' : 'jungle-swamp';
    notes.push(`two rivers leave this hex, so it is water: ${v} makes it ${water}`);
    return { rng, result: { terrain: water, river: null, oasis: false, peakFeet, rolls, notes } };
  }
  if (outflows.length === 1) {
    const out = outflows[0];
    if (inflows.length) {
      river = { in: inflows, out, source: false, cataract: false, waterfallFeet: null };
      notes.push('the rivers connect');
    } else {
      const d = roll('where the river comes from', { what: 'for where the river comes from', hint: 'a direction around the hex' }) as Direction;
      if (candidate(d)) {
        river = { in: [d], out, source: false, cataract: false, waterfallFeet: null };
        notes.push(`the river comes from the ${nb(d)!.mapped ? 'water' : 'unexplored hex'} in direction ${d}`);
      } else {
        river = { in: [], out, source: true, cataract: false, waterfallFeet: null };
        notes.push(`the river rises here: nothing for it to come from in direction ${d}`);
      }
    }
  } else if (inflows.length) {
    // Rivers flow INTO the new hex: they must leave somewhere, or the hex is a great salt lake.
    const exits = DIRECTIONS.filter(candidate);
    if (!exits.length) {
      notes.push('nowhere for the river to go: a great salt lake');
      return { rng, result: { terrain: 'lake', river: null, oasis: false, peakFeet, rolls, notes } };
    }
    let out: Direction | null = null;
    const passed: Direction[] = [];
    for (let i = 0; i < 12 && out === null; i++) {
      const d = roll('where the river goes', { what: 'for where the river flows on to', hint: 'a direction around the hex, rolled again until the river can go that way' }) as Direction;
      if (exits.includes(d)) out = d;
      else passed.push(d);
    }
    if (out === null) out = exits[0];
    river = { in: inflows, out, source: false, cataract: false, waterfallFeet: null };
    notes.push(`the river flows on in direction ${out}${passed.length ? ` (not ${passed.join(', ')}: mapped land there)` : ''}`);
  } else {
    // No rivers known in or out: maybe a source (an oasis in desert).
    const v = roll('a river source?', { what: 'for a river source', hint: 'an even roll means a river rises here' });
    if (v % 2 === 0) {
      const d = roll('which way it flows', { what: 'for which way the river flows', hint: 'a direction around the hex' }) as Direction;
      const n = nb(d);
      if (n && (!n.mapped || isWater(n.terrain))) {
        if (terrain === 'desert') {
          notes.push(`${v} is even: an oasis (in desert a source is an oasis)`);
          return { rng, result: { terrain, river: null, oasis: true, peakFeet, rolls, notes } };
        }
        river = { in: [], out: d, source: true, cataract: false, waterfallFeet: null };
        notes.push(`${v} is even: a river rises here and flows in direction ${d}`);
      } else notes.push(`${v} is even, but direction ${d} is mapped land: no river`);
    } else notes.push(`${v} is odd: no river`);
  }

  // Cataracts (rules §7.5) whenever a river is mapped in a hex that is not water.
  if (river) {
    const v = roll('cataract?', { what: 'for a cataract', hint: hasPart(terrain, 'mountain') ? '2, 3 or 4 means a cataract' : terrain === 'desert' ? '1 or 2 means a cataract' : '1 means a cataract' });
    const found = hasPart(terrain, 'mountain') ? v >= 2 && v <= 4 : terrain === 'desert' ? v <= 2 : v === 1;
    if (found) {
      river.cataract = true;
      const h = dice(rng, 4, 'main', { what: "for the waterfall's height", hint: 'the product in feet; 400 ft or more is recorded' });
      rng = h.state;
      h.values.forEach((x, i) => rolls.push({ label: `waterfall die ${i + 1}`, value: x }));
      const feet = h.values.reduce((a, b) => a * b, 1);
      if (feet >= 400) river.waterfallFeet = feet;
      notes.push(`a cataract on a ${v}${feet >= 400 ? ` with a ${feet} ft fall (${h.values.join(' × ')}, a record from 400)` : ` (its fall of ${feet} ft, ${h.values.join(' × ')}, under the 400 recorded)`}`);
    } else notes.push(`no cataract (${v})`);
  }
  return { rng, result: { terrain, river, oasis: false, peakFeet, rolls, notes } };
}

/** Following a river from `from` toward `to`? Uses the course of `from`. */
export function riverDirection(course: RiverCourse | null, d: Direction): 'downstream' | 'upstream' | null {
  if (!course) return null;
  if (course.out === d) return 'downstream';
  if (course.in.includes(d)) return 'upstream';
  return null;
}
