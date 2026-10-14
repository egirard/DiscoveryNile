import { beforeEach, describe, expect, it } from 'vitest';
import { reduce } from '$lib/game/reduce';
import { created, event, resetSequence } from '$lib/game/test-fixtures';
import { describeCard } from './actions';

beforeEach(resetSequence);

const LAYOUT = { bottom: 2, top: 2, left: 1, right: 1 };
const seatAndCommission = (seat: string) => [event('seat/taken', { seat, uid: `table:${seat}` }), event('explorer/commissioned', { seat, specialties: [] })];
const pass = (seat: string, s: ReturnType<typeof reduce>) => {
  const e = s.explorers.find((x) => x.seat === seat)!;
  return s.turn!.phase === 'discard' ? [event('cards/discarded', { seat, cardIds: [e.hand[0]] }), event('turn/ended', { seat })] : [event('turn/ended', { seat })];
};
const lines = (s: ReturnType<typeof reduce>, seat: string) => s.history.filter((t) => t.seat === seat).map((t) => ({ round: t.round, log: t.log.filter((r) => r.seat === seat).map((r) => `${r.kind}: ${r.outcome}`) }));

// Seed 863 (as scenario 023): bottom-1 pays passage to Mombasa and keeps $700.
const base = () => [created('ABCDE', LAYOUT, 863, { main: [6, 6, 6, 6, 1, 1, 1, 1], hunting: [1, 1, 1] }), ...seatAndCommission('bottom-1'), ...seatAndCommission('top-1'), event('game/started', { seat: 'bottom-1' })];

describe('the log of every turn so far (prompt 17)', () => {
  it('opens with the roll for first player, one entry per seat in round 0, read from the same dice as the roll-off', () => {
    const s = reduce(base());
    expect(s.history.map((t) => [t.round, t.seat])).toEqual([[0, 'bottom-1'], [0, 'top-1']]);
    // One line, the same in every seat's log (prompt 28): each seat's dice and total, and who goes first.
    for (const t of s.history) {
      expect(t.log.map((r) => r.kind)).toEqual(['first-player']);
      expect(t.log[0].contenders).toEqual([{ seat: 'bottom-1', values: [6, 6, 6, 6], total: 24 }, { seat: 'top-1', values: [1, 1, 1, 1], total: 4 }]);
      expect(t.log[0].rolls.map((x) => x.value)).toEqual([6, 6, 6, 6, 1, 1, 1, 1]);
      expect(t.log[0].total).toBe(24);
    }
    expect(lines(s, 'bottom-1')[0].log).toEqual(['first-player: bottom-1 first']);
    expect(lines(s, 'top-1')[0].log).toEqual(['first-player: bottom-1 first']);
  });
  it('a turn that ends joins the history with its lines, and the current turn starts afresh', () => {
    const started = reduce(base());
    const drawn = started.explorers[0].hand.at(-1)!;
    const ended = reduce([...base(), event('voyage/booked', { seat: 'bottom-1', port: 'mombasa' }), event('turn/ended', { seat: 'bottom-1' })]);
    expect(ended.turn!.current).toBe('top-1');
    expect(lines(ended, 'bottom-1')).toEqual([
      { round: 0, log: ['first-player: bottom-1 first'] },
      { round: 1, log: [`action: drew ${describeCard(drawn)}`, 'action: booked passage to Mombasa for $500'] }
    ]);
    expect(ended.turn!.log.filter((r) => r.seat === 'bottom-1')).toEqual([]);
  });
  it('the turn skipped at sea is logged as the landing, and the meal closes a turn in the field', () => {
    let events = [...base(), event('voyage/booked', { seat: 'bottom-1', port: 'mombasa' }), event('turn/ended', { seat: 'bottom-1' })];
    events = [...events, ...pass('top-1', reduce(events))];
    events = [...events, ...pass('top-1', reduce(events))];
    const landed = reduce(events);
    expect(landed.turn!.current).toBe('bottom-1');
    expect(lines(landed, 'bottom-1').at(-1)).toEqual({ round: 2, log: ['action: landed at Mombasa'] });
    events = [...events, event('expedition/outfitted', { seat: 'bottom-1', purchases: { askaris: 5, bearers: 15, food: 100 } }), event('expedition/moved', { seat: 'bottom-1', path: ['c25r11'] }), event('turn/ended', { seat: 'bottom-1' })];
    const fed = reduce(events);
    expect(fed.diagnostics).toEqual([]);
    const last = fed.history.at(-1)!;
    expect([last.round, last.seat]).toEqual([3, 'bottom-1']);
    expect(last.log.map((r) => r.kind)).toEqual(['action', 'action', 'hunting']);
    expect(last.log.at(-1)).toEqual(fed.explorers.find((e) => e.seat === 'bottom-1')!.lastMeal);
  });
  it('a continued game starts its history afresh', () => {
    const s = reduce([...base(), event('game/ended', { seat: 'bottom-1' }), event('game/continued', { seat: 'bottom-1' })]);
    expect(s.history).toEqual([]);
  });
});
