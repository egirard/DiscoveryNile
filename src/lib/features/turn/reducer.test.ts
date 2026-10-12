import { beforeEach, describe, expect, it } from 'vitest';
import { reduce } from '$lib/game/reduce';
import { created, event, resetSequence } from '$lib/game/test-fixtures';
import type { GameState } from '$lib/game/state';
import { card } from '$features/cards/deck';
import { currentExplorer, explorerSeats, PASSAGE_FARE } from './reducer';

beforeEach(resetSequence);

const LAYOUT = { bottom: 2, top: 2, left: 1, right: 1 };
const seatAndCommission = (seat: string, specialties: string[] = []) => [
  event('seat/taken', { seat, uid: `table:${seat}` }),
  event('explorer/commissioned', { seat, specialties })
];
const twoPlayers = (seed = 1234) => [created('ABCDE', LAYOUT, seed), ...seatAndCommission('bottom-1'), ...seatAndCommission('top-1'), event('game/started', {})];
const other = (s: GameState) => (s.turn!.current === 'bottom-1' ? 'top-1' : 'bottom-1');
const hand = (s: GameState, seat: string) => s.explorers.find((e) => e.seat === seat)!.hand;
const allCards = (s: GameState) => [...s.deck!.draw, ...s.deck!.discard, ...s.explorers.flatMap((e) => e.hand)];

