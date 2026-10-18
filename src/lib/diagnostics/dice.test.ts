import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseLog } from './context';
import { consumedRecord, consumptions, describeSuspect, diceHealth, purposeOf, suspects, type AskHeld } from './dice';

const ask: AskHeld = { seat: 'bottom-1', count: 1, have: [], prompt: 'Roll a D6 for the terrain; 1 desert, 2 mountain, 3 swamp, 4 jungle, 5 veldt, 6 lake', stream: 'main', rolled: [{}, {}], event: { id: 'e-9', type: 'expedition/moved' } };

describe('consumedRecord', () => {
  it('writes a dicecam reading as the dice taken with their places and surety, the dice left lying, and what the table ignored', () => {
    const read = {
      rollId: 'r-1',
      dice: [{ value: 3, confidence: 0.947, normalizedPosition: { x: 0.48, y: 0.37 } }, { value: 3, confidence: 0.95, normalizedPosition: { x: 0.51, y: 0.64 } }],
      lay: [{ x: 0.51, y: 0.64 }],
      ignore: [{ dice: [{ value: 3, x: 0.48, y: 0.37 }] }]
    };
    expect(consumedRecord(ask, 'bottom-1', [3], read, 'dicecam', true)).toEqual({
      seat: 'bottom-1',
      source: 'dicecam',
      rollId: 'r-1',
      dice: [{ value: 3, x: 0.51, y: 0.64, confidence: 0.95 }],
      lying: [{ value: 3, x: 0.48, y: 0.37 }],
      ignored: [{ value: 3, x: 0.48, y: 0.37 }],
      moved: true,
      for: { event: 'expedition/moved', eventId: 'e-9', prompt: ask.prompt, stream: 'main', count: 1, have: 0, rolled: 2 }
    });
  });
  it('writes tapped faces without places, and the table rolling the rest without values', () => {
    expect(consumedRecord(ask, 'bottom-1', [5], null, 'tap', false)).toMatchObject({ source: 'tap', rollId: null, dice: [{ value: 5, x: null, y: null, confidence: null }], lying: [], ignored: [], moved: false });
    expect(consumedRecord({ ...ask, count: 12, have: [1, 2, 3, 4] }, 'bottom-1', [], null, 'auto', false)).toMatchObject({ source: 'auto', dice: [], for: { count: 12, have: 4 } });
  });
});

describe('purposeOf', () => {
  it('keeps the purpose of the ask without the dice or the hint', () => {
    expect(purposeOf("Roll a D6 to see if you are lost; 2+ means you're okay")).toBe('to see if you are lost');
    expect(purposeOf('Roll 4 D6 for first player; the highest total goes first')).toBe('for first player');
    expect(purposeOf('')).toBe('');
  });
});

