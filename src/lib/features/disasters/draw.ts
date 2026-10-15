// The disaster step of an African turn (rules §10): outside a port of entry or Cape Colony, the
// top card is drawn and shown to the player in full (phase `disaster`, PROMPTS.md prompt 34); once read
// (`disaster/faced`) its disaster face is resolved against the expedition's situation and the card
// discarded. Rolls and the outcome go to the turn log for the rail.
import type { ExplorerState, GameState, Phase, RollRecord } from '$lib/game/state';
import { card, type CardId } from '$features/cards/deck';
import { shuffleWith } from '$lib/game/random';
import { coastal } from '$features/exploration/movement';
import { courseAt, oasisKnownTo, terrainOf } from '$features/exploration/reducer';
import { inCapeColony } from './cape-colony';
import { PORTS } from '$features/map/manifest';
import { resolveDisaster, type Situation } from './resolve';
import { replaceExplorer } from '$features/turn/reducer';
import { perish } from '$features/explorers/fate';
import { alive } from '$features/expedition/party';

export function situationOf(state: GameState, e: ExplorerState): Situation | null {
  if (e.location.kind !== 'hex') return null;
  const hex = e.location.hex;
  const m = state.map[hex];
  return { terrain: terrainOf(state, hex), river: courseAt(state, hex) !== null, oasis: oasisKnownTo(m, e.seat), sea: coastal(hex) };
}

/** Camped in a hex outside a port of entry and Cape Colony: disasters are drawn, hunting and meals happen (G-44). */
export function inTheField(e: ExplorerState, map: GameState['map'] = {}): boolean {
  return e.location.kind === 'hex' && !!e.chart && !inCapeColony(e.location.hex, map) && !PORTS.some((p) => p.hex === (e.location as { hex: string }).hex);
}

/** Whether this explorer draws a disaster card at the start of its turn. */
export const drawsDisaster = inTheField;

/**
 * Deal the turn's disaster card: the top of the draw pile (the discards shuffled when it is empty) is held in the
 * turn for the player to read, and the turn stands at phase `disaster` until `disaster/faced`; `then` is the phase
 * the turn goes on to. Null when no card is drawn here.
 */
export function dealDisaster(state: GameState, e: ExplorerState, then: Phase): GameState | null {
  if (!drawsDisaster(e, state.map) || !state.deck) return null;
  let { draw, discard } = state.deck;
  let rng = state.rng!;
  if (draw.length === 0) {
    if (discard.length === 0) return null;
    const shuffled = shuffleWith(discard, rng);
    rng = shuffled.state;
    draw = shuffled.items;
    discard = [];
  }
  const [top, ...rest] = draw as CardId[];
  return { ...state, rng, deck: { draw: rest, discard }, turn: { ...state.turn!, phase: 'disaster', disaster: { card: top, then } } };
}

/** The card read: its disaster face is resolved, logged and discarded, and the turn goes on. */
export function faceDisaster(state: GameState): GameState {
  const turn = state.turn!;
  const { card: top, then } = turn.disaster!;
  const e = alive(state, turn.current);
  const situation = e && situationOf(state, e);
  // Nobody in the field to face it (the explorer gone in the meantime): the card is simply discarded.
  if (!e || !situation || !e.chart) return { ...state, deck: { ...state.deck!, discard: [...state.deck!.discard, top] }, turn: { ...turn, phase: then, disaster: null } };
  const result = resolveDisaster(state.rng!, card(top), situation, { chart: e.chart!, sick: e.sick, specialties: e.specialties }, e.seat);
  const hex = (e.location as { hex: string }).hex;
  const record: RollRecord = { kind: 'disaster', seat: e.seat, hex: hex as RollRecord['hex'], card: top, applies: result.applies, rolls: result.rolls, outcome: result.outcome };
  const next: ExplorerState = { ...e, chart: result.chart, sick: result.sick };
  const after = result.explorerDies ? perish(state, next, 'died', `struck down by ${card(top).disaster.type.replace(/\s*\(.*$/, '')} at ${hex}`) : replaceExplorer(state, next);
  return {
    ...after,
    rng: result.rng,
    deck: { ...state.deck!, discard: [...state.deck!.discard, top] },
    // The card killed him: the seat's turn stays open to read the rail, then passes.
    turn: { ...turn, phase: result.explorerDies ? 'act' : then, disaster: null, moved: turn.moved || result.halted || result.explorerDies, log: [...turn.log, record] }
  };
}
