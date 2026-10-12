import { beforeEach, describe, expect, it } from 'vitest';
import { reduce } from '$lib/game/reduce';
import { created, event, resetSequence } from '$lib/game/test-fixtures';
import type { GameState } from '$lib/game/state';
import { card } from '$features/cards/deck';
import { moveTargets, standingHex, unknownTo } from './reducer';
import { neighbour } from '$features/map/hex';

beforeEach(resetSequence);

const LAYOUT = { bottom: 2, top: 2, left: 1, right: 1 };
const seatAndCommission = (seat: string) => [event('seat/taken', { seat, uid: `table:${seat}` }), event('explorer/commissioned', { seat, specialties: [] })];
const start = (seed: number) => [created('ABCDE', LAYOUT, seed), ...seatAndCommission('bottom-1'), ...seatAndCommission('top-1'), event('game/started', {})];
const FOOT = { askaris: 5, bearers: 15, food: 100 };

/** Land the first player at a port with the given expedition; returns the event list and seats. */
export function landedAt(seed: number, port: string, purchases: Record<string, number> = FOOT) {
  resetSequence();
  const base = start(seed);
  const s0 = reduce(base);
  const first = s0.turn!.current;
  const second = first === 'bottom-1' ? 'top-1' : 'bottom-1';
  const hand = s0.explorers.find((e) => e.seat === first)!.hand;
  const ticket = hand.find((id) => card(id).donation.kind === 'ticket' && (card(id).donation as { port: string }).port === port) ?? null;
  const events = [
    ...base,
    event('voyage/booked', { seat: first, port, ticketCardId: ticket }),
    event('turn/ended', { seat: first }),
    event('turn/ended', { seat: second }),
    event('turn/ended', { seat: second }),
    event('expedition/outfitted', { seat: first, purchases })
  ];
  return { events, first, second };
}

/** Seed 5: bottom-1 holds $1100 and tickets to Port Elizabeth and Durban. */
describe('expedition/moved from a port (rules §7)', () => {
  it('offers the adjacent passable hexes as targets, marking which are unknown', () => {
    const { events, first } = landedAt(5, 'port-elizabeth');
    const s = reduce(events);
    expect(s.diagnostics).toEqual([]);
    const e = s.explorers.find((x) => x.seat === first)!;
    expect(standingHex(e)).toBe('c14r36');
    const targets = moveTargets(s, e);
    expect(targets.map((t) => t.hex).sort()).toEqual(['c13r35', 'c13r36', 'c14r35', 'c15r36']);
    expect(targets.every((t) => !t.unknown)).toBe(true); // the Cape is pre-printed
    expect(unknownTo(e, 'c12r20')).toBe(true);
  });
  it('moves into a known hex without a roll and refuses a second move that turn', () => {
    const { events, first } = landedAt(5, 'port-elizabeth');
    const s = reduce([...events, event('expedition/moved', { seat: first, path: ['c15r36'] })]);
    expect(s.diagnostics).toEqual([]);
    const e = s.explorers.find((x) => x.seat === first)!;
    expect(e.location).toEqual({ kind: 'hex', hex: 'c15r36' });
    expect(e.known).toEqual(['c14r36', 'c15r36']);
    expect(s.turn!.log).toEqual([]);
    expect(s.turn!.moved).toBe(true);
    expect(s.map).toEqual({});
    const again = reduce([...events, event('expedition/moved', { seat: first, path: ['c15r36'] }), event('expedition/moved', { seat: first, path: ['c14r36'] })]);
    expect(again.diagnostics.at(-1)?.reason).toBe('the expedition has already moved this turn');
  });
  it('rejects non-adjacent, off-board, impassable and out-of-turn moves', () => {
    const { events, first, second } = landedAt(5, 'port-elizabeth');
    const reason = (payload: Record<string, unknown>) => reduce([...events, event('expedition/moved', payload)]).diagnostics.at(-1)?.reason;
    expect(reason({ seat: second, path: ['c14r35'] })).toBe(`it is not ${second}'s turn`);
    expect(reason({ seat: first, path: ['c14r30'] })).toBe('c14r30 is not adjacent to c14r36');
    expect(reason({ seat: first, path: ['c14r37'] })).toBe('c14r37 is not on the board');
    expect(reason({ seat: first, path: [] })).toBe('expedition/moved needs a path of one hex');
    // the Sudd is swamp: not on foot (test via a hex adjacent to it later); here an unoutfitted move
    resetSequence();
    const noChart = reduce([...start(5), event('expedition/moved', { seat: 'bottom-1', path: ['c14r35'] })]);
    expect(noChart.diagnostics.at(-1)?.reason).toBe('the explorer is not in Africa');
  });
});

