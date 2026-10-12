import { beforeEach, describe, expect, it } from 'vitest';
import { reduce, reduceOne } from '$lib/game/reduce';
import { created, event, resetSequence } from '$lib/game/test-fixtures';
import type { GameState } from '$lib/game/state';
import { homecoming, publishable, scoreOf, valueOf } from './score';
import { moveTargets, unknownTo } from '$features/exploration/reducer';
import { inCapeColony } from '$features/disasters/cape-colony';
import { RIVERS } from '$features/map/manifest';
import { directionTo, neighbours, parseHexId, type HexId } from '$features/map/hex';

beforeEach(resetSequence);

const LAYOUT = { bottom: 2, top: 2, left: 1, right: 1 };
const seatAndCommission = (seat: string) => [event('seat/taken', { seat, uid: `table:${seat}` }), event('explorer/commissioned', { seat, specialties: [] })];
const pass = (seat: string, s: GameState) => {
  const e = s.explorers.find((x) => x.seat === seat)!;
  return s.turn!.phase === 'discard' ? [event('cards/discarded', { seat, cardIds: [e.hand[0]] }), event('turn/ended', { seat })] : [event('turn/ended', { seat })];
};

/**
 * Seed 26 (as scenario 025): bottom-1 ($727) and top-1 ($600) both sail to Mombasa, both walk into the blank hex
 * c24r12 (veldt where a river rises; natives dice scripted to sixes find nobody) and both sail home from Mombasa.
 * Round 5 opens with bottom-1 in Europe and top-1 still at sea.
 */
function bothHome() {
  const buy = { bearers: 5, food: 20 };
  const base = [created('ABCDE', LAYOUT, 26, { main: [6, 6, 6, 6, 1, 1, 1, 1], natives: [6, 6, 6, 6] }), ...seatAndCommission('bottom-1'), ...seatAndCommission('top-1'), event('game/started', {})];
  const inAfrica = [
    ...base,
    event('voyage/booked', { seat: 'bottom-1', port: 'mombasa' }), event('turn/ended', { seat: 'bottom-1' }),
    event('voyage/booked', { seat: 'top-1', port: 'mombasa' }), event('turn/ended', { seat: 'top-1' }),
    event('expedition/outfitted', { seat: 'bottom-1', purchases: buy }), event('expedition/moved', { seat: 'bottom-1', path: ['c24r12'] }), event('expedition/reorganised', { seat: 'bottom-1', action: 'cache', item: 'food', count: 5 }), event('turn/ended', { seat: 'bottom-1' }),
    event('expedition/outfitted', { seat: 'top-1', purchases: buy }), event('expedition/moved', { seat: 'top-1', path: ['c24r12'] })
  ];
  const events = [
    ...inAfrica,
    event('turn/ended', { seat: 'top-1' }),
    event('expedition/moved', { seat: 'bottom-1', path: ['c25r12'] }), event('expedition/returned', { seat: 'bottom-1' }), event('turn/ended', { seat: 'bottom-1' }),
    event('expedition/moved', { seat: 'top-1', path: ['c25r12'] }), event('expedition/returned', { seat: 'top-1' }), event('turn/ended', { seat: 'top-1' })
  ];
  return { inAfrica, events };
}

