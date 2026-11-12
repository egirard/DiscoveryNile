import { describe, expect, it } from 'vitest';
import type { GameState, RollRecord } from '$lib/game/state';
import { initialState } from '$lib/game/state';
import { emptyDirection, emptyText, mappedBy, phasesOf, provisionalTerrain, revealSteps } from './reveal';

// c3r6, up the Benue from the Niger: blank on the printed board, with blank hexes in directions 1 and 2 (c3r5, c4r6)
// and printed jungle in directions 3 to 6 (c3r7, c2r7, c2r6, c2r5).
const ASK = 'Roll a D6 for the direction of the terrain to copy; a mapped neighbour in that direction is copied';
const AGAIN = 'Roll a D6 for the direction of the terrain to copy, once more; a mapped neighbour in that direction is copied';
const base = (): GameState => ({ ...initialState(), turn: { log: [] } as unknown as GameState['turn'] });
function held(rolled: [string, number][], sofar: RollRecord[] = [], id = 'e1'): GameState {
  return { ...base(), awaiting: { event: { id, type: 'expedition/moved', payload: { seat: 'bottom-1', path: ['c3r6'] } }, seat: 'bottom-1', stream: 'main', count: 1, prompt: '', rolled: rolled.map(([prompt, v]) => ({ prompt, values: [v], seat: 'bottom-1' })), have: [], at: 0, sofar } as unknown as GameState['awaiting'] };
}
const terrainLine = (rolls: number[], outcome: string): RollRecord => ({ kind: 'terrain', seat: 'bottom-1', hex: 'c3r6', rolls: rolls.map((value, i) => ({ label: `direction (try ${i + 1})`, value })), outcome });
const applied = (log: RollRecord[]): GameState => ({ ...base(), turn: { log } as unknown as GameState['turn'], map: { c3r6: { terrain: 'jungle' } } as unknown as GameState['map'] });
const lost: [string, number] = ['Roll a D6 to see if you are lost; 4+ means you\'re okay', 6];

describe('the terrain\'s direction played out (prompt 68)', () => {
  it('a step shows the digit, the neighbour, then the copy, or the empty neighbour fading', () => {
    expect(phasesOf({ hex: 'c3r6', direction: 5, neighbour: 'c2r6', terrain: 'jungle', attempt: 1 })).toEqual(['digit', 'hex', 'copy']);
    expect(phasesOf({ hex: 'c3r6', direction: 2, neighbour: 'c4r6', terrain: null, attempt: 1 })).toEqual(['digit', 'hex', 'empty']);
  });
  it('with physical dice each direction die is played as it comes: the lost check is none, an empty neighbour, then the copy', () => {
    const afterLost = held([lost]);
    expect(revealSteps(base(), afterLost)).toEqual([]);
    const first = held([lost, [ASK, 2]]);
    expect(revealSteps(afterLost, first)).toEqual([{ hex: 'c3r6', direction: 2, neighbour: 'c4r6', terrain: null, attempt: 1 }]);
    const second = held([lost, [ASK, 2], [AGAIN, 5]]);
    expect(revealSteps(first, second)).toEqual([{ hex: 'c3r6', direction: 5, neighbour: 'c2r6', terrain: 'jungle', attempt: 2 }]);
    // A later die of the same step (the river, the natives) plays nothing, and neither does the step applied at last.
    const river = held([lost, [ASK, 2], [AGAIN, 5], ['Roll a D6 for the river', 3]]);
    expect(revealSteps(second, river)).toEqual([]);
    expect(revealSteps(river, applied([terrainLine([2, 5], 'mapped jungle: nothing mapped in direction 2, rolled again; jungle copied from the neighbour in direction 5')]))).toEqual([]);
  });
  it('a step applied at once (the table\'s own dice) plays both tries; one whose last die was the direction plays only that', () => {
    const line = terrainLine([1, 6], 'mapped jungle: nothing mapped in direction 1, rolled again; jungle copied from the neighbour in direction 6');
    expect(revealSteps(base(), applied([line]))).toEqual([
      { hex: 'c3r6', direction: 1, neighbour: 'c3r5', terrain: null, attempt: 1 },
      { hex: 'c3r6', direction: 6, neighbour: 'c2r5', terrain: 'jungle', attempt: 2 }
    ]);
    expect(revealSteps(held([lost, [ASK, 1]]), applied([line]))).toEqual([{ hex: 'c3r6', direction: 6, neighbour: 'c2r5', terrain: 'jungle', attempt: 2 }]);
    // Another kind of line, or none, plays nothing.
    expect(revealSteps(base(), applied([{ kind: 'hunting', seat: 'bottom-1', hex: 'c3r6', rolls: [{ label: 'hunting', value: 4 }], outcome: 'fair hunting' }]))).toEqual([]);
  });
  it('the sea and the edge of the map are empty directions', () => {
    const coast = { ...held([[ASK, 1], [AGAIN, 2], [ASK, 3], [ASK, 4], [ASK, 5], [ASK, 6]]) };
    (coast.awaiting!.event.payload as { path: string[] }).path = ['c0r0'];
    for (const s of revealSteps(base(), coast)) if (s.neighbour.includes('-')) expect(s.terrain).toBeNull();
  });
  it('says so once an empty direction waits for the next die, and not after a copy or another die', () => {
    expect(emptyDirection(held([lost]))).toBeNull();
    expect(emptyDirection(held([lost, [ASK, 2]]))).toEqual({ direction: 2, attempt: 1 });
    expect(emptyDirection(held([lost, [ASK, 2], [AGAIN, 1]]))).toEqual({ direction: 1, attempt: 2 });
    expect(emptyDirection(held([lost, [ASK, 5]]))).toBeNull();
    expect(emptyDirection(held([lost, [ASK, 2], [AGAIN, 1], ['Roll a D6 for the terrain', 4]]))).toBeNull();
    expect(emptyDirection(base())).toBeNull();
    expect(emptyText({ direction: 2, attempt: 1 })).toBe('Hex in direction 2 is empty; roll again');
    expect(emptyText({ direction: 1, attempt: 2 })).toBe('Hex in direction 1 is empty too; roll on the terrain table');
  });
  it('a step held for more dice keeps the terrain its line so far gave the hex', () => {
    const line = terrainLine([5], 'mapped jungle-swamp: jungle-swamp copied from the neighbour in direction 5');
    expect(mappedBy(line)).toBe('jungle-swamp');
    expect(mappedBy({ ...line, kind: 'water' })).toBeNull();
    expect(provisionalTerrain(held([lost, [ASK, 5]], [line]).awaiting)).toEqual({ hex: 'c3r6', terrain: 'jungle-swamp' });
    expect(provisionalTerrain(held([lost]).awaiting)).toBeNull();
    expect(provisionalTerrain(null)).toBeNull();
  });
});
