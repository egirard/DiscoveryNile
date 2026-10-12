import { beforeEach, describe, expect, it } from 'vitest';
import { reduce } from '$lib/game/reduce';
import { created, event, resetSequence } from '$lib/game/test-fixtures';
import { explorerSeats } from './reducer';

beforeEach(resetSequence);

const LAYOUT = { bottom: 2, top: 2, left: 1, right: 1 };
const seatAndCommission = (seat: string, specialties: string[] = []) => [
  event('seat/taken', { seat, uid: `table:${seat}` }),
  event('explorer/commissioned', { seat, specialties })
];

describe('game/started', () => {
  it('rolls four dice per explorer, seats the high roller first, and deals five cards each from a seeded shuffle', () => {
    const s = reduce([created('ABCDE', LAYOUT, 1234), ...seatAndCommission('bottom-1'), ...seatAndCommission('top-1'), event('game/started', {})]);
    expect(s.diagnostics).toEqual([]);
    expect(s.turn).not.toBeNull();
    expect(Object.keys(s.rollOff!).sort()).toEqual(['bottom-1', 'top-1']);
    for (const attempts of Object.values(s.rollOff!)) {
      expect(attempts.length).toBeGreaterThanOrEqual(1);
      for (const roll of attempts) {
        expect(roll).toHaveLength(4);
        for (const d of roll) expect(d).toBeGreaterThanOrEqual(1);
      }
    }
    const total = (seat: string) => s.rollOff![seat].at(-1)!.reduce((a, b) => a + b, 0);
    const other = s.turn!.current === 'bottom-1' ? 'top-1' : 'bottom-1';
    expect(total(s.turn!.current)).toBeGreaterThan(total(other));
    expect(s.turn!.order[0]).toBe(s.turn!.current);
    expect(s.turn!.round).toBe(1);
    expect(s.turn!.phase).toBe('europe');
    for (const e of s.explorers) expect(e.hand).toHaveLength(5);
    expect(s.deck!.draw).toHaveLength(48 - 10);
    expect(s.deck!.discard).toEqual([]);
    const all = [...s.deck!.draw, ...s.explorers.flatMap((e) => e.hand)];
    expect(new Set(all).size).toBe(48);
  });
  it('is deterministic for a seed and differs across seeds', () => {
    const run = (seed: number) => reduce([created('ABCDE', LAYOUT, seed), ...seatAndCommission('bottom-1'), ...seatAndCommission('left-1'), event('game/started', {})]);
    const a = run(1234), b = run(1234), c = run(99);
    expect(a.rollOff).toEqual(b.rollOff);
    expect(a.deck).toEqual(b.deck);
    expect(a.deck).not.toEqual(c.deck);
  });
  it('orders turns clockwise from the winner across all six seats', () => {
    const seats = ['bottom-1', 'bottom-2', 'right-1', 'top-1', 'top-2', 'left-1'];
    const s = reduce([created('ABCDE', LAYOUT, 42), ...seats.flatMap((x) => seatAndCommission(x)), event('game/started', {})]);
    expect(explorerSeats(s)).toEqual(seats);
    const i = seats.indexOf(s.turn!.current);
    expect(s.turn!.order).toEqual([...seats.slice(i), ...seats.slice(0, i)]);
    expect(s.deck!.draw).toHaveLength(48 - 30);
  });
  it('re-rolls ties until one explorer is high (RQ-1)', () => {
    // Search seeds for a tie on the first attempt so the re-roll path is exercised.
    let found = false;
    for (let seed = 1; seed < 400 && !found; seed++) {
      const s = reduce([created('ABCDE', LAYOUT, seed), ...seatAndCommission('bottom-1'), ...seatAndCommission('top-1'), event('game/started', {})]);
      const attempts = Object.values(s.rollOff!).map((a) => a.length);
      if (Math.max(...attempts) > 1) {
        found = true;
        const total = (r: number[]) => r.reduce((a, b) => a + b, 0);
        expect(total(s.rollOff!['bottom-1'][0])).toBe(total(s.rollOff!['top-1'][0]));
        expect(s.rollOff![s.turn!.current].length).toBe(Math.max(...attempts));
      }
    }
    expect(found).toBe(true);
  });
  it('rejects starting twice, without explorers, or with a bad round limit', () => {
    const s = reduce([
      created('ABCDE', LAYOUT, 1),
      event('game/started', {}),
      ...seatAndCommission('bottom-1'),
      event('game/started', { roundLimit: 0 }),
      event('game/started', { roundLimit: 12 }),
      event('game/started', {})
    ]);
    expect(s.diagnostics.map((d) => d.reason)).toEqual(['no explorer has been commissioned', 'roundLimit must be a positive integer', 'game already started']);
    expect(s.turn?.round).toBe(1);
  });
});
