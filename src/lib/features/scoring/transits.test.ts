import { beforeEach, describe, expect, it } from 'vitest';
import { reduce, reduceOne } from '$lib/game/reduce';
import { created, event, resetSequence } from '$lib/game/test-fixtures';
import type { GameState, MappedHex } from '$lib/game/state';
import { crossingBetween, fmtPoints, northEast } from './transits';
import { BOARD } from '$features/map/manifest';
import { neighbours, type HexId } from '$features/map/hex';

beforeEach(resetSequence);

const LAYOUT = { bottom: 2, top: 2, left: 1, right: 1 };
const seatAndCommission = (seat: string) => [event('seat/taken', { seat, uid: `table:${seat}` }), event('explorer/commissioned', { seat, specialties: [] })];
const pass = (seat: string, s: GameState) => {
  const e = s.explorers.find((x) => x.seat === seat)!;
  return s.turn!.phase === 'discard' ? [event('cards/discarded', { seat, cardIds: [e.hand[0]] }), event('turn/ended', { seat })] : [event('turn/ended', { seat })];
};
const mapped = (markers: string[] = ['bottom-1']): MappedHex => ({ terrain: 'veldt', markers: markers as MappedHex['markers'], publishedBy: null, river: null, oasis: false, oasisKnownTo: [], peakFeet: null, tribe: null, nativesCheckedBy: [] });

/**
 * Seed 26 as scenario 025, then the state is crafted: bottom-1 stands on c21r2 (pre-printed desert next to Khartoum)
 * having walked from Mombasa through three mapped hexes, and may step onto Khartoum's hex c20r1.
 */
function atKhartoumsGate(): { s: GameState; route: HexId[]; gate: HexId } {
  const base = [created('ABCDE', LAYOUT, 26, { main: [6, 6, 6, 6, 1, 1, 1, 1], natives: [6, 6, 6, 6] }), ...seatAndCommission('bottom-1'), ...seatAndCommission('top-1'), event('game/started', {})];
  let events = [...base, event('voyage/booked', { seat: 'bottom-1', port: 'mombasa' }), event('turn/ended', { seat: 'bottom-1' })];
  events = [...events, ...pass('top-1', reduce(events))];
  events = [...events, ...pass('top-1', reduce(events))];
  events = [...events, event('expedition/outfitted', { seat: 'bottom-1', purchases: { bearers: 5, food: 20 } })];
  const s0 = reduce(events);
  expect(s0.diagnostics).toEqual([]);
  const route: HexId[] = ['c21r8', 'c21r6', 'c21r5']; // blank hexes on the way; the printed desert beyond is known already
  const gate = neighbours('c20r1').find((h) => BOARD.hexes[h]?.terrain === 'desert')!;
  const s: GameState = {
    ...s0,
    map: { ...s0.map, ...Object.fromEntries(route.map((h) => [h, mapped()])) },
    explorers: s0.explorers.map((e) => (e.seat === 'bottom-1' ? { ...e, location: { kind: 'hex' as const, hex: gate }, known: ['c25r12', ...route, gate], chart: { ...e.chart!, water: 20 } } : e)),
    turn: { ...s0.turn!, round: 9, moved: false, movement: null, log: [] }
  };
  return { s, route, gate };
}

