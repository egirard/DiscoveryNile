// Superlative discoveries (rules §12): the highest mountain over 15,000 ft, the largest lake, the
// highest waterfall of 400 ft or more, and the source of the longest river. Each is ranked when
// its hex is published against what has been published before (and, for rivers, the lengths
// known in 1820); a new record takes first place, a lesser one the place it merits, and points
// once scored are never lost (RQ-15, G-87..90).
import type { GameState, ScoreEntry, SuperlativeRecord } from '$lib/game/state';
import type { SeatId } from '$lib/tabletop/seats';
import { LAND_HEXES, RIVERS, isLand } from '$features/map/manifest';
import { directionTo, neighbour, neighbours, opposite, type HexId } from '$features/map/hex';
import { courseAt, terrainOf } from '$features/exploration/reducer';
import { isWater } from '$features/map/rivers';

export const PEAK_POINTS = [8, 4, 2, 1];
export const LAKE_POINTS = [4, 2, 1];
export const FALL_POINTS = [4, 2, 1];
export const RIVER_POINTS = [16, 8, 4, 2, 1];
export const PEAK_FEET = 15000; // strictly over
export const FALL_FEET = 400; // recorded at 400 or over (rules §7.5)

/** The longest rivers known in 1820 (rules, Superlative Geographic Features): they hold their places until bettered. */
export const KNOWN_RIVERS: readonly { system: string; name: string; length: number }[] = [
  { system: 'niger', name: 'Niger', length: 23 },
  { system: 'orange', name: 'Orange', length: 12 },
  { system: 'senegal', name: 'Senegal', length: 10 },
  { system: 'gambia', name: 'Gambia', length: 7 }
];

export const ordinal = (n: number) => `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`;
/** 'the highest known', 'the 2nd highest known' … */
const placed = (rank: number, superlative: string) => `the ${rank === 1 ? '' : ordinal(rank) + ' '}${superlative} known`;

export interface RiverPlace {
  /** The manifest river at the mouth, or the coastal hex where an unnamed river meets the sea. */
  system: string;
  /** Hexes from the mouth, counting the mouth, plus the river's hexes beyond the board. */
  length: number;
}

/** Every river hex the table knows, with its system and its distance from the sea along the shortest course. */
export function riverPlaces(state: GameState): Map<HexId, RiverPlace> {
  const course = (id: HexId) => courseAt(state, id);
  const printedEnd = (id: HexId) => RIVERS.some((r) => r.path.at(-1) === id && !r.continuesOffMap);
  const water = (id: HexId) => isWater(terrainOf(state, id));
  const node = (id: HexId) => isLand(id) && (course(id) !== null || water(id));
  // Two river hexes are linked when either course points at the other; a course pointing into a lake or swamp
  // links to it; water hexes link to adjacent water hexes (a lake is one body).
  const linked = (a: HexId, b: HexId): boolean => {
    if (!node(b)) return false;
    const d = directionTo(a, b);
    if (d === null) return false;
    const ca = course(a), cb = course(b);
    const aPoints = !!ca && (ca.out === d || ca.in.includes(d));
    const bPoints = !!cb && (cb.out === opposite(d) || cb.in.includes(opposite(d)));
    if (ca && cb) return aPoints || bPoints;
    if (ca) return aPoints || printedEnd(a); // into water, or a lake found where a printed river was known to continue
    if (cb) return bPoints || printedEnd(b); // out of water
    return water(a) && water(b);
  };
  const mouths: { system: string; hex: HexId; offMap: number }[] = [];
  for (const r of RIVERS) if (!r.joins) mouths.push({ system: r.id, hex: r.path[0], offMap: r.offMapHexes ?? 0 });
  for (const h of LAND_HEXES) {
    const c = state.map[h.id]?.river;
    if (c && c.out !== null && !isLand(neighbour(h.id, c.out)) && !RIVERS.some((r) => r.path.includes(h.id))) mouths.push({ system: h.id, hex: h.id, offMap: 0 });
  }
  const places = new Map<HexId, RiverPlace>();
  for (const m of mouths) {
    if (!node(m.hex)) continue;
    const queue: [HexId, number][] = [[m.hex, 0]];
    const seen = new Set<HexId>([m.hex]);
    while (queue.length) {
      const [at, dist] = queue.shift()!;
      const had = places.get(at);
      if (!had || had.length > dist + 1 + m.offMap) places.set(at, { system: m.system, length: dist + 1 + m.offMap });
      for (const n of neighbours(at)) {
        if (seen.has(n) || !linked(at, n)) continue;
        seen.add(n);
        queue.push([n, dist + 1]);
      }
    }
  }
  return places;
}

