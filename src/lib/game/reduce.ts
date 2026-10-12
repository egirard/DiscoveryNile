import { REDUCER_VERSION, SCHEMA_VERSION, type GameEvent } from './events';
import { initialState, type GameState } from './state';
import { reduceSeats } from '$features/seats/reducer';

export type Step = (state: GameState, event: GameEvent) => GameState | string;

// Each feature contributes a step. A step returns the new state, or a string explaining
// why the event is illegal (which becomes a diagnostic and leaves state untouched).
const steps: Step[] = [reduceSeats];

export function reduceOne(state: GameState, event: GameEvent): GameState {
  if (event.schemaVersion !== SCHEMA_VERSION || event.reducerVersion !== REDUCER_VERSION) {
    return reject(state, event, `incompatible version ${event.schemaVersion}/${event.reducerVersion}`);
  }
  for (const step of steps) {
    const result = step(state, event);
    if (typeof result === 'string') return reject(state, event, result);
    if (result !== state) return result;
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
