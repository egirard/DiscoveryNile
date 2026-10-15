import { beforeEach, describe, expect, it } from 'vitest';
import { reduce } from '$lib/game/reduce';
import { created, event, resetSequence } from '$lib/game/test-fixtures';
import { card } from '$features/cards/deck';

beforeEach(resetSequence);

const LAYOUT = { bottom: 2, top: 2, left: 1, right: 1 };
const seatAndCommission = (seat: string) => [event('seat/taken', { seat, uid: `table:${seat}` }), event('explorer/commissioned', { seat, specialties: [] })];
const pass = (seat: string, s: ReturnType<typeof reduce>) => {
  const e = s.explorers.find((x) => x.seat === seat)!;
  return s.turn!.phase === 'discard' ? [event('cards/discarded', { seat, cardIds: [e.hand[0]] }), event('turn/ended', { seat })] : [event('turn/ended', { seat })];
};

// Seed 863 (as scenarios 013, 014, 021 and 023): bottom-1 pays passage to Mombasa and keeps $700. Cache die 5: recovered.
function onTheVeldt() {
  const base = [created('ABCDE', LAYOUT, 863, { main: [6, 6, 6, 6, 1, 1, 1, 1], hunting: [1, 1, 1], cache: [5, 2] }), ...seatAndCommission('bottom-1'), ...seatAndCommission('top-1'), event('game/started', {})];
  let events = [...base, event('voyage/booked', { seat: 'bottom-1', port: 'mombasa' }), event('turn/ended', { seat: 'bottom-1' })];
  events = [...events, ...pass('top-1', reduce(events))];
  events = [...events, ...pass('top-1', reduce(events))];
  events = [...events, event('expedition/outfitted', { seat: 'bottom-1', purchases: { askaris: 5, bearers: 15, food: 100, muskets: 5 } }), event('expedition/moved', { seat: 'bottom-1', path: ['c25r11'] })];
  return events;
}