/** A hex where a river may rise: a recorded source, or a lake, swamp or jungle-swamp hex (rules §12). */
export function isSourceHex(state: GameState, hex: HexId): boolean {
  return !!state.map[hex]?.river?.source || isWater(terrainOf(state, hex));
}

/** The connected lake hexes around one (RQ-8: a lake's size is its count of connected hexes). */
export function lakeAround(state: GameState, hex: HexId): HexId[] {
  if (terrainOf(state, hex) !== 'lake') return [];
  const seen = new Set<HexId>([hex]);
  const queue = [hex];
  while (queue.length) {
    const at = queue.shift()!;
    for (const n of neighbours(at)) if (!seen.has(n) && isLand(n) && terrainOf(state, n) === 'lake') { seen.add(n); queue.push(n); }
  }
  return [...seen];
}

export function riverName(system: string): string {
  return RIVERS.find((r) => r.id === system)?.name ?? KNOWN_RIVERS.find((k) => k.system === system)?.name ?? 'an unnamed river';
}

export interface SuperlativeOutcome {
  records: SuperlativeRecord[];
  entries: ScoreEntry[];
  parts: string[];
}

/** What publishing `hex` adds in superlatives, ranked against the records so far. */
export function superlativesOf(state: GameState, hex: HexId, seat: SeatId, round: number): SuperlativeOutcome {
  const m = state.map[hex];
  const out: SuperlativeOutcome = { records: [], entries: [], parts: [] };
  if (!m) return out;
  const prior = (kind: SuperlativeRecord['kind']) => state.superlatives.filter((r) => r.kind === kind);
  const add = (record: Omit<SuperlativeRecord, 'seat' | 'round' | 'hex'>, part: string) => {
    const full: SuperlativeRecord = { ...record, hex, seat, round };
    out.records.push(full);
    if (full.points > 0) {
      out.entries.push({ kind: 'superlative', detail: `${record.kind} ${hex}`, points: full.points, round });
      out.parts.push(`${part} (${full.points})`);
    }
  };
  if (m.peakFeet !== null && m.peakFeet > PEAK_FEET) {
    const rank = 1 + prior('peak').filter((r) => r.value >= m.peakFeet!).length;
    add({ kind: 'peak', value: m.peakFeet, rank, points: PEAK_POINTS[rank - 1] ?? 0 }, `a peak of ${m.peakFeet.toLocaleString('en-US')} ft, ${placed(rank, 'highest')}`);
  }
  if (m.river?.waterfallFeet && m.river.waterfallFeet >= FALL_FEET) {
    const feet = m.river.waterfallFeet;
    const rank = 1 + prior('waterfall').filter((r) => r.value >= feet).length;
    add({ kind: 'waterfall', value: feet, rank, points: FALL_POINTS[rank - 1] ?? 0 }, `a waterfall of ${feet} ft, ${placed(rank, 'highest')}`);
  }
  if (m.terrain === 'lake') {
    const lake = lakeAround(state, hex);
    if (!prior('lake').some((r) => lake.includes(r.hex))) {
      const rank = 1 + prior('lake').filter((r) => r.value >= lake.length).length;
      add({ kind: 'lake', value: lake.length, rank, points: LAKE_POINTS[rank - 1] ?? 0 }, `a lake of ${lake.length} hex${lake.length === 1 ? '' : 'es'}, ${placed(rank, 'largest')}`);
    }
  }
  if (isSourceHex(state, hex)) {
    const place = riverPlaces(state).get(hex);
    if (place) {
      const sources = prior('source');
      const bettered = sources.filter((r) => r.system === place.system).every((r) => r.value < place.length); // ties go to the first published
      if (bettered) {
        const lengths = new Map<string, number>(KNOWN_RIVERS.map((k) => [k.system, k.length]));
        for (const r of sources) if (r.system) lengths.set(r.system, Math.max(lengths.get(r.system) ?? 0, r.value));
        lengths.delete(place.system);
        const rank = 1 + [...lengths.values()].filter((l) => l >= place.length).length;
        add({ kind: 'source', value: place.length, system: place.system, rank, points: RIVER_POINTS[rank - 1] ?? 0 }, `the source of ${riverName(place.system)}, ${place.length} hexes, ${placed(rank, 'longest')}`);
      }
    }
  }
  return out;
}
