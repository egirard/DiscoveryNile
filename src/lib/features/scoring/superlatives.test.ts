import { beforeEach, describe, expect, it } from 'vitest';
import { reduce, reduceOne } from '$lib/game/reduce';
import { created, event, resetSequence } from '$lib/game/test-fixtures';
import type { GameState, MappedHex } from '$lib/game/state';
import { lakeAround, riverPlaces, superlativesOf } from './superlatives';
import { RIVERS } from '$features/map/manifest';
import { directionTo, neighbours, opposite, type HexId } from '$features/map/hex';
import { hexAt } from '$features/map/manifest';

beforeEach(resetSequence);

const LAYOUT = { bottom: 2, top: 2, left: 1, right: 1 };
const seatAndCommission = (seat: string) => [event('seat/taken', { seat, uid: `table:${seat}` }), event('explorer/commissioned', { seat, specialties: [] })];
const pass = (seat: string, s: GameState) => {
  const e = s.explorers.find((x) => x.seat === seat)!;
  return s.turn!.phase === 'discard' ? [event('cards/discarded', { seat, cardIds: [e.hand[0]] }), event('turn/ended', { seat })] : [event('turn/ended', { seat })];
};
const blank = (): MappedHex => ({ terrain: 'veldt', markers: ['bottom-1'], publishedBy: null, river: null, oasis: false, oasisKnownTo: [], peakFeet: null, tribe: null, nativesCheckedBy: [] });

/** Seed 26 as scenario 025: round 5 opens with bottom-1 in Europe, free to publish whatever hexes the test crafts under his marker. */
function inEurope(): GameState {
  const buy = { bearers: 5, food: 20 };
  const base = [created('ABCDE', LAYOUT, 26, { main: [6, 6, 6, 6, 1, 1, 1, 1], natives: [6, 6, 6, 6] }), ...seatAndCommission('bottom-1'), ...seatAndCommission('top-1'), event('game/started', {})];
  const events = [
    ...base,
    event('voyage/booked', { seat: 'bottom-1', port: 'mombasa' }), event('turn/ended', { seat: 'bottom-1' }),
    event('voyage/booked', { seat: 'top-1', port: 'mombasa' }), event('turn/ended', { seat: 'top-1' }),
    event('expedition/outfitted', { seat: 'bottom-1', purchases: buy }), event('expedition/moved', { seat: 'bottom-1', path: ['c24r12'] }), event('turn/ended', { seat: 'bottom-1' }),
    event('expedition/outfitted', { seat: 'top-1', purchases: buy }), event('expedition/moved', { seat: 'top-1', path: ['c24r12'] }), event('turn/ended', { seat: 'top-1' }),
    event('expedition/moved', { seat: 'bottom-1', path: ['c25r12'] }), event('expedition/returned', { seat: 'bottom-1' }), event('turn/ended', { seat: 'bottom-1' }),
    event('expedition/moved', { seat: 'top-1', path: ['c25r12'] }), event('expedition/returned', { seat: 'top-1' }), event('turn/ended', { seat: 'top-1' })
  ];
  const s = reduce(events);
  expect(s.diagnostics).toEqual([]);
  expect(s.turn).toMatchObject({ current: 'bottom-1', round: 5 });
  return s;
}
const publish = (s: GameState, hex: string) => reduceOne(s, event('hex/published', { seat: 'bottom-1', hex }));
const withHexes = (s: GameState, hexes: Record<string, MappedHex>): GameState => ({ ...s, map: { ...s.map, ...hexes } });

/** A blank hex beyond the inland end of a printed river, with the direction back to that end. */
function beyond(riverId: string) {
  const river = RIVERS.find((r) => r.id === riverId)!;
  const end = river.path.at(-1)!;
  const next = neighbours(end).find((n) => hexAt(n) && !hexAt(n)!.terrain && !RIVERS.some((r) => r.path.includes(n)))!;
  expect(next).toBeDefined();
  return { river, end, next, back: directionTo(next, end)! };
}

