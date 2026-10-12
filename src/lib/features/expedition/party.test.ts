import { beforeEach, describe, expect, it } from 'vitest';
import { reduce, reduceOne } from '$lib/game/reduce';
import { created, event, resetSequence } from '$lib/game/test-fixtures';
import type { GameState } from '$lib/game/state';
import { handValue } from '$features/cards/deck';
import { moveTargets } from '$features/exploration/reducer';
import { addCharts, holderOf, moverOf, partyOf, subtractChart } from './party';
import { perish } from '$features/explorers/fate';

beforeEach(resetSequence);

const LAYOUT = { bottom: 2, top: 2, left: 1, right: 1 };
const seatAndCommission = (seat: string) => [event('seat/taken', { seat, uid: `table:${seat}` }), event('explorer/commissioned', { seat, specialties: [] })];
const pass = (seat: string, s: GameState) => {
  const e = s.explorers.find((x) => x.seat === seat)!;
  return s.turn!.phase === 'discard' ? [event('cards/discarded', { seat, cardIds: [e.hand[0]] }), event('turn/ended', { seat })] : [event('turn/ended', { seat })];
};

/** Seed 26 as scenario 025: bottom-1 ($727) sails to Mombasa pooling top-1's $600; they land together and bottom-1 outfits. */
function pooled() {
  const base = [created('ABCDE', LAYOUT, 26, { main: [6, 6, 6, 6, 1, 1, 1, 1], natives: [6, 6, 6, 6, 6, 6] }), ...seatAndCommission('bottom-1'), ...seatAndCommission('top-1'), event('game/started', {})];
  const s0 = reduce(base);
  const cash = [handValue(s0.explorers[0].hand), handValue(s0.explorers[1].hand)];
  let events = [...base, event('voyage/booked', { seat: 'bottom-1', port: 'mombasa', with: ['top-1'] })];
  const booked = reduce(events);
  events = [...events, event('turn/ended', { seat: 'bottom-1' })];
  // top-1 is at sea too: his round-1 turn is skipped; in round 2 bottom-1 lands both and his landing turn is skipped,
  // then top-1 has an idle turn in port; round 3 opens with bottom-1 outfitting.
  const r1 = reduce(events);
  events = [...events, ...pass('top-1', r1), event('expedition/outfitted', { seat: 'bottom-1', purchases: { bearers: 10, food: 60 } })];
  return { base, cash, booked, r1, events, outfitted: reduce(events) };
}

