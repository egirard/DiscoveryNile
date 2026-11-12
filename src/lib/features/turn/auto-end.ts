// A turn that ends itself (PROMPTS.md, prompt 70): an expedition in the field that has spent its movement has
// nothing left but the hunt, so the table ends the turn and goes on to the hunting die without waiting for the
// end-turn control. The table does it (it appends the same `turn/ended` the control does), not the reducer, so a
// game's events replay as they were made. This module is the pure part: when.
import type { GameState } from '$lib/game/state';
import type { SeatId } from '$lib/tabletop/seats';
import { moveTargets, researchPending } from '$features/exploration/reducer';
import { hexAt } from '$features/map/manifest';

/**
 * The seat whose expedition is out of moves: its turn, free to act, nothing held for dice, standing in a hex of the
 * field (at a port there is the voyage home and the outfitter still), having moved this turn, with no hex left it
 * may step into and no study owed. Null otherwise.
 */
export function outOfMoves(state: GameState): SeatId | null {
  const t = state.turn;
  if (!t || state.ended || state.awaiting || t.phase !== 'act') return null;
  const explorer = state.explorers.find((e) => e.seat === t.current && e.location.kind !== 'dead');
  if (!explorer || explorer.location.kind !== 'hex' || hexAt(explorer.location.hex)?.port) return null;
  if (!t.movement || t.movement.spent <= 0) return null;
  if (moveTargets(state, explorer).length > 0) return null;
  if (!t.moved && researchPending(explorer).length > 0) return null;
  return t.current;
}

/**
 * The seat whose turn the table should end for it after a change of the game: the expedition has just run out of
 * moves. Not after an undo, which hands the turn back to be played another way, and not for a game found that way
 * (a reload): then the end-turn control stands as it always did.
 */
export function endsItself(before: GameState, after: GameState, lastEvent: string | undefined): SeatId | null {
  if (lastEvent === 'turn/undone') return null;
  const seat = outOfMoves(after);
  return seat && outOfMoves(before) !== seat ? seat : null;
}