describe('publishing (rules §12)', () => {
  it('a hex under the marker is claimed in Europe: points scored, every marker off, a card drawn', () => {
    const { events } = bothHome();
    const s = reduce(events);
    expect(s.diagnostics).toEqual([]);
    expect(s.turn).toMatchObject({ current: 'bottom-1', round: 5 });
    expect(s.map['c24r12']).toMatchObject({ terrain: 'veldt', markers: ['bottom-1', 'top-1'], publishedBy: null });
    expect(s.map['c24r12'].river?.source).toBe(true);
    expect(publishable(s, 'bottom-1')).toEqual(['c24r12']);
    expect(publishable(s, 'top-1')).toEqual(['c24r12']); // contested: whoever publishes first wins it
    expect(valueOf(s, 'c24r12', 'bottom-1', 5)).toMatchObject({ points: 2, parts: ['veldt', 'river'] });
    const handBefore = s.explorers[0].hand.length;
    const p = reduce([...events, event('hex/published', { seat: 'bottom-1', hex: 'c24r12' })]);
    expect(p.diagnostics).toEqual([]);
    expect(p.map['c24r12']).toMatchObject({ markers: [], publishedBy: 'bottom-1' });
    expect(p.scores['bottom-1']).toEqual([{ kind: 'hex', detail: 'c24r12', points: 2, round: 5 }]);
    expect(scoreOf(p, 'bottom-1')).toBe(2);
    expect(scoreOf(p, 'top-1')).toBe(0);
    expect(p.explorers[0].hand).toHaveLength(handBefore + 1);
    expect(p.turn!.log.at(-1)).toMatchObject({ kind: 'published', hex: 'c24r12', outcome: 'c24r12 published (veldt, river): 2 points, a card drawn' });
    // Stolen: top-1 has nothing left to publish.
    expect(publishable(p, 'top-1')).toEqual([]);
    expect(reduce([...events, event('hex/published', { seat: 'bottom-1', hex: 'c24r12' }), event('hex/published', { seat: 'bottom-1', hex: 'c24r12' })]).diagnostics.at(-1)?.reason).toBe('c24r12 is already published');
  });
  it('refuses publication away from Europe, of unmapped hexes, and of hexes without the marker', () => {
    const { inAfrica, events } = bothHome();
    expect(reduce([...inAfrica, event('hex/published', { seat: 'top-1', hex: 'c24r12' })]).diagnostics.at(-1)?.reason).toBe('hexes are published in Europe');
    expect(reduce([...events, event('hex/published', { seat: 'bottom-1', hex: 'c25r11' })]).diagnostics.at(-1)?.reason).toBe('hex/published needs a hex mapped in play');
    expect(reduce([...events, event('hex/published', { seat: 'top-1', hex: 'c24r12' })]).diagnostics.at(-1)?.reason).toBe("it is not top-1's turn");
    const s = reduce(events);
    const stripped: GameState = { ...s, map: { ...s.map, c24r12: { ...s.map['c24r12'], markers: ['top-1'] } } };
    expect(reduceOne(stripped, event('hex/published', { seat: 'bottom-1', hex: 'c24r12' })).diagnostics.at(-1)?.reason).toBe('no marker of bottom-1 on c24r12');
  });
  it('a published hex is known to everyone: no lost check, no natives roll, no marker, its oasis and caches open to all (RQ-3)', () => {
    const { inAfrica, events } = bothHome();
    const p = reduce([...events, event('hex/published', { seat: 'bottom-1', hex: 'c24r12' })]);
    const top = p.explorers[1];
    expect(unknownTo(p, top, 'c24r12')).toBe(false);
    // Back on the hex (state crafted: top-1 standing at Mombasa with a chart, the hex published, bottom-1's cache there).
    const s3 = reduce(inAfrica);
    const atMombasa: GameState = { ...s3, map: { ...s3.map, c24r12: { ...s3.map['c24r12'], markers: [], publishedBy: 'bottom-1', nativesCheckedBy: [] } }, explorers: s3.explorers.map((e) => (e.seat === 'top-1' ? { ...e, location: { kind: 'port' as const, port: 'mombasa' as const }, known: ['c25r12'] } : e)), turn: { ...s3.turn!, moved: false, movement: null, log: [] } };
    const target = moveTargets(atMombasa, atMombasa.explorers[1]).find((t) => t.hex === 'c24r12')!;
    expect(target).toMatchObject({ unknown: false, cost: 1 });
    const back = reduceOne(atMombasa, event('expedition/moved', { seat: 'top-1', path: ['c24r12'] }));
    expect(back.diagnostics).toEqual([]);
    expect(back.turn!.log.map((r) => r.kind)).toEqual([]); // neither a lost check nor a natives roll
    expect(back.map['c24r12'].markers).toEqual([]);
    const cacheId = Object.values(back.caches).find((c) => c.seat === 'bottom-1')!.id;
    const dug = reduceOne({ ...back, turn: { ...back.turn!, round: back.turn!.round + 1 } }, event('cache/recovered', { seat: 'top-1', cacheId }));
    expect(dug.diagnostics).toEqual([]);
    const unpublished = reduceOne({ ...back, map: { ...back.map, c24r12: { ...back.map['c24r12'], publishedBy: null } }, turn: { ...back.turn!, round: back.turn!.round + 1 } }, event('cache/recovered', { seat: 'top-1', cacheId }));
    expect(unpublished.diagnostics.at(-1)?.reason).toContain('only findable once the hex is published');
  });
  it('scores a discovered tribe with the hex, and a point more for its defeat by the publisher', () => {
    const { events } = bothHome();
    const s = reduce(events);
    const tribe = { id: 1, hex: 'c24r12' as HexId, warriors: 10, attitude: 0, pending: null, negotiatedBy: [], regard: {}, preachedBy: [], treatedBy: [], defeatedBy: ['top-1' as const] };
    const withTribe: GameState = { ...s, tribes: { 1: tribe }, map: { ...s.map, c24r12: { ...s.map['c24r12'], tribe: 1 } } };
    expect(valueOf(withTribe, 'c24r12', 'bottom-1', 5)).toMatchObject({ points: 3, parts: ['veldt', 'river', 'tribe 1 discovered'] });
    expect(valueOf(withTribe, 'c24r12', 'top-1', 5)).toMatchObject({ points: 4, parts: ['veldt', 'river', 'tribe 1 discovered', 'defeated'] });
    expect(valueOf(withTribe, 'c24r12', 'top-1', 5).entries).toEqual([{ kind: 'hex', detail: 'c24r12', points: 2, round: 5 }, { kind: 'tribe', detail: '1', points: 2, round: 5 }]);
  });
  it('specimens and good works score on landing in Europe (G-79)', () => {
    const { events } = bothHome();
    const s = reduce(events);
    expect(s.explorers[1].location).toEqual({ kind: 'homeward', port: 'mombasa' });
    const laden: GameState = { ...s, explorers: s.explorers.map((e) => (e.seat === 'top-1' ? { ...e, specimens: { zoology: 2, geology: 1 }, goodWorks: { evangelism: 3, medicine: 0 } } : e)) };
    expect(homecoming(laden.explorers[1], 5)).toEqual([{ kind: 'specimens', detail: '3 specimens', points: 3, round: 5 }, { kind: 'works', detail: 'evangelism', points: 3, round: 5 }]);
    const home = reduceOne(laden, event('turn/ended', { seat: 'bottom-1' }));
    expect(home.diagnostics).toEqual([]);
    expect(home.turn!.current).toBe('top-1');
    expect(home.explorers[1]).toMatchObject({ location: { kind: 'europe' }, specimens: { zoology: 0, geology: 0 }, goodWorks: { evangelism: 0, medicine: 0 } });
    expect(scoreOf(home, 'top-1')).toBe(6);
    expect(home.turn!.log[0]).toMatchObject({ kind: 'published', outcome: 'home with 3 specimens and evangelism: 6 points' });
    expect(homecoming(s.explorers[0], 5)).toEqual([]);
  });
  it('a published hex joins Cape Colony when its river drains into the Orange (G-81)', () => {
    const orange = RIVERS.find((r) => r.id === 'orange')!;
    const on = orange.path[Math.floor(orange.path.length / 2)];
    const row = parseHexId(on)!.row;
    const north = neighbours(on).find((n) => !orange.path.includes(n) && parseHexId(n)!.row < row && !inCapeColony(n))!;
    expect(north).toBeDefined();
    const course = { in: [], out: directionTo(north, on)!, source: true, cataract: false, waterfallFeet: null };
    const base = { terrain: 'veldt' as const, markers: [], river: course, oasis: false, oasisKnownTo: [], peakFeet: null, tribe: null, nativesCheckedBy: [] };
    expect(inCapeColony(north, { [north]: { ...base, publishedBy: null } })).toBe(false);
    expect(inCapeColony(north, { [north]: { ...base, publishedBy: 'bottom-1' } })).toBe(true);
    expect(inCapeColony(north, { [north]: { ...base, river: null, publishedBy: 'bottom-1' } })).toBe(false);
  });
});
