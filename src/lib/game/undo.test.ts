import { beforeEach, describe, expect, it } from 'vitest';
import { reduce, reduceOne } from './reduce';
import { created, event, resetSequence } from './test-fixtures';
import type { GameState } from './state';

beforeEach(resetSequence);

const LAYOUT = { bottom: 2, top: 2, left: 1, right: 1 };
const seatAndCommission = (seat: string) => [event('seat/taken', { seat, uid: `table:${seat}` }), event('explorer/commissioned', { seat, specialties: [] })];
const pass = (seat: string, s: GameState) => {
  const e = s.explorers.find((x) => x.seat === seat)!;
  return s.turn!.phase === 'discard' ? [event('cards/discarded', { seat, cardIds: [e.hand[0]] }), event('turn/ended', { seat })] : [event('turn/ended', { seat })];
};
const undo = (s: GameState) => reduceOne(s, event('turn/undone', { seat: s.undo!.seat, eventId: s.undo!.eventId }));

/** Seed 26 as scenario 025: bottom-1 starts; round 3 he outfits at Mombasa. */
function atMombasa() {
  const base = [created('ABCDE', LAYOUT, 26, { main: [6, 6, 6, 6, 1, 1, 1, 1], natives: [6, 6, 6, 6, 6, 6] }), ...seatAndCommission('bottom-1'), ...seatAndCommission('top-1'), event('game/started', {})];
  let events = [...base, event('voyage/booked', { seat: 'bottom-1', port: 'mombasa' }), event('turn/ended', { seat: 'bottom-1' })];
  events = [...events, ...pass('top-1', reduce(events))];
  events = [...events, ...pass('top-1', reduce(events))];
  return { base, events, s: reduce(events) };
}

describe('undo within the turn (docs/tabletop-ux.md)', () => {
  it('a choice that rolled no dice can be taken back: sailing, outfitting, caching, trading', () => {
    const { base } = atMombasa();
    const s0 = reduce(base);
    expect(s0.undo).toBeNull(); // the game's start rolled dice and dealt cards
    const sailed = reduceOne(s0, event('voyage/booked', { seat: 'bottom-1', port: 'mombasa' }));
    expect(sailed.undo).toMatchObject({ seat: 'bottom-1', type: 'voyage/booked' });
    expect(sailed.undo!.before.undo).toBeNull(); // one level only
    const back = undo(sailed);
    expect(back.diagnostics).toEqual([]);
    expect(back.undo).toBeNull();
    expect(back.explorers[0]).toMatchObject({ location: { kind: 'europe' }, hand: s0.explorers[0].hand, money: 0 });
    expect(back.deck).toEqual(s0.deck);
    const { s } = atMombasa();
    const outfitted = reduceOne(s, event('expedition/outfitted', { seat: 'bottom-1', purchases: { bearers: 5, food: 20 } }));
    expect(outfitted.undo?.type).toBe('expedition/outfitted');
    expect(undo(outfitted).explorers[0]).toMatchObject({ chart: null, money: s.explorers[0].money });
    const cached = reduceOne(outfitted, event('expedition/reorganised', { seat: 'bottom-1', action: 'cache', item: 'food', count: 5 }));
    expect(cached.explorers[0].chart!.food).toBe(15);
    expect(undo(cached).explorers[0].chart!.food).toBe(20);
    expect(undo(cached).caches).toEqual({});
    expect(undo(cached).undo).toBeNull(); // the outfit before it is resolved for good
  });
  it('is refused once dice have been rolled, for the wrong event, by another seat, and after the turn ends', () => {
    const { s } = atMombasa();
    const outfitted = reduceOne(s, event('expedition/outfitted', { seat: 'bottom-1', purchases: { bearers: 5, food: 20 } }));
    const moved = reduceOne(outfitted, event('expedition/moved', { seat: 'bottom-1', path: ['c24r12'] }));
    expect(moved.turn!.log.some((r) => r.kind === 'lost-check')).toBe(true);
    expect(moved.undo).toBeNull();
    expect(reduceOne(moved, event('turn/undone', { seat: 'bottom-1', eventId: 'host-00000001' })).diagnostics.at(-1)?.reason).toBe('nothing to undo');
    expect(reduceOne(outfitted, event('turn/undone', { seat: 'bottom-1', eventId: 'host-00000001' })).diagnostics.at(-1)?.reason).toBe('that is not the last action');
    expect(reduceOne(outfitted, event('turn/undone', { seat: 'top-1', eventId: outfitted.undo!.eventId })).diagnostics.at(-1)?.reason).toBe('only bottom-1 may undo it');
    const ended = reduceOne(outfitted, event('turn/ended', { seat: 'bottom-1' }));
    expect(ended.undo).toBeNull(); // the next turn has begun with a draw
    // A discard can be taken back while the player is still choosing; the draw that follows the last discard cannot.
    const { events } = atMombasa();
    // top-1 first opens a turn over the hand limit in round 4 (a ticket expired earlier): bottom-1 idles in port until then.
    let log = [...events, event('expedition/outfitted', { seat: 'bottom-1', purchases: { bearers: 5, food: 20 } }), event('turn/ended', { seat: 'bottom-1' })];
    log = [...log, ...pass('top-1', reduce(log)), event('turn/ended', { seat: 'bottom-1' })];
    const r4 = reduce(log);
    expect(r4.turn).toMatchObject({ current: 'top-1', round: 4, phase: 'discard' });
    const top = r4.explorers[1];
    const discarded = reduceOne(r4, event('cards/discarded', { seat: 'top-1', cardIds: [top.hand[0]] }));
    expect(discarded.turn!.phase).toBe('act'); // six cards less one: the limit is met and a card is drawn
    expect(discarded.undo).toBeNull();
  });
  it('replays the same after a reload: the undo is part of the event log', () => {
    const { events } = atMombasa();
    const log = [...events, event('expedition/outfitted', { seat: 'bottom-1', purchases: { bearers: 5, food: 20 } })];
    const s = reduce(log);
    const undone = [...log, event('turn/undone', { seat: 'bottom-1', eventId: s.undo!.eventId })];
    const again = reduce(undone);
    expect(again.diagnostics).toEqual([]);
    expect(again.explorers[0].chart).toBeNull();
    expect(reduce([...undone, event('expedition/outfitted', { seat: 'bottom-1', purchases: { bearers: 6, food: 10 } })]).explorers[0].chart).toMatchObject({ bearers: 6, food: 10 });
  });
});
