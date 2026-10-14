import { REDUCER_VERSION, SCHEMA_VERSION, type GameEvent } from './events';
import { initialState, type AwaitingDice, type GameState } from './state';
import { DiceNeeded, settled, withPhysical, withRolled } from './random';
import { reduceSeats } from '$features/seats/reducer';
import { reduceExplorers } from '$features/explorers/reducer';
import { reduceTurn } from '$features/turn/reducer';
import { reduceExploration } from '$features/exploration/reducer';
import { noteAction } from '$features/turn/actions';
import { promptText } from '$features/dice/prompt';

export type Step = (state: GameState, event: GameEvent) => GameState | string;

// Each feature contributes a step. A step returns the new state, or a string explaining
// why the event is illegal (which becomes a diagnostic and leaves state untouched).
const steps: Step[] = [reduceSeats, reduceExplorers, reduceTurn, reduceExploration];

const NEVER_UNDONE = new Set<string>(['game/created', 'game/started', 'game/continued', 'seat/taken', 'seat/left', 'turn/undone', 'dice/physical', 'dice/rolled']);

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
  // Physical dice (PROMPTS.md, prompt 18): while an event waits for a roll, only the roll may arrive.
  if (state.awaiting && event.type !== 'dice/rolled') return reject(state, event, `waiting for ${state.awaiting.seat} to roll the dice`);
  if (event.type === 'dice/physical') {
    const { on } = event.payload as { on?: unknown };
    if (typeof on !== 'boolean') return reject(state, event, 'dice/physical needs on: true or false');
    if (state.rng === null) return reject(state, event, 'game has no seed');
    return { ...state, rng: withPhysical(state.rng, on), undo: null };
  }
  if (event.type === 'dice/rolled') {
    const { seat, values } = event.payload as { seat?: unknown; values?: unknown };
    const waiting = state.awaiting;
    if (!waiting) return reject(state, event, 'no roll was asked for');
    if (seat !== waiting.seat) return reject(state, event, `it is ${waiting.seat}'s roll`);
    if (!Array.isArray(values) || values.length !== waiting.count || !values.every((v) => Number.isInteger(v) && v >= 1 && v <= 6))
      return reject(state, event, `${waiting.count} ${waiting.count === 1 ? 'die' : 'dice'} of 1 to 6 expected`);
    const rolled = [...waiting.rolled, { prompt: waiting.prompt, values: values as number[] }];
    return resume({ ...state, rng: withRolled(state.rng!, waiting.stream, values as number[]), awaiting: null }, waiting.event, rolled);
  }
  if (event.type === 'turn/undone') {
    const { seat, eventId } = event.payload as { seat?: unknown; eventId?: unknown };
    if (!state.undo) return reject(state, event, 'nothing to undo');
    if (eventId !== state.undo.eventId) return reject(state, event, 'that is not the last action');
    if (seat !== state.undo.seat) return reject(state, event, `only ${state.undo.seat} may undo it`);
    return { ...state.undo.before, undo: null, diagnostics: state.diagnostics };
  }
  return resume(state, event, []);
}

/**
 * Apply an event, or hold it for the dice it needs: a rule that reaches a physical roll with nothing rolled yet
 * throws `DiceNeeded` before anything is changed, and the table asks the seat for that throw. Once the dice
 * arrive the event is applied again from the same state, its earlier throws read back in order from the
 * stream's script, until it either completes or stops at the next roll.
 */
function resume(state: GameState, event: GameEvent, rolled: AwaitingDice['rolled']): GameState {
  try {
    const after = apply(state, event);
    return after.rng === state.rng ? after : { ...after, rng: after.rng === null ? null : settled(after.rng) };
  } catch (e) {
    if (!(e instanceof DiceNeeded)) throw e;
    const payloadSeat = (event.payload as { seat?: unknown }).seat;
    const seat = (e.ask.seat ?? (typeof payloadSeat === 'string' ? payloadSeat : undefined) ?? state.turn?.current ?? state.seats[0]?.id) as AwaitingDice['seat'];
    return { ...state, awaiting: { event, seat, stream: e.stream, count: e.count, prompt: promptText(e.count, e.ask), rolled } };
  }
}

function apply(state: GameState, event: GameEvent): GameState {
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
