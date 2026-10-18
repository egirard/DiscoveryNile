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
