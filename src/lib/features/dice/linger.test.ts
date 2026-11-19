import { describe, expect, it } from 'vitest';
import type { GameState, RollRecord } from '$lib/game/state';
import { RESULT_MS, allRecords, lingerLines, resultTitle, segmentsOf, summaryOf } from './linger';

const line = (kind: RollRecord['kind'], outcome = ''): RollRecord => ({ kind, seat: 'bottom-1', rolls: [], outcome });
const game = (history: RollRecord[][], turn: RollRecord[] | null, awaiting: boolean): GameState =>
  ({ history: history.map((log) => ({ log })), turn: turn ? { log: turn } : null, awaiting: awaiting ? { seat: 'bottom-1', prompt: 'Roll a D6 for the hunt; the die bags one ration per hunter at 2', event: { type: 'turn/ended' } } : null }) as unknown as GameState;

describe('the lines kept in view after a throw (prompts 54 and 55)', () => {
  it('lists every line of the game in order, the turns played before the turn under way', () => {
    const s = game([[line('lost-check')], [line('terrain')]], [line('disaster')], false);
    expect(allRecords(s).map((r) => r.kind)).toEqual(['lost-check', 'terrain', 'disaster']);
  });
  it('keeps the hunt in view with the lost check that led to it, the turn having passed to history', () => {
    const before = game([], [line('disaster')], true);
    const after = game([[line('disaster'), line('lost-check', 'lost'), line('hunting', 'two per hunter')]], [], false);
    expect(lingerLines(before, after)!.map((r) => r.kind)).toEqual(['lost-check', 'hunting']);
  });
  it("keeps the natives' reaction and the fight, leaving out the action noted, and a lost check alone as well (prompt 56)", () => {
    const before = game([], [line('disaster')], true);
    const after = game([], [line('disaster'), line('action', 'chose policy 4'), line('reaction', 'hostile'), line('combat', 'the natives hide')], false);
    expect(lingerLines(before, after)!.map((r) => r.kind)).toEqual(['reaction', 'combat']);
    expect(lingerLines(before, game([], [line('disaster'), line('lost-check', 'lost')], false))!.map((r) => r.kind)).toEqual(['lost-check']);
    expect(lingerLines(before, game([], [line('disaster'), line('action', 'drew a card')], false))).toBeNull();
  });
  it('lingers only when the throw finished the event: not while more dice are asked for, nor on an ordinary event, nor after the roll for first player', () => {
    const held = game([], [line('hunting')], true);
    expect(lingerLines(held, held)).toBeNull();
    expect(lingerLines(game([], [], false), game([], [line('hunting')], false))).toBeNull();
    const starting = { ...game([], null, true), awaiting: { seat: 'bottom-1', prompt: 'Roll 4 D6 for first player', event: { type: 'game/started' } } } as unknown as GameState;
    expect(lingerLines(starting, game([[line('first-player')]], [], false))).toBeNull();
  });
  it('titles the result by what the throw was for', () => {
    expect(resultTitle('Hunt: Roll a D6; 1 nothing, 2 or 3 one ration a hunter')).toBe('Hunt: Roll a D6');
    expect(resultTitle('Lost? Roll a D6; 2+ finds the way')).toBe('Lost? Roll a D6');
    expect(resultTitle('3D6 added gives the gifts the chief returns')).toBe('3D6 added gives the gifts the chief returns');
  });
});

describe('a result kept whole, a segment at a time (prompt 79)', () => {
  it('stays five seconds by itself', () => {
    expect(RESULT_MS).toBe(5000);
  });
  it('keeps a step into a hex as one segment: the lost check, the terrain, its details and the natives', () => {
    const at = (kind: RollRecord['kind']): RollRecord => ({ ...line(kind), hex: 'c24r12' });
    const s = segmentsOf([at('lost-check'), at('terrain'), at('water'), at('natives')]);
    expect(s.map((x) => [x.name, x.title, x.lines.map((r) => r.kind)])).toEqual([['step', 'The step into c24r12', ['lost-check', 'terrain', 'water', 'natives']]]);
  });
  it('tells a step lost from the hunt it led to, and the natives dealt with from both', () => {
    expect(segmentsOf([{ ...line('lost-check', 'lost'), hex: 'c25r12' }, line('hunting')]).map((x) => x.title)).toEqual(['The step into c25r12', 'End of turn']);
    expect(segmentsOf([line('reaction'), line('combat'), line('victory')]).map((x) => [x.name, x.lines.length])).toEqual([['natives', 3]]);
    expect(segmentsOf([])).toEqual([]);
  });
});

describe('the summary of an operation (prompt 89)', () => {
  const r = (kind: string, more: Record<string, unknown> = {}) => ({ kind, seat: 'bottom-1', rolls: [], outcome: '', ...more }) as unknown as RollRecord;
  it('names the operation, then what each line found, and leaves out a line that found nothing', () => {
    expect(summaryOf([r('lost-check'), r('terrain', { op: 'Explored c24r12', brief: 'veldt' }), r('water', { brief: '' }), r('natives', { brief: '' })], 'The step')).toBe('Explored c24r12 => Veldt');
    expect(summaryOf([r('terrain', { op: 'Explored c24r12', brief: 'jungle with mountain' }), r('water', { brief: 'the second highest peak (22,000 ft); a river source with a cataract' }), r('natives', { brief: 'tribe 1, 8 warriors' })], 'The step')).toBe('Explored c24r12 => Jungle with mountain; the second highest peak (22,000 ft); a river source with a cataract; tribe 1, 8 warriors');
  });
  it('tells a step lost or turned back by that line alone', () => {
    expect(summaryOf([r('lost-check', { lost: true, op: 'Lost on the way to c24r12', brief: 'the turn ends' })], 'The step')).toBe('Lost on the way to c24r12 => The turn ends');
    expect(summaryOf([r('lost-check'), r('terrain', { op: 'Explored c23r12', brief: 'swamp' }), r('turned-back', { op: 'Turned back from c23r12', brief: 'swamp, no way in on foot' })], 'The step')).toBe('Turned back from c23r12 => Swamp, no way in on foot');
  });
  it('is the operation alone when nothing was found, and the fallback when no line names it', () => {
    expect(summaryOf([r('hunting', { op: 'End of turn', brief: '' })], 'The hunt')).toBe('End of turn');
    expect(summaryOf([r('combat')], 'The natives')).toBe('The natives');
  });
});
