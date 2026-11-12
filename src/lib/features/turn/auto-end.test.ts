import { beforeEach, describe, expect, it } from 'vitest';
import { reduce } from '$lib/game/reduce';
import { created, event, resetSequence } from '$lib/game/test-fixtures';
import { card } from '$features/cards/deck';
import { moveTargets } from '$features/exploration/reducer';
import { endsItself, outOfMoves } from './auto-end';

beforeEach(resetSequence);

/** Seed 5: the first player lands at a port on a ticket and outfits on foot, as in the exploration reducer's tests. */
function landedAt(seed: number, port: string) {
  resetSequence();
  const seat = (id: string) => [event('seat/taken', { seat: id, uid: `table:${id}` }), event('explorer/commissioned', { seat: id, specialties: [] })];
  const base = [created('ABCDE', { bottom: 2, top: 2, left: 1, right: 1 }, seed), ...seat('bottom-1'), ...seat('top-1'), event('game/started', {})];
  const s0 = reduce(base);
  const first = s0.turn!.current;
  const second = first === 'bottom-1' ? 'top-1' : 'bottom-1';
  const hand = s0.explorers.find((e) => e.seat === first)!.hand;
  const ticket = hand.find((id) => card(id).donation.kind === 'ticket' && (card(id).donation as { port: string }).port === port) ?? null;
  const events = [...base, event('voyage/booked', { seat: first, port, ticketCardId: ticket }), event('turn/ended', { seat: first }), event('turn/ended', { seat: second }), event('turn/ended', { seat: second }), event('expedition/outfitted', { seat: first, purchases: { askaris: 5, bearers: 15, food: 100 } })];
  return { events, first };
}

describe('a turn that ends itself when the expedition is out of moves (prompt 70)', () => {
  it('on foot through known country: one step leaves a move, the second spends the last and the turn is over but for the hunt', () => {
    const { events, first } = landedAt(5, 'port-elizabeth');
    const landed = reduce(events);
    expect(outOfMoves(landed)).toBeNull(); // nothing moved yet
    const one = [...events, event('expedition/moved', { seat: first, path: ['c15r36'] })];
    const afterOne = reduce(one);
    expect(afterOne.diagnostics).toEqual([]);
    expect(outOfMoves(afterOne)).toBeNull();
    expect(endsItself(landed, afterOne, 'expedition/moved')).toBeNull();
    const next = moveTargets(afterOne, afterOne.explorers.find((e) => e.seat === first)!).find((t) => !t.unknown && t.hex !== 'c14r36')!;
    const afterTwo = reduce([...one, event('expedition/moved', { seat: first, path: [next.hex] })]);
    expect(afterTwo.diagnostics).toEqual([]);
    expect(afterTwo.turn).toMatchObject({ current: first, phase: 'act' });
    const inField = afterTwo.explorers.find((e) => e.seat === first)!.location.kind === 'hex';
    expect(outOfMoves(afterTwo)).toBe(inField ? first : null);
    expect(inField).toBe(true);
    expect(endsItself(afterOne, afterTwo, 'expedition/moved')).toBe(first);
    // Told once: the same state seen again ends nothing, nor does a turn handed back by an undo.
    expect(endsItself(afterTwo, afterTwo, 'expedition/moved')).toBeNull();
    expect(endsItself(afterOne, afterTwo, 'turn/undone')).toBeNull();
    // Once ended, it is the next seat's turn and nothing is out of moves.
    const ended = reduce([...one, event('expedition/moved', { seat: first, path: [next.hex] }), event('turn/ended', { seat: first })]);
    expect(ended.diagnostics).toEqual([]);
    expect(outOfMoves(ended)).toBeNull();
  });
  it('not at a port, not in Europe, not while dice are asked for, not when the game is over', () => {
    const { events, first } = landedAt(5, 'port-elizabeth');
    const one = [...events, event('expedition/moved', { seat: first, path: ['c15r36'] })];
    const s = reduce(one);
    const back = reduce([...one, event('expedition/moved', { seat: first, path: ['c14r36'] })]); // back into Port Elizabeth with the last point
    expect(back.diagnostics).toEqual([]);
    expect(back.turn!.movement).toMatchObject({ spent: 2 });
    expect(outOfMoves(back)).toBeNull();
    expect(outOfMoves(reduce(events.slice(0, 6)))).toBeNull();
    const spent = { ...s, turn: { ...s.turn!, moved: true, movement: { ...s.turn!.movement!, spent: 2 } } };
    expect(outOfMoves(spent)).toBe(first);
    expect(outOfMoves({ ...spent, awaiting: {} as never })).toBeNull();
    expect(outOfMoves({ ...spent, ended: {} as never })).toBeNull();
    expect(outOfMoves({ ...spent, turn: { ...spent.turn!, phase: 'natives' } })).toBeNull();
  });
});
