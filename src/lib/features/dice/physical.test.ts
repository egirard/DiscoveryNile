// Physical dice (PROMPTS.md, prompt 18): the reducer holds an event at a roll, the table asks for the throw, and
// the event goes on once `dice/rolled` brings the values; the log replays the same way.
import { beforeEach, describe, expect, it } from 'vitest';
import { reduce } from '$lib/game/reduce';
import { created, event, resetSequence } from '$lib/game/test-fixtures';
import { d6, dice, DiceNeeded, isPhysical, rngScripted, settled, withPhysical, withRolled } from '$lib/game/random';
import type { GameEvent } from '$lib/game/events';
import { okayFrom, promptText } from './prompt';

beforeEach(resetSequence);

const seats = ['bottom-1', 'top-1'] as const;
const lobby = (): GameEvent[] => [
  created('ABCDE', { bottom: 1, top: 1, left: 1, right: 1 }, 24),
  ...seats.flatMap((seat) => [event('seat/taken', { seat, uid: `table:${seat}` }), event('explorer/commissioned', { seat, specialties: [] })])
];

describe('the generator with physical dice', () => {
  it('asks instead of drawing, reads scripted values first, and asks for a throw as a whole', () => {
    const rng = withPhysical(rngScripted(1, [3]), true);
    expect(isPhysical(rng)).toBe(true);
    expect(d6(rng, 'main', { what: 'for a test' }).value).toBe(3);
    const after = d6(rng).state;
    expect(() => d6(after, 'main', { what: 'to see if you are lost', hint: '4+ means you\'re okay' })).toThrow(DiceNeeded);
    let caught: DiceNeeded | null = null;
    try { dice(rng, 4, 'main', { what: 'for first player', seat: 'top-1' }); } catch (e) { caught = e as DiceNeeded; }
    expect(caught).toMatchObject({ stream: 'main', count: 4, ask: { what: 'for first player', seat: 'top-1' } });
    expect(() => d6(after, 'hunting')).toThrow(/hunting stream/);
    expect(() => d6(withPhysical(rng, false), 'hunting')).not.toThrow();
  });
  it('reads the dice rolled at the table in order, then forgets the ones a finished event used', () => {
    const rng = withRolled(withPhysical(5, true), 'combat', [6, 2]);
    const two = dice(rng, 2, 'combat');
    expect(two.values).toEqual([6, 2]);
    const clean = settled(two.state);
    expect(clean).toMatchObject({ scripts: { combat: [] }, next: {} });
    expect(() => d6(clean, 'combat')).toThrow(DiceNeeded);
    expect(settled(5)).toBe(5);
  });
});

describe('the prompt', () => {
  it('reads as the table asks it', () => {
    expect(promptText(1, { what: 'to see if you are lost', hint: okayFrom(4) })).toBe("Roll a D6 to see if you are lost; 4+ means you're okay");
    expect(promptText(4, { what: 'for first player', hint: 'the highest total goes first' })).toBe('Roll 4 D6 for first player; the highest total goes first');
    expect(okayFrom(1)).toBe("any roll and you're okay");
    expect(okayFrom(7)).toBe("whatever you roll you're lost");
    expect(okayFrom(3, 'you shrug it off', 'it takes hold')).toBe('3+ means you shrug it off');
  });
});

