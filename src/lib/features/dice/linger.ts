// What the dice just decided, kept in view for a moment (PROMPTS.md, prompts 54 and 55): when the last die of an ask
// is in and the held event has written its lines, the hunt's meal or the natives' nerve and the fight that follows
// would otherwise vanish with the prompt, the table moving straight on. The lines those throws made stay at the
// seat's edge for a moment, every number explained, before the table goes on; a tap carries on sooner.
import type { GameState, RollRecord } from '$lib/game/state';
import { askWhat } from './prompt';

/** The kinds of line worth a moment's pause: the hunt (the meal that follows it) and the natives' nerve or the fight. */
export const LINGER_KINDS = new Set<RollRecord['kind']>(['hunting', 'combat']);

/** Every line the game has written, in order: the turns played and the turn under way. Append-only as the game goes on. */
export function allRecords(state: GameState): RollRecord[] {
  return [...state.history.flatMap((t) => t.log), ...(state.turn?.log ?? [])];
}

/**
 * The lines to keep in view after a throw: when `before` held an event for dice and `after` has applied it, the lines
 * it wrote (the actions noted among them left out), if one of them is a hunt or a fight. Otherwise nothing lingers.
 */
export function lingerLines(before: GameState, after: GameState): RollRecord[] | null {
  if (!before.awaiting || after.awaiting) return null;
  const fresh = allRecords(after).slice(allRecords(before).length);
  return fresh.some((r) => LINGER_KINDS.has(r.kind)) ? fresh.filter((r) => r.kind !== 'action') : null;
}

/** "The hunt" out of "Roll a D6 for the hunt; the die bags …": what the throw was for, as a title. */
export function resultTitle(prompt: string): string {
  return askWhat(prompt).replace(/^for\s+/, '').replace(/^./, (c) => c.toUpperCase());
}
