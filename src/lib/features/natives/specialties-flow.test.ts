import { beforeEach, describe, expect, it } from 'vitest';
import { reduce } from '$lib/game/reduce';
import { created, event, resetSequence } from '$lib/game/test-fixtures';
import { card } from '$features/cards/deck';
import { moveTargets } from '$features/exploration/reducer';

beforeEach(resetSequence);

const LAYOUT = { bottom: 2, top: 2, left: 1, right: 1 };
const commission = (seat: string, specialties: string[]) => [event('seat/taken', { seat, uid: `table:${seat}` }), event('explorer/commissioned', { seat, specialties })];
// Seed 18 (as scenarios 016–020, shared with 022): bottom-1, a zoologist and missionary, holds a ticket to Mombasa;
// c24r12 holds 12 warriors. Combat: reaction 1,1,1 (calm to policy 5); offer 3,6 (satisfied); prices 3,2,4,1; next turn
// reaction 1,1,1. Specialty dice: preaching 6 (the chief asks to be baptised); zoology 2 (a specimen on the veldt).
const SCRIPT = { main: [6, 6, 6, 6, 1, 1, 1, 1, 6, 2, 1], natives: [1, 2, 3, 4, 5], hunting: [1, 1], combat: [1, 1, 1, 3, 6, 3, 2, 4, 1, 1, 1, 1], specialty: [6, 2] };

function atTheTribe(script = SCRIPT, specialties = ['zoology', 'evangelism']) {
  const base = [created('ABCDE', LAYOUT, 18, script), ...commission('bottom-1', specialties), ...commission('top-1', []), event('game/started', {})];
  const s0 = reduce(base);
  const ticket = s0.explorers[0].hand.find((id) => card(id).donation.kind === 'ticket' && (card(id).donation as { port: string }).port === 'mombasa')!;
  const pass = (seat: string, s: ReturnType<typeof reduce>) => {
    const e = s.explorers.find((x) => x.seat === seat)!;
    return s.turn!.phase === 'discard' ? [event('cards/discarded', { seat, cardIds: [e.hand[0]] }), event('turn/ended', { seat })] : [event('turn/ended', { seat })];
  };
  let events = [...base, event('voyage/booked', { seat: 'bottom-1', port: 'mombasa', ticketCardId: ticket }), event('turn/ended', { seat: 'bottom-1' })];
  events = [...events, ...pass('top-1', reduce(events))];
  events = [...events, ...pass('top-1', reduce(events))];
  events = [...events, event('expedition/outfitted', { seat: 'bottom-1', purchases: { askaris: 5, bearers: 6, food: 40, gifts: 20 } }), event('expedition/moved', { seat: 'bottom-1', path: ['c24r12'] }), event('natives/policy', { seat: 'bottom-1', policy: 5 }), event('natives/offered', { seat: 'bottom-1', gifts: 2 })];
  return { events, pass };
}