describe('the reducer with physical dice', () => {
  it('holds the start of the game at each seat\'s roll for first player and goes on when the dice are in', () => {
    const events = [...lobby(), event('dice/physical', { on: true }), event('game/started', {})];
    const held = reduce(events);
    expect(held.diagnostics).toEqual([]);
    expect(held.turn).toBeNull();
    expect(held.awaiting).toMatchObject({ seat: 'bottom-1', stream: 'main', count: 4, prompt: 'Roll 4 D6 for first player; the highest total goes first', rolled: [] });
    expect(held.awaiting!.event.type).toBe('game/started');

    // Anything but the roll is refused while the table waits.
    const refused = reduce([...events, event('turn/ended', { seat: 'bottom-1' })]);
    expect(refused.diagnostics).toEqual([{ eventId: expect.stringMatching(/-00000008$/), reason: 'waiting for bottom-1 to roll the dice' }]);
    expect(reduce([...events, event('dice/rolled', { seat: 'top-1', values: [1, 1, 1, 1] })]).diagnostics[0].reason).toBe("it is bottom-1's roll");
    expect(reduce([...events, event('dice/rolled', { seat: 'bottom-1', values: [1, 1, 1] })]).diagnostics[0].reason).toBe('4 dice of 1 to 6 expected');
    expect(reduce([...events, event('dice/rolled', { seat: 'bottom-1', values: [1, 1, 1, 7] })]).diagnostics[0].reason).toBe('4 dice of 1 to 6 expected');

    const second = reduce([...events, event('dice/rolled', { seat: 'bottom-1', values: [6, 6, 6, 6] })]);
    expect(second.diagnostics).toEqual([]);
    expect(second.awaiting).toMatchObject({ seat: 'top-1', count: 4, rolled: [{ prompt: 'Roll 4 D6 for first player; the highest total goes first', values: [6, 6, 6, 6] }] });

    const started = reduce([...events, event('dice/rolled', { seat: 'bottom-1', values: [6, 6, 6, 6] }), event('dice/rolled', { seat: 'top-1', values: [1, 1, 1, 1] })]);
    expect(started.diagnostics).toEqual([]);
    expect(started.awaiting).toBeNull();
    expect(started.turn).toMatchObject({ current: 'bottom-1', round: 1 });
    expect(started.rollOff).toEqual({ 'bottom-1': [[6, 6, 6, 6]], 'top-1': [[1, 1, 1, 1]] });
    expect(started.history.map((h) => h.log[0].outcome)).toEqual(['total 24: first player', 'total 4']);
    // The dice used are gone from the state; the shuffle that followed did not read them.
    expect(started.rng).toMatchObject({ physical: true, scripts: { main: [] }, next: {} });
    expect(started.explorers.map((e) => e.hand.length)).toEqual([6, 5]); // five each, and the first player has drawn
  });
  it('asks the tied seats to roll again, and a re-roll is read from the same throw of the same seat', () => {
    const events = [...lobby(), event('dice/physical', { on: true }), event('game/started', {}), event('dice/rolled', { seat: 'bottom-1', values: [2, 2, 2, 2] }), event('dice/rolled', { seat: 'top-1', values: [2, 2, 2, 2] })];
    const tied = reduce(events);
    expect(tied.awaiting).toMatchObject({ seat: 'bottom-1', count: 4 });
    expect(tied.awaiting!.rolled).toHaveLength(2);
    const done = reduce([...events, event('dice/rolled', { seat: 'bottom-1', values: [1, 1, 1, 1] }), event('dice/rolled', { seat: 'top-1', values: [5, 5, 5, 5] })]);
    expect(done.turn!.current).toBe('top-1');
    expect(done.rollOff).toEqual({ 'bottom-1': [[2, 2, 2, 2], [1, 1, 1, 1]], 'top-1': [[2, 2, 2, 2], [5, 5, 5, 5]] });
  });
  it('is deterministic on replay and the same game without physical dice rolls the generator', () => {
    const events = [...lobby(), event('dice/physical', { on: true }), event('game/started', {}), event('dice/rolled', { seat: 'bottom-1', values: [6, 6, 6, 6] }), event('dice/rolled', { seat: 'top-1', values: [1, 1, 1, 1] })];
    expect(reduce(events)).toEqual(reduce(events));
    const seeded = reduce([...lobby(), event('game/started', {})]);
    expect(seeded.turn).not.toBeNull();
    expect(seeded.rollOff).not.toEqual(reduce(events).rollOff);
  });
  it('can be turned on and off, never while a roll is waited for, and is never undone', () => {
    const off = reduce([...lobby(), event('dice/physical', { on: true }), event('dice/physical', { on: false }), event('game/started', {})]);
    expect(off.awaiting).toBeNull();
    expect(off.turn).not.toBeNull();
    expect(isPhysical(off.rng)).toBe(false);
    const waiting = reduce([...lobby(), event('dice/physical', { on: true }), event('game/started', {}), event('dice/physical', { on: false })]);
    expect(waiting.diagnostics[0].reason).toBe('waiting for bottom-1 to roll the dice');
    expect(reduce([event('dice/physical', { on: true })]).diagnostics[0].reason).toBe('game has no seed');
    expect(reduce([created(), event('dice/physical', { on: 'yes' })]).diagnostics[0].reason).toBe('dice/physical needs on: true or false');
    expect(reduce([created(), event('dice/rolled', { seat: 'bottom-1', values: [1] })]).diagnostics[0].reason).toBe('no roll was asked for');
    expect(reduce([created(), event('dice/physical', { on: true })]).undo).toBeNull();
  });
  it('asks for the lost check in the rules\' words and logs the throw once the step is made', () => {
    const start: GameEvent[] = [...lobby(), event('dice/physical', { on: true }), event('game/started', {}), event('dice/rolled', { seat: 'bottom-1', values: [6, 6, 6, 6] }), event('dice/rolled', { seat: 'top-1', values: [1, 1, 1, 1] })];
    const s0 = reduce(start);
    const hand = s0.explorers.find((e) => e.seat === 'bottom-1')!.hand;
    expect(hand).toContain('card-2'); // seed 24: a free ticket to Mombasa and $1000 in the opening hand (the roll-off reads no generator dice)
    const landed: GameEvent[] = [
      ...start,
      event('voyage/booked', { seat: 'bottom-1', port: 'mombasa', ticketCardId: 'card-2' }),
      event('turn/ended', { seat: 'bottom-1' }),
      event('turn/ended', { seat: 'top-1' }),
      event('turn/ended', { seat: 'top-1' }),
      event('expedition/outfitted', { seat: 'bottom-1', purchases: { askaris: 5, bearers: 15, food: 100, guides: 0, camels: 0, horses: 0, canoes: 0, muskets: 0, gifts: 0 } }),
      event('expedition/moved', { seat: 'bottom-1', path: ['c24r12'] })
    ];
    const asked = reduce(landed);
    expect(asked.diagnostics).toEqual([]);
    expect(asked.awaiting).toMatchObject({ seat: 'bottom-1', stream: 'main', count: 1, prompt: "Roll a D6 to see if you are lost; 2+ means you're okay", rolled: [] });
    const lost = reduce([...landed, event('dice/rolled', { seat: 'bottom-1', values: [1] })]);
    expect(lost.awaiting).toBeNull();
    expect(lost.turn!.log.at(-1)).toMatchObject({ kind: 'lost-check', lost: true, rolls: [{ label: 'lost check', value: 1 }] });
    expect(lost.turn!.moved).toBe(true);
  });
});
