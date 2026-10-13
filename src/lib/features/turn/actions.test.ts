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
const actions = (s: ReturnType<typeof reduce>, seat = 'bottom-1') => s.turn!.log.filter((r) => r.seat === seat && r.kind === 'action').map((r) => r.outcome);

// Seed 863 (as scenario 023): bottom-1 pays passage to Mombasa and keeps $700.
const base = () => [created('ABCDE', LAYOUT, 863, { main: [6, 6, 6, 6, 1, 1, 1, 1], hunting: [1, 1, 1] }), ...seatAndCommission('bottom-1'), ...seatAndCommission('top-1'), event('game/started', { seat: 'bottom-1' })];

describe("the turn's log of actions that rolled nothing (prompts 13 and 16)", () => {
  it('a turn in Europe opens with the card drawn, and booking passage is logged', () => {
    const started = reduce(base());
    expect(started.turn!.current).toBe('bottom-1');
    const drawn = started.explorers[0].hand.at(-1)!;
    expect(actions(started)).toEqual([`drew ${describeCard(drawn)}`]);
    const booked = reduce([...base(), event('voyage/booked', { seat: 'bottom-1', port: 'mombasa' })]);
    expect(booked.diagnostics).toEqual([]);
    expect(actions(booked)).toEqual([`drew ${describeCard(drawn)}`, 'booked passage to Mombasa for $500']);
    expect(booked.turn!.log.at(-1)).toMatchObject({ kind: 'action', seat: 'bottom-1', rolls: [] });
    expect(booked.turn!.log.at(-1)!.hex).toBeUndefined();
  });
  it('outfitting and a step through known country are logged; an undo takes the line away', () => {
    let events = [...base(), event('voyage/booked', { seat: 'bottom-1', port: 'mombasa' }), event('turn/ended', { seat: 'bottom-1' })];
    events = [...events, ...pass('top-1', reduce(events))];
    events = [...events, ...pass('top-1', reduce(events))];
    const outfit = event('expedition/outfitted', { seat: 'bottom-1', purchases: { askaris: 5, bearers: 15, food: 100, muskets: 5 } });
    const outfitted = reduce([...events, outfit]);
    expect(outfitted.diagnostics).toEqual([]);
    expect(actions(outfitted)).toEqual(['outfitted at Mombasa: 15 bearers, 5 askaris, 5 muskets, 100 rations']);
    expect(outfitted.turn!.log.at(-1)!.hex).toBe('c25r12'); // Mombasa
    expect(outfitted.undo).toMatchObject({ seat: 'bottom-1', type: 'expedition/outfitted' });
    const undone = reduce([...events, outfit, event('turn/undone', { seat: 'bottom-1', eventId: outfit.id })]);
    expect(undone.diagnostics).toEqual([]);
    expect(actions(undone)).toEqual([]);
    // c25r11 is pre-printed veldt: a step into known country rolls nothing and is a line of its own.
    const stepped = reduce([...events, outfit, event('expedition/moved', { seat: 'bottom-1', path: ['c25r11'] })]);
    expect(stepped.diagnostics).toEqual([]);
    expect(actions(stepped)).toEqual(['outfitted at Mombasa: 15 bearers, 5 askaris, 5 muskets, 100 rations', 'moved to c25r11']);
    expect(stepped.turn!.log.at(-1)).toMatchObject({ kind: 'action', hex: 'c25r11', rolls: [] });
  });
  it('describes every card: a donation, a free ticket', () => {
    expect(describeCard('card-1')).toMatch(/^\$\d+|^a free ticket to /);
  });
});
