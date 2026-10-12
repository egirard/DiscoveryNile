// The disaster step of an African turn (rules §10): outside a port of entry or Cape Colony, the
// top card is drawn, its disaster face resolved against the expedition's situation, and the card
// discarded. Rolls and the outcome go to the turn log for the rail.
import type { ExplorerState, GameState, RollRecord } from '$lib/game/state';
import { card, type CardId } from '$features/cards/deck';
import { shuffleWith } from '$lib/game/random';
import { coastal } from '$features/exploration/movement';
import { courseAt, oasisKnownTo, terrainOf } from '$features/exploration/reducer';
import { inCapeColony } from './cape-colony';
import { PORTS } from '$features/map/manifest';
import { resolveDisaster, type Situation } from './resolve';
import { replaceExplorer } from '$features/turn/reducer';
import { perish } from '$features/explorers/fate';

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

export function drawDisaster(state: GameState, e: ExplorerState): GameState {
  if (!drawsDisaster(e, state.map) || !state.deck) return state;
  let { draw, discard } = state.deck;
  let rng = state.rng!;
  if (draw.length === 0) {
    if (discard.length === 0) return state;
    const shuffled = shuffleWith(discard, rng);
    rng = shuffled.state;
    draw = shuffled.items;
    discard = [];
  }
  const [top, ...rest] = draw as CardId[];
  const situation = situationOf(state, e)!;
  const result = resolveDisaster(rng, card(top), situation, { chart: e.chart!, sick: e.sick, specialties: e.specialties });
  const record: RollRecord = { kind: 'disaster', seat: e.seat, hex: (e.location as { hex: string }).hex as RollRecord['hex'], card: top, applies: result.applies, rolls: result.rolls, outcome: result.outcome };
  const next: ExplorerState = { ...e, chart: result.chart, sick: result.sick };
  const turn = state.turn!;
  const hex = (e.location as { hex: string }).hex;
  const after = result.explorerDies ? perish(state, next, 'died', `struck down by ${card(top).disaster.type.replace(/\s*\(.*$/, '')} at ${hex}`) : replaceExplorer(state, next);
  return {
    ...after,
    rng: result.rng,
    deck: { draw: rest, discard: [...discard, top] },
    turn: { ...turn, moved: turn.moved || result.halted || result.explorerDies, log: [...turn.log, record] }
  };
}
