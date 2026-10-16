// The trading's line in the log (PROMPTS.md, prompt 41): every exchange with one chief in one turn is one line,
// "bought 1 bearer for 2 gifts; sold 6 rations for 2 gifts", written again as each tap adds to it, rather than a line
// a tap. The tally is kept on the record so the line can be written again as it grows, as the camp's is (camp.ts).
import type { RollRecord } from '$lib/game/state';
import type { SeatId } from '$lib/tabletop/seats';
import type { HexId } from '$features/map/hex';
import type { Item } from '$features/expedition/prices';
import { someOf } from '$features/expedition/camp';

export interface Trade {
  direction: 'buy' | 'sell';
  item: Item;
  /** Rations for food, else the number of the item. */
  count: number;
  gifts: number;
  /** Muskets handed over with askaris bought. */
  muskets?: number;
}

/** Add one exchange to the tally: the same direction and item are summed, the rest keep their order. */
export function talliedTrade(trades: readonly Trade[], next: Trade): Trade[] {
  const at = trades.findIndex((t) => t.direction === next.direction && t.item === next.item);
  if (at < 0) return [...trades, next];
  return trades.map((t, i) => (i === at ? { ...t, count: t.count + next.count, gifts: t.gifts + next.gifts, ...(t.muskets || next.muskets ? { muskets: (t.muskets ?? 0) + (next.muskets ?? 0) } : {}) } : t));
}

const gifts = (n: number) => `${n} gift${n === 1 ? '' : 's'}`;

/** One exchange in words: "bought 1 bearer for 2 gifts", "sold 6 rations for 2 gifts", "bought 2 askaris for 2 gifts and 2 muskets". */
export function tradeWords(t: Trade): string {
  const what = t.item === 'food' ? `${t.count} rations` : someOf(t.count, t.item);
  const paid = t.direction === 'buy' && t.muskets ? `${gifts(t.gifts)} and ${someOf(t.muskets, 'muskets')}` : gifts(t.gifts);
  return `${t.direction === 'buy' ? 'bought' : 'sold'} ${what} for ${paid}`;
}

/** The line for a tally, each exchange in the order it first happened. */
export function tradeLine(trades: readonly Trade[]): string {
  return trades.map(tradeWords).join('; ');
}

/** The turn's log with one more exchange: added to the trading's line when that is the log's latest line, else a new line. */
export function logTrade(log: readonly RollRecord[], seat: SeatId, hex: HexId, next: Trade): RollRecord[] {
  const last = log.at(-1);
  if (last?.trades && last.seat === seat && last.hex === hex) {
    const trades = talliedTrade(last.trades, next);
    return [...log.slice(0, -1), { ...last, trades, outcome: tradeLine(trades) }];
  }
  const trades = [next];
  return [...log, { kind: 'trade', seat, hex, rolls: [], trades, outcome: tradeLine(trades) }];
}
