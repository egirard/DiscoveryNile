// A die set right after the fact (PROMPTS.md, prompt 37): each die in the log knows the throw it came from, and a
// `dice/corrected` is applied by folding the game again with the die changed, or refused with the reason when the
// game could not have gone on as it did.
import { beforeEach, describe, expect, it } from 'vitest';
import { reduce, reduceOne } from '$lib/game/reduce';
import { created, event, resetSequence } from '$lib/game/test-fixtures';
import { tagRolls } from '$lib/game/sources';
import type { GameEvent } from '$lib/game/events';
import type { RollRecord } from '$lib/game/state';

beforeEach(resetSequence);

const seats = ['bottom-1', 'top-1'] as const;
const lobby = (): GameEvent[] => [
  created('ABCDE', { bottom: 1, top: 1, left: 1, right: 1 }, 24),
  ...seats.flatMap((seat) => [event('seat/taken', { seat, uid: `table:${seat}` }), event('explorer/commissioned', { seat, specialties: [] })])
];
/** Seed 24 as physical.test: bottom-1 first with a free ticket to Mombasa, landed and outfitted, about to step into the unknown. */
function landed(): GameEvent[] {
  return [
    ...lobby(),
    event('dice/physical', { on: true }),
    event('game/started', {}),
    event('dice/rolled', { seat: 'bottom-1', values: [6, 6, 6, 6] }),
    event('dice/rolled', { seat: 'top-1', values: [1, 1, 1, 1] }),
    event('voyage/booked', { seat: 'bottom-1', port: 'mombasa', ticketCardId: 'card-2' }),
    event('turn/ended', { seat: 'bottom-1' }),
    event('turn/ended', { seat: 'top-1' }),
    event('turn/ended', { seat: 'top-1' }),
    event('expedition/outfitted', { seat: 'bottom-1', purchases: { askaris: 5, bearers: 15, food: 100, guides: 0, camels: 0, horses: 0, canoes: 0, muskets: 0, gifts: 0 } }),
    event('expedition/moved', { seat: 'bottom-1', path: ['c24r12'] })
  ];
}
const lastOf = (s: ReturnType<typeof reduce>, seat: string) => s.history.filter((t) => t.seat === seat).at(-1)!.log;
const dice = (log: RollRecord[]) => log.filter((r) => r.kind !== 'action').map((r) => [r.kind, r.rolls.map((x) => x.value)]);

describe('each die in the log knows its throw', () => {
  it('tags the dice of the lines an event writes with the dice/rolled they came from, in order, a die rolled and not logged skipped', () => {
    const read = [{ value: 4, from: { eventId: 'a', index: 0 } }, { value: 2, from: { eventId: 'b', index: 0 } }, { value: 3, from: null }, { value: 3, from: { eventId: 'c', index: 1 } }];
    const lines: RollRecord[] = [
      { kind: 'lost-check', seat: 'bottom-1', rolls: [{ label: 'lost check', value: 4 }], outcome: 'found the way' },
      { kind: 'action', seat: 'bottom-1', rolls: [], outcome: 'nothing' },
      { kind: 'natives', seat: 'bottom-1', rolls: [{ label: 'natives', value: 3 }, { label: 'natives', value: 3 }], outcome: 'no natives' }
    ];
    const tagged = tagRolls(lines, read);
    expect(tagged[0].rolls).toEqual([{ label: 'lost check', value: 4, from: { eventId: 'a', index: 0 } }]);
    expect(tagged[1]).toBe(lines[1]);
    // The two threes: the first scripted by a scenario (no throw), the second from a throw; the two of 'b' was rolled and not logged.
    expect(tagged[2].rolls).toEqual([{ label: 'natives', value: 3 }, { label: 'natives', value: 3, from: { eventId: 'c', index: 1 } }]);
    expect(tagRolls(lines, [])).toBe(lines);
  });
  it('tags the lines of a step in the field, across the turn that ends with it', () => {
    const one = event('dice/rolled', { seat: 'bottom-1', values: [1] });
    const s = reduce([...landed(), one]);
    expect(s.diagnostics).toEqual([]);
    // Lost at the port: the turn ended with the throw, so the line is in the history, its die tagged.
    expect(lastOf(s, 'bottom-1').at(-1)).toMatchObject({ kind: 'lost-check', lost: true, rolls: [{ label: 'lost check', value: 1, from: { eventId: one.id, index: 0 } }] });
    // The dice read are dropped with the throw once the event settled.
    expect(s.rng).not.toHaveProperty('read');
  });
});

