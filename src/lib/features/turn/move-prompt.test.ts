import { beforeEach, describe, expect, it } from 'vitest';
import { reduce } from '$lib/game/reduce';
import { created, event, resetSequence } from '$lib/game/test-fixtures';
import { card } from '$features/cards/deck';
import { movePromptFor, movePromptText } from './move-prompt';

beforeEach(resetSequence);

/** Seed 5: the first player lands at Port Elizabeth on a ticket and outfits on foot, as in the auto-end tests. */
function landed() {
  const port = 'port-elizabeth';
  const seat = (id: string) => [event('seat/taken', { seat: id, uid: `table:${id}` }), event('explorer/commissioned', { seat: id, specialties: [] })];
  const base = [created('ABCDE', { bottom: 2, top: 2, left: 1, right: 1 }, 5), ...seat('bottom-1'), ...seat('top-1'), event('game/started', {})];
  const s0 = reduce(base);
  const first = s0.turn!.current;
  const second = first === 'bottom-1' ? 'top-1' : 'bottom-1';
  const hand = s0.explorers.find((e) => e.seat === first)!.hand;
  const ticket = hand.find((id) => card(id).donation.kind === 'ticket' && (card(id).donation as { port: string }).port === port) ?? null;
  const booked = [...base, event('voyage/booked', { seat: first, port, ticketCardId: ticket })];
  const events = [...booked, event('turn/ended', { seat: first }), event('turn/ended', { seat: second }), event('turn/ended', { seat: second }), event('expedition/outfitted', { seat: first, purchases: { askaris: 5, bearers: 15, food: 100 } })];
  return { base, events, first };
}

describe('when the seat is prompted to move (prompt 74)', () => {
  it('not in Europe, where there is no hex to step into', () => {
    expect(movePromptFor(reduce(landed().base))).toBeNull();
  });
  it('outfitted at the port: prompted without points, then with the points left after a step', () => {
    const { events, first } = landed();
    expect(movePromptFor(reduce(events))).toEqual({ seat: first, left: null });
    const one = reduce([...events, event('expedition/moved', { seat: first, path: ['c15r36'] })]);
    expect(one.diagnostics).toEqual([]);
    expect(movePromptFor(one)).toEqual({ seat: first, left: 1 });
  });
});

describe('the prompt to move', () => {
  it('names the movement points left once the mode of travel is settled', () => {
    expect(movePromptText(2)).toBe('You have 2 MP: pick a hex to move into, or');
    expect(movePromptText(1)).toBe('You have 1 MP: pick a hex to move into, or');
  });
  it('asks only for the hex before the first step', () => {
    expect(movePromptText(null)).toBe('Pick a hex to move into, or');
  });
});
