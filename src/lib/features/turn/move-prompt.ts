// The prompt to move (PROMPTS.md, prompt 74): while it is a seat's turn and its expedition has a hex it may step
// into, the turn's record at the seat's edge says so, with the movement points left once the turn's mode of travel
// is settled (the first step settles it: on foot, mounted or by canoe), and offers the end of the turn in the same
// line. This module is the pure part: when, and the words.
import type { GameState } from '$lib/game/state';
import type { SeatId } from '$lib/tabletop/seats';
import { moveTargets } from '$features/exploration/reducer';
import { remainsAmongNatives } from './reducer';

export interface MovePrompt {
  seat: SeatId;
  /** Movement points left this turn; null before the first step, which settles how the expedition travels. */
  left: number | null;
  /** The expedition stands among natives it has not met this turn (prompt 77): ending the turn is remaining, and meets them. */
  natives?: true;
}

/** The seat to prompt for a move: its turn, free to act, nothing held for dice, a hex open to its expedition. */
export function movePromptFor(state: GameState): MovePrompt | null {
  const t = state.turn;
  if (!t || state.ended || state.awaiting || t.phase !== 'act') return null;
  const explorer = state.explorers.find((e) => e.seat === t.current && e.location.kind !== 'dead');
  if (!explorer || moveTargets(state, explorer).length === 0) return null;
  const mv = t.movement;
  return { seat: t.current, left: mv ? (mv.halted ? 0 : mv.points - mv.spent) : null, ...(remainsAmongNatives(state) ? { natives: true as const } : {}) };
}

/** The words before the END TURN control: "You have 2 MP: pick a hex to move into, or"; among natives not yet met, before REMAIN. */
export function movePromptText(left: number | null, natives = false): string {
  const pick = 'pick a hex to move into, or';
  const text = left === null ? `P${pick.slice(1)}` : `You have ${left} MP: ${pick}`;
  return natives ? `Natives here. ${text}` : text;
}
