// The camp's line in the log (PROMPTS.md, prompt 39): everything reorganised in one turn at one place is one line,
// "20 food, 5 muskets cached; 5 bearers dismissed; 10 food taken back from the cache", kept up as each tap adds to
// it, rather than a line a tap ("1 canoes cached" twelve times over). The tally is kept on the record so the line
// can be written again as it grows.
import type { RollRecord } from '$lib/game/state';
import type { SeatId } from '$lib/tabletop/seats';
import type { HexId } from '$features/map/hex';
import type { Item } from './prices';

export type CampAction = 'cache' | 'take' | 'dismiss' | 'release' | 'eat';

export interface CampTally {
  action: CampAction;
  item: Item;
  count: number;
}

/** "5 muskets", "1 musket", "20 food". */
export function someOf(count: number, item: string): string {
  return `${count} ${count === 1 && item.endsWith('s') ? item.slice(0, -1) : item}`;
}

/** Add one reorganisation to the tally: the same action on the same item is summed, the rest keep their order. */
export function tallied(tally: readonly CampTally[], next: CampTally): CampTally[] {
  const at = tally.findIndex((t) => t.action === next.action && t.item === next.item);
  if (at < 0) return [...tally, next];
  return tally.map((t, i) => (i === at ? { ...t, count: t.count + next.count } : t));
}

const WORDED: Record<CampAction, (list: string, total: number) => string> = {
  cache: (list) => `${list} cached`,
  take: (list) => `${list} taken back from the cache`,
  dismiss: (list) => `${list} dismissed`,
  release: (list) => `${list} turned loose`,
  eat: (list, total) => `${list} eaten: ${10 * total} rations`
};

/** The line for a tally: one part an action, in the order the actions first happened, the items of each in order. */
export function campLine(tally: readonly CampTally[]): string {
  const actions = [...new Set(tally.map((t) => t.action))];
  return actions
    .map((action) => {
      const of = tally.filter((t) => t.action === action && t.count > 0);
      return WORDED[action](of.map((t) => someOf(t.count, t.item)).join(', '), of.reduce((n, t) => n + t.count, 0));
    })
    .join('; ');
}

/**
 * The turn's log with one more reorganisation: added to the camp's line when that is the log's latest line (the same
 * seat at the same place), else a new line.
 */
export function logCamp(log: readonly RollRecord[], seat: SeatId, hex: HexId, next: CampTally): RollRecord[] {
  const last = log.at(-1);
  if (last?.camp && last.seat === seat && last.hex === hex) {
    const camp = tallied(last.camp, next);
    return [...log.slice(0, -1), { ...last, camp, outcome: campLine(camp) }];
  }
  const camp = [next];
  return [...log, { kind: 'cache', seat, hex, rolls: [], camp, outcome: campLine(camp) }];
}
