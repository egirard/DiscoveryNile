// An expedition cannot move overland with more gear than its bearers and animals carry (rules §4; PROMPTS.md,
// prompt 43): the camp (cache, dismiss) is the way out, on the same turn.
import { beforeEach, describe, expect, it } from 'vitest';
import { reduce } from '$lib/game/reduce';
import { created, event, resetSequence } from '$lib/game/test-fixtures';
import { moveTargets } from './reducer';

beforeEach(resetSequence);

const LAYOUT = { bottom: 2, top: 2, left: 1, right: 1 };
const seatAndCommission = (seat: string) => [event('seat/taken', { seat, uid: `table:${seat}` }), event('explorer/commissioned', { seat, specialties: [] })];
const pass = (seat: string, s: ReturnType<typeof reduce>) => {
  const e = s.explorers.find((x) => x.seat === seat)!;
  return s.turn!.phase === 'discard' ? [event('cards/discarded', { seat, cardIds: [e.hand[0]] }), event('turn/ended', { seat })] : [event('turn/ended', { seat })];
};
/** Seed 863 as scenario 023: bottom-1 at Mombasa with $700, outfitted with three bearers under a hundred rations and five muskets. */
function overloadedAtMombasa() {
  const base = [created('ABCDE', LAYOUT, 863, { main: [6, 6, 6, 6, 1, 1, 1, 1], hunting: [1, 1, 1] }), ...seatAndCommission('bottom-1'), ...seatAndCommission('top-1'), event('game/started', {})];
  let events = [...base, event('voyage/booked', { seat: 'bottom-1', port: 'mombasa' }), event('turn/ended', { seat: 'bottom-1' })];
  events = [...events, ...pass('top-1', reduce(events))];
  events = [...events, ...pass('top-1', reduce(events))];
  return [...events, event('expedition/outfitted', { seat: 'bottom-1', purchases: { askaris: 5, bearers: 3, food: 100, muskets: 5 } })];
}

describe('the load overland in play', () => {
  it('offers no step while the load is more than is carried, refuses a move with the reason, and moves once the camp has lightened it', () => {
    const events = overloadedAtMombasa();
    const s = reduce(events);
    expect(s.diagnostics).toEqual([]);
    const me = () => s.explorers.find((e) => e.seat === 'bottom-1')!;
    expect(me().chart).toMatchObject({ bearers: 3, food: 100, muskets: 5 });
    expect(moveTargets(s, me())).toEqual([]);
    const refused = reduce([...events, event('expedition/moved', { seat: 'bottom-1', path: ['c25r11'] })]);
    expect(refused.diagnostics.map((d) => d.reason)).toEqual(['cannot move overland: 105 units to carry, the bearers and animals carry 30; cache or dismiss at the camp first']);
    // Seventy rations and the muskets cached at the port: thirty units on three bearers, and the way is open the same turn.
    const lightened = [...events, event('expedition/reorganised', { seat: 'bottom-1', action: 'cache', item: 'food', count: 70 }), event('expedition/reorganised', { seat: 'bottom-1', action: 'cache', item: 'muskets', count: 5 })];
    const l = reduce(lightened);
    expect(l.diagnostics).toEqual([]);
    expect(moveTargets(l, l.explorers.find((e) => e.seat === 'bottom-1')!).map((t) => t.hex).sort()).toEqual(['c24r11', 'c24r12', 'c24r13', 'c25r11']);
    const moved = reduce([...lightened, event('expedition/moved', { seat: 'bottom-1', path: ['c25r11'] })]);
    expect(moved.diagnostics).toEqual([]);
    expect(moved.explorers.find((e) => e.seat === 'bottom-1')!.location).toEqual({ kind: 'hex', hex: 'c25r11' });
    // Dismissing instead would not help: the men carry the load. Eating is not open to a foot expedition without animals.
    const dismissed = reduce([...events, event('expedition/reorganised', { seat: 'bottom-1', action: 'dismiss', item: 'bearers', count: 1 })]);
    expect(moveTargets(dismissed, dismissed.explorers.find((e) => e.seat === 'bottom-1')!)).toEqual([]);
  });
});
