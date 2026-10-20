import { REDUCER_VERSION, SCHEMA_VERSION, type GameEvent } from './events';
import { initialState, type AwaitingDice, type GameState, type RollRecord } from './state';
import { DiceNeeded, generated, settled, withPhysical, withRolled, type DieSource } from './random';
import { allRecords, readOf, tagNew, tagRolls } from './sources';
import { askWhat } from '$features/dice/prompt';
import { reduceSeats } from '$features/seats/reducer';
import { reduceExplorers } from '$features/explorers/reducer';
import { endTurnAfterLost, facesTheCardFirst, reduceTurn, settleWater } from '$features/turn/reducer';
import { reduceExploration } from '$features/exploration/reducer';
import { noteAction } from '$features/turn/actions';
import { promptText } from '$features/dice/prompt';

export type Step = (state: GameState, event: GameEvent) => GameState | string;

// Each feature contributes a step. A step returns the new state, or a string explaining
// why the event is illegal (which becomes a diagnostic and leaves state untouched).
const steps: Step[] = [reduceSeats, reduceExplorers, reduceTurn, reduceExploration];

const NEVER_UNDONE = new Set<string>(['game/created', 'game/started', 'game/begun', 'game/continued', 'disaster/faced', 'seat/taken', 'seat/left', 'turn/undone', 'dice/physical', 'dice/rolled', 'dice/corrected', 'cards/seen']);

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
  // A die's face set right after the fact (prompt 37) is applied by `reduce`, which folds the game again with the die changed.
  if (event.type === 'dice/corrected') return reject(state, event, 'a correction is applied by replaying the game');
  // Physical dice (PROMPTS.md, prompt 18): while an event waits for a roll, only the roll may arrive.
  if (state.awaiting && event.type !== 'dice/rolled') return reject(state, event, `waiting for ${state.awaiting.seat} to roll the dice`);
  if (event.type === 'dice/physical') {
    const { on } = event.payload as { on?: unknown };
    if (typeof on !== 'boolean') return reject(state, event, 'dice/physical needs on: true or false');
    if (state.rng === null) return reject(state, event, 'game has no seed');
    return { ...state, rng: withPhysical(state.rng, on), undo: null };
  }
  if (event.type === 'dice/rolled') {
    const { seat, values, auto, corrected } = event.payload as { seat?: unknown; values?: unknown; auto?: unknown; corrected?: unknown };
    const waiting = state.awaiting;
    if (!waiting) return reject(state, event, 'no roll was asked for');
    if (seat !== waiting.seat) return reject(state, event, `it is ${waiting.seat}'s roll`);
    // A throw may come in parts (PROMPTS.md, prompt 33): a village's loot is a die a warrior, more than a tray holds,
    // so each throw brings some of them until the count is in, or `auto` has the table roll the rest from the
    // stream's generator (deterministic, so every client draws the same).
    const remaining = waiting.count - waiting.have.length;
    let rng = state.rng!;
    let thrown: number[];
    if (auto === true) {
      const r = generated(rng, remaining, waiting.stream);
      rng = r.state;
      thrown = r.values;
    } else {
      if (!Array.isArray(values) || values.length < 1 || values.length > remaining || !values.every((v) => Number.isInteger(v) && v >= 1 && v <= 6))
        return reject(state, event, remaining === waiting.count ? `${waiting.count} ${waiting.count === 1 ? 'die' : 'dice'} of 1 to 6 expected` : `${remaining} more ${remaining === 1 ? 'die' : 'dice'} of 1 to 6 expected`);
      thrown = values as number[];
    }
    const have = [...waiting.have, ...thrown];
    // Each die remembers its throw (prompt 37), so a die in the log can be set right; `corrected` marks the dice a
    // player set by hand (put in the payload by `reduce` when it folds the game again, never sent by the table).
    const byHand = Array.isArray(corrected) ? corrected : [];
    const sources: DieSource[] = thrown.map((_, i) => (byHand.includes(i) ? { eventId: event.id, index: i, corrected: true } : { eventId: event.id, index: i }));
    rng = withRolled(rng, waiting.stream, thrown, waiting.at + waiting.have.length, sources);
    if (have.length < waiting.count) return { ...state, rng, awaiting: { ...waiting, have } };
    const rolled = [...waiting.rolled, { prompt: waiting.prompt, values: have, seat: waiting.seat }];
    return resume({ ...state, rng, awaiting: null }, waiting.event, rolled);
  }
  if (event.type === 'turn/undone') {
    const { seat, eventId } = event.payload as { seat?: unknown; eventId?: unknown };
    if (!state.undo) return reject(state, event, 'nothing to undo');
    if (eventId !== state.undo.eventId) return reject(state, event, 'that is not the last action');
    if (seat !== state.undo.seat) return reject(state, event, `only ${state.undo.seat} may undo it`);
    return { ...state.undo.before, undo: null, diagnostics: state.diagnostics };
  }
  if (state.turn?.phase === 'disaster' && state.turn.disaster && facesTheCardFirst(event.type) && (event.payload as { seat?: unknown }).seat === state.turn.current && state.explorers.some((e) => e.seat === state.turn!.current && e.location.kind === 'hex')) {
    // The seat acts with its disaster card still to be read: the card is faced first (prompt 34).
    const faced = resume(state, { ...event, id: `${event.id}:disaster`, type: 'disaster/faced', payload: { seat: state.turn.current } }, []);
    if (faced.awaiting) return reject(faced, event, 'the disaster card asks for dice first');
    state = { ...faced, undo: null };
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
    if (after.rng === state.rng) return after;
    // The lines the event wrote are tagged with the dice it read (prompt 37) before the dice are dropped.
    const tagged = tagNew(state, after);
    return { ...tagged, rng: tagged.rng === null ? null : settled(tagged.rng) };
  } catch (e) {
    if (!(e instanceof DiceNeeded)) throw e;
    const payloadSeat = (event.payload as { seat?: unknown }).seat;
    const seat = (e.ask.seat ?? (typeof payloadSeat === 'string' ? payloadSeat : undefined) ?? state.turn?.current ?? state.seats[0]?.id) as AwaitingDice['seat'];
    // The lines so far (prompts 34 and 56): what the game as the rule last noted it holds beyond `state`, the lines a rule
    // attached itself, then the lines still in the making, each given the seat whose roll it is.
    const stood = e.state ? tagRolls(allRecords(e.state).slice(allRecords(state).length), readOf(e.state.rng)) : [];
    const making = (e.making ?? []).map((m): RollRecord => ({ ...m, seat }));
    return { ...state, awaiting: { event, seat, stream: e.stream, count: e.count, prompt: promptText(e.count, e.ask), rolled, have: [], at: e.at, sofar: [...stood, ...(e.sofar ?? []), ...making] } };
  }
}

