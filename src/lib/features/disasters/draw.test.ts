import { beforeEach, describe, expect, it } from 'vitest';
import { reduce } from '$lib/game/reduce';
import { created, event, resetSequence } from '$lib/game/test-fixtures';
import { drawsDisaster } from './draw';

beforeEach(resetSequence);

const LAYOUT = { bottom: 2, top: 2, left: 1, right: 1 };
const seatAndCommission = (seat: string) => [event('seat/taken', { seat, uid: `table:${seat}` }), event('explorer/commissioned', { seat, specialties: [] })];
// Seed 863 (found by search; shared with scenario 013): bottom-1 pays passage to Mombasa and keeps $700; after the
// Europe draws the deck yields card 1 (veldt: an askari killed), card 29 (jungle: no effect here) and card 23 (the rhino).
// Dice: roll-off 6,6,6,6 / 1,1,1,1; then the rhino's charges, five hunters each: 1,2,3,4,5 (miss) and 1,1,6,1,1.
const SCRIPT = [6, 6, 6, 6, 1, 1, 1, 1, 1, 2, 3, 4, 5, 1, 1, 6, 1, 1];
const FOOT = { askaris: 5, bearers: 15, food: 100 };

function toTheVeldt() {
  const base = [created('ABCDE', LAYOUT, 863, SCRIPT), ...seatAndCommission('bottom-1'), ...seatAndCommission('top-1'), event('game/started', {})];
  const s0 = reduce(base);
  const pass = (seat: string, s: ReturnType<typeof reduce>) => {
    const e = s.explorers.find((x) => x.seat === seat)!;
    return s.turn!.phase === 'discard' ? [event('cards/discarded', { seat, cardIds: [e.hand[0]] }), event('turn/ended', { seat })] : [event('turn/ended', { seat })];
  };
  let events = [...base, event('voyage/booked', { seat: 'bottom-1', port: 'mombasa' }), event('turn/ended', { seat: 'bottom-1' })];
  events = [...events, ...pass('top-1', reduce(events))]; // round 1
  events = [...events, ...pass('top-1', reduce(events))]; // round 2: bottom-1 lands and is skipped
  const atPort = events;
  events = [...events, event('expedition/outfitted', { seat: 'bottom-1', purchases: FOOT }), event('expedition/moved', { seat: 'bottom-1', path: ['c25r11'] }), event('turn/ended', { seat: 'bottom-1' })];
  events = [...events, ...pass('top-1', reduce(events))]; // round 3
  return { events, atPort, pass };
}

describe('the disaster step of an African turn (rules §10)', () => {
  it('deals one card per turn in the field, none at the port, shown before it is faced, then applied and discarded', () => {
    const { events, atPort: portEvents, pass } = toTheVeldt();
    const face = () => event('disaster/faced', { seat: 'bottom-1' }); // a fresh event each time: ids are unique
    const atPort = reduce(portEvents);
    expect(atPort.turn).toMatchObject({ current: 'bottom-1', round: 3, log: [], phase: 'act', disaster: null });
    expect(drawsDisaster(atPort.explorers[0])).toBe(false);
    // The card is dealt and held for the player to read (prompt 34): nothing has happened to the chart yet.
    const dealt = reduce(events);
    expect(dealt.diagnostics).toEqual([]);
    expect(dealt.turn).toMatchObject({ current: 'bottom-1', round: 4, phase: 'disaster', disaster: { card: 'card-1', then: 'act' }, log: [] });
    expect(dealt.explorers[0].chart).toMatchObject({ askaris: 5, bearers: 15 });
    expect(dealt.deck!.draw).not.toContain('card-1');
    expect(dealt.deck!.discard).not.toContain('card-1');
    expect(reduce([...events, event('turn/ended', { seat: 'bottom-1' }), face()]).diagnostics.map((d) => d.reason)).toEqual(["it is not bottom-1's turn"]); // ending the turn faced it, and the turn passed
    expect(reduce([...events, face(), face()]).diagnostics.map((d) => d.reason)).toEqual(['no disaster card to face']);
    expect(reduce([...events, event('disaster/faced', { seat: 'top-1' })]).diagnostics.map((d) => d.reason)).toEqual(["it is not top-1's turn"]);
    const r4 = reduce([...events, face()]);
    expect(r4.diagnostics).toEqual([]);
    expect(r4.turn).toMatchObject({ current: 'bottom-1', round: 4, phase: 'act', disaster: null });
    expect(r4.turn!.log).toEqual([{ kind: 'disaster', seat: 'bottom-1', hex: 'c25r11', card: 'card-1', applies: true, rolls: [], outcome: '1 askari killed' }]);
    expect(r4.explorers[0].chart).toMatchObject({ askaris: 4, bearers: 15 });
    expect(r4.deck!.discard).toContain('card-1');
    expect(r4.explorers[0].hand).not.toContain('card-1');
    // An action of the seat with the card still to be read faces it first, so an event stream without the facing plays the same.
    const acted = reduce([...events, event('expedition/reorganised', { seat: 'bottom-1', action: 'dismiss', item: 'bearers', count: 1 })]);
    expect(acted.diagnostics).toEqual([]);
    expect(acted.turn!.log.map((l) => l.outcome)).toEqual(['1 askari killed', '1 bearer dismissed']);
    // Taking the action back leaves the card faced: the undo goes to the state after the facing.
    expect(acted.undo).toMatchObject({ type: 'expedition/reorganised', seat: 'bottom-1' });
    expect(acted.undo!.before.turn!.log.map((l) => l.outcome)).toEqual(['1 askari killed']);
    expect(acted.undo!.before.turn!.phase).toBe('act');
    const ev5 = [...events, face(), ...pass('bottom-1', r4)];
    const ev5b = [...ev5, ...pass('top-1', reduce(ev5)), face()];
    const r5 = reduce(ev5b);
    expect(r5.turn!.log[0]).toMatchObject({ kind: 'disaster', card: 'card-29', applies: false, outcome: 'not here: jungle' });
    expect(r5.explorers[0].chart).toMatchObject({ askaris: 4, bearers: 15 });
    const ev6 = [...ev5b, ...pass('bottom-1', r5)];
    const r6 = reduce([...ev6, ...pass('top-1', reduce(ev6)), face()]);
    const rhino = r6.turn!.log[0];
    expect(rhino).toMatchObject({ card: 'card-23', applies: true, outcome: '1 bearer killed by the rhino, the rhino is shot on charge 2' });
    expect(rhino.rolls.map((r) => r.value)).toEqual([1, 2, 3, 4, 5, 1, 1, 6, 1, 1]);
    expect(r6.explorers[0].chart).toMatchObject({ askaris: 4, bearers: 14 });
    expect(r6.turn!.moved).toBe(false);
  });
  it('is skipped in Cape Colony', () => {
    expect(drawsDisaster({ location: { kind: 'hex', hex: 'c16r33' }, chart: {} } as never)).toBe(false);
    expect(drawsDisaster({ location: { kind: 'hex', hex: 'c16r30' }, chart: {} } as never)).toBe(true);
    expect(drawsDisaster({ location: { kind: 'port', port: 'mombasa' }, chart: {} } as never)).toBe(false);
  });
});