describe('the capture of the 17th read back', () => {
  // diagnostics/LIVBV, 20:41:40 to 20:42:40 UTC (relay lines left out): a step into c21r15 with its lost check and
  // the terrain's dice, the day the user saw the table take a die it had already taken.
  const lines = parseLog(readFileSync(new URL('./fixtures/dice-reuse-2026-10-17.ndjson', import.meta.url), 'utf8'));
  const all = consumptions(lines);

  it('rebuilds every throw taken from the readings, the asks and the throws appended, with where each die lay', () => {
    expect(all.map((c) => [c.at.slice(11, 19), c.dice.map((d) => `${d.value}@${d.x!.toFixed(2)},${d.y!.toFixed(2)}`).join(' '), c.moved, purposeOf(c.prompt)])).toEqual([
      ['20:41:51', '4@0.39,0.35', true, 'to see if you are lost'],
      ['20:42:08', '3@0.48,0.37', true, 'for the direction of the terrain to copy'],
      ['20:42:12', '3@0.51,0.64', true, 'for the direction of the terrain to copy, once more'],
      ['20:42:13', '1@0.48,0.37', false, 'for the terrain'],
      ['20:42:13', '3@0.48,0.37', false, 'for a river source']
    ]);
    expect(all.every((c) => c.seat === 'bottom-1' && c.source === 'dicecam' && c.dice[0].confidence! >= 0.8)).toBe(true);
  });

  it('tells the die taken twice more where it lay while nothing moved: once misread as a 1, then as the 3 it was', () => {
    const found = suspects(all);
    expect(found.map((s) => [s.kind, s.die.value, s.earlier.die.value, s.earlier.at.slice(11, 19)])).toEqual([
      ['unmoved', 1, 3, '2026-10-17T20:42:08.266Z'.slice(11, 19)],
      ['unmoved', 3, 1, '20:42:13']
    ]);
    expect(describeSuspect(found[0])).toBe('20:42:13  bottom-1  1@0.48,0.37 for the terrain  RE-USED: nothing moved since the 3 taken at 20:42:08 for the direction of the terrain to copy lay there; read as a 1 where the 3 lay');
    expect(describeSuspect(found[1])).toBe('20:42:13  bottom-1  3@0.48,0.37 for a river source  RE-USED: nothing moved since the 1 taken at 20:42:13 for the terrain lay there; read as a 3 where the 1 lay');
  });

  it('reports the health of the capture: the throws by source, the dice, and the dice re-used', () => {
    const report = diceHealth('LIVBV', lines);
    expect(report[0]).toBe('LIVBV: 5 throws consumed (5 by the dicecam, 0 tapped, 0 rolled by the table), 5 dice; 2 RE-USED');
    expect(report).toHaveLength(3);
    expect(diceHealth('EMPTY', [])).toEqual(['EMPTY: no dice consumed']);
  });
});

describe('suspects', () => {
  const at = (s: number) => new Date(Date.UTC(2026, 9, 18, 12, 0, s)).toISOString();
  const throwOf = (second: number, value: number, x: number, moved: boolean | null, prompt = 'Roll a D6 for the hunt') => ({ at: at(second), seat: 'bottom-1', source: 'dicecam' as const, rollId: null, dice: [{ value, x, y: 0.5, confidence: 0.9 }], moved, prompt, event: '' });

  it('lists the same face at the same place after a throw to check, within two minutes only, and never a die at a new place', () => {
    expect(suspects([throwOf(0, 4, 0.3, true), throwOf(5, 4, 0.31, true)]).map((s) => s.kind)).toEqual(['same-face']);
    expect(suspects([throwOf(0, 4, 0.3, true), throwOf(5, 2, 0.31, true)])).toEqual([]);
    expect(suspects([throwOf(0, 4, 0.3, true), throwOf(5, 4, 0.5, false)])).toEqual([]);
    expect(suspects([throwOf(0, 4, 0.3, true), throwOf(200, 4, 0.31, true)])).toEqual([]);
  });

  it('prefers the `dice/consumed` lines where the table wrote them, and rebuilds only the readings without one', () => {
    const consumed = { kind: 'dice/consumed', at: at(1), data: { seat: 'top-1', source: 'tap', rollId: null, dice: [{ value: 6, x: null, y: null, confidence: null }], lying: [], ignored: [], moved: false, for: { event: 'game/started', eventId: 'e', prompt: 'Roll 4 D6 for first player', stream: 'main', count: 4, have: 0, rolled: 1 } } };
    const reading = { kind: 'dicecam/reading', at: at(0), data: { rollId: 'r', dice: [{ value: 6, confidence: 0.9, at: { x: 0.2, y: 0.2 } }], verdict: 'taken 6' } };
    const appended = { kind: 'event/appended', at: at(1), data: { type: 'dice/rolled', payload: { seat: 'top-1', values: [6] } } };
    expect(consumptions([reading, appended, consumed]).map((c) => c.source)).toEqual(['tap']);
    expect(consumptions([reading, appended]).map((c) => [c.source, c.dice[0].x])).toEqual([['dicecam', 0.2]]);
    expect(consumptions([appended]).map((c) => [c.source, c.moved])).toEqual([['tap', null]]);
  });
});
