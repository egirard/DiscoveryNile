import { describe, expect, it } from 'vitest';
import { reduce } from '$lib/game/reduce';
import { created, event, resetSequence } from '$lib/game/test-fixtures';

// The roll for first player as the table shows it (PROMPTS.md, prompts 27 and 28): one line in every seat's log with
// each seat's dice and total and who goes first, the game standing still (`starting`) until `game/begun`.
const LAYOUT = { bottom: 1, top: 1, left: 0, right: 0 };
const seatAndCommission = (seat: string) => [event('seat/taken', { seat, uid: `u-${seat}` }), event('explorer/commissioned', { seat, specialties: [] })];
function game(dice?: number[]) {
  resetSequence();
  return [created('ABCDE', LAYOUT, 5, dice), ...seatAndCommission('bottom-1'), ...seatAndCommission('top-1')];
}

describe('the roll for first player', () => {
  it('is one line in every seat\'s log: each seat\'s dice and total, and who goes first', () => {
    const s = reduce([...game([6, 6, 6, 6, 1, 1, 1, 1]), event('game/started', {})]);
    expect(s.diagnostics).toEqual([]);
    expect(s.rollOff).toEqual({ 'bottom-1': [[6, 6, 6, 6]], 'top-1': [[1, 1, 1, 1]] });
    expect(s.history.map((t) => [t.round, t.seat, t.log.length])).toEqual([[0, 'bottom-1', 1], [0, 'top-1', 1]]);
    const [mine, theirs] = s.history.map((t) => t.log[0]);
    expect(mine).toMatchObject({
      kind: 'first-player',
      seat: 'bottom-1',
      total: 24,
      outcome: 'bottom-1 first',
      contenders: [{ seat: 'bottom-1', values: [6, 6, 6, 6], total: 24 }, { seat: 'top-1', values: [1, 1, 1, 1], total: 4 }]
    });
    expect(mine.rolls.map((r) => `${r.label} ${r.value}`)).toEqual(['bottom-1 die 1 6', 'bottom-1 die 2 6', 'bottom-1 die 3 6', 'bottom-1 die 4 6', 'top-1 die 1 1', 'top-1 die 2 1', 'top-1 die 3 1', 'top-1 die 4 1']);
    expect(theirs).toEqual({ ...mine, seat: 'top-1' });
  });
  it('tells a tie and the throw again on the same line', () => {
    const s = reduce([...game([2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 5, 5, 5, 5]), event('game/started', {})]);
    expect(s.history[0].log[0]).toMatchObject({
      total: 20,
      outcome: 'bottom-1 8, top-1 8, a tie; again top-1 first',
      contenders: [{ seat: 'bottom-1', values: [1, 1, 1, 1], total: 4 }, { seat: 'top-1', values: [5, 5, 5, 5], total: 20 }]
    });
    expect(s.history[0].log[0].rolls).toHaveLength(16);
    expect(s.turn!.current).toBe('top-1');
  });
  it('holds the table at the decided roll until game/begun, which is refused at any other time', () => {
    const started = reduce([...game([6, 6, 6, 6, 1, 1, 1, 1]), event('game/started', {})]);
    expect(started.starting).toBe('bottom-1');
    expect(started.turn).toMatchObject({ current: 'bottom-1', round: 1 });
    const begun = reduce([...game([6, 6, 6, 6, 1, 1, 1, 1]), event('game/started', {}), event('game/begun', {})]);
    expect(begun.starting).toBeNull();
    expect(begun.diagnostics).toEqual([]);
    expect(begun.turn).toEqual(started.turn);
    const early = reduce([...game(), event('game/begun', {})]);
    expect(early.diagnostics.at(-1)?.reason).toBe('the game is not starting');
    const twice = reduce([...game([6, 6, 6, 6, 1, 1, 1, 1]), event('game/started', {}), event('game/begun', {}), event('game/begun', {})]);
    expect(twice.diagnostics.at(-1)?.reason).toBe('the game is not starting');
  });
  it('records which seat threw each physical roll while the roll is asked for', () => {
    const asked = reduce([...game(), event('dice/physical', { on: true }), event('game/started', {})]);
    expect(asked.awaiting).toMatchObject({ seat: 'bottom-1', count: 4, rolled: [] });
    const one = reduce([...game(), event('dice/physical', { on: true }), event('game/started', {}), event('dice/rolled', { seat: 'bottom-1', values: [6, 6, 6, 6] })]);
    expect(one.awaiting).toMatchObject({ seat: 'top-1', rolled: [{ seat: 'bottom-1', values: [6, 6, 6, 6] }] });
    expect(one.starting).toBeNull();
  });
});