/**
 * A seat that acts has looked at the cards waiting at its edge (prompt 44): any event of the seat clears them, unless
 * the event brought new ones (a turn's draw, a card for a hex published), which wait in their turn.
 */
function cardsSeenByActing(before: GameState, after: GameState, seat: string | undefined): GameState {
  if (!seat) return after;
  const was = before.explorers.find((e) => e.seat === seat);
  const now = after.explorers.find((e) => e.seat === seat);
  if (!was || !now || was.unseen.length === 0 || now.unseen !== was.unseen) return after;
  return { ...after, explorers: after.explorers.map((e) => (e === now ? { ...e, unseen: [] } : e)) };
}

/** The move just made ended lost: its lost check is the turn's last line and says so. */
function lostNow(before: GameState, after: GameState): boolean {
  const last = after.turn?.log.at(-1);
  return !!last && last.kind === 'lost-check' && last.lost === true && after.turn!.log.length > (before.turn?.log.length ?? 0);
}

function apply(state: GameState, event: GameEvent): GameState {
  for (const step of steps) {
    let result = step(state, event);
    if (typeof result === 'string') return reject(state, event, result);
    if (result !== state) {
      // Lost, the expedition can do nothing more this turn: the turn goes straight on to the hunt and passes (prompt 20).
      // The hunt's die asked for on the way: the lost check already made goes with the ask (prompts 34 and 56).
      if (event.type === 'expedition/moved' && lostNow(state, result)) result = endTurnAfterLost(result);
      const seat = (event.payload as { seat?: string }).seat;
      result = cardsSeenByActing(state, result, seat);
      // Wherever there is water the expedition carries as much as it can (prompt 60): water is the slack of the load.
      result = settleWater(result);
      const noted = noteAction(event, state, result);
      return { ...noted, undo: seat && undoable(state, noted, event) ? { eventId: event.id, seat: seat as GameState['seats'][number]['id'], type: event.type, before: { ...state, undo: null } } : null };
    }
  }
  return reject(state, event, `unknown event type ${event.type}`);
}

export function reduce(events: readonly GameEvent[]): GameState {
  return fold(events, true).state;
}

/** Which ask a `dice/rolled` answered: the held event, which of its asks (the throws before it, the dice of this one in) and the prompt. */
interface Answer {
  key: string;
  prompt: string;
}

