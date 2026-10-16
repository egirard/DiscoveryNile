import { describe, expect, it } from 'vitest';
import { logTrade, talliedTrade, tradeLine, tradeWords, type Trade } from './trades';

describe("the trading's line (prompt 41)", () => {
  it('words each exchange as the log did', () => {
    expect(tradeWords({ direction: 'buy', item: 'bearers', count: 1, gifts: 2 })).toBe('bought 1 bearer for 2 gifts');
    expect(tradeWords({ direction: 'sell', item: 'food', count: 6, gifts: 2 })).toBe('sold 6 rations for 2 gifts');
    expect(tradeWords({ direction: 'buy', item: 'food', count: 3, gifts: 1 })).toBe('bought 3 rations for 1 gift');
    expect(tradeWords({ direction: 'buy', item: 'askaris', count: 2, gifts: 2, muskets: 2 })).toBe('bought 2 askaris for 2 gifts and 2 muskets');
    expect(tradeWords({ direction: 'sell', item: 'canoes', count: 1, gifts: 4 })).toBe('sold 1 canoe for 4 gifts');
  });
  it('sums the same exchange and keeps the order they first happened', () => {
    let t: Trade[] = [];
    t = talliedTrade(t, { direction: 'buy', item: 'bearers', count: 1, gifts: 2 });
    t = talliedTrade(t, { direction: 'sell', item: 'food', count: 3, gifts: 1 });
    t = talliedTrade(t, { direction: 'sell', item: 'food', count: 3, gifts: 1 });
    t = talliedTrade(t, { direction: 'buy', item: 'bearers', count: 1, gifts: 2 });
    t = talliedTrade(t, { direction: 'buy', item: 'askaris', count: 1, gifts: 1, muskets: 1 });
    expect(tradeLine(t)).toBe('bought 2 bearers for 4 gifts; sold 6 rations for 2 gifts; bought 1 askari for 1 gift and 1 musket');
  });
  it('adds to the line while it is the latest, and starts another after anything else', () => {
    const one = logTrade([{ kind: 'trade', seat: 'bottom-1', hex: 'c24r12', rolls: [], outcome: 'the chief permits trade: 3 rations per gift' }], 'bottom-1', 'c24r12', { direction: 'buy', item: 'bearers', count: 1, gifts: 2 });
    expect(one.map((r) => r.outcome)).toEqual(['the chief permits trade: 3 rations per gift', 'bought 1 bearer for 2 gifts']);
    const two = logTrade(one, 'bottom-1', 'c24r12', { direction: 'sell', item: 'food', count: 6, gifts: 2 });
    expect(two.map((r) => r.outcome)).toEqual(['the chief permits trade: 3 rations per gift', 'bought 1 bearer for 2 gifts; sold 6 rations for 2 gifts']);
    expect(two[1].trades).toEqual([{ direction: 'buy', item: 'bearers', count: 1, gifts: 2 }, { direction: 'sell', item: 'food', count: 6, gifts: 2 }]);
    const three = logTrade([...two, { kind: 'specialty', seat: 'bottom-1', hex: 'c24r12', rolls: [], outcome: 'preached' }], 'bottom-1', 'c24r12', { direction: 'buy', item: 'guides', count: 1, gifts: 4 });
    expect(three.at(-1)!.outcome).toBe('bought 1 guide for 4 gifts');
    expect(three).toHaveLength(4);
  });
});
