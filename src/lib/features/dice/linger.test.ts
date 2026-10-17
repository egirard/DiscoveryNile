import { describe, expect, it } from 'vitest';
import type { GameState, RollRecord } from '$lib/game/state';
import { allRecords, lingerLines, resultTitle } from './linger';

const line = (kind: RollRecord['kind'], outcome = ''): RollRecord => ({ kind, seat: 'bottom-1', rolls: [], outcome });
const game = (history: RollRecord[][], turn: RollRecord[] | null, awaiting: boolean): GameState =>
  ({ history: history.map((log) => ({ log })), turn: turn ? { log: turn } : null, awaiting: awaiting ? { seat: 'bottom-1', prompt: 'Roll a D6 for the hunt; the die bags a ration a hunter at 2' } : null }) as unknown as GameState;

describe('the lines kept in view after a throw (prompts 54 and 55)', () => {
  it('lists every line of the game in order, the turns played before the turn under way', () => {
    const s = game([[line('lost-check')], [line('terrain')]], [line('disaster')], false);
    expect(allRecords(s).map((r) => r.kind)).toEqual(['lost-check', 'terrain', 'disaster']);
  });
  it('keeps the hunt in view with the lost check that led to it, the turn having passed to history', () => {
    const before = game([], [line('disaster')], true);
    const after = game([[line('disaster'), line('lost-check', 'lost'), line('hunting', 'two a hunter')]], [], false);
    expect(lingerLines(before, after)!.map((r) => r.kind)).toEqual(['lost-check', 'hunting']);
  });
  it("keeps the natives' reaction and the fight, leaving out the action noted, and nothing after a lost check alone", () => {
    const before = game([], [line('disaster')], true);
    const after = game([], [line('disaster'), line('action', 'chose policy 4'), line('reaction', 'hostile'), line('combat', 'the natives hide')], false);
    expect(lingerLines(before, after)!.map((r) => r.kind)).toEqual(['reaction', 'combat']);
    expect(lingerLines(before, game([], [line('disaster'), line('lost-check', 'lost')], false))).toBeNull();
  });
  it('lingers only when the throw finished the event: not while more dice are asked for, nor on an ordinary event', () => {
    const held = game([], [line('hunting')], true);
    expect(lingerLines(held, held)).toBeNull();
    expect(lingerLines(game([], [], false), game([], [line('hunting')], false))).toBeNull();
  });
  it('titles the result by what the throw was for', () => {
    expect(resultTitle('Roll a D6 for the hunt; the die bags a ration a hunter at 2, two at 4, three at 6')).toBe('The hunt');
    expect(resultTitle("Roll a D6 for the natives' nerve; the die × 4 askaris ÷ policy 4 over 1 warrior and they hide")).toBe("The natives' nerve");
    expect(resultTitle('Roll 2 D6 for surprise; 4+ and the expedition is ready')).toBe('Surprise');
  });
});
