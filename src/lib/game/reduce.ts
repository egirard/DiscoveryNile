import { REDUCER_VERSION, SCHEMA_VERSION, type GameEvent } from './events';
import { initialState, type GameState } from './state';
import { reduceSeats } from '$features/seats/reducer';
import { reduceExplorers } from '$features/explorers/reducer';
import { reduceTurn } from '$features/turn/reducer';
import { reduceExploration } from '$features/exploration/reducer';
import { noteAction } from '$features/turn/actions';

export type Step = (state: GameState, event: GameEvent) => GameState | string;

// Each feature contributes a step. A step returns the new state, or a string explaining
// why the event is illegal (which becomes a diagnostic and leaves state untouched).
const steps: Step[] = [reduceSeats, reduceExplorers, reduceTurn, reduceExploration];

const NEVER_UNDONE = new Set<string>(['game/created', 'game/started', 'game/continued', 'seat/taken', 'seat/left', 'turn/undone']);

/**
 * A choice not yet resolved by dice can be taken back within the turn (docs/tabletop-ux.md): the event rolled no die,
 * drew no card, kept the same turn and did not end the game, and the current seat made it.
 */
function undoable(before: GameState, after: GameState, event: GameEvent): boolean {
  if (NEVER_UNDONE.has(event.type) || !before.turn || !after.turn) return false;
  const seat = (event.payload as { seat?: unknown }).seat;
  if (seat !== before.turn.current) return false;
  return before.rng === after.rng && before.deck?.draw === after.deck?.draw && before.turn.current === after.turn.current && before.turn.round === after.turn.round && before.ended === after.ended;
}

export function reduceOne(state: GameState, event: GameEvent): GameState {
  if (event.schemaVersion !== SCHEMA_VERSION || event.reducerVersion !== REDUCER_VERSION) {
    return reject(state, event, `incompatible version ${event.schemaVersion}/${event.reducerVersion}`);
  }
  if (event.type === 'turn/undone') {
    const { seat, eventId } = event.payload as { seat?: unknown; eventId?: unknown };
    if (!state.undo) return reject(state, event, 'nothing to undo');
    if (eventId !== state.undo.eventId) return reject(state, event, 'that is not the last action');
    if (seat !== state.undo.seat) return reject(state, event, `only ${state.undo.seat} may undo it`);
    return { ...state.undo.before, undo: null, diagnostics: state.diagnostics };
  }
  for (const step of steps) {
    const result = step(state, event);
    if (typeof result === 'string') return reject(state, event, result);
    if (result !== state) {
      const seat = (event.payload as { seat?: string }).seat;
      const noted = noteAction(event, state, result);
      return { ...noted, undo: seat && undoable(state, noted, event) ? { eventId: event.id, seat: seat as GameState['seats'][number]['id'], type: event.type, before: { ...state, undo: null } } : null };
    }
  }
  return reject(state, event, `unknown event type ${event.type}`);
}

export function reduce(events: readonly GameEvent[]): GameState {
  const seen = new Set<string>();
  let state = initialState();
  for (const event of events) {
    if (seen.has(event.id)) {
      state = reject(state, event, 'duplicate event id');
      continue;
    }
    seen.add(event.id);
    state = reduceOne(state, event);
  }
  return state;
}

function reject(state: GameState, event: GameEvent, reason: string): GameState {
  return { ...state, diagnostics: [...state.diagnostics, { eventId: event.id, reason }] };
}