describe('dice/corrected', () => {
  it('changes the die of the throw named and the game goes on from there as it would have, the die marked as set by hand', () => {
    const base = landed();
    const one = event('dice/rolled', { seat: 'bottom-1', values: [1] });
    const lost = reduce([...base, one]);
    expect(lastOf(lost, 'bottom-1').at(-1)).toMatchObject({ kind: 'lost-check', lost: true });
    expect(lost.turn!.current).toBe('top-1');
    // The one was a misread four: the step is no longer lost, and the same turn now stands at the terrain die.
    const fixed = reduce([...base, one, event('dice/corrected', { seat: 'bottom-1', eventId: one.id, index: 0, value: 4 })]);
    expect(fixed.diagnostics).toEqual([]);
    expect(fixed.turn!.current).toBe('bottom-1');
    expect(fixed.awaiting).toMatchObject({ seat: 'bottom-1', prompt: 'Roll a D6 for the direction of the terrain to copy; a mapped neighbour in that direction is copied', rolled: [{ values: [4] }] });
    expect(fixed.awaiting!.sofar).toEqual([expect.objectContaining({ kind: 'lost-check', lost: false, rolls: [{ label: 'lost check', value: 4, from: { eventId: one.id, index: 0, corrected: true } }] })]);
    // The stored throw is untouched: the correction is its own event, and a replay applies it again.
    expect(one.payload).toEqual({ seat: 'bottom-1', values: [1] });
    expect(reduce([...base, one, event('dice/corrected', { seat: 'bottom-1', eventId: one.id, index: 0, value: 4 })])).toEqual(fixed);
  });
  it('is refused, and the game left as it was, when a later action would be refused or a later throw would answer another ask', () => {
    const base = landed();
    const four = event('dice/rolled', { seat: 'bottom-1', values: [4] });
    const two = event('dice/rolled', { seat: 'bottom-1', values: [2] });
    const mapped = [...base, four, two];
    const s = reduce(mapped);
    expect(s.diagnostics).toEqual([]);
    expect(s.awaiting).toMatchObject({ prompt: 'Roll a D6 for a river source; an even roll means a river rises here' });
    // The lost check was really a one: lost, the turn would have ended, and the terrain's two would have had no ask to answer.
    const refused = reduce([...mapped, event('dice/corrected', { seat: 'bottom-1', eventId: four.id, index: 0, value: 1 })]);
    expect(refused.diagnostics).toEqual([{ eventId: expect.stringMatching(/-00000018$/), reason: 'the die stays a 4: the dice/rolled that followed would be refused (no roll was asked for)' }]);
    expect({ ...refused, diagnostics: [] }).toEqual(s);
    // The terrain die itself can still be set: nothing followed it.
    const terrain = reduce([...mapped, event('dice/corrected', { seat: 'bottom-1', eventId: two.id, index: 0, value: 3 })]);
    expect(terrain.diagnostics).toEqual([]);
    expect(terrain.awaiting!.sofar.map((r) => [r.kind, r.rolls.map((x) => x.value)])).toEqual([['lost-check', [4]], ['terrain', [3]]]);
  });
  it('is refused when a throw made after it would answer another ask', () => {
    // Lost in the field, the hunt's die follows the lost check at once (prompt 20): were the check a four, the hunt's
    // five would be read as the terrain's direction, so the check stays as it was.
    const base = landed();
    const field = [...base, event('dice/rolled', { seat: 'bottom-1', values: [4] }), event('dice/rolled', { seat: 'bottom-1', values: [2] }), event('dice/rolled', { seat: 'bottom-1', values: [1] }), event('dice/rolled', { seat: 'bottom-1', values: [3, 3] })];
    const hunt = event('dice/rolled', { seat: 'bottom-1', values: [5] });
    const next = [...field, event('turn/ended', { seat: 'bottom-1' }), hunt, event('turn/ended', { seat: 'top-1' }), event('expedition/moved', { seat: 'bottom-1', path: ['c24r11'] })];
    const lostCheck = event('dice/rolled', { seat: 'bottom-1', values: [1] });
    const hunted = event('dice/rolled', { seat: 'bottom-1', values: [5] });
    const s = reduce([...next, lostCheck, hunted]);
    expect(s.diagnostics).toEqual([]);
    expect(dice(lastOf(s, 'bottom-1'))).toEqual([['disaster', []], ['lost-check', [1]], ['hunting', [5]]]);
    const refused = reduce([...next, lostCheck, hunted, event('dice/corrected', { seat: 'bottom-1', eventId: lostCheck.id, index: 0, value: 4 })]);
    expect(refused.diagnostics.map((d) => d.reason)).toEqual(['the die stays a 1: the throw for the hunt that followed would answer another ask (for the direction of the terrain to copy)']);
    expect(dice(lastOf(refused, 'bottom-1'))).toEqual([['disaster', []], ['lost-check', [1]], ['hunting', [5]]]);
    // The hunt's die, the last throw, can be set: a six bags three rations a hunter instead of two.
    const fed = reduce([...next, lostCheck, hunted, event('dice/corrected', { seat: 'bottom-1', eventId: hunted.id, index: 0, value: 6 })]);
    expect(fed.diagnostics).toEqual([]);
    const meal = lastOf(fed, 'bottom-1').at(-1)!;
    expect(meal).toMatchObject({ kind: 'hunting', rolls: [{ label: 'hunting', value: 6, from: { eventId: hunted.id, index: 0, corrected: true } }] });
    expect(meal.outcome).not.toBe(lastOf(s, 'bottom-1').at(-1)!.outcome);
    expect(fed.explorers[0].chart!.food).toBeGreaterThan(s.explorers[0].chart!.food);
    // Set again, the die carries on from the stored throw, not from the last correction.
    const again = reduce([...next, lostCheck, hunted, event('dice/corrected', { seat: 'bottom-1', eventId: hunted.id, index: 0, value: 6 }), event('dice/corrected', { seat: 'bottom-1', eventId: hunted.id, index: 0, value: 2 })]);
    expect(again.diagnostics).toEqual([]);
    expect(lastOf(again, 'bottom-1').at(-1)!.rolls).toEqual([{ label: 'hunting', value: 2, from: { eventId: hunted.id, index: 0, corrected: true } }]);
  });
  it('is refused for a throw that is not there to correct, and never applied outside the fold', () => {
    const base = landed();
    const one = event('dice/rolled', { seat: 'bottom-1', values: [1] });
    const s = reduce([...base, one]);
    const reasons = (payload: Record<string, unknown>) => reduce([...base, one, event('dice/corrected', payload)]).diagnostics.map((d) => d.reason);
    expect(reasons({ seat: 'bottom-1', eventId: 'nowhere', index: 0, value: 4 })).toEqual(['no such throw was rolled at the table']);
    expect(reasons({ seat: 'bottom-1', eventId: one.id, index: 3, value: 4 })).toEqual(['that throw has no such die']);
    expect(reasons({ seat: 'bottom-1', eventId: one.id, index: 0, value: 1 })).toEqual(['the die already shows a 1']);
    expect(reasons({ seat: 'bottom-1', eventId: one.id, index: 0, value: 7 })).toEqual(["dice/corrected needs the throw's eventId, the die's index and a value of 1 to 6"]);
    expect(reasons({ seat: 'bottom-1', eventId: one.id, value: 4 })).toEqual(["dice/corrected needs the throw's eventId, the die's index and a value of 1 to 6"]);
    // A die the table rolled itself was never read from the tray.
    const auto = [...lobby(), event('dice/physical', { on: true }), event('game/started', {}), event('dice/rolled', { seat: 'bottom-1', values: [6] })];
    const rest = event('dice/rolled', { seat: 'bottom-1', auto: true });
    expect(reduce([...auto, rest, event('dice/corrected', { seat: 'bottom-1', eventId: rest.id, index: 0, value: 4 })]).diagnostics.map((d) => d.reason)).toEqual(['the table rolled that die itself; it was not read from the tray']);
    // Applied one event at a time, without the stream, a correction cannot fold the game again.
    expect(reduceOne(s, event('dice/corrected', { seat: 'bottom-1', eventId: one.id, index: 0, value: 4 })).diagnostics.at(-1)!.reason).toBe('a correction is applied by replaying the game');
    // A correction while a roll is awaited is applied all the same: it is not an action of the game.
    const four = event('dice/rolled', { seat: 'bottom-1', values: [4] });
    const waiting = reduce([...base, four, event('dice/corrected', { seat: 'bottom-1', eventId: four.id, index: 0, value: 5 })]);
    expect(waiting.diagnostics).toEqual([]);
    expect(waiting.awaiting!.sofar[0].rolls[0]).toMatchObject({ value: 5, from: { corrected: true } });
  });
});