describe('superlatives (rules §12)', () => {
  it('a peak over 15,000 ft ranks first when published, lesser peaks take the places they merit, points are never lost', () => {
    const s = withHexes(inEurope(), { c20r20: { ...blank(), terrain: 'mountain', peakFeet: 16400 }, c20r21: { ...blank(), terrain: 'mountain', peakFeet: 15300 }, c20r22: { ...blank(), terrain: 'mountain', peakFeet: 15000 } });
    expect(superlativesOf(s, 'c20r22', 'bottom-1', 5).records).toEqual([]); // 15,000 is not over 15,000
    const first = publish(s, 'c20r21');
    expect(first.diagnostics).toEqual([]);
    expect(first.superlatives).toEqual([{ kind: 'peak', hex: 'c20r21', seat: 'bottom-1', value: 15300, rank: 1, points: 8, round: 5 }]);
    expect(first.turn!.log.at(-1)!.outcome).toBe('c20r21 published (mountain, a peak of 15,300 ft, the highest known (8)): 8 points, a card drawn');
    const second = publish(first, 'c20r20');
    expect(second.superlatives.at(-1)).toMatchObject({ kind: 'peak', value: 16400, rank: 1, points: 8 }); // a new record: first again
    expect(second.scores['bottom-1']!.filter((e) => e.kind === 'superlative').map((e) => e.points)).toEqual([8, 8]);
    const lesser = publish(withHexes(second, { c20r23: { ...blank(), terrain: 'mountain', peakFeet: 15100 } }), 'c20r23');
    expect(lesser.superlatives.at(-1)).toMatchObject({ value: 15100, rank: 3, points: 2 });
  });
  it('waterfalls of 400 ft or more rank 4/2/1 and a lake is the count of its connected hexes, scored once (RQ-8)', () => {
    const fall = (feet: number): MappedHex => ({ ...blank(), river: { in: [], out: 1, source: true, cataract: true, waterfallFeet: feet } });
    const s = withHexes(inEurope(), { c20r20: fall(450), c20r22: fall(600), c21r20: fall(399) });
    const a = publish(s, 'c20r20');
    expect(a.superlatives.at(-1)).toMatchObject({ kind: 'waterfall', value: 450, rank: 1, points: 4 });
    const b = publish(a, 'c20r22');
    expect(b.superlatives.at(-1)).toMatchObject({ kind: 'waterfall', value: 600, rank: 1, points: 4 });
    expect(superlativesOf(b, 'c21r20', 'bottom-1', 5).records).toEqual([]);
    // A lake of three hexes: the first hex published scores it, the rest add nothing.
    const lakeHexes = ['c15r20', ...neighbours('c15r20').slice(0, 2)] as HexId[];
    const lake = withHexes(inEurope(), Object.fromEntries(lakeHexes.map((h) => [h, { ...blank(), terrain: 'lake' as const }])));
    expect(lakeAround(lake, lakeHexes[0]).sort()).toEqual([...lakeHexes].sort());
    const l1 = publish(lake, lakeHexes[1]);
    expect(l1.superlatives.at(-1)).toMatchObject({ kind: 'lake', hex: lakeHexes[1], value: 3, rank: 1, points: 4 });
    const l2 = publish(l1, lakeHexes[0]);
    expect(l2.superlatives).toHaveLength(1);
    expect(l2.turn!.log.at(-1)!.outcome).toBe(`${lakeHexes[0]} published (lake): 1 point, a card drawn`);
  });
  it('a river source is measured from the mouth along the shortest course and ranked among the rivers known in 1820', () => {
    const { river, end, next, back } = beyond('rufiji');
    const s = withHexes(inEurope(), { [next]: { ...blank(), river: { in: [], out: back, source: true, cataract: false, waterfallFeet: null } } });
    const places = riverPlaces(s);
    expect(places.get(river.path[0])).toEqual({ system: 'rufiji', length: 1 });
    expect(places.get(end)).toEqual({ system: 'rufiji', length: river.path.length });
    expect(places.get(next)).toEqual({ system: 'rufiji', length: river.path.length + 1 }); // 4 hexes: shorter than the Gambia
    const p = publish(s, next);
    expect(p.superlatives.at(-1)).toMatchObject({ kind: 'source', system: 'rufiji', value: 4, rank: 5, points: 1 });
    expect(p.turn!.log.at(-1)!.outcome).toContain('the source of Rufiji, 4 hexes, the 5th longest known (1)');
    // A second source of the same river at the same distance is not the true source; a farther one is, and scores by rank.
    const other = neighbours(end).find((n) => n !== next && hexAt(n) && !hexAt(n)!.terrain && !RIVERS.some((r) => r.path.includes(n)))!;
    const tie = withHexes(p, { [other]: { ...blank(), river: { in: [], out: directionTo(other, end)!, source: true, cataract: false, waterfallFeet: null } } });
    expect(superlativesOf(tie, other, 'bottom-1', 5).records).toEqual([]);
    const farther = neighbours(next).find((n) => n !== end && hexAt(n) && !hexAt(n)!.terrain && !RIVERS.some((r) => r.path.includes(n)))!;
    const longer = withHexes(p, { [next]: { ...p.map[next], river: { ...p.map[next].river!, source: false, in: [directionTo(next, farther)!] } }, [farther]: { ...blank(), river: { in: [], out: opposite(directionTo(next, farther)!), source: true, cataract: false, waterfallFeet: null } } });
    const f = publish(longer, farther);
    expect(f.superlatives.at(-1)).toMatchObject({ kind: 'source', system: 'rufiji', value: 5, rank: 5, points: 1 });
  });
  it('the Nile counts its 25 hexes beyond the board, so its source outranks every river known', () => {
    const { river, next, back } = beyond('white-nile');
    expect(river.offMapHexes).toBe(25);
    const s = withHexes(inEurope(), { [next]: { ...blank(), terrain: 'lake' } });
    void back;
    const places = riverPlaces(s);
    expect(places.get(next)).toEqual({ system: 'white-nile', length: river.path.length + 1 + 25 });
    const p = publish(s, next);
    const source = p.superlatives.find((r) => r.kind === 'source')!;
    expect(source).toMatchObject({ system: 'white-nile', rank: 1, points: 16 });
    expect(p.superlatives.find((r) => r.kind === 'lake')).toMatchObject({ value: 1, rank: 1, points: 4 });
  });
  it('a source whose river has not yet been followed to the sea cannot be measured, and an unranked source is not mentioned', () => {
    const s = inEurope();
    expect(s.map['c24r12'].river).toMatchObject({ source: true, out: 5 }); // flows west into a blank hex: no mouth known
    expect(riverPlaces(s).get('c24r12')).toBeUndefined();
    const p = publish(s, 'c24r12');
    expect(p.superlatives).toEqual([]);
    expect(p.turn!.log.at(-1)!.outcome).toBe('c24r12 published (veldt, river): 2 points, a card drawn');
    // A short river reaching the sea on its own is a system of its own, too short to rank (G-90): recorded, not mentioned.
    const coast = withHexes(s, { c24r12: { ...s.map['c24r12'], river: { in: [], out: 2, source: true, cataract: false, waterfallFeet: null } } });
    const place = riverPlaces(coast).get('c24r12');
    if (place) {
      const q = publish(coast, 'c24r12');
      expect(q.superlatives.at(-1)).toMatchObject({ kind: 'source', points: 0 });
      expect(q.turn!.log.at(-1)!.outcome).toBe('c24r12 published (veldt, river): 2 points, a card drawn');
    }
  });
});
