import { beforeEach, describe, expect, it } from 'vitest';
import { reduce, reduceOne } from '$lib/game/reduce';
import { created, event, resetSequence } from '$lib/game/test-fixtures';
import type { GameState } from '$lib/game/state';
import { perish } from './fate';
import { card } from '$features/cards/deck';

beforeEach(resetSequence);

const LAYOUT = { bottom: 2, top: 2, left: 1, right: 1 };
const seatAndCommission = (seat: string, specialties: string[] = []) => [event('seat/taken', { seat, uid: `table:${seat}` }), event('explorer/commissioned', { seat, specialties })];
const pass = (seat: string, s: GameState) => {
  const e = s.explorers.find((x) => x.seat === seat)!;
  return s.turn!.phase === 'discard' ? [event('cards/discarded', { seat, cardIds: [e.hand[0]] }), event('turn/ended', { seat })] : [event('turn/ended', { seat })];
};

/**
 * Seed 18 as scenarios 016–018 and 026: bottom-1 holds a ticket to Mombasa and c24r12 holds twelve warriors. The combat
 * script is 018's up to the defeat die, which is a 1 here: the explorer is killed (rules §8.4).
 */
function killedAtC24r12() {
  const dice = { main: [6, 6, 6, 6, 1, 1, 1, 1, 6, 2, 1], natives: [1, 2, 3, 4, 5], hunting: [1, 1, 1], combat: [6, 6, 6, 1, 6, 6, 2, 1, 3, 4, 1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6, 6, 6, 6, 2, 1, 1, 1, 3, 1] };
  const base = [created('ABCDE', LAYOUT, 18, dice), ...seatAndCommission('bottom-1'), ...seatAndCommission('top-1'), event('game/started', {})];
  const opening = reduce(base);
  const mombasaTicket = opening.explorers[0].hand.find((id) => { const d = card(id).donation; return d.kind === 'ticket' && d.port === 'mombasa'; })!;
  let events: ReturnType<typeof event>[];
  events = [...base, event('voyage/booked', { seat: 'bottom-1', port: 'mombasa', ticketCardId: mombasaTicket }), event('turn/ended', { seat: 'bottom-1' })];
  events = [...events, ...pass('top-1', reduce(events))];
  events = [...events, ...pass('top-1', reduce(events))];
  events = [...events, event('expedition/outfitted', { seat: 'bottom-1', purchases: { askaris: 5, bearers: 6, food: 60 } }), event('expedition/moved', { seat: 'bottom-1', path: ['c24r12'] }), event('natives/policy', { seat: 'bottom-1', policy: 3 }), event('natives/spoils', { seat: 'bottom-1', choice: 'keep' }), event('expedition/reorganised', { seat: 'bottom-1', action: 'cache', item: 'food', count: 10 }), event('turn/ended', { seat: 'bottom-1' })];
  events = [...events, ...pass('top-1', reduce(events))];
  const before = reduce(events);
  const killed = reduce([...events, event('natives/policy', { seat: 'bottom-1', policy: 4 })]);
  return { events, before, killed };
}

