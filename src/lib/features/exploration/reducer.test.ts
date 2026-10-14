import { beforeEach, describe, expect, it } from 'vitest';
import { reduce } from '$lib/game/reduce';
import { created, event, resetSequence } from '$lib/game/test-fixtures';
import type { GameState } from '$lib/game/state';
import { card } from '$features/cards/deck';
import { moveTargets, standingHex, unknownTo } from './reducer';
import { neighbour } from '$features/map/hex';

/** The turn's rolls, leaving out the plain lines for actions that rolled nothing (prompt 16). */
const rolls = (s: GameState) => s.turn!.log.filter((r) => r.kind !== 'action');

beforeEach(resetSequence);

const LAYOUT = { bottom: 2, top: 2, left: 1, right: 1 };
const seatAndCommission = (seat: string) => [event('seat/taken', { seat, uid: `table:${seat}` }), event('explorer/commissioned', { seat, specialties: [] })];
const start = (seed: number) => [created('ABCDE', LAYOUT, seed), ...seatAndCommission('bottom-1'), ...seatAndCommission('top-1'), event('game/started', {})];
const FOOT = { askaris: 5, bearers: 15, food: 100 };
const hand = (s: GameState, seat: string) => s.explorers.find((e) => e.seat === seat)!.hand;

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
    expect(targets.every((t) => !t.unknown && t.mode === 'foot' && t.cost === 1)).toBe(true); // the Cape is pre-printed
    expect(unknownTo(s, e, 'c12r20')).toBe(true);
  });
  it('on foot moves two known hexes without a roll and no more that turn', () => {
    const { events, first } = landedAt(5, 'port-elizabeth');
    const s = reduce([...events, event('expedition/moved', { seat: first, path: ['c15r36'] })]);
    expect(s.diagnostics).toEqual([]);
    const e = s.explorers.find((x) => x.seat === first)!;
    expect(e.location).toEqual({ kind: 'hex', hex: 'c15r36' });
    expect(e.known).toEqual(['c14r36', 'c15r36']);
    expect(rolls(s)).toEqual([]);
    expect(s.turn!.log.map((r) => r.kind)).toEqual(['action', 'action']); // outfitted, moved: no die
    expect(s.turn!.movement).toMatchObject({ mode: 'foot', points: 2, spent: 1, halted: false });
    expect(s.turn!.moved).toBe(false);
    expect(s.map).toEqual({});
    const two = reduce([...events, event('expedition/moved', { seat: first, path: ['c15r36'] }), event('expedition/moved', { seat: first, path: ['c14r36'] })]);
    expect(two.turn!.moved).toBe(true);
    const three = reduce([...events, event('expedition/moved', { seat: first, path: ['c15r36'] }), event('expedition/moved', { seat: first, path: ['c14r36'] }), event('expedition/moved', { seat: first, path: ['c15r36'] })]);
    expect(three.diagnostics.at(-1)?.reason).toMatch(/no movement left/);
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
      const lost = rolls(s)[0];
      expect(lost.kind).toBe('lost-check');
      expect(lost.modifiers![0]).toEqual({ label: 'veldt', value: -1 });
      if (!lost.lost) hit = { s, first };
    }
    expect(hit).not.toBeNull();
    const { s, first } = hit!;
    expect(rolls(s)[1].kind).toBe('terrain');
    expect(s.map['c24r12']).toBeDefined();
    expect(s.map['c24r12'].markers).toEqual([first]);
    const e = s.explorers.find((x) => x.seat === first)!;
    if (s.turn!.log.some((l) => l.outcome.includes('impassable'))) {
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
      if (s.diagnostics.length || !s.history.filter((t) => t.seat === first).at(-1)?.log.some((r) => r.kind === 'lost-check' && r.lost)) continue;
      found = true;
      expect(s.explorers.find((x) => x.seat === first)!.location).toEqual({ kind: 'port', port: 'mombasa' });
      expect(s.map).toEqual({});
      // Lost, the turn ended there and then (prompt 20): the next seat is up, and the lost check closes the turn's log.
      expect(s.turn!.current).not.toBe(first);
      const played = s.history.filter((t) => t.seat === first).at(-1)!;
      expect(played.log.filter((r) => r.kind !== 'action')).toHaveLength(1);
      expect(played.log.at(-1)).toMatchObject({ kind: 'lost-check', lost: true, outcome: 'lost; no hunting needed at Mombasa' });
      const again = reduce([...events, event('expedition/moved', { seat: first, path: ['c24r12'] })]);
      expect(again.history).toEqual(s.history);
    }
    expect(found).toBe(true);
  });
  it('a guide hired at the port means never lost when leaving it', () => {
    for (let seed = 1; seed < 400; seed++) {
      const { events, first } = landedAt(seed, 'mombasa', { guides: 1, askaris: 3, bearers: 10, food: 60 });
      if (!reduce(events).explorers.find((x) => x.seat === first)!.chart) continue;
      const s = reduce([...events, event('expedition/moved', { seat: first, path: ['c24r12'] })]);
      expect(s.diagnostics).toEqual([]);
      expect(rolls(s)[0]).toMatchObject({ kind: 'lost-check', lost: false, rolls: [], modifiers: [{ label: 'guide from this hex', value: 0 }] });
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

describe('movement rates with scripted dice (rules §7.1)', () => {
  // Seed 1573 (found by search): bottom-1's hand pays passage and the rules' mounted sample; top-1 holds a
  // ticket to Brass and enough for the canoe sample. Scripted dice do not advance the shuffle.
  // Dice script: roll-off bottom-1 6,6,6,6 and top-1 1,1,1,1; then bottom-1's unknown step: lost check 6,
  // terrain tries 1 and 5 (both blank), random table 6 = lake.
  const SCRIPT = [6, 6, 6, 6, 1, 1, 1, 1, 6, 1, 5, 6];
  const MOUNTED = { horses: 11, askaris: 4, guides: 1, bearers: 2, muskets: 1, gifts: 20, food: 50 };
  const CANOES = { canoes: 2, bearers: 16, guides: 1, askaris: 6, muskets: 4, gifts: 50, food: 125 };
  const setup = () => {
    resetSequence();
    const base = [created('ABCDE', LAYOUT, 1573, SCRIPT), ...seatAndCommission('bottom-1'), ...seatAndCommission('top-1'), event('game/started', {})];
    const s0 = reduce(base);
    expect(s0.turn!.current).toBe('bottom-1');
    const brass = hand(s0, 'top-1').find((id) => card(id).donation.kind === 'ticket' && (card(id).donation as { port: string }).port === 'brass')!;
    const events = [
      ...base,
      event('voyage/booked', { seat: 'bottom-1', port: 'durban' }), event('turn/ended', { seat: 'bottom-1' }),
      event('voyage/booked', { seat: 'top-1', port: 'brass', ticketCardId: brass }), event('turn/ended', { seat: 'top-1' }),
      // round 2: both at sea, both turns skipped; round 3: bottom-1 outfits and rides
      event('expedition/outfitted', { seat: 'bottom-1', purchases: MOUNTED })
    ];
    const s = reduce(events);
    expect(s.diagnostics).toEqual([]);
    expect(s.turn).toMatchObject({ current: 'bottom-1', round: 3 });
    return events;
  };
  it('mounted: two known hexes then an unknown one, which turns out to be a lake and bounces the expedition', () => {
    const events = [...setup(), event('expedition/moved', { seat: 'bottom-1', path: ['c16r33'] }), event('expedition/moved', { seat: 'bottom-1', path: ['c16r32'] })];
    const s2 = reduce(events);
    expect(s2.diagnostics).toEqual([]);
    expect(s2.turn!.movement).toMatchObject({ mode: 'mounted', points: 4, unknownCost: 2, spent: 2 });
    const targets = moveTargets(s2, s2.explorers[0]);
    expect(targets.find((t) => t.hex === 'c15r32')).toMatchObject({ unknown: true, cost: 2, mode: 'mounted' });
    const s3 = reduce([...events, event('expedition/moved', { seat: 'bottom-1', path: ['c15r32'] })]);
    expect(s3.diagnostics).toEqual([]);
    expect(rolls(s3).map((l) => l.outcome)).toEqual(['found the way', 'mapped lake', 'lake is impassable mounted: the expedition turns back']);
    expect(s3.map['c15r32']).toMatchObject({ terrain: 'lake', markers: ['bottom-1'] });
    expect(s3.explorers[0].location).toEqual({ kind: 'hex', hex: 'c16r32' });
    expect(s3.turn!.moved).toBe(true);
  });
  it('canoes with eight paddlers each: four hexes up the Niger and along the coast, never off the water', () => {
    const events = [...setup(), event('turn/ended', { seat: 'bottom-1' }), event('expedition/outfitted', { seat: 'top-1', purchases: CANOES })];
    const s = reduce(events);
    expect(s.turn!.current).toBe('top-1');
    // From Brass (c2r8) the Niger leads to c2r7; the other land neighbour c3r8 is jungle-swamp, closed to canoes.
    expect(moveTargets(s, s.explorers[1])).toEqual([{ hex: 'c2r7', unknown: false, mode: 'canoe', cost: 1 }]);
    const trip = ['c2r7', 'c2r6', 'c2r5', 'c2r4'];
    const s4 = reduce([...events, ...trip.map((hex) => event('expedition/moved', { seat: 'top-1', path: [hex] }))]);
    expect(s4.diagnostics).toEqual([]);
    expect(s4.turn!.movement).toMatchObject({ mode: 'canoe', points: 4, spent: 4 });
    expect(s4.explorers[1].location).toEqual({ kind: 'hex', hex: 'c2r4' });
    // The mode is fixed for the turn by the first step (open-questions G-32): once afloat, dry c3r7 is off the menu.
    const afloat = reduce([...events, event('expedition/moved', { seat: 'top-1', path: ['c2r7'] })]);
    expect(moveTargets(afloat, afloat.explorers[1]).map((x) => x.hex)).not.toContain('c3r7');
    const dry = reduce([...events, event('expedition/moved', { seat: 'top-1', path: ['c2r7'] }), event('expedition/moved', { seat: 'top-1', path: ['c3r7'] })]);
    expect(dry.diagnostics.at(-1)?.reason).toBe('canoes must follow the water');
  });
});
