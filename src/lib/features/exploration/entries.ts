// The log by operation (PROMPTS.md, prompt 90; docs/sample-turn-text.md): a step into a hex, a meeting with natives
// or the end of a turn is one entry, told briefly by its summary ("Explored c24r12 => Veldt; tribe 1, 8 warriors")
// and in full by the lines under it, which the entry opens to show. A line outside any operation (a card drawn, a
// disaster, a publication) is an entry by itself, told as it always was.
import type { RollRecord } from '$lib/game/state';
import { segmentsOf } from '$features/dice/linger';

export interface LogEntryData {
  /** The operation's summary, or null for a line told by itself. */
  summary: string | null;
  /** The lines of the operation, in the order they were made. */
  lines: RollRecord[];
  /** Where the entry's last line stands among the lines it was made from. */
  index: number;
}

/** The entries of one turn's lines, oldest first. `from` is where the turn's first line stands in the whole log. */
export function entriesOf(lines: RollRecord[], from = 0): LogEntryData[] {
  const out: LogEntryData[] = [];
  let at = from;
  for (const s of segmentsOf(lines)) {
    // An operation is summed up when one of its lines names it; lines no rule has named are told one by one.
    if (s.name !== 'other' && s.lines.some((r) => r.op)) {
      at += s.lines.length;
      out.push({ summary: s.title, lines: s.lines, index: at - 1 });
    } else for (const r of s.lines) out.push({ summary: null, lines: [r], index: at++ });
  }
  return out;
}

/** An entry has more to show than its brief line: the lines of its operation, or the asks its dice answered. */
export const hasMore = (e: LogEntryData): boolean => e.summary !== null || e.lines.some((r) => (r.asks?.length ?? 0) > 0);