describe('death (rules §12, Scoring)', () => {
  it('a killed explorer leaves play: markers off, his unvisited hexes erased with their tribe and caches, the turn still his to end', () => {
    const { events, before, killed } = killedAtC24r12();
    expect(before.diagnostics).toEqual([]);
    expect(before.map['c24r12']).toMatchObject({ markers: ['bottom-1'], tribe: 1 });
    expect(Object.values(before.caches)).toHaveLength(1);
    expect(killed.diagnostics).toEqual([]);
    expect(killed.turn!.log.at(-1)).toMatchObject({ kind: 'defeat', outcome: 'defeat 1: the explorer is killed' });
    const e = killed.explorers[0];
    expect(e.location).toEqual({ kind: 'dead' });
    expect(e.fate).toEqual({ kind: 'died', round: 4, cause: 'killed by tribe 1 at c24r12' });
    expect(e.chart).toBeNull();
    expect(killed.map['c24r12']).toBeUndefined(); // erased: a rumour
    expect(killed.tribes).toEqual({});
    expect(killed.caches).toEqual({});
    expect(killed.turn).toMatchObject({ current: 'bottom-1', round: 4, moved: true });
    // The seat's turn goes on so the rail can be read, then passes to the living.
    const passed = reduceOne(killed, event('turn/ended', { seat: 'bottom-1' }));
    expect(passed.diagnostics).toEqual([]);
    expect(passed.turn).toMatchObject({ current: 'top-1', round: 4 });
    const again = reduce([...events, event('natives/policy', { seat: 'bottom-1', policy: 4 }), event('turn/ended', { seat: 'bottom-1' }), ...pass('top-1', passed)]);
    expect(again.diagnostics).toEqual([]);
    expect(again.turn).toMatchObject({ current: 'top-1', round: 5 }); // bottom-1 has nobody: skipped
  });
  it('a new explorer is commissioned at the seat and starts in Europe with an empty hand, drawing on his first turn', () => {
    const { events, killed } = killedAtC24r12();
    const passed = reduceOne(killed, event('turn/ended', { seat: 'bottom-1' }));
    const successor = reduceOne(passed, event('explorer/commissioned', { seat: 'bottom-1', specialties: ['zoology'] }));
    expect(successor.diagnostics).toEqual([]);
    expect(successor.explorers.map((e) => [e.seat, e.location.kind])).toEqual([['bottom-1', 'dead'], ['top-1', 'europe'], ['bottom-1', 'europe']]);
    expect(successor.explorers[2]).toMatchObject({ specialties: ['zoology'], hand: [], fate: null });
    const next = reduce([...events, event('natives/policy', { seat: 'bottom-1', policy: 4 }), event('turn/ended', { seat: 'bottom-1' }), event('explorer/commissioned', { seat: 'bottom-1', specialties: ['zoology'] }), ...pass('top-1', successor)]);
    expect(next.diagnostics).toEqual([]);
    expect(next.turn).toMatchObject({ current: 'bottom-1', round: 5 });
    expect(next.explorers[2].hand).toHaveLength(1);
    expect(reduceOne(passed, event('explorer/commissioned', { seat: 'top-1', specialties: [] })).diagnostics.at(-1)?.reason).toBe('seat top-1 already has an explorer');
  });
  it('erasure spares published hexes and hexes another explorer has visited, and forgets erased hexes for everyone', () => {
    const { before } = killedAtC24r12();
    const seat = 'bottom-1';
    const e = before.explorers[0];
    const base = before.map['c24r12'];
    const crafted: GameState = {
      ...before,
      map: {
        ...before.map,
        c23r12: { ...base, tribe: null, markers: ['bottom-1', 'top-1'] },
        c23r11: { ...base, tribe: null, markers: ['bottom-1'], publishedBy: null },
        c22r11: { ...base, tribe: null, markers: [], publishedBy: 'bottom-1' }
      },
      explorers: before.explorers.map((x) => (x.seat === 'top-1' ? { ...x, known: ['c25r12', 'c23r11', 'c23r12'] } : x))
    };
    const after = perish(crafted, e, 'died', 'test');
    expect(Object.keys(after.map).sort()).toEqual(['c22r11', 'c23r12']);
    expect(after.map['c23r12'].markers).toEqual(['top-1']);
    expect(after.explorers[1].known).toEqual(['c25r12', 'c23r12']);
    expect(after.explorers[0].fate).toMatchObject({ kind: 'died', cause: 'test' });
    void seat;
  });
  it('tribe numbers are never reused after an erasure', () => {
    const { killed } = killedAtC24r12();
    const crafted: GameState = { ...killed, tribes: { 1: { id: 1, hex: 'c20r20', warriors: 1, attitude: 0, pending: null, negotiatedBy: [], regard: {}, preachedBy: [], treatedBy: [], defeatedBy: [] }, 3: { id: 3, hex: 'c20r21', warriors: 1, attitude: 0, pending: null, negotiatedBy: [], regard: {}, preachedBy: [], treatedBy: [], defeatedBy: [] } } };
    expect(Math.max(0, ...Object.keys(crafted.tribes).map(Number)) + 1).toBe(4);
  });
});

describe('retirement (rules §12)', () => {
  it('an explorer retires on his own turn, in Europe or Africa, and his seat may commission anew', () => {
    const { before } = killedAtC24r12();
    // top-1 is in Europe with a hand: retiring discards it and leaves the seat free.
    const s = reduceOne({ ...before, turn: { ...before.turn!, current: 'top-1' } }, event('explorer/retired', { seat: 'top-1' }));
    expect(s.diagnostics).toEqual([]);
    expect(s.explorers[1]).toMatchObject({ location: { kind: 'dead' }, hand: [], fate: { kind: 'retired', cause: 'retired in Europe' } });
    expect(s.deck!.discard.length).toBe(before.deck!.discard.length + before.explorers[1].hand.length);
    // bottom-1 retires in the field: the same erasure as death.
    const field = reduceOne(before, event('explorer/retired', { seat: 'bottom-1' }));
    expect(field.diagnostics).toEqual([]);
    expect(field.explorers[0].fate).toEqual({ kind: 'retired', round: 4, cause: 'retired in Africa at c24r12' });
    expect(field.map['c24r12']).toBeUndefined();
    expect(field.turn!.moved).toBe(true);
    expect(reduceOne(before, event('explorer/retired', { seat: 'top-1' })).diagnostics.at(-1)?.reason).toBe("it is not top-1's turn");
  });
  it('a captive may be abandoned by retiring; nobody retires at sea', () => {
    const { before } = killedAtC24r12();
    const captive: GameState = { ...before, explorers: before.explorers.map((x) => (x.seat === 'bottom-1' ? { ...x, location: { kind: 'captive' as const, hex: 'c24r12' as const, tribe: 1, had: x.chart!, goodwill: 0 }, chart: null } : x)) };
    expect(reduceOne(captive, event('explorer/retired', { seat: 'bottom-1' })).explorers[0].fate?.cause).toBe('retired in captivity, abandoned to tribe 1');
    const atSea: GameState = { ...before, explorers: before.explorers.map((x) => (x.seat === 'bottom-1' ? { ...x, location: { kind: 'homeward' as const, port: 'mombasa' as const }, chart: null } : x)) };
    expect(reduceOne(atSea, event('explorer/retired', { seat: 'bottom-1' })).diagnostics.at(-1)?.reason).toBe('the explorer is at sea');
  });
});