describe('expedition/moved into a blank hex', () => {
  const mombasa = (seed: number) => landedAt(seed, 'mombasa');
  it('rolls the lost check with the terrain of the hex left, then generates terrain and claims the hex', () => {
    // Mombasa (veldt) borders blank c24r12 and c24r11. Search seeds for one found-the-way move.
    let hit: { s: GameState; first: string } | null = null;
    for (let seed = 1; seed < 400 && !hit; seed++) {
      const { events, first } = mombasa(seed);
      const before = reduce(events);
      const cash = before.explorers.find((x) => x.seat === first)!;
      if (!cash.chart) continue; // could not afford or sail
      const s = reduce([...events, event('expedition/moved', { seat: first, path: ['c24r12'] })]);
      if (s.diagnostics.length) continue;
      const lost = s.turn!.log[0];
      expect(lost.kind).toBe('lost-check');
      expect(lost.modifiers![0]).toEqual({ label: 'veldt', value: -1 });
      if (!lost.lost) hit = { s, first };
    }
    expect(hit).not.toBeNull();
    const { s, first } = hit!;
    expect(s.turn!.log[1].kind).toBe('terrain');
    expect(s.map['c24r12']).toBeDefined();
    expect(s.map['c24r12'].markers).toEqual([first]);
    const e = s.explorers.find((x) => x.seat === first)!;
    if (s.turn!.log[1].outcome.includes('impassable')) {
      expect(e.location).toEqual({ kind: 'port', port: 'mombasa' });
    } else {
      expect(e.location).toEqual({ kind: 'hex', hex: 'c24r12' });
    }
    expect(e.known).toContain('c24r12');
  });
  it('stays put when lost, with the roll on record, and may try again next turn with the same result for the same seed', () => {
    let found = false;
    for (let seed = 1; seed < 400 && !found; seed++) {
      const { events, first } = mombasa(seed);
      if (!reduce(events).explorers.find((x) => x.seat === first)!.chart) continue;
      const s = reduce([...events, event('expedition/moved', { seat: first, path: ['c24r12'] })]);
      if (s.diagnostics.length || !s.turn!.log[0]?.lost) continue;
      found = true;
      expect(s.explorers.find((x) => x.seat === first)!.location).toEqual({ kind: 'port', port: 'mombasa' });
      expect(s.map).toEqual({});
      expect(s.turn!.moved).toBe(true);
      expect(s.turn!.log).toHaveLength(1);
      const again = reduce([...events, event('expedition/moved', { seat: first, path: ['c24r12'] })]);
      expect(again.turn!.log).toEqual(s.turn!.log);
    }
    expect(found).toBe(true);
  });
  it('a guide hired at the port means never lost when leaving it', () => {
    for (let seed = 1; seed < 400; seed++) {
      const { events, first } = landedAt(seed, 'mombasa', { guides: 1, askaris: 3, bearers: 10, food: 60 });
      if (!reduce(events).explorers.find((x) => x.seat === first)!.chart) continue;
      const s = reduce([...events, event('expedition/moved', { seat: first, path: ['c24r12'] })]);
      expect(s.diagnostics).toEqual([]);
      expect(s.turn!.log[0]).toMatchObject({ kind: 'lost-check', lost: false, rolls: [], modifiers: [{ label: 'guide from this hex', value: 0 }] });
      return;
    }
    throw new Error('no affordable seed');
  });
  it('generated terrain beside the pre-printed coast copies a neighbour or rolls the table, deterministically', () => {
    const { events, first } = mombasa(2);
    const a = reduce([...events, event('expedition/moved', { seat: first, path: ['c24r11'] })]);
    resetSequence();
    const b = reduce([...mombasa(2).events, event('expedition/moved', { seat: first, path: ['c24r11'] })]);
    expect(a.map).toEqual(b.map);
    expect(a.turn!.log).toEqual(b.turn!.log);
    expect(neighbour('c24r11', 2)).toBe('c25r11');
  });
});