describe('reorganising the expedition (rules §5)', () => {
  it('caches goods under a marker, dismisses men, and refuses the impossible', () => {
    const events = onTheVeldt();
    const r = (payload: Record<string, unknown>) => event('expedition/reorganised', { seat: 'bottom-1', ...payload });
    const s = reduce([...events, r({ action: 'cache', item: 'food', count: 10 }), r({ action: 'cache', item: 'food', count: 10 }), r({ action: 'cache', item: 'muskets', count: 5 }), r({ action: 'dismiss', item: 'bearers', count: 5 })]);
    expect(s.diagnostics).toEqual([]);
    expect(s.explorers[0].chart).toMatchObject({ food: 80, muskets: 0, bearers: 10 });
    expect(Object.values(s.caches)).toEqual([{ id: 1, hex: 'c25r11', seat: 'bottom-1', round: 3, contents: { food: 20, muskets: 5 } }]);
    expect(s.turn!.log.slice(-2).map((l) => l.outcome)).toEqual(['5 muskets cached', '5 bearers dismissed']);
    const reason = (payload: Record<string, unknown>) => reduce([...events, r(payload)]).diagnostics.at(-1)?.reason;
    expect(reason({ action: 'cache', item: 'bearers', count: 1 })).toBe('bearers cannot be cached');
    expect(reason({ action: 'eat', item: 'horses', count: 1 })).toBe('only 0 horses');
    expect(reason({ action: 'dismiss', item: 'food', count: 1 })).toBe('food cannot be dismissed');
    expect(reason({ action: 'cache', item: 'food', count: 200 })).toBe('only 100 food');
    expect(reduce([...events, event('cache/recovered', { seat: 'bottom-1', cacheId: 1 })]).diagnostics.at(-1)?.reason).toBe('no such cache');
  });
  it('gives goods back out of a cache made this turn, item by item, and lifts the marker when it is empty (prompt 34)', () => {
    const events = [...onTheVeldt(), event('expedition/reorganised', { seat: 'bottom-1', action: 'cache', item: 'food', count: 20 }), event('expedition/reorganised', { seat: 'bottom-1', action: 'cache', item: 'muskets', count: 5 })];
    const take = (payload: Record<string, unknown>) => event('expedition/reorganised', { seat: 'bottom-1', action: 'take', cacheId: 1, ...payload });
    const some = reduce([...events, take({ item: 'food', count: 10 })]);
    expect(some.diagnostics).toEqual([]);
    expect(some.explorers[0].chart).toMatchObject({ food: 90, muskets: 0 });
    expect(some.caches[1].contents).toEqual({ food: 10, muskets: 5 });
    expect(some.turn!.log.at(-1)).toMatchObject({ kind: 'cache', outcome: '10 food taken back from the cache' });
    const all = reduce([...events, take({ item: 'food', count: 20 }), take({ item: 'muskets', count: 5 })]);
    expect(all.caches).toEqual({});
    expect(all.explorers[0].chart).toMatchObject({ food: 100, muskets: 5 });
    const reason = (payload: Record<string, unknown>) => reduce([...events, take(payload)]).diagnostics.at(-1)?.reason;
    expect(reason({ item: 'food', count: 30 })).toBe('only 20 food in the cache');
    expect(reason({ item: 'gifts', count: 1 })).toBe('only 0 gifts in the cache');
    expect(reason({ item: 'food', count: 1, cacheId: 2 })).toBe('no such cache here');
    // Next turn the cache is an earlier one: dug up with a die, not taken from.
    const ev = [...events, event('turn/ended', { seat: 'bottom-1' })];
    const later = [...ev, ...pass('top-1', reduce(ev))];
    expect(reduce([...later, take({ item: 'food', count: 1 })]).diagnostics.at(-1)?.reason).toBe('dig up the cache first');
  });
  it('a cache is dug up on a later turn: a 1 or 2 and it has gone, otherwise its goods return', () => {
    const events = [...onTheVeldt(), event('expedition/reorganised', { seat: 'bottom-1', action: 'cache', item: 'food', count: 20 })];
    expect(reduce([...events, event('cache/recovered', { seat: 'bottom-1', cacheId: 1 })]).diagnostics.at(-1)?.reason).toBe('a cache is dug up on a later turn');
    const ev = [...events, event('turn/ended', { seat: 'bottom-1' })];
    const later = [...ev, ...pass('top-1', reduce(ev))];
    const found = reduce([...later, event('cache/recovered', { seat: 'bottom-1', cacheId: 1 })]);
    expect(found.diagnostics).toEqual([]);
    expect(found.turn!.log.at(-1)).toMatchObject({ kind: 'cache', outcome: 'the cache is recovered: 20 food', rolls: [{ label: 'cache', value: 5 }] });
    expect(found.caches).toEqual({});
    expect(found.explorers[0].chart!.food).toBe(80 - 21 + 20); // 21 men ate the first evening
    expect(reduce([...later, event('cache/recovered', { seat: 'top-1', cacheId: 1 })]).diagnostics.at(-1)?.reason).toBe("it is not top-1's turn");
    // The second cache die is a 2: gone. (Marker numbers are reused once a cache is lifted.)
    const gone = reduce([...later, event('cache/recovered', { seat: 'bottom-1', cacheId: 1 }), event('expedition/reorganised', { seat: 'bottom-1', action: 'cache', item: 'food', count: 5 }), event('turn/ended', { seat: 'bottom-1' })]);
    const laterStill = [...later, event('cache/recovered', { seat: 'bottom-1', cacheId: 1 }), event('expedition/reorganised', { seat: 'bottom-1', action: 'cache', item: 'food', count: 5 }), event('turn/ended', { seat: 'bottom-1' })];
    const lost = reduce([...laterStill, ...pass('top-1', gone), event('cache/recovered', { seat: 'bottom-1', cacheId: 1 })]);
    expect(lost.turn!.log.at(-1)).toMatchObject({ outcome: 'the cache has disappeared (5 food)' });
    expect(lost.caches).toEqual({});
  });
  it('animals are turned loose or eaten for ten rations each', () => {
    // Seed 1573 as in scenario 012: bottom-1 buys the rules' mounted sample at Durban.
    resetSequence();
    const base = [created('ABCDE', LAYOUT, 1573, [6, 6, 6, 6, 1, 1, 1, 1]), ...seatAndCommission('bottom-1'), ...seatAndCommission('top-1'), event('game/started', {})];
    const s0 = reduce(base);
    const brass = s0.explorers[1].hand.find((id) => card(id).donation.kind === 'ticket' && (card(id).donation as { port: string }).port === 'brass')!;
    const events = [...base, event('voyage/booked', { seat: 'bottom-1', port: 'durban' }), event('turn/ended', { seat: 'bottom-1' }), event('voyage/booked', { seat: 'top-1', port: 'brass', ticketCardId: brass }), event('turn/ended', { seat: 'top-1' }),
      event('expedition/outfitted', { seat: 'bottom-1', purchases: { horses: 11, askaris: 4, guides: 1, bearers: 2, muskets: 1, gifts: 20, food: 50 } })];
    const s = reduce([...events, event('expedition/reorganised', { seat: 'bottom-1', action: 'eat', item: 'horses', count: 2 }), event('expedition/reorganised', { seat: 'bottom-1', action: 'release', item: 'horses', count: 1 })]);
    expect(s.diagnostics).toEqual([]);
    expect(s.explorers[0].chart).toMatchObject({ horses: 8, food: 70 });
    expect(s.turn!.log.slice(-2).map((l) => l.outcome)).toEqual(['2 horses eaten: 20 rations', '1 horse turned loose']);
  });
});
