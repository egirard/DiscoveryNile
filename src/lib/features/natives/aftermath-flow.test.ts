import { beforeEach, describe, expect, it } from 'vitest';
import { reduce } from '$lib/game/reduce';
import { created, event, resetSequence } from '$lib/game/test-fixtures';
import { card } from '$features/cards/deck';

beforeEach(resetSequence);

const LAYOUT = { bottom: 2, top: 2, left: 1, right: 1 };
const seatAndCommission = (seat: string) => [event('seat/taken', { seat, uid: `table:${seat}` }), event('explorer/commissioned', { seat, specialties: [] })];
// Seed 18 as in scenarios 016–018: bottom-1 holds a ticket to Mombasa; the step into c24r12 finds 12 warriors.
// Combat dice: reaction 6,6,6; strength 1; surprise 6,6; morale 2 (victory, 6 warriors left); prisoners 1 (four taken);
// village 3,4 (found); loot 1..6,1..6. Next turn, policy 4: reaction 6,6,6; strength 2 (attack); surprise 1,1; natives
// strike 1 (two askaris fall); break 3 (6 over 4: defeat); defeat die 2 (prisoner). Then the escape die 6 (3: alone).
const COMBAT = [6, 6, 6, 1, 6, 6, 2, 1, 3, 4, 1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6, 6, 6, 6, 2, 1, 1, 1, 3, 2, 6];
const SCRIPT = { main: [6, 6, 6, 6, 1, 1, 1, 1, 6, 2, 1], natives: [1, 2, 3, 4, 5], hunting: [1, 1, 1], combat: COMBAT };

function facingTheTribe(combat = COMBAT) {
  const base = [created('ABCDE', LAYOUT, 18, { ...SCRIPT, combat }), ...seatAndCommission('bottom-1'), ...seatAndCommission('top-1'), event('game/started', {})];
  const s0 = reduce(base);
  const ticket = s0.explorers[0].hand.find((id) => card(id).donation.kind === 'ticket' && (card(id).donation as { port: string }).port === 'mombasa')!;
  const pass = (seat: string, s: ReturnType<typeof reduce>) => {
    const e = s.explorers.find((x) => x.seat === seat)!;
    return s.turn!.phase === 'discard' ? [event('cards/discarded', { seat, cardIds: [e.hand[0]] }), event('turn/ended', { seat })] : [event('turn/ended', { seat })];
  };
  let events = [...base, event('voyage/booked', { seat: 'bottom-1', port: 'mombasa', ticketCardId: ticket }), event('turn/ended', { seat: 'bottom-1' })];
  events = [...events, ...pass('top-1', reduce(events))];
  events = [...events, ...pass('top-1', reduce(events))];
  events = [...events, event('expedition/outfitted', { seat: 'bottom-1', purchases: { askaris: 5, bearers: 6, food: 60 } }), event('expedition/moved', { seat: 'bottom-1', path: ['c24r12'] })];
  return { events, pass };
}

describe('victory: prisoners, the village and the loot (rules §8.4)', () => {
  it('takes prisoners as bearers, finds the village and offers the choice; keeping them loots a die per warrior', () => {
    const { events } = facingTheTribe();
    const won = reduce([...events, event('natives/policy', { seat: 'bottom-1', policy: 3 })]);
    expect(won.diagnostics).toEqual([]);
    expect(won.turn!.phase).toBe('spoils');
    expect(won.turn!.log.at(-1)).toMatchObject({ kind: 'victory', outcome: '4 prisoners taken, the village is found' });
    expect(won.explorers[0].chart).toMatchObject({ askaris: 5, bearers: 10 });
    expect(won.tribes[1]).toMatchObject({ warriors: 2, pending: { by: 'bottom-1', prisoners: 4, policy: 3, original: 12 } });
    expect(reduce([...events, event('natives/policy', { seat: 'bottom-1', policy: 3 }), event('turn/ended', { seat: 'bottom-1' })]).diagnostics.at(-1)?.reason).toBe('deal with the prisoners and the village first');
    const looted = reduce([...events, event('natives/policy', { seat: 'bottom-1', policy: 3 }), event('natives/spoils', { seat: 'bottom-1', choice: 'keep' })]);
    expect(looted.diagnostics).toEqual([]);
    expect(looted.turn!.phase).toBe('act');
    expect(looted.turn!.log.at(-1)).toMatchObject({ kind: 'loot', outcome: 'looted 20 rations, 2 gifts' });
    expect(looted.turn!.log.at(-1)!.rolls).toHaveLength(12);
    expect(looted.explorers[0].chart).toMatchObject({ bearers: 10, food: 80, gifts: 2 });
    expect(looted.tribes[1].pending).toBeNull();
    const released = reduce([...events, event('natives/policy', { seat: 'bottom-1', policy: 3 }), event('natives/spoils', { seat: 'bottom-1', choice: 'release' })]);
    expect(released.explorers[0].chart).toMatchObject({ bearers: 6, food: 60 });
    expect(released.tribes[1]).toMatchObject({ warriors: 6, attitude: 0, regard: { 'bottom-1': 3 }, pending: null });
  });
  it('a village not found is searched again next turn while the explorer stays', () => {
    const combat = [6, 6, 6, 1, 6, 6, 2, 1, 6, 6, 3, 4, ...Array(12).fill(1)];
    const { events, pass } = facingTheTribe(combat);
    const won = reduce([...events, event('natives/policy', { seat: 'bottom-1', policy: 3 })]);
    expect(won.turn!.phase).toBe('act');
    expect(won.turn!.log.at(-1)).toMatchObject({ outcome: '4 prisoners taken, the village cannot be found' });
    const ev = [...events, event('natives/policy', { seat: 'bottom-1', policy: 3 }), event('turn/ended', { seat: 'bottom-1' })];
    expect(reduce([...ev, ...pass('top-1', reduce(ev))]).turn).toMatchObject({ round: 4, phase: 'disaster', disaster: { then: 'spoils' } }); // the card is read first (prompt 34)
    const next = reduce([...ev, ...pass('top-1', reduce(ev)), event('disaster/faced', { seat: 'bottom-1' })]);
    expect(next.turn).toMatchObject({ round: 4, phase: 'spoils' });
    expect(next.turn!.log.find((l) => l.kind === 'victory')).toMatchObject({ outcome: 'the village is found' });
  });
});

