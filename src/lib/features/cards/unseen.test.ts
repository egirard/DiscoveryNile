// The cards a seat has not looked at yet (PROMPTS.md, prompt 44): dealt or drawn, they wait at the seat's edge until
// taken (`cards/seen`) or until the seat acts.
import { beforeEach, describe, expect, it } from 'vitest';
import { reduce } from '$lib/game/reduce';
import { created, event, resetSequence } from '$lib/game/test-fixtures';

beforeEach(resetSequence);

const LAYOUT = { bottom: 2, top: 2, left: 1, right: 1 };
const seatAndCommission = (seat: string) => [event('seat/taken', { seat, uid: `table:${seat}` }), event('explorer/commissioned', { seat, specialties: [] })];
const me = (s: ReturnType<typeof reduce>, seat: string) => s.explorers.find((e) => e.seat === seat)!;

describe('cards waiting to be looked at', () => {
  it('are the hand dealt, then the card each turn draws; taking them or acting clears them', () => {
    const base = [created('ABCDE', LAYOUT, 1234, [6, 6, 6, 6, 1, 1, 1, 1]), ...seatAndCommission('bottom-1'), ...seatAndCommission('top-1'), event('game/started', {})];
    const s = reduce(base);
    expect(s.diagnostics).toEqual([]);
    expect(s.turn!.current).toBe('bottom-1');
    // The first player's five dealt and the sixth drawn as the turn began; the other seat's five.
    expect(me(s, 'bottom-1').unseen).toEqual(me(s, 'bottom-1').hand);
    expect(me(s, 'bottom-1').unseen).toHaveLength(6);
    expect(me(s, 'top-1').unseen).toEqual(me(s, 'top-1').hand);
    expect(me(s, 'top-1').unseen).toHaveLength(5);
    // Taking them.
    const taken = reduce([...base, event('cards/seen', { seat: 'top-1' })]);
    expect(taken.diagnostics).toEqual([]);
    expect(me(taken, 'top-1').unseen).toEqual([]);
    expect(me(taken, 'bottom-1').unseen).toHaveLength(6);
    expect(taken.undo).toBeNull();
    // Acting takes them too: the first player ends its turn, and top-1 draws its sixth.
    const passed = reduce([...base, event('turn/ended', { seat: 'bottom-1' })]);
    expect(me(passed, 'bottom-1').unseen).toEqual([]);
    expect(me(passed, 'top-1').unseen).toHaveLength(6);
    expect(me(passed, 'top-1').unseen.at(-1)).toBe(me(passed, 'top-1').hand.at(-1));
    // Taking at a seat with nothing waiting changes nothing; a seat with no explorer is refused.
    expect(reduce([...base, event('cards/seen', { seat: 'top-1' }), event('cards/seen', { seat: 'top-1' })]).diagnostics).toEqual([]);
    expect(reduce([...base, event('cards/seen', { seat: 'left-1' })]).diagnostics.at(-1)?.reason).toBe('no explorer at left-1');
  });
  it('drops a card discarded or expired from the cards waiting', () => {
    const base = [created('ABCDE', LAYOUT, 1234, [6, 6, 6, 6, 1, 1, 1, 1]), ...seatAndCommission('bottom-1'), ...seatAndCommission('top-1'), event('game/started', {})];
    let events = base;
    // Europe turn after turn until a hand is over the limit and must be trimmed.
    for (let i = 0; i < 6; i++) {
      const s = reduce(events);
      const seat = s.turn!.current;
      if (s.turn!.phase === 'discard') {
        const e = me(s, seat);
        const [gone] = e.hand;
        const trimmed = reduce([...events, event('cards/discarded', { seat, cardIds: [gone] })]);
        expect(me(trimmed, seat).unseen).not.toContain(gone);
        // The discard was an action of the seat: the cards waiting before it are taken, and the draw that follows waits.
        expect(me(trimmed, seat).unseen).toEqual([me(trimmed, seat).hand.at(-1)]);
        return;
      }
      events = [...events, event('turn/ended', { seat })];
    }
    throw new Error('no hand reached the limit');
  });
});