describe('specialties in the field (rules §9)', () => {
  it('a missionary must preach once the chief permits; the attitude moves and the points are kept', () => {
    const { events } = atTheTribe();
    const permitted = reduce(events);
    expect(permitted.turn!.phase).toBe('trade');
    expect(reduce([...events, event('natives/done', { seat: 'bottom-1' })]).diagnostics.at(-1)?.reason).toBe('the missionary must preach first');
    const preached = reduce([...events, event('specialty/performed', { seat: 'bottom-1', specialty: 'evangelism' })]);
    expect(preached.diagnostics).toEqual([]);
    expect(preached.turn!.log.at(-1)).toMatchObject({ kind: 'specialty', outcome: 'the chief asks to be baptised (attitude +5)' });
    expect(preached.tribes[1]).toMatchObject({ attitude: 5, preachedBy: ['bottom-1'] });
    expect(preached.explorers[0].goodWorks).toEqual({ evangelism: 5, medicine: 0 });
    expect(reduce([...events, event('specialty/performed', { seat: 'bottom-1', specialty: 'evangelism' }), event('specialty/performed', { seat: 'bottom-1', specialty: 'evangelism' })]).diagnostics.at(-1)?.reason).toBe('the missionary has preached here already');
    expect(reduce([...events, event('specialty/performed', { seat: 'bottom-1', specialty: 'medicine' })]).diagnostics.at(-1)?.reason).toBe('the explorer is no doctor');
    expect(reduce([...events, event('specialty/performed', { seat: 'bottom-1', specialty: 'evangelism' }), event('natives/done', { seat: 'bottom-1' })]).turn!.phase).toBe('act');
  });
  it('a zoologist owes the hex a turn of study before moving on; a specimen weighs a ration', () => {
    const { events, pass } = atTheTribe();
    const ev3 = [...events, event('specialty/performed', { seat: 'bottom-1', specialty: 'evangelism' }), event('natives/done', { seat: 'bottom-1' }), event('turn/ended', { seat: 'bottom-1' })];
    const ev4 = [...ev3, ...pass('top-1', reduce(ev3)), event('natives/policy', { seat: 'bottom-1', policy: 4 })];
    const s4 = reduce(ev4);
    expect(s4.diagnostics).toEqual([]);
    expect(s4.turn).toMatchObject({ round: 4, phase: 'act', moved: false });
    expect(s4.explorers[0].research).toEqual({ hex: 'c24r12', done: [] });
    expect(moveTargets(s4, s4.explorers[0])).toEqual([]);
    expect(reduce([...ev4, event('expedition/moved', { seat: 'bottom-1', path: ['c25r12'] })]).diagnostics.at(-1)?.reason).toBe('the naturalist must study this hex first');
    expect(reduce([...ev4, event('specialty/performed', { seat: 'bottom-1', specialty: 'geology' })]).diagnostics.at(-1)?.reason).toBe('the explorer is no geologist');
    const studied = reduce([...ev4, event('specialty/performed', { seat: 'bottom-1', specialty: 'zoology' })]);
    expect(studied.diagnostics).toEqual([]);
    expect(studied.turn!.log.at(-1)).toMatchObject({ kind: 'specialty', outcome: 'a zoological specimen is found', rolls: [{ label: 'zoology', value: 2 }] });
    expect(studied.explorers[0].specimens).toEqual({ zoology: 1, geology: 0 });
    expect(studied.explorers[0].research).toEqual({ hex: 'c24r12', done: ['zoology'] });
    expect(studied.turn!.moved).toBe(true);
    expect(reduce([...ev4, event('specialty/performed', { seat: 'bottom-1', specialty: 'zoology' }), event('specialty/performed', { seat: 'bottom-1', specialty: 'zoology' })]).diagnostics.at(-1)?.reason).toBe('the turn is spent');
  });
  it('a doctor treating the tribe may be poisoned; in captivity he treats without permission at −1', () => {
    // Medicine 6: two poison attempts (combat stream after the prices): 4 fails, 3 the explorer recovers hardened.
    const script = { ...SCRIPT, combat: [1, 1, 1, 3, 6, 3, 2, 4, 1, 4, 3], specialty: [6] };
    const { events } = atTheTribe(script, ['medicine']);
    const treated = reduce([...events, event('specialty/performed', { seat: 'bottom-1', specialty: 'medicine' })]);
    expect(treated.diagnostics).toEqual([]);
    expect(treated.turn!.log.slice(-3).map((l) => l.outcome)).toEqual(['several major cases treated; the witch doctor tries poison twice (attitude +2)', 'the chief’s poisoning attempt fails', 'poisoned, the explorer recovers (hardened against the next attempt)']);
    expect(treated.tribes[1]).toMatchObject({ attitude: 2, treatedBy: ['bottom-1'] });
    expect(treated.explorers[0]).toMatchObject({ goodWorks: { evangelism: 0, medicine: 2 }, poisonBonus: 1 });
  });
});
