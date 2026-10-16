import { describe, expect, it } from 'vitest';
import { campLine, logCamp, someOf, tallied, type CampTally } from './camp';
import type { RollRecord } from '$lib/game/state';

describe("the camp's line (prompt 39)", () => {
  it('words one action, and one item, in the singular when it is one', () => {
    expect(someOf(1, 'canoes')).toBe('1 canoe');
    expect(someOf(12, 'canoes')).toBe('12 canoes');
    expect(someOf(1, 'food')).toBe('1 food');
    expect(campLine([{ action: 'dismiss', item: 'bearers', count: 1 }])).toBe('1 bearer dismissed');
    expect(campLine([{ action: 'eat', item: 'horses', count: 2 }, { action: 'eat', item: 'camels', count: 1 }])).toBe('2 horses, 1 camel eaten: 30 rations');
  });
  it('sums the same action on the same item and keeps the order things first happened', () => {
    let tally: CampTally[] = [];
    for (let i = 0; i < 12; i++) tally = tallied(tally, { action: 'cache', item: 'canoes', count: 1 });
    expect(campLine(tally)).toBe('12 canoes cached');
    tally = tallied(tally, { action: 'dismiss', item: 'bearers', count: 5 });
    tally = tallied(tally, { action: 'cache', item: 'food', count: 20 });
    tally = tallied(tally, { action: 'take', item: 'canoes', count: 3 });
    expect(campLine(tally)).toBe('12 canoes, 20 food cached; 5 bearers dismissed; 3 canoes taken back from the cache');
  });
  it('adds to the camp line while it is the latest line, and starts another after anything else', () => {
    const one = logCamp([], 'bottom-1', 'c25r11', { action: 'cache', item: 'food', count: 10 });
    expect(one).toEqual([{ kind: 'cache', seat: 'bottom-1', hex: 'c25r11', rolls: [], camp: [{ action: 'cache', item: 'food', count: 10 }], outcome: '10 food cached' }]);
    const two = logCamp(one, 'bottom-1', 'c25r11', { action: 'cache', item: 'food', count: 10 });
    expect(two).toHaveLength(1);
    expect(two[0].outcome).toBe('20 food cached');
    const meal: RollRecord = { kind: 'hunting', seat: 'bottom-1', hex: 'c25r11', rolls: [], outcome: 'no game' };
    const three = logCamp([...two, meal], 'bottom-1', 'c25r11', { action: 'dismiss', item: 'bearers', count: 1 });
    expect(three.map((r) => r.outcome)).toEqual(['20 food cached', 'no game', '1 bearer dismissed']);
    // Another seat's line, or another place, is not added to.
    expect(logCamp(two, 'top-1', 'c25r11', { action: 'cache', item: 'food', count: 1 })).toHaveLength(2);
    expect(logCamp(two, 'bottom-1', 'c25r12', { action: 'cache', item: 'food', count: 1 })).toHaveLength(2);
  });
});