describe('game/started', () => {
  it('rolls four dice per explorer, seats the high roller first, deals five each and the first player draws', () => {
    const s = reduce(twoPlayers());
    expect(s.diagnostics).toEqual([]);
    expect(Object.keys(s.rollOff!).sort()).toEqual(['bottom-1', 'top-1']);
    for (const attempts of Object.values(s.rollOff!)) for (const roll of attempts) expect(roll).toHaveLength(4);
    const total = (seat: string) => s.rollOff![seat].at(-1)!.reduce((a, b) => a + b, 0);
    expect(total(s.turn!.current)).toBeGreaterThan(total(other(s)));
    expect(s.turn!.order[0]).toBe(s.turn!.current);
    expect(s.turn).toMatchObject({ round: 1, phase: 'act' });
    expect(hand(s, s.turn!.current)).toHaveLength(6);
    expect(hand(s, other(s))).toHaveLength(5);
    expect(s.deck!.draw).toHaveLength(48 - 11);
    expect(new Set(allCards(s)).size).toBe(48);
    for (const e of s.explorers) for (const id of e.hand) expect(e.drawnRound[id]).toBe(1);
  });
  it('is deterministic for a seed and differs across seeds', () => {
    const a = reduce(twoPlayers(1234)), b = reduce(twoPlayers(1234)), c = reduce(twoPlayers(99));
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
  });
  it('re-rolls ties until one explorer is high (RQ-1)', () => {
    let found = false;
    for (let seed = 1; seed < 400 && !found; seed++) {
      const s = reduce(twoPlayers(seed));
      const attempts = Object.values(s.rollOff!).map((a) => a.length);
      if (Math.max(...attempts) > 1) {
        found = true;
        const total = (r: number[]) => r.reduce((a, b) => a + b, 0);
        expect(total(s.rollOff!['bottom-1'][0])).toBe(total(s.rollOff!['top-1'][0]));
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
  });
});

describe('turn/ended and the start of a Europe turn (rules §4)', () => {
  it('passes the turn clockwise, the next player draws, and the roll-off dice are cleared', () => {
    const s0 = reduce(twoPlayers());
    const first = s0.turn!.current, second = other(s0);
    const s1 = reduce([...twoPlayers(), event('turn/ended', { seat: first })]);
    expect(s1.diagnostics).toEqual([]);
    expect(s1.turn).toMatchObject({ current: second, round: 1, phase: 'act' });
    expect(hand(s1, second)).toHaveLength(6);
    expect(s1.rollOff).toBeNull();
    expect(s1.deck!.draw).toHaveLength(48 - 12);
  });
  it('starts a new round when the order wraps and expires tickets drawn before this round', () => {
    const s0 = reduce(twoPlayers());
    const first = s0.turn!.current, second = other(s0);
    const s2 = reduce([...twoPlayers(), event('turn/ended', { seat: first }), event('turn/ended', { seat: second })]);
    expect(s2.turn).toMatchObject({ current: first, round: 2 });
    const openingTickets = hand(s0, first).filter((id) => card(id).donation.kind === 'ticket');
    for (const id of openingTickets) {
      expect(hand(s2, first)).not.toContain(id);
      expect(s2.deck!.discard).toContain(id);
    }
    expect(new Set(allCards(s2)).size).toBe(48);
  });
  it('rejects ending out of turn or before the game starts', () => {
    const s = reduce([created('ABCDE', LAYOUT, 1), ...seatAndCommission('bottom-1'), event('turn/ended', { seat: 'bottom-1' }), event('game/started', {}), event('turn/ended', { seat: 'top-1' })]);
    expect(s.diagnostics.map((d) => d.reason)).toEqual(['game not started', "it is not top-1's turn"]);
  });
  it('holds the hand limit: over five cards means choosing discards before the draw', () => {
    // Find a seed where the first player reaches round 2 with more than five non-ticket cards.
    let events: ReturnType<typeof event>[] | null = null;
    for (let seed = 1; seed < 500 && !events; seed++) {
      resetSequence();
      const base = twoPlayers(seed);
      const s0 = reduce(base);
      const first = s0.turn!.current, second = other(s0);
      const s2 = reduce([...base, event('turn/ended', { seat: first }), event('turn/ended', { seat: second })]);
      if (s2.turn!.phase === 'discard') events = [...base, event('turn/ended', { seat: first }), event('turn/ended', { seat: second })];
    }
    expect(events).not.toBeNull();
    const s2 = reduce(events!);
    const first = s2.turn!.current;
    expect(hand(s2, first)).toHaveLength(6);
    const chosen = hand(s2, first)[0];
    const blocked = reduce([...events!, event('turn/ended', { seat: first })]);
    expect(blocked.diagnostics.at(-1)?.reason).toBe('cannot end the turn while discarding');
    const bad = reduce([...events!, event('cards/discarded', { seat: first, cardIds: ['card-99'] })]);
    expect(bad.diagnostics.at(-1)?.reason).toBe('cards/discarded needs cards from the hand');
    const s3 = reduce([...events!, event('cards/discarded', { seat: first, cardIds: [chosen] })]);
    expect(s3.diagnostics).toEqual([]);
    expect(s3.turn!.phase).toBe('act');
    expect(hand(s3, first)).toHaveLength(6); // five kept, one drawn
    expect(hand(s3, first)).not.toContain(chosen);
    expect(s3.deck!.discard).toContain(chosen);
    const idle = reduce([...events!, event('cards/discarded', { seat: first, cardIds: [chosen] }), event('cards/discarded', { seat: first, cardIds: [hand(s3, first)[0]] })]);
    expect(idle.diagnostics.at(-1)?.reason).toBe('no discard is pending');
  });
  it('reshuffles the discards under the draw pile when it runs out', () => {
    const base = twoPlayers(7);
    const events = [...base];
    let s = reduce(events);
    for (let i = 0; i < 90 && s.deck!.draw.length > 0; i++) {
      const seat = s.turn!.current;
      if (s.turn!.phase === 'discard') events.push(event('cards/discarded', { seat, cardIds: [hand(s, seat)[0]] }));
      else events.push(event('turn/ended', { seat }));
      s = reduce(events);
    }
    expect(s.deck!.draw).toHaveLength(0);
    const before = s.deck!.discard.length;
    expect(before).toBeGreaterThan(0);
    const seat = s.turn!.current;
    events.push(s.turn!.phase === 'discard' ? event('cards/discarded', { seat, cardIds: [hand(s, seat)[0]] }) : event('turn/ended', { seat }));
    s = reduce(events);
    expect(s.diagnostics).toEqual([]);
    expect(s.deck!.draw.length + s.deck!.discard.length).toBeLessThan(before + 2);
    expect(new Set(allCards(s)).size).toBe(48);
    expect(currentExplorer(s)).toBeDefined();
  });
});

describe('voyage/booked (rules §5)', () => {
  const cash = (s: GameState, seat: string) => hand(s, seat).reduce((sum, id) => sum + (card(id).donation.kind === 'money' ? (card(id).donation as { amount: number }).amount : 0), 0);
  /** The first seed (from 1) whose started game satisfies the predicate for the first player. */
  const seedWhere = (pred: (s: GameState, first: string) => boolean) => {
    for (let seed = 1; seed < 500; seed++) {
      resetSequence();
      const s = reduce(twoPlayers(seed));
      if (pred(s, s.turn!.current)) return seed;
    }
    throw new Error('no seed found');
  };
  const setup = (seed: number) => {
    resetSequence();
    const base = twoPlayers(seed);
    const s0 = reduce(base);
    return { base, first: s0.turn!.current, second: other(s0), s0 };
  };
  it('turns the hand into a budget less the $500 fare and puts the explorer at sea', () => {
    const { base, first, s0 } = setup(seedWhere((s, f) => cash(s, f) >= PASSAGE_FARE));
    const s = reduce([...base, event('voyage/booked', { seat: first, port: 'mombasa' })]);
    expect(s.diagnostics).toEqual([]);
    const e = s.explorers.find((x) => x.seat === first)!;
    expect(e.location).toEqual({ kind: 'voyage', port: 'mombasa' });
    expect(e.money).toBe(cash(s0, first) - PASSAGE_FARE);
    expect(e.hand).toEqual([]);
    expect(s.deck!.discard).toHaveLength(6);
    expect(new Set(allCards(s)).size).toBe(48);
  });
  it('sails free with a ticket to that port and keeps the whole budget', () => {
    const { base, first, s0 } = setup(seedWhere((s, f) => hand(s, f).some((id) => card(id).donation.kind === 'ticket')));
    const ticket = hand(s0, first).find((id) => card(id).donation.kind === 'ticket')!;
    const port = (card(ticket).donation as { port: string }).port;
    const s = reduce([...base, event('voyage/booked', { seat: first, port, ticketCardId: ticket })]);
    expect(s.diagnostics).toEqual([]);
    expect(s.explorers.find((x) => x.seat === first)!.money).toBe(cash(s0, first));
    const wrong = reduce([...base, event('voyage/booked', { seat: first, port: port === 'mombasa' ? 'brass' : 'mombasa', ticketCardId: ticket })]);
    expect(wrong.diagnostics.at(-1)?.reason).toMatch(/not a free ticket/);
  });
  it('rejects sailing out of turn, to an unknown port, without the fare, or when not in Europe', () => {
    const rich = setup(seedWhere((s, f) => cash(s, f) >= PASSAGE_FARE));
    expect(reduce([...rich.base, event('voyage/booked', { seat: rich.second, port: 'mombasa' })]).diagnostics.at(-1)?.reason).toBe(`it is not ${rich.second}'s turn`);
    expect(reduce([...rich.base, event('voyage/booked', { seat: rich.first, port: 'atlantis' })]).diagnostics.at(-1)?.reason).toBe('voyage/booked needs a port of entry');
    expect(reduce([...rich.base, event('voyage/booked', { seat: rich.first, port: 'mombasa' }), event('voyage/booked', { seat: rich.first, port: 'kilwa' })]).diagnostics.at(-1)?.reason).toBe('the explorer is not in Europe');
    const poor = setup(seedWhere((s, f) => cash(s, f) < PASSAGE_FARE));
    expect(reduce([...poor.base, event('voyage/booked', { seat: poor.first, port: 'mombasa' })]).diagnostics.at(-1)?.reason).toBe(`passage costs $500; only $${cash(poor.s0, poor.first)} raised`);
  });
  it('skips the next turn at sea: the explorer lands at the port and the turn passes on', () => {
    const { base, first, second } = setup(seedWhere((s, f) => cash(s, f) >= PASSAGE_FARE));
    const events = [...base, event('voyage/booked', { seat: first, port: 'mombasa' }), event('turn/ended', { seat: first }), event('turn/ended', { seat: second })];
    const s = reduce(events);
    expect(s.diagnostics).toEqual([]);
    expect(s.explorers.find((x) => x.seat === first)!.location).toEqual({ kind: 'port', port: 'mombasa' });
    expect(s.turn).toMatchObject({ current: second, round: 2 });
    const s2 = reduce([...events, event('turn/ended', { seat: second })]);
    expect(s2.turn).toMatchObject({ current: first, round: 3, phase: 'act' });
    expect(s2.explorers.find((x) => x.seat === first)!.hand).toEqual([]);
  });
});

describe('expedition/outfitted (rules §5)', () => {
  const cash = (s: GameState, seat: string) => hand(s, seat).reduce((sum, id) => sum + (card(id).donation.kind === 'money' ? (card(id).donation as { amount: number }).amount : 0), 0);
  /** Seed 5: the first player (bottom-1) holds $1100 and tickets to Port Elizabeth and Durban. */
  const landed = (port = 'port-elizabeth') => {
    resetSequence();
    const base = twoPlayers(5);
    const s0 = reduce(base);
    const first = s0.turn!.current, second = other(s0);
    const ticket = hand(s0, first).find((id) => card(id).donation.kind === 'ticket' && (card(id).donation as { port: string }).port === port)!;
    const events = [...base, event('voyage/booked', { seat: first, port, ticketCardId: ticket }), event('turn/ended', { seat: first }), event('turn/ended', { seat: second }), event('turn/ended', { seat: second })];
    const s = reduce(events);
    expect(s.turn).toMatchObject({ current: first, round: 3 });
    expect(s.explorers.find((e) => e.seat === first)!.location).toEqual({ kind: 'port', port });
    return { events, first, second, budget: cash(s0, first) };
  };
  const canoeExpedition = { canoes: 2, bearers: 16, guides: 1, askaris: 6, muskets: 4, gifts: 50, food: 125 };
  it('records the chart and forfeits the unspent budget', () => {
    const { events, first, budget } = landed();
    expect(budget).toBe(1100);
    const s = reduce([...events, event('expedition/outfitted', { seat: first, purchases: canoeExpedition })]);
    expect(s.diagnostics).toEqual([]);
    const e = s.explorers.find((x) => x.seat === first)!;
    expect(e.chart).toEqual({ ...canoeExpedition, camels: 0, horses: 0, water: 0, guideHomes: { c14r36: 1 } });
    expect(e.money).toBe(0);
  });
  it('sells horses at the Cape and refuses camels there; refuses overspending and bad counts', () => {
    const { events, first } = landed();
    expect(reduce([...events, event('expedition/outfitted', { seat: first, purchases: { horses: 2 } })]).diagnostics).toEqual([]);
    expect(reduce([...events, event('expedition/outfitted', { seat: first, purchases: { camels: 1 } })]).diagnostics.at(-1)?.reason).toBe('camels are not sold at port-elizabeth');
    expect(reduce([...events, event('expedition/outfitted', { seat: first, purchases: { askaris: 30 } })]).diagnostics.at(-1)?.reason).toBe('the expedition costs $1500; the budget is $1100');
    expect(reduce([...events, event('expedition/outfitted', { seat: first, purchases: { food: -1 } })]).diagnostics.at(-1)?.reason).toBe('bad count for food');
    expect(reduce([...events, event('expedition/outfitted', { seat: first, purchases: { food: 1.5 } })]).diagnostics.at(-1)?.reason).toBe('bad count for food');
  });
  it('rejects outfitting out of turn, away from a port, or twice', () => {
    const { events, first, second } = landed();
    expect(reduce([...events, event('expedition/outfitted', { seat: second, purchases: {} })]).diagnostics.at(-1)?.reason).toBe(`it is not ${second}'s turn`);
    const twice = reduce([...events, event('expedition/outfitted', { seat: first, purchases: {} }), event('expedition/outfitted', { seat: first, purchases: {} })]);
    expect(twice.diagnostics.at(-1)?.reason).toBe('the expedition is already outfitted');
    resetSequence();
    const inEurope = reduce([...twoPlayers(5), event('expedition/outfitted', { seat: 'bottom-1', purchases: {} })]);
    expect(inEurope.diagnostics.at(-1)?.reason).toBe('the explorer is not at a port of entry');
  });
});
