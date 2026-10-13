import { beforeEach, describe, expect, it } from 'vitest';
import { reduce, reduceOne } from '$lib/game/reduce';
import { created, event, resetSequence } from '$lib/game/test-fixtures';
import type { GameState } from '$lib/game/state';

beforeEach(resetSequence);

const LAYOUT = { bottom: 2, top: 2, left: 1, right: 1 };
const seatAndCommission = (seat: string) => [event('seat/taken', { seat, uid: `table:${seat}` }), event('explorer/commissioned', { seat, specialties: [] })];
const pass = (seat: string, s: GameState) => {
  const e = s.explorers.find((x) => x.seat === seat)!;
  return s.turn!.phase === 'discard' ? [event('cards/discarded', { seat, cardIds: [e.hand[0]] }), event('turn/ended', { seat })] : [event('turn/ended', { seat })];
};

/** Seed 26 as scenarios 025 and 029, with a limit of five rounds: bottom-1 maps c24r12 and is home with its marker when round 5 ends. */
function fiveRounds() {
  const base = [created('ABCDE', LAYOUT, 26, { main: [6, 6, 6, 6, 1, 1, 1, 1], natives: [6, 6, 6, 6, 6, 6] }), ...seatAndCommission('bottom-1'), ...seatAndCommission('top-1'), event('game/started', { roundLimit: 5 })];
  let events = [...base, event('voyage/booked', { seat: 'bottom-1', port: 'mombasa' }), event('turn/ended', { seat: 'bottom-1' })];
  events = [...events, ...pass('top-1', reduce(events))];
  events = [...events, ...pass('top-1', reduce(events))];
  events = [...events, event('expedition/outfitted', { seat: 'bottom-1', purchases: { bearers: 5, food: 20 } }), event('expedition/moved', { seat: 'bottom-1', path: ['c24r12'] }), event('turn/ended', { seat: 'bottom-1' })];
  events = [...events, ...pass('top-1', reduce(events))];
  events = [...events, event('expedition/moved', { seat: 'bottom-1', path: ['c25r12'] }), event('expedition/returned', { seat: 'bottom-1' }), event('turn/ended', { seat: 'bottom-1' })];
  events = [...events, ...pass('top-1', reduce(events))];
  const r5 = reduce(events); // round 5: bottom-1 in Europe with his marker on c24r12
  events = [...events, event('turn/ended', { seat: 'bottom-1' })];
  const last = reduce(events);
  events = [...events, ...pass('top-1', last)];
  return { r5, over: reduce(events), events };
}

