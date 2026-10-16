import { beforeEach, describe, expect, it } from 'vitest';
import { reduce } from '$lib/game/reduce';
import { created, event, resetSequence } from '$lib/game/test-fixtures';
import { rngScripted } from '$lib/game/random';
import { oasisSearch, oasisSearchable } from '$features/exploration/reducer';
import type { MappedHex } from '$lib/game/state';

beforeEach(resetSequence);

const LAYOUT = { bottom: 2, top: 2, left: 1, right: 1 };
const seatAndCommission = (seat: string) => [event('seat/taken', { seat, uid: `table:${seat}` }), event('explorer/commissioned', { seat, specialties: [] })];
// Seed 2 (shared with scenario 015): bottom-1 pays passage to Khartoum and keeps $750; the first two disaster
// cards drawn in the desert are for the mountain and the jungle. Hunting dice scripted 1,1: no game.
const SCRIPT = { main: [6, 6, 6, 6, 1, 1, 1, 1], hunting: [1, 1] };
const CARAVAN = { bearers: 10, askaris: 2, camels: 3, food: 30 }; // 30 rations and 30 water at four each: what the nine free bearers and three led camels carry (prompt 43)

function atKhartoum() {
  const base = [created('ABCDE', LAYOUT, 2, SCRIPT), ...seatAndCommission('bottom-1'), ...seatAndCommission('top-1'), event('game/started', {})];
  const pass = (seat: string, s: ReturnType<typeof reduce>) => {
    const e = s.explorers.find((x) => x.seat === seat)!;
    return s.turn!.phase === 'discard' ? [event('cards/discarded', { seat, cardIds: [e.hand[0]] }), event('turn/ended', { seat })] : [event('turn/ended', { seat })];
  };
  let events = [...base, event('voyage/booked', { seat: 'bottom-1', port: 'khartoum' }), event('turn/ended', { seat: 'bottom-1' })];
  events = [...events, ...pass('top-1', reduce(events))];
  events = [...events, ...pass('top-1', reduce(events))];
  events = [...events, event('expedition/outfitted', { seat: 'bottom-1', purchases: CARAVAN })];
  return { events, pass };
}

describe('water/taken and the desert camp', () => {
  it('takes water for nothing where there is water, never below zero, and only on the player\'s turn', () => {
    const { events } = atKhartoum();
    const s = reduce([...events, event('water/taken', { seat: 'bottom-1', rations: 10 }), event('water/taken', { seat: 'bottom-1', rations: 10 }), event('water/taken', { seat: 'bottom-1', rations: 10 })]);
    expect(s.diagnostics).toEqual([]);
    expect(s.explorers[0].chart!.water).toBe(30);
    const reason = (payload: Record<string, unknown>) => reduce([...events, event('water/taken', payload)]).diagnostics.at(-1)?.reason;
    expect(reason({ seat: 'top-1', rations: 10 })).toBe("it is not top-1's turn");
    expect(reason({ seat: 'bottom-1', rations: -10 })).toBe('only 0 water rations to pour out');
    expect(reason({ seat: 'bottom-1', rations: 0 })).toBe('water/taken needs a whole number of rations');
  });
  it('in a dry desert hex the evening costs water; without enough, men and animals die', () => {
    const { events, pass } = atKhartoum();
    const toDesert = [...events, ...Array(3).fill(0).map(() => event('water/taken', { seat: 'bottom-1', rations: 10 })), event('expedition/moved', { seat: 'bottom-1', path: ['c21r1'] })];
    const inDesert = reduce(toDesert);
    expect(inDesert.diagnostics).toEqual([]);
    const dry = reduce([...toDesert, event('water/taken', { seat: 'bottom-1', rations: 10 })]);
    expect(dry.diagnostics.at(-1)?.reason).toBe('there is no water here');
    const r3 = reduce([...toDesert, event('turn/ended', { seat: 'bottom-1' })]);
    const e3 = r3.explorers[0];
    expect(e3.chart).toMatchObject({ food: 17, water: 5, bearers: 10, camels: 3 });
    expect(e3.lastMeal!.outcome).toBe('no game, 13 men ate (13 from the stores); drank 25 water, 5 left');
    const ev4 = [...toDesert, event('turn/ended', { seat: 'bottom-1' })];
    const r4 = reduce([...ev4, ...pass('top-1', r3), event('turn/ended', { seat: 'bottom-1' })]);
    const e4 = r4.explorers[0];
    expect(e4.chart).toMatchObject({ bearers: 2, askaris: 2, camels: 0, water: 0, food: 34 });
    expect(e4.lastMeal!.outcome).toBe('no game, 13 men ate (13 from the stores); drank 5 water, 8 bearers died of thirst, 3 camels shot for want of water (30 rations)');
    expect(e4.sick.explorer).toBe(false);
  });
});

describe('a later explorer\'s oasis search (rules §7.4)', () => {
  const hex = (oasis: boolean): MappedHex => ({ terrain: 'desert', markers: ['bottom-1'], river: null, oasis, oasisKnownTo: oasis ? ['bottom-1'] : [], peakFeet: null, tribe: null, nativesCheckedBy: [], publishedBy: null });
  it('rolls on the water stream: an even roll finds an oasis that exists; nothing is found where there is none', () => {
    expect(oasisSearchable(hex(true), 'top-1')).toBe(true);
    expect(oasisSearchable(hex(true), 'bottom-1')).toBe(false);
    const found = oasisSearch(rngScripted(1, { water: [4] }), hex(true), 'top-1');
    expect(found.found).toBe(true);
    expect(found.hex.oasisKnownTo).toEqual(['bottom-1', 'top-1']);
    expect(oasisSearch(rngScripted(1, { water: [3] }), hex(true), 'top-1').found).toBe(false);
    const none = oasisSearch(rngScripted(1, { water: [4] }), hex(false), 'top-1');
    expect(none.found).toBe(false);
    expect(none.rolls).toEqual([{ label: 'oasis', value: 4 }]);
  });
});
