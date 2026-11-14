// What the dice just decided, kept in view for a moment (PROMPTS.md, prompts 54 to 56): when the last die of an ask
// is in and the held event has written its lines, the result would otherwise vanish with the prompt, the table moving
// straight on to the next turn, the next card or the next choice. The lines the throw made stay at the seat's edge
// for a moment, every number explained, before the table goes on; a tap carries on sooner. When the same event goes
// straight on to another ask, nothing lingers: that ask shows the lines so far itself (prompt 34).
import type { GameState, RollRecord } from '$lib/game/state';
import { allRecords } from '$lib/game/sources';
import { askWhat } from './prompt';

export { allRecords };

/**
 * The lines to keep in view after a throw: when `before` held an event for dice and `after` has applied it in full,
 * the lines it wrote (the actions noted among them left out). Nothing lingers while more dice are asked for, after
 * the roll for first player (shown at every station in its own way, prompt 27), or when the throw wrote no line.
 */
export function lingerLines(before: GameState, after: GameState): RollRecord[] | null {
  if (!before.awaiting || after.awaiting) return null;
  if (before.awaiting.event.type === 'game/started') return null;
  const fresh = allRecords(after).slice(allRecords(before).length).filter((r) => r.kind !== 'action');
  return fresh.length ? fresh : null;
}

/** "The hunt" out of "Roll a D6 for the hunt; the die bags …": what the throw was for, as a title. */
export function resultTitle(prompt: string): string {
  return askWhat(prompt).replace(/^for\s+/, '').replace(/^./, (c) => c.toUpperCase());
}

/** How long a result stays at the seat's edge by itself (PROMPTS.md, prompt 79): five seconds, or until OK is tapped. */
export const RESULT_MS = 5000;

/**
 * A segment of a turn (prompt 79): one step into a hex (the hex picked, the lost check, the terrain, its details,
 * the natives found there), the natives dealt with, or the hunt that closes the turn. A result is kept whole, a
 * segment at a time.
 */
export interface Segment {
  name: 'step' | 'natives' | 'hunt' | 'other';
  title: string;
  lines: RollRecord[];
}

const STEP = new Set<RollRecord['kind']>(['lost-check', 'terrain', 'water', 'turned-back', 'canoes', 'natives', 'transit']);
const NATIVES = new Set<RollRecord['kind']>(['reaction', 'combat', 'defeat', 'captivity', 'victory', 'loot', 'negotiation', 'poison', 'trade']);
const segmentOf = (r: RollRecord): Segment['name'] => (r.kind === 'hunting' ? 'hunt' : STEP.has(r.kind) ? 'step' : NATIVES.has(r.kind) ? 'natives' : 'other');

/** The lines of a result by segment, in the order they were made: a step lost and the hunt it led to are two. */
export function segmentsOf(lines: RollRecord[]): Segment[] {
  const out: Segment[] = [];
  for (const r of lines) {
    const name = segmentOf(r);
    const last = out.at(-1);
    if (last && last.name === name && (name !== 'step' || last.lines[0].hex === r.hex)) last.lines.push(r);
    else out.push({ name, title: name === 'hunt' ? 'The hunt' : name === 'step' ? (r.hex ? `The step into ${r.hex}` : 'The step') : name === 'natives' ? 'The natives' : '', lines: [r] });
  }
  return out;
}