describe('epic transits (rules §12)', () => {
  it('names the four crossings and the barred north-east edge', () => {
    expect(crossingBetween('khartoum', 'durban')).toBe('khartoum-cape');
    expect(crossingBetween('mombasa', 'khartoum')).toBe('khartoum-east');
    expect(crossingBetween('khartoum', 'brass')).toBe('khartoum-west');
    expect(crossingBetween('luanda', 'quilimane')).toBe('west-east');
    expect(crossingBetween('capetown', 'mombasa')).toBeNull();
    expect(crossingBetween('luanda', 'benguela')).toBeNull();
    expect(northEast('c22r3')).toBe(true); // printed highlands
    expect(northEast('c25r10')).toBe(true); // printed coast north of Mombasa
    expect(northEast('c25r12')).toBe(false); // Mombasa itself
    expect(northEast('c21r3')).toBe(false); // the desert below Khartoum: every route must cross it
    expect(northEast('c21r8')).toBe(false); // blank
  });
  it('stepping onto Khartoum from Mombasa completes the crossing: the route is recorded and each route hex published earns a point', () => {
    const { s, route } = atKhartoumsGate();
    const arrived = reduceOne(s, event('expedition/moved', { seat: 'bottom-1', path: ['c20r1'] }));
    expect(arrived.diagnostics).toEqual([]);
    const e = arrived.explorers[0];
    expect(e.transit).toMatchObject({ crossing: 'khartoum-east', order: 1, from: 'mombasa', to: 'khartoum', seat: 'bottom-1' });
    expect(e.transit!.route).toEqual(expect.arrayContaining(route));
    expect(arrived.transits).toHaveLength(1);
    expect(arrived.turn!.log.at(-1)).toMatchObject({ kind: 'transit', outcome: 'epic transit, Khartoum to the east coast (the first): 3 hexes to publish at 1 point each' });
    // Home and publishing: the hex scores its terrain and the transit bonus.
    const home = reduceOne(arrived, event('expedition/returned', { seat: 'bottom-1' }));
    const europe: GameState = { ...home, explorers: home.explorers.map((x) => (x.seat === 'bottom-1' ? { ...x, location: { kind: 'europe' as const } } : x)), turn: { ...home.turn!, round: 10, moved: false, log: [] } };
    const p = reduceOne(europe, event('hex/published', { seat: 'bottom-1', hex: 'c21r8' }));
    expect(p.diagnostics).toEqual([]);
    expect(p.scores['bottom-1']).toEqual([{ kind: 'hex', detail: 'c21r8', points: 1, round: 10 }, { kind: 'transit', detail: 'khartoum-east c21r8', points: 1, round: 10 }]);
    expect(p.turn!.log.at(-1)!.outcome).toBe('c21r8 published (veldt, epic transit (1)): 2 points, a card drawn');
  });
  it('the second explorer on a different route earns half a point per hex; the same route, the north-east edge and a fifth explorer earn nothing', () => {
    const { s, route, gate } = atKhartoumsGate();
    const first = { crossing: 'khartoum-east' as const, order: 1, route: ['c19r9', 'c20r6', 'c21r4'] as HexId[], from: 'mombasa' as const, to: 'khartoum' as const, seat: 'top-1' as const };
    const second = reduceOne({ ...s, transits: [first] }, event('expedition/moved', { seat: 'bottom-1', path: ['c20r1'] }));
    expect(second.explorers[0].transit).toMatchObject({ order: 2 });
    expect(second.turn!.log.at(-1)!.outcome).toContain('(the second): 3 hexes to publish at ½ point each');
    expect(second.transits).toHaveLength(2);
    const europe: GameState = { ...second, explorers: second.explorers.map((x) => (x.seat === 'bottom-1' ? { ...x, location: { kind: 'europe' as const }, chart: null } : x)), turn: { ...second.turn!, round: 10, moved: false, log: [] } };
    const p = reduceOne(europe, event('hex/published', { seat: 'bottom-1', hex: route[0] }));
    expect(p.scores['bottom-1']!.at(-1)).toMatchObject({ kind: 'transit', points: 0.5 });
    expect(p.turn!.log.at(-1)!.outcome).toBe(`${route[0]} published (veldt, epic transit (½)): 1½ points, a card drawn`);
    const sameRoute = reduceOne({ ...s, transits: [{ ...first, route: [...route, gate] }] }, event('expedition/moved', { seat: 'bottom-1', path: ['c20r1'] }));
    expect(sameRoute.explorers[0].transit).toBeNull();
    const viaNorthEast = reduceOne({ ...s, explorers: s.explorers.map((x) => (x.seat === 'bottom-1' ? { ...x, known: ['c25r12', 'c25r10', ...route, x.known.at(-1)!] } : x)) }, event('expedition/moved', { seat: 'bottom-1', path: ['c20r1'] }));
    expect(viaNorthEast.explorers[0].transit).toBeNull();
    const fifth = reduceOne({ ...s, transits: [1, 2, 3, 4].map((n) => ({ ...first, order: n, route: [`c1${n}r20` as HexId] })) }, event('expedition/moved', { seat: 'bottom-1', path: ['c20r1'] }));
    expect(fifth.explorers[0].transit).toBeNull();
  });
  it('formats fractional points', () => {
    expect(fmtPoints(3)).toBe('3');
    expect(fmtPoints(0.5)).toBe('½');
    expect(fmtPoints(2 + 1 / 3)).toBe('2⅓');
    expect(fmtPoints(1.25)).toBe('1¼');
    expect(fmtPoints(0.5 + 1 / 3)).toBe('⅚');
  });
});
