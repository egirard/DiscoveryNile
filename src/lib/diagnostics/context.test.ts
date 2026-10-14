import { describe, expect, it } from 'vitest';
import { describeLine, localClock, parseLog, select, summariseState, utcClock } from './context';
import { reduce } from '$lib/game/reduce';
import { created } from '$lib/game/test-fixtures';

describe('reading the diagnostics capture back', () => {
  const text = [
    '2026-10-14T12:00:00.000Z {"kind":"events/loaded","data":{"count":3,"last":"seat/taken"}}',
    '2026-10-14T12:00:05.000Z {"kind":"dice/asked","data":{"seat":"bottom-1","count":1,"prompt":"Roll a D6 for the hunt; the die bags a ration a hunter at 2, two at 4, three at 6","rolled":[{"prompt":"lost","values":[1]}],"lying":[{"value":1,"x":0.25,"y":0.5}]}}',
    '2026-10-14T12:00:06.000Z {"kind":"dicecam/reading","data":{"rollId":"r7","kind":"update","dice":[{"value":1,"confidence":0.91,"askew":false,"at":{"x":0.25,"y":0.5}}],"verdict":"lying there already"}}',
    '2026-10-14T12:00:08.000Z {"kind":"dicecam/rolling","data":{"asked":true}}',
    '2026-10-14T12:00:09.000Z {"kind":"dicecam/reading","data":{"rollId":"r8","kind":"initial","dice":[{"value":5,"confidence":0.88,"askew":false,"at":{"x":0.4,"y":0.52}}],"verdict":"taken 5"}}',
    '2026-10-14T12:00:09.100Z {"kind":"event/appended","data":{"id":"host-00000004","type":"dice/rolled","payload":{"seat":"bottom-1","values":[5]}}}',
    'garbage line',
    ''
  ].join('\n');
  it('parses the log and words each line', () => {
    const lines = parseLog(text);
    expect(lines.map((l) => l.kind)).toEqual(['events/loaded', 'dice/asked', 'dicecam/reading', 'dicecam/rolling', 'dicecam/reading', 'event/appended', '?']);
    expect(lines.map((l) => describeLine(l))).toEqual([
      '12:00:00  (opened with 3 events, the last seat/taken)',
      '12:00:05  asked bottom-1: Roll a D6 for the hunt; the die bags a ration a hunter at 2, two at 4, three at 6 (already 1)',
      '12:00:06  dicecam r7 1@0.25,0.50(0.91) → lying there already',
      '12:00:08  dicecam rolling',
      '12:00:09  dicecam r8 5@0.40,0.52(0.88) → taken 5',
      '12:00:09  dice/rolled  {"seat":"bottom-1","values":[5]}',
      '  ?  "garbage line"'
    ]);
    expect(describeLine(lines[0], utcClock)).toBe(describeLine(lines[0]));
    expect(describeLine(lines[0], localClock)).toMatch(/^\d\d:\d\d:\d\d  \(opened/);
    expect(select(lines, { last: 2 }).map((l) => l.kind)).toEqual(['event/appended', '?']);
    expect(select(lines, { since: '2026-10-14T12:00:08' }).map((l) => l.at)).toEqual(['2026-10-14T12:00:08.000Z', '2026-10-14T12:00:09.000Z', '2026-10-14T12:00:09.100Z']);
  });
  it('summarises the game the captured stream reduces to', () => {
    expect(summariseState(reduce([]))).toEqual(['no game']);
    const lines = summariseState(reduce([created('ABCDE', { bottom: 1, top: 1, left: 0, right: 0 }, 5)]));
    expect(lines[0]).toBe('game ABCDE, 0 seats taken');
  });
});
