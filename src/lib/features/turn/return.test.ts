import { beforeEach, describe, expect, it } from 'vitest';
import { reduce } from '$lib/game/reduce';
import { created, event, resetSequence } from '$lib/game/test-fixtures';

beforeEach(resetSequence);

const LAYOUT = { bottom: 2, top: 2, left: 1, right: 1 };
const seatAndCommission = (seat: string) => [event('seat/taken', { seat, uid: `table:${seat}` }), event('explorer/commissioned', { seat, specialties: [] })];
const pass = (seat: string, s: ReturnType<typeof reduce>) => {
  const e = s.explorers.find((x) => x.seat === seat)!;
  return s.turn!.phase === 'discard' ? [event('cards/discarded', { seat, cardIds: [e.hand[0]] }), event('turn/ended', { seat })] : [event('turn/ended', { seat })];
};

// Seed 863 (as scenarios 013, 014, 021, 023 and 024): bottom-1 pays passage to Mombasa and keeps $700.
function backAtMombasa() {
  const base = [created('ABCDE', LAYOUT, 863, { main: [6, 6, 6, 6, 1, 1, 1, 1], hunting: [1, 1, 1] }), ...seatAndCommission('bottom-1'), ...seatAndCommission('top-1'), event('game/started', {})];
  let events = [...base, event('voyage/booked', { seat: 'bottom-1', port: 'mombasa' }), event('turn/ended', { seat: 'bottom-1' })];
  events = [...events, ...pass('top-1', reduce(events))];
  events = [...events, ...pass('top-1', reduce(events))];
  events = [...events, event('expedition/outfitted', { seat: 'bottom-1', purchases: { askaris: 5, bearers: 15, food: 100 } }), event('expedition/moved', { seat: 'bottom-1', path: ['c25r11'] }), event('turn/ended', { seat: 'bottom-1' })];
  events = [...events, ...pass('top-1', reduce(events)), event('expedition/moved', { seat: 'bottom-1', path: ['c25r12'] })];
  return { events, pass };
}

describe('return to Europe (rules §12)', () => {
  it('standing on a port hex counts as being in port: no disaster, no meal, and the way home is open', () => {
    const { events, pass } = backAtMombasa();
    const s = reduce(events);
    expect(s.diagnostics).toEqual([]);
    expect(s.explorers[0].location).toEqual({ kind: 'hex', hex: 'c25r12' });
    expect(reduce([...events, event('expedition/returned', { seat: 'top-1' })]).diagnostics.at(-1)?.reason).toBe("it is not top-1's turn");
    const home = reduce([...events, event('expedition/returned', { seat: 'bottom-1' })]);
    expect(home.diagnostics).toEqual([]);
    expect(home.explorers[0]).toMatchObject({ location: { kind: 'homeward', port: 'mombasa' }, chart: null });
    expect(home.turn!.log.at(-1)!.outcome).toBe('the expedition is dismissed at Mombasa; passage home is free');
    expect(home.turn!.moved).toBe(true);
    const ended = reduce([...events, event('expedition/returned', { seat: 'bottom-1' }), event('turn/ended', { seat: 'bottom-1' })]);
    expect(ended.explorers[0].lastMeal).toBeNull(); // no evening in port
    const ev = [...events, event('expedition/returned', { seat: 'bottom-1' }), event('turn/ended', { seat: 'bottom-1' })];
    const back = reduce([...ev, ...pass('top-1', ended)]);
    expect(back.turn).toMatchObject({ current: 'bottom-1', round: 5 });
    expect(back.explorers[0].location).toEqual({ kind: 'europe' });
    expect(back.explorers[0].hand).toHaveLength(1); // the Europe turn resumes with a draw
    expect(back.explorers[0].known).toContain('c25r11');
  });
  it('cannot sail home from the field', () => {
    const { events } = backAtMombasa();
    const inland = [...events.slice(0, -1)];
    expect(reduce([...inland, event('expedition/returned', { seat: 'bottom-1' })]).diagnostics.at(-1)?.reason).toBe('the explorer is not at a port of entry');
  });
});
