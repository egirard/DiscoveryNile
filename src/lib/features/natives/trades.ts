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

// ---- Taking an exchange back (PROMPTS.md, prompt 67) -----------------------------------------------------------
// Until "Done trading" the trading with a chief is one bargain still being struck: what was bought can be handed
// back for what it cost and what was sold taken back for what it fetched, so a tap too many is a tap the other way.
// The tally nets: a bearer bought and handed back leaves no line.

/** The units of an exchange as the panel counts its taps: gifts for rations, else the number of the item. */
const units = (t: Trade) => (t.item === 'food' ? t.gifts : t.count);

/** How much of `item` this seat has bought (or sold) from the chief at `hex` this turn and not yet taken back, in the panel's units. */
export function tradedHere(log: readonly RollRecord[], seat: SeatId, hex: HexId, direction: Trade['direction'], item: Item): number {
  let n = 0;
  for (const r of log) if (r.trades && r.seat === seat && r.hex === hex) for (const t of r.trades) if (t.direction === direction && t.item === item) n += units(t);
  return n;
}

/**
 * The turn's log with `back` taken off the exchange it undoes: `back` is the exchange as it was first made (its
 * direction, item, count, gifts and muskets), in part or whole. The latest lines give first; an exchange brought to
 * nothing leaves the tally, and a tally left empty takes its line with it.
 */
export function logTakenBack(log: readonly RollRecord[], seat: SeatId, hex: HexId, back: Trade): RollRecord[] {
  let left = { count: back.count, gifts: back.gifts, muskets: back.muskets ?? 0 };
  const out = [...log];
  for (let i = out.length - 1; i >= 0 && left.count > 0; i--) {
    const r = out[i];
    if (!r.trades || r.seat !== seat || r.hex !== hex) continue;
    const trades: Trade[] = [];
    for (const t of r.trades) {
      if (t.direction !== back.direction || t.item !== back.item || left.count === 0) {
        trades.push(t);
        continue;
      }
      const count = Math.min(t.count, left.count);
      const share = count / left.count;
      const gifts = Math.round(left.gifts * share);
      const muskets = Math.round(left.muskets * share);
      left = { count: left.count - count, gifts: left.gifts - gifts, muskets: left.muskets - muskets };
      if (t.count > count) trades.push({ ...t, count: t.count - count, gifts: t.gifts - gifts, ...(t.muskets ? { muskets: t.muskets - muskets } : {}) });
    }
    if (trades.length) out[i] = { ...r, trades, outcome: tradeLine(trades) };
    else out.splice(i, 1);
  }
  return out;
}