interface Folded {
  state: GameState;
  /** The stream as applied: every event but the corrections, the dice they corrected changed in place. */
  applied: GameEvent[];
  /** The ask each accepted throw answered, by the throw's event id. */
  answers: Map<string, Answer>;
}

/**
 * Fold the stream. With `correcting`, a `dice/corrected` (PROMPTS.md, prompt 37) is applied by folding the stream so
 * far again with the die's value changed in its throw, and stands only if the game goes on as it did: every later
 * event accepted or refused as before, and every later throw answering the ask it answered. Otherwise the correction
 * is refused with the reason and the game is left as it was.
 */
function fold(events: readonly GameEvent[], correcting: boolean): Folded {
  const seen = new Set<string>();
  let folded: Folded = { state: initialState(), applied: [], answers: new Map() };
  for (const event of events) {
    if (seen.has(event.id)) {
      folded = { ...folded, state: reject(folded.state, event, 'duplicate event id') };
      continue;
    }
    seen.add(event.id);
    if (event.type === 'dice/corrected' && correcting) {
      folded = correct(folded, event);
      continue;
    }
    const waiting = folded.state.awaiting;
    const asked: Answer | null = event.type === 'dice/rolled' && waiting ? { key: `${waiting.event.id} ${waiting.rolled.length} ${waiting.have.length} ${waiting.prompt}`, prompt: waiting.prompt } : null;
    const state = reduceOne(folded.state, event);
    if (asked && state.diagnostics.length === folded.state.diagnostics.length) folded.answers.set(event.id, asked);
    folded.applied.push(event);
    folded = { ...folded, state };
  }
  return folded;
}

function correct(folded: Folded, event: GameEvent): Folded {
  const refuse = (why: string) => ({ ...folded, state: reject(folded.state, event, why) });
  const { eventId, index, value } = event.payload as { eventId?: unknown; index?: unknown; value?: unknown };
  if (typeof eventId !== 'string' || !Number.isInteger(index) || !Number.isInteger(value) || (value as number) < 1 || (value as number) > 6) return refuse('dice/corrected needs the throw\'s eventId, the die\'s index and a value of 1 to 6');
  const at = folded.applied.findIndex((e) => e.id === eventId && e.type === 'dice/rolled');
  if (at < 0) return refuse('no such throw was rolled at the table');
  const rolled = folded.applied[at];
  const payload = rolled.payload as { values?: unknown; auto?: unknown; corrected?: unknown };
  if (payload.auto === true) return refuse('the table rolled that die itself; it was not read from the tray');
  if (!Array.isArray(payload.values) || (index as number) < 0 || (index as number) >= payload.values.length) return refuse('that throw has no such die');
  if (folded.state.diagnostics.some((d) => d.eventId === rolled.id)) return refuse('that throw was refused when it was rolled');
  const was = payload.values[index as number] as number;
  if (was === value) return refuse(`the die already shows a ${value}`);
  const values = payload.values.map((v, k) => (k === index ? value : v));
  const corrected = [...(Array.isArray(payload.corrected) ? payload.corrected : []), index];
  const candidate = folded.applied.map((e, k) => (k === at ? { ...e, payload: { ...payload, values, corrected } } : e));
  const again = fold(candidate, false);
  const refusedThen = new Set(folded.state.diagnostics.map((d) => d.eventId));
  const refusedNow = new Map(again.state.diagnostics.map((d) => [d.eventId, d.reason]));
  const stays = `the die stays a ${was}`;
  for (const e of candidate.slice(at + 1)) {
    const then = refusedThen.has(e.id);
    const now = refusedNow.has(e.id);
    if (now && !then) return refuse(`${stays}: the ${e.type} that followed would be refused (${refusedNow.get(e.id)})`);
    if (then && !now) return refuse(`${stays}: the ${e.type} that followed, refused then, would now go through`);
    if (e.type === 'dice/rolled' && !now) {
      const before = folded.answers.get(e.id);
      const after = again.answers.get(e.id);
      if (before && after && before.key !== after.key) return refuse(`${stays}: the throw ${askWhat(before.prompt)} that followed would answer another ask (${askWhat(after.prompt)})`);
    }
  }
  // The game as it would have gone; the refusals noted so far (earlier corrections among them) are kept.
  return { state: { ...again.state, diagnostics: folded.state.diagnostics }, applied: candidate, answers: again.answers };
}

function reject(state: GameState, event: GameEvent, reason: string): GameState {
  return { ...state, diagnostics: [...state.diagnostics, { eventId: event.id, reason }] };
}