describe('joint expeditions (rules §13)', () => {
  it('companions in Europe pool their donations and sail with the leader, landing together', () => {
    const { cash, booked, r1, outfitted } = pooled();
    expect(booked.diagnostics).toEqual([]);
    expect(booked.explorers.map((e) => [e.seat, e.location, e.money, e.party])).toEqual([['bottom-1', { kind: 'voyage', port: 'mombasa' }, cash[0] + cash[1] - 500, 1], ['top-1', { kind: 'voyage', port: 'mombasa' }, 0, 1]]);
    expect(booked.parties).toEqual({ 1: { id: 1, leader: 'bottom-1', members: ['bottom-1', 'top-1'] } });
    expect(booked.turn!.log.at(-1)).toMatchObject({ kind: 'party', outcome: `a joint expedition with top-1: $${cash[1]} pooled, $${cash[0] + cash[1] - 500} to spend at Mombasa` });
    expect(r1.diagnostics).toEqual([]);
    expect(r1.turn).toMatchObject({ current: 'top-1', round: 2 });
    expect(r1.explorers.every((e) => e.location.kind === 'port')).toBe(true);
    expect(outfitted.diagnostics).toEqual([]);
    expect(outfitted.turn).toMatchObject({ current: 'bottom-1', round: 3 });
    expect(reduceOne({ ...outfitted, turn: { ...outfitted.turn!, current: 'top-1' } }, event('expedition/outfitted', { seat: 'top-1', purchases: {} })).diagnostics.at(-1)?.reason).toContain('does not outfit');
    expect(reduce([...pooled().base, event('voyage/booked', { seat: 'bottom-1', port: 'mombasa', with: ['bottom-1'] })]).diagnostics.at(-1)?.reason).toBe('no companion at bottom-1');
  });
  it('the party moves on its last member\'s turn, as one, with one lost check and markers for everyone', () => {
    const { events, outfitted } = pooled();
    expect(moveTargets(outfitted, outfitted.explorers[0])).toEqual([]); // bottom-1 comes first in the order: not the mover
    expect(moverOf(outfitted, outfitted.parties[1])).toBe('top-1');
    expect(reduceOne(outfitted, event('expedition/moved', { seat: 'bottom-1', path: ['c24r12'] })).diagnostics.at(-1)?.reason).toContain('moves on its last member');
    const topsTurn = reduce([...events, event('turn/ended', { seat: 'bottom-1' })]);
    expect(topsTurn.turn!.current).toBe('top-1');
    expect(moveTargets(topsTurn, topsTurn.explorers[1]).map((t) => t.hex)).toContain('c24r12');
    const moved = reduceOne(topsTurn, event('expedition/moved', { seat: 'top-1', path: ['c24r12'] }));
    expect(moved.diagnostics).toEqual([]);
    expect(moved.explorers.map((e) => e.location)).toEqual([{ kind: 'hex', hex: 'c24r12' }, { kind: 'hex', hex: 'c24r12' }]);
    expect(moved.map['c24r12'].markers).toEqual(['bottom-1', 'top-1']);
    expect(moved.turn!.log.filter((r) => r.kind === 'lost-check')).toHaveLength(1);
    expect(moved.explorers[0].chart).not.toBeNull();
    expect(moved.explorers[1].chart).toBeNull();
    expect(holderOf(moved, moved.explorers[1]).seat).toBe('bottom-1');
    // The evening: the leader's chart feeds both explorers.
    const evening = reduceOne(moved, event('turn/ended', { seat: 'top-1' }));
    expect(evening.explorers[0].lastMeal).toBeNull(); // not his turn: no meal for bottom-1 yet
    const bottomsEvening = reduce([...events, event('turn/ended', { seat: 'bottom-1' }), event('expedition/moved', { seat: 'top-1', path: ['c24r12'] }), event('turn/ended', { seat: 'top-1' }), event('turn/ended', { seat: 'bottom-1' })]);
    expect(bottomsEvening.explorers[0].lastMeal!.outcome).toMatch(/12 men ate/); // 10 bearers and two explorers
  });
  it('a member leaves with an agreed share; a leaving leader passes the rest to the next member', () => {
    const { events } = pooled();
    const together = reduce([...events, event('turn/ended', { seat: 'bottom-1' }), event('expedition/moved', { seat: 'top-1', path: ['c24r12'] })]);
    const split = reduceOne(together, event('expedition/split', { seat: 'top-1', take: { bearers: 3, food: 10 } }));
    expect(split.diagnostics).toEqual([]);
    expect(split.parties).toEqual({});
    expect(split.explorers.map((e) => [e.party, e.chart?.bearers, e.chart?.food])).toEqual([[null, 7, 50], [null, 3, 10]]);
    expect(split.turn!.log.at(-1)!.outcome).toBe('top-1 leaves the joint expedition with 3 bearers, 10 food');
    expect(reduceOne(together, event('expedition/split', { seat: 'top-1', take: { bearers: 11 } })).diagnostics.at(-1)?.reason).toBe('only 10 bearers to divide');
    const leaderLeaves = reduceOne({ ...together, turn: { ...together.turn!, current: 'bottom-1' } }, event('expedition/split', { seat: 'bottom-1', take: { bearers: 2 } }));
    expect(leaderLeaves.explorers.map((e) => [e.party, e.chart?.bearers, e.chart?.food])).toEqual([[null, 2, 0], [null, 8, 60]]);
  });
  it('expeditions meeting in a hex join forces into one chart', () => {
    // Seed 26 as scenario 025: both explorers walk into c24r12 on their own, then top-1 joins bottom-1.
    const base = [created('ABCDE', LAYOUT, 26, { main: [6, 6, 6, 6, 1, 1, 1, 1], natives: [6, 6, 6, 6] }), ...seatAndCommission('bottom-1'), ...seatAndCommission('top-1'), event('game/started', {})];
    const buy = { bearers: 5, food: 20 };
    const events = [
      ...base,
      event('voyage/booked', { seat: 'bottom-1', port: 'mombasa' }), event('turn/ended', { seat: 'bottom-1' }),
      event('voyage/booked', { seat: 'top-1', port: 'mombasa' }), event('turn/ended', { seat: 'top-1' }),
      event('expedition/outfitted', { seat: 'bottom-1', purchases: buy }), event('expedition/moved', { seat: 'bottom-1', path: ['c24r12'] }), event('turn/ended', { seat: 'bottom-1' }),
      event('expedition/outfitted', { seat: 'top-1', purchases: buy }), event('expedition/moved', { seat: 'top-1', path: ['c24r12'] })
    ];
    const s = reduce(events);
    expect(s.diagnostics).toEqual([]);
    const joined = reduceOne(s, event('expedition/joined', { seat: 'top-1', with: 'bottom-1' }));
    expect(joined.diagnostics).toEqual([]);
    expect(joined.parties).toEqual({ 1: { id: 1, leader: 'bottom-1', members: ['bottom-1', 'top-1'] } });
    expect(joined.explorers[0].chart).toMatchObject({ bearers: 10, food: s.explorers[0].chart!.food + 20 }); // both charts as one
    expect(joined.explorers[1].chart).toBeNull();
    expect(joined.turn!.log.at(-1)!.outcome).toContain("top-1 joins bottom-1's expedition: 2 explorers, 10 men");
    expect(reduceOne(joined, event('expedition/joined', { seat: 'top-1', with: 'bottom-1' })).diagnostics.at(-1)?.reason).toBe('already in a joint expedition');
    expect(reduceOne({ ...s, turn: { ...s.turn!, policy: 2 } }, event('expedition/joined', { seat: 'top-1', with: 'bottom-1' })).diagnostics.at(-1)?.reason).toContain('not while standing on the defensive');
    expect(addCharts(s.explorers[0].chart!, s.explorers[1].chart!).bearers).toBe(10);
    expect(subtractChart(s.explorers[0].chart!, { food: 5 })).toMatchObject({ rest: { food: s.explorers[0].chart!.food - 5 }, taken: { food: 5 } });
  });
  it('death leaves the party and the men stay with the companions', () => {
    const { events } = pooled();
    const together = reduce([...events, event('turn/ended', { seat: 'bottom-1' }), event('expedition/moved', { seat: 'top-1', path: ['c24r12'] })]);
    const gone = perish(together, together.explorers[0], 'died', 'test');
    expect(gone.parties).toEqual({});
    expect(gone.explorers[1]).toMatchObject({ party: null, chart: { bearers: 10 } });
    expect(partyOf(gone, gone.explorers[1])).toBeNull();
  });
});