describe('defeat: captivity, escape and death', () => {
  it('a beaten explorer is held prisoner, tries to escape each turn, and walks free alone on a three', () => {
    const { events, pass } = facingTheTribe();
    const ev3 = [...events, event('natives/policy', { seat: 'bottom-1', policy: 3 }), event('natives/spoils', { seat: 'bottom-1', choice: 'keep' }), event('turn/ended', { seat: 'bottom-1' })];
    const ev4 = [...ev3, ...pass('top-1', reduce(ev3)), event('natives/policy', { seat: 'bottom-1', policy: 4 })];
    const beaten = reduce(ev4);
    expect(beaten.diagnostics).toEqual([]);
    expect(beaten.turn!.log.filter((l) => l.kind === 'combat' || l.kind === 'defeat').map((l) => l.outcome)).toEqual([
      'hostile; nerve 2 × 5 askaris ÷ policy 4 = 2, not more than 2 warriors: the natives attack; the expedition is surprised; 2 askaris fall; the askaris break and run: defeat',
      'the explorer is held prisoner'
    ]);
    const e4 = beaten.explorers[0];
    expect(e4.location).toMatchObject({ kind: 'captive', hex: 'c24r12', tribe: 1 });
    expect(e4.chart).toBeNull();
    expect(beaten.tribes[1].attitude).toBe(-1);
    expect(reduce([...ev4, event('expedition/moved', { seat: 'bottom-1', path: ['c25r12'] })]).diagnostics.at(-1)?.reason).toBe('the explorer is held prisoner');
    const ev5 = [...ev4, event('turn/ended', { seat: 'bottom-1' })];
    const free = reduce([...ev5, ...pass('top-1', reduce(ev5))]);
    expect(free.turn).toMatchObject({ current: 'bottom-1', round: 5, phase: 'natives' });
    expect(free.turn!.log[0]).toMatchObject({ kind: 'captivity', outcome: 'the explorer escapes alone', rolls: [{ label: 'escape', value: 6 }] });
    expect(free.explorers[0].location).toEqual({ kind: 'hex', hex: 'c24r12' });
    expect(free.explorers[0].chart).toMatchObject({ askaris: 0, bearers: 0, food: 0, muskets: 0 });
  });
  it('a killed explorer leaves the turn order', () => {
    const combat = [...COMBAT.slice(0, 30), 1]; // the defeat die comes up 1: killed
    const { events, pass } = facingTheTribe(combat);
    const ev3 = [...events, event('natives/policy', { seat: 'bottom-1', policy: 3 }), event('natives/spoils', { seat: 'bottom-1', choice: 'keep' }), event('turn/ended', { seat: 'bottom-1' })];
    const ev4 = [...ev3, ...pass('top-1', reduce(ev3)), event('natives/policy', { seat: 'bottom-1', policy: 4 })];
    const dead = reduce(ev4);
    expect(dead.turn!.log.at(-1)).toMatchObject({ kind: 'defeat', outcome: 'the explorer is killed' });
    expect(dead.explorers[0].location).toEqual({ kind: 'dead' });
    expect(dead.tribes).toEqual({}); // the hex only he had visited is erased with its tribe (rules §12, slice 026)
    expect(dead.map['c24r12']).toBeUndefined();
    const onward = reduce([...ev4, event('turn/ended', { seat: 'bottom-1' })]);
    expect(onward.turn!.current).toBe('top-1');
    const again = reduce([...ev4, event('turn/ended', { seat: 'bottom-1' }), ...pass('top-1', onward)]);
    expect(again.turn).toMatchObject({ current: 'top-1', round: 5 }); // bottom-1's seat is skipped
  });
});

describe('tribe attitude (rules §8.6)', () => {
  it('released prisoners earn regard for that explorer alone; a defeat lowers the attitude towards everyone', () => {
    const combat = [6, 6, 6, 1, 6, 6, 2, 1, 3, 4, /* turn 4, policy 5: */ 1, 1, 1];
    const { events, pass } = facingTheTribe(combat);
    const ev3 = [...events, event('natives/policy', { seat: 'bottom-1', policy: 3 }), event('natives/spoils', { seat: 'bottom-1', choice: 'release' }), event('turn/ended', { seat: 'bottom-1' })];
    const s3 = reduce(ev3);
    expect(s3.tribes[1]).toMatchObject({ attitude: 0, regard: { 'bottom-1': 3 } });
    const s4 = reduce([...ev3, ...pass('top-1', s3), event('natives/policy', { seat: 'bottom-1', policy: 5 })]);
    const reaction = s4.turn!.log.find((l) => l.kind === 'reaction')!;
    expect(reaction.modifiers).toEqual([{ label: 'distance to port', value: 1 }, { label: 'policy 5', value: 5 }, { label: 'regard for you', value: 3 }]);
    expect(reaction.outcome).toBe('not hostile (3 within 9)');
    expect(s4.turn!.phase).toBe('negotiate');
  });
});
