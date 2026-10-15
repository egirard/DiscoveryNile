// Physical dice (PROMPTS.md, prompt 18): the reducer holds an event at a roll, the table asks for the throw, and
// the event goes on once `dice/rolled` brings the values; the log replays the same way.
import { beforeEach, describe, expect, it } from 'vitest';
import { tradePrices } from '$features/natives/negotiation';
import { reduce } from '$lib/game/reduce';
import { created, event, resetSequence } from '$lib/game/test-fixtures';
import { DiceNeeded, d6, dice, isPhysical, rngScripted, settled, withPhysical, withRolled } from '$lib/game/random';
import type { GameEvent } from '$lib/game/events';
import { okayFrom, promptText, uncovered } from './prompt';

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
    expect(reduce([...events, event('dice/rolled', { seat: 'bottom-1', values: [1, 1, 1, 1, 1] })]).diagnostics[0].reason).toBe('4 dice of 1 to 6 expected');
    expect(reduce([...events, event('dice/rolled', { seat: 'bottom-1', values: [1, 1, 1, 7] })]).diagnostics[0].reason).toBe('4 dice of 1 to 6 expected');
    expect(reduce([...events, event('dice/rolled', { seat: 'bottom-1', values: [] })]).diagnostics[0].reason).toBe('4 dice of 1 to 6 expected');

    const second = reduce([...events, event('dice/rolled', { seat: 'bottom-1', values: [6, 6, 6, 6] })]);
    expect(second.diagnostics).toEqual([]);
    expect(second.awaiting).toMatchObject({ seat: 'top-1', count: 4, rolled: [{ prompt: 'Roll 4 D6 for first player; the highest total goes first', values: [6, 6, 6, 6], seat: 'bottom-1' }] });

    const started = reduce([...events, event('dice/rolled', { seat: 'bottom-1', values: [6, 6, 6, 6] }), event('dice/rolled', { seat: 'top-1', values: [1, 1, 1, 1] })]);
    expect(started.diagnostics).toEqual([]);
    expect(started.awaiting).toBeNull();
    expect(started.turn).toMatchObject({ current: 'bottom-1', round: 1 });
    expect(started.rollOff).toEqual({ 'bottom-1': [[6, 6, 6, 6]], 'top-1': [[1, 1, 1, 1]] });
    expect(started.history.map((h) => h.log[0].outcome)).toEqual(['bottom-1 first', 'bottom-1 first']);
    // The dice used are gone from the state; the shuffle that followed did not read them.
    expect(started.rng).toMatchObject({ physical: true, scripts: { main: [] }, next: {} });
    expect(started.explorers.map((e) => e.hand.length)).toEqual([6, 5]); // five each, and the first player has drawn
  });
  it('takes a throw in parts, the rest from the generator at a word, and reads the whole in order (prompt 33)', () => {
    // A throw of more dice than the tray holds: three of bottom-1's four come first, then the fourth.
    const events = [...lobby(), event('dice/physical', { on: true }), event('game/started', {})];
    const part = reduce([...events, event('dice/rolled', { seat: 'bottom-1', values: [6, 5, 4] })]);
    expect(part.diagnostics).toEqual([]);
    expect(part.awaiting).toMatchObject({ seat: 'bottom-1', count: 4, have: [6, 5, 4], rolled: [] });
    expect(part.rng).toMatchObject({ scripts: { main: [6, 5, 4] } });
    expect(reduce([...events, event('dice/rolled', { seat: 'bottom-1', values: [6, 5, 4] }), event('dice/rolled', { seat: 'bottom-1', values: [1, 1] })]).diagnostics[0].reason).toBe('1 more die of 1 to 6 expected');
    const whole = reduce([...events, event('dice/rolled', { seat: 'bottom-1', values: [6, 5, 4] }), event('dice/rolled', { seat: 'bottom-1', values: [3] })]);
    expect(whole.diagnostics).toEqual([]);
    expect(whole.awaiting).toMatchObject({ seat: 'top-1', have: [], rolled: [{ values: [6, 5, 4, 3], seat: 'bottom-1' }] });
    // `auto` has the table roll the rest from the stream's generator: the same dice on every client, as a seeded game rolls them.
    const auto = reduce([...events, event('dice/rolled', { seat: 'bottom-1', values: [6] }), event('dice/rolled', { seat: 'bottom-1', auto: true })]);
    expect(auto.diagnostics).toEqual([]);
    expect(auto.awaiting!.rolled[0].values).toHaveLength(4);
    expect(auto.awaiting!.rolled[0].values[0]).toBe(6);
    expect(auto.awaiting!.rolled[0].values.slice(1).every((v) => v >= 1 && v <= 6)).toBe(true);
    expect(reduce([...events, event('dice/rolled', { seat: 'bottom-1', values: [6] }), event('dice/rolled', { seat: 'bottom-1', auto: true })])).toEqual(auto);
    const generator = reduce([...lobby(), event('game/started', {})]);
    expect(auto.awaiting!.rolled[0].values.slice(1)).toEqual(generator.rollOff!['bottom-1'][0].slice(0, 3)); // the generator's own first three dice
  });
  it('puts the dice rolled at the table ahead of a script written for later, so a scripted game can turn physical dice on part way', () => {
    // Scripted through bottom-1's roll and two dice beyond: with physical dice on, top-1's throw is asked for, read
    // after bottom-1's scripted four and before the two scripted for later, which stay in place.
    const scripted = [created('ABCDE', { bottom: 1, top: 1, left: 1, right: 1 }, 24, [2, 2, 2, 2, 5, 5]), ...seats.flatMap((seat) => [event('seat/taken', { seat, uid: `table:${seat}` }), event('explorer/commissioned', { seat, specialties: [] })])];
    const held = reduce([...scripted, event('dice/physical', { on: true }), event('game/started', {})]);
    expect(held.awaiting).toMatchObject({ seat: 'top-1', count: 4, at: 4, rolled: [] });
    const done = reduce([...scripted, event('dice/physical', { on: true }), event('game/started', {}), event('dice/rolled', { seat: 'top-1', values: [6, 6, 6, 6] })]);
    expect(done.diagnostics).toEqual([]);
    expect(done.awaiting).toBeNull();
    expect(done.rollOff).toEqual({ 'bottom-1': [[2, 2, 2, 2]], 'top-1': [[6, 6, 6, 6]] });
    expect(done.rng).toMatchObject({ scripts: { main: [5, 5] }, next: {} });
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
    // The lines so far go with the next ask (prompt 34): found the way, the terrain die is asked with the lost check's
    // line, its verdict on it. (Lost at the port there is no hunt to ask for; scenario 037 reads the hunt's ask in the field.)
    const found = reduce([...landed, event('dice/rolled', { seat: 'bottom-1', values: [4] })]);
    expect(found.awaiting).toMatchObject({ seat: 'bottom-1', count: 1, rolled: [{ values: [4] }] });
    expect(found.awaiting!.sofar).toEqual([expect.objectContaining({ kind: 'lost-check', lost: false, outcome: 'found the way', rolls: [{ label: 'lost check', value: 4 }] })]);
    expect(uncovered(found.awaiting!.rolled, found.awaiting!.sofar)).toEqual([]);
    const lost = reduce([...landed, event('dice/rolled', { seat: 'bottom-1', values: [1] })]);
    expect(lost.awaiting).toBeNull();
    // Lost, the turn ends there and then (prompt 20): at a port there is no hunt, and the line says so.
    expect(lost.turn!.current).toBe('top-1');
    expect(uncovered([{ values: [4] }, { values: [2] }, { values: [3, 3] }], [{ rolls: [1] }])).toEqual([{ values: [2] }, { values: [3, 3] }]);
    expect(uncovered([{ values: [4] }], [])).toEqual([{ values: [4] }]);
    const bottom = lost.history.filter((t) => t.seat === 'bottom-1').at(-1)!;
    expect(bottom.log.at(-1)).toMatchObject({ kind: 'lost-check', lost: true, needed: '2+', rolls: [{ label: 'lost check', value: 1 }], outcome: 'lost; no hunting needed at Mombasa' });
    expect(lost.diagnostics).toEqual([]);
  });
  it('asks for each price by name, one die at a time, and lists each as it is read', () => {
    const physical = withPhysical({ seed: 1, state: 1, streams: {}, scripts: {}, next: {} }, true);
    expect(() => tradePrices(physical, { desert: false, water: false })).toThrow(DiceNeeded);
    try {
      tradePrices(physical, { desert: false, water: false });
    } catch (e) {
      expect((e as DiceNeeded).count).toBe(1);
      expect((e as DiceNeeded).ask).toMatchObject({ what: 'for the price of food', hint: 'in gifts, rations per gift' });
    }
    const second = withRolled(physical, 'combat', [3]);
    try {
      tradePrices(second, { desert: false, water: false });
    } catch (e) {
      expect((e as DiceNeeded).ask).toMatchObject({ what: 'for the price of bearers', hint: 'in gifts each' });
    }
    const all = tradePrices(withRolled(physical, 'combat', [3, 2, 4, 1]), { desert: false, water: false });
    expect(all.prices).toEqual({ food: 3, bearers: 2, guides: 4, askaris: 1 });
    expect(all.rolls.map((r) => r.label)).toEqual(['price of food', 'price of bearers', 'price of guides', 'price of askaris']);
  });
});