describe('the game\'s end (rules: Description of Game; RQ-10)', () => {
  it('a round limit ends the game: explorers in Europe publish what they can, everyone retires, the most points win', () => {
    const { r5, over } = fiveRounds();
    expect(r5.diagnostics).toEqual([]);
    expect(r5.turn).toMatchObject({ current: 'bottom-1', round: 5, roundLimit: 5 });
    expect(r5.explorers[0].location).toEqual({ kind: 'europe' });
    expect(r5.map['c24r12'].markers).toEqual(['bottom-1']);
    expect(over.diagnostics).toEqual([]);
    expect(over.ended).toEqual({ round: 5, reason: 'limit', standings: [{ seat: 'bottom-1', points: 2 }, { seat: 'top-1', points: 0 }], winners: ['bottom-1'] });
    expect(over.map['c24r12']).toMatchObject({ publishedBy: 'bottom-1', markers: [] });
    expect(over.scores['bottom-1']).toEqual([{ kind: 'hex', detail: 'c24r12', points: 2, round: 5 }]);
    expect(over.explorers.map((e) => [e.location.kind, e.fate?.cause])).toEqual([['dead', 'retired in Europe at the end of the game'], ['dead', 'retired in Europe at the end of the game']]);
    // Nothing more can be played.
    expect(reduceOne(over, event('turn/ended', { seat: 'bottom-1' })).diagnostics.at(-1)?.reason).toBe('the game is over');
    expect(reduceOne(over, event('explorer/commissioned', { seat: 'bottom-1', specialties: [] })).diagnostics.at(-1)?.reason).toBe('the game is over');
  });
  it('an explorer still in Africa at the end retires unpublished, and his lone hexes are erased', () => {
    const base = [created('ABCDE', LAYOUT, 26, { main: [6, 6, 6, 6, 1, 1, 1, 1], natives: [6, 6, 6, 6, 6, 6] }), ...seatAndCommission('bottom-1'), ...seatAndCommission('top-1'), event('game/started', { roundLimit: 3 })];
    let events = [...base, event('voyage/booked', { seat: 'bottom-1', port: 'mombasa' }), event('turn/ended', { seat: 'bottom-1' })];
    events = [...events, ...pass('top-1', reduce(events))];
    events = [...events, ...pass('top-1', reduce(events))];
    events = [...events, event('expedition/outfitted', { seat: 'bottom-1', purchases: { bearers: 5, food: 20 } }), event('expedition/moved', { seat: 'bottom-1', path: ['c24r12'] }), event('turn/ended', { seat: 'bottom-1' })];
    const s = reduce(events);
    events = [...events, ...pass('top-1', s)];
    const over = reduce(events);
    expect(over.diagnostics).toEqual([]);
    expect(over.ended).toMatchObject({ round: 3, reason: 'limit', winners: ['bottom-1', 'top-1'] }); // nobody scored: the tie is shared
    expect(over.map['c24r12']).toBeUndefined();
    expect(over.explorers[0].fate?.cause).toBe('retired in Africa at the end of the game');
  });
  it('ends by consensus when every seat with an explorer has voted, a vote being withdrawable', () => {
    const { r5 } = fiveRounds();
    const one = reduceOne(r5, event('game/end-voted', { seat: 'top-1' }));
    expect(one.diagnostics).toEqual([]);
    expect(one.endVotes).toEqual(['top-1']);
    expect(one.ended).toBeNull();
    const withdrawn = reduceOne(one, event('game/end-voted', { seat: 'top-1' }));
    expect(withdrawn.endVotes).toEqual([]);
    const both = reduceOne(one, event('game/end-voted', { seat: 'bottom-1' }));
    expect(both.ended).toMatchObject({ round: 5, reason: 'consensus', winners: ['bottom-1'] });
    expect(reduceOne(r5, event('game/end-voted', { seat: 'left-1' })).diagnostics.at(-1)?.reason).toBe('only a seat with an explorer votes');
  });
  it('ends by agreement from the options screen, whoever sends it, once a game is under way', () => {
    const { r5 } = fiveRounds();
    const over = reduceOne(r5, event('game/ended', { seat: 'top-1' }));
    expect(over.diagnostics).toEqual([]);
    expect(over.ended).toMatchObject({ round: 5, reason: 'consensus', winners: ['bottom-1'] });
    expect(reduceOne(reduce([created('ABCDE', LAYOUT, 26)]), event('game/ended', { seat: 'top-1' })).diagnostics.at(-1)?.reason).toBe('game not started');
  });
  it('continues on the same map: published hexes and records stay, scores and explorers start afresh', () => {
    const { over } = fiveRounds();
    const next = reduceOne(over, event('game/continued', {}));
    expect(next.diagnostics).toEqual([]);
    expect(next).toMatchObject({ turn: null, ended: null, scores: {}, explorers: [], games: 1, deck: null });
    expect(next.map['c24r12']).toMatchObject({ publishedBy: 'bottom-1' });
    expect(next.seats.filter((s) => s.uid)).toHaveLength(2);
    const again = reduce([...fiveRounds().events, event('game/continued', {}), event('explorer/commissioned', { seat: 'bottom-1', specialties: ['medicine'] }), event('game/started', {})]);
    expect(again.diagnostics).toEqual([]);
    expect(again.turn).toMatchObject({ current: 'bottom-1', round: 1, roundLimit: null });
    expect(again.explorers[0].hand).toHaveLength(6); // five dealt and one drawn, like any first turn
    expect(reduceOne(over, event('game/continued', {})).ended).toBeNull();
    expect(reduceOne(fiveRounds().r5, event('game/continued', {})).diagnostics.at(-1)?.reason).toBe('the game has not ended');
  });
});
