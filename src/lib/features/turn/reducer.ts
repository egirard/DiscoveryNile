import type { GameEvent } from '$lib/game/events';
import type { ExplorerState, GameState, RollOff, RollRecord } from '$lib/game/state';
import type { HexId } from '$features/map/hex';
import { dice, shuffleWith } from '$lib/game/random';
import { CARD_IDS, card, handValue, isCardId, type CardId } from '$features/cards/deck';
import { BOARD, PORTS, type PortId } from '$features/map/manifest';
import { ITEMS, availableAt, cost, type Purchases } from '$features/expedition/prices';
import type { SeatId } from '$lib/tabletop/seats';
import { drawDisaster, inTheField, situationOf } from '$features/disasters/draw';
import { oasisSearch, oasisSearchable, terrainOf } from '$features/exploration/reducer';
import { react } from '$features/natives/reaction';
import { consequencesOfDefeat, loot, resultsOfVictory, searchVillage } from '$features/natives/aftermath';
import type { Tribe } from '$lib/game/state';
import type { Chart } from '$features/expedition/prices';
import { distanceToNearestPort } from '$features/natives/discovery';
import { modeFor } from '$features/exploration/movement';
import { directionTo } from '$features/map/hex';
import { drink, dryDesert, feed, hunt } from '$features/rations/rations';

export const OPENING_HAND = 5;
export const HAND_LIMIT = 5;
export const PASSAGE_FARE = 500;

/** Seats holding a living explorer, in clockwise table order. */
export function explorerSeats(state: GameState): SeatId[] {
  return state.seats.filter((s) => state.explorers.some((e) => e.seat === s.id && e.location.kind !== 'dead')).map((s) => s.id);
}

export function currentExplorer(state: GameState): ExplorerState | undefined {
  return state.turn ? state.explorers.find((e) => e.seat === state.turn!.current && e.location.kind !== 'dead') : undefined;
}

function replaceExplorer(state: GameState, explorer: ExplorerState): GameState {
  return { ...state, explorers: state.explorers.map((e) => (e.seat === explorer.seat && e.location.kind !== 'dead' ? explorer : e)) };
}

/** Take the top card; when the draw pile is empty the discards are shuffled to form a new one. */
function drawOne(state: GameState, explorer: ExplorerState): GameState {
  let { draw, discard } = state.deck!;
  let rng = state.rng!;
  if (draw.length === 0) {
    if (discard.length === 0) return state; // every card is in a hand
    const shuffled = shuffleWith(discard, rng);
    rng = shuffled.state;
    draw = shuffled.items;
    discard = [];
  }
  const [top, ...rest] = draw;
  const next: ExplorerState = { ...explorer, hand: [...explorer.hand, top], drawnRound: { ...explorer.drawnRound, [top]: state.turn!.round } };
  return { ...replaceExplorer(state, next), rng, deck: { draw: rest, discard } };
}

/** Hand the turn to the next seat clockwise; a new round starts when the order wraps. */
function advance(state: GameState): GameState {
  const { order, current, round } = state.turn!;
  const alive = (seat: SeatId) => state.explorers.some((e) => e.seat === seat && e.location.kind !== 'dead');
  let i = order.indexOf(current);
  let nextRound = round;
  for (let step = 0; step < order.length; step++) {
    if (i + 1 >= order.length) nextRound++;
    i = (i + 1) % order.length;
    if (alive(order[i])) return beginTurn({ ...state, rollOff: null, turn: { ...state.turn!, round: nextRound } }, order[i]);
  }
  return state; // no living explorer: the game's end arrives with 030 (G-62)
}

/**
 * The start of a turn. In Europe (rules §4): expired free tickets go to the discard pile, then
 * the hand limit applies (the player chooses what to discard), then one card is drawn. At sea:
 * the explorer lands at the chosen port and this turn is the one the rules say is skipped.
 */
function beginTurn(state: GameState, seat: SeatId): GameState {
  const turn = { ...state.turn!, current: seat, phase: 'act' as const, moved: false, movement: null, policy: null, log: [] };
  state = { ...state, turn };
  let explorer = currentExplorer(state)!;
  if (explorer.location.kind === 'voyage') {
    const port = explorer.location.port;
    const landed = replaceExplorer(state, { ...explorer, location: { kind: 'port', port }, known: [BOARD.ports[port].hex] });
    return advance(landed);
  }
  if (explorer.location.kind === 'captive') return escapeAttempt(state, explorer);
  if (explorer.location.kind === 'hex') {
    const hex = explorer.location.hex;
    state = villageRetry(state, explorer);
    explorer = currentExplorer(state)!;
    const rechecked = oasisRecheck(state, explorer);
    const drawn = drawDisaster(rechecked, currentExplorer(rechecked)!);
    // Remaining in a hex with natives: a policy is chosen again (rules §8.1), unless the village's spoils are being dealt with.
    if (drawn.turn!.phase === 'spoils') return drawn;
    return drawn.map[hex]?.tribe != null ? { ...drawn, turn: { ...drawn.turn!, phase: 'natives' } } : drawn;
  }
  if (explorer.location.kind !== 'europe') return state;
  const expired = explorer.hand.filter((id) => card(id).donation.kind === 'ticket' && (explorer.drawnRound[id] ?? 0) < turn.round);
  if (expired.length) {
    const drawnRound = { ...explorer.drawnRound };
    for (const id of expired) delete drawnRound[id];
    explorer = { ...explorer, hand: explorer.hand.filter((id) => !expired.includes(id)), drawnRound };
    state = { ...replaceExplorer(state, explorer), deck: { ...state.deck!, discard: [...state.deck!.discard, ...expired] } };
  }
  if (explorer.hand.length > HAND_LIMIT) return { ...state, turn: { ...turn, phase: 'discard' } };
  return drawOne(state, explorer);
}

export { replaceExplorer };

/** Hunting and the meal at the end of a turn in the field (rules §11): recorded on the explorer for its rail. */
function eatAndHunt(state: GameState, explorer: ExplorerState): GameState {
  if (!inTheField(explorer)) return state;
  const camp = situationOf(state, explorer)!;
  const askaris = Math.max(0, explorer.chart!.askaris - explorer.sick.askaris);
  // A defensive stand (policy 1) forbids hunting (rules §8.1): the die is still rolled but no game is taken.
  const h = hunt(state.rng!, camp, askaris, explorer.specialties.includes('zoology'));
  if (state.turn!.policy === 1) h.result = { ...h.result, game: 0 };
  const meal = feed(explorer.chart!, explorer.sick, camp, h.result.game);
  const water = drink(meal.chart, camp);
  const hex = (explorer.location as { hex: string }).hex as HexId;
  const outcome = water ? `${meal.summary}; ${water.summary}` : meal.summary;
  const sick = water?.explorerThirsty ? { ...explorer.sick, explorer: true } : explorer.sick;
  const lastMeal: RollRecord = { kind: 'hunting', seat: explorer.seat, hex, rolls: h.result.rolls, modifiers: h.result.modifiers, total: h.result.total, outcome };
  return { ...replaceExplorer(state, { ...explorer, chart: water?.chart ?? meal.chart, sick, lastMeal }), rng: h.rng };
}

/** Camped in a mapped desert hex whose oasis exists but is unknown to him, the explorer tries again each turn (rules §7.4). */
function oasisRecheck(state: GameState, explorer: ExplorerState): GameState {
  if (explorer.location.kind !== 'hex') return state;
  const hex = explorer.location.hex;
  const m = state.map[hex];
  if (!m || !m.oasis || !oasisSearchable(m, explorer.seat)) return state;
  const search = oasisSearch(state.rng!, m, explorer.seat);
  const record: RollRecord = { kind: 'water', seat: explorer.seat, hex, rolls: search.rolls, outcome: search.found ? 'the oasis is found' : 'no oasis found' };
  return { ...state, rng: search.rng, map: { ...state.map, [hex]: search.hex }, turn: { ...state.turn!, log: [...state.turn!.log, record] } };
}

/** A captive's turn: one die less three on the consequences-of-defeat table (rules §8.4). */
function escapeAttempt(state: GameState, explorer: ExplorerState): GameState {
  const { hex, tribe, had } = explorer.location as { kind: 'captive'; hex: HexId; tribe: number; had: Chart };
  const r = consequencesOfDefeat(state.rng!, had, -3);
  const record: RollRecord = { kind: 'captivity', seat: explorer.seat, hex, rolls: r.rolls, outcome: r.fate === 'prisoner' ? 'still held prisoner' : r.summary };
  const turn = { ...state.turn!, log: [...state.turn!.log, record], moved: true };
  if (r.fate === 'killed') {
    const t = state.tribes[tribe];
    return { ...replaceExplorer(state, { ...explorer, location: { kind: 'dead' }, chart: null }), rng: r.rng, turn, tribes: { ...state.tribes, [tribe]: { ...t, attitude: t.attitude - 1 } } };
  }
  if (r.fate === 'prisoner') return { ...replaceExplorer(state, explorer), rng: r.rng, turn };
  // Free, but still in the tribe's hex: a policy is chosen (rules §8.1).
  return { ...replaceExplorer(state, { ...explorer, location: { kind: 'hex', hex }, chart: r.chart }), rng: r.rng, turn: { ...turn, phase: 'natives' } };
}

/** Staying in the hex after a victory whose village was not found, the explorer searches again (rules §8.4). */
function villageRetry(state: GameState, explorer: ExplorerState): GameState {
  if (explorer.location.kind !== 'hex') return state;
  const hex = explorer.location.hex;
  const id = state.map[hex]?.tribe;
  const tribe = id != null ? state.tribes[id] : undefined;
  if (!tribe?.pending || tribe.pending.by !== explorer.seat) return state;
  const s = searchVillage(state.rng!, tribe.pending.prisoners, tribe.pending.policy);
  const record: RollRecord = { kind: 'victory', seat: explorer.seat, hex, rolls: s.rolls, outcome: s.found ? 'the village is found' : 'the village cannot be found' };
  const next = { ...state, rng: s.rng, turn: { ...state.turn!, log: [...state.turn!.log, record] } };
  return s.found ? spoilsOrLoot(next, explorer, tribe, tribe.pending.prisoners, tribe.pending.policy, tribe.pending.original) : next;
}

/** The village is found: with prisoners the player chooses; without, the askaris loot it (G-60). */
function spoilsOrLoot(state: GameState, explorer: ExplorerState, tribe: Tribe, prisoners: number, policy: number, original: number): GameState {
  const pending = { by: explorer.seat, prisoners, policy, original };
  const tribes = { ...state.tribes, [tribe.id]: { ...tribe, pending } };
  if (prisoners > 0) return { ...state, tribes, turn: { ...state.turn!, phase: 'spoils' } };
  return lootVillage({ ...state, tribes }, currentExplorer({ ...state, tribes })!, tribes[tribe.id]);
}

function lootVillage(state: GameState, explorer: ExplorerState, tribe: Tribe): GameState {
  const hex = (explorer.location as { kind: 'hex'; hex: HexId }).hex;
  const camp = situationOf(state, explorer)!;
  const l = loot(state.rng!, tribe.pending!.original, camp.terrain, camp.river || camp.oasis || camp.terrain === 'lake' || (camp.terrain !== null && camp.terrain.includes('swamp')));
  const chart = { ...explorer.chart!, food: explorer.chart!.food + l.rations, gifts: explorer.chart!.gifts + l.gifts, camels: explorer.chart!.camels + l.camels, canoes: explorer.chart!.canoes + l.canoes };
  const record: RollRecord = { kind: 'loot', seat: explorer.seat, hex, rolls: l.rolls, outcome: l.summary };
  return { ...replaceExplorer(state, { ...explorer, chart }), rng: l.rng, tribes: { ...state.tribes, [tribe.id]: { ...tribe, pending: null } }, turn: { ...state.turn!, phase: 'act', log: [...state.turn!.log, record] } };
}

/** A guide hired in a hex adjacent to this one (rules §8.2: "a guide from an adjacent hex"). */
function guideFromAdjacent(explorer: ExplorerState, hex: HexId): boolean {
  return Object.entries(explorer.chart?.guideHomes ?? {}).some(([home, n]) => n > 0 && directionTo(hex, home as HexId) !== null);
}

/** Water is free wherever there is water: anywhere but a dry desert hex (rules §5). */
export function waterAvailable(state: GameState, explorer: ExplorerState): boolean {
  if (!explorer.chart) return false;
  if (explorer.location.kind === 'port') return true;
  const camp = situationOf(state, explorer);
  return !!camp && !dryDesert(camp);
}

export const WATER_STEP = 10;

export function reduceTurn(state: GameState, event: GameEvent): GameState | string {
  switch (event.type) {
    case 'game/started': {
      if (state.turn) return 'game already started';
      if (state.rng === null) return 'game has no seed';
      const seats = explorerSeats(state);
      if (seats.length === 0) return 'no explorer has been commissioned';
      const { roundLimit } = event.payload as { roundLimit?: unknown };
      if (roundLimit !== undefined && roundLimit !== null && !(typeof roundLimit === 'number' && Number.isInteger(roundLimit) && roundLimit > 0))
        return 'roundLimit must be a positive integer';

      // First player: four dice apiece, high total; ties re-roll among the tied (RQ-1).
      let rng = state.rng;
      const rollOff: RollOff = Object.fromEntries(seats.map((s) => [s, [] as number[][]]));
      let contenders = seats;
      let winner: SeatId | null = null;
      while (winner === null) {
        const totals = new Map<SeatId, number>();
        for (const seat of contenders) {
          const r = dice(rng, 4);
          rng = r.state;
          rollOff[seat].push(r.values);
          totals.set(seat, r.values.reduce((a, b) => a + b, 0));
        }
        const high = Math.max(...totals.values());
        const tied = contenders.filter((s) => totals.get(s) === high);
        if (tied.length === 1) winner = tied[0];
        else contenders = tied;
      }
      const start = seats.indexOf(winner);
      const order = [...seats.slice(start), ...seats.slice(0, start)];

      // The deck: a seeded shuffle, then five cards to each explorer in turn order. Opening cards
      // count as drawn in round 1, so an opening ticket can be used on the first turn.
      const shuffled = shuffleWith(CARD_IDS, rng);
      rng = shuffled.state;
      const draw = shuffled.items;
      const hands = new Map<SeatId, CardId[]>(order.map((s) => [s, []]));
      for (let i = 0; i < OPENING_HAND; i++) for (const seat of order) hands.get(seat)!.push(draw.shift()!);

      const started: GameState = {
        ...state,
        rng,
        rollOff,
        turn: { order, current: winner, round: 1, phase: 'act', moved: false, movement: null, policy: null, log: [] },
        deck: { draw, discard: [] },
        explorers: state.explorers.map((e) =>
          hands.has(e.seat) ? { ...e, hand: hands.get(e.seat)!, drawnRound: Object.fromEntries(hands.get(e.seat)!.map((id) => [id, 1])) } : e
        )
      };
      return beginTurn(started, winner);
    }
    case 'turn/ended': {
      const { seat } = event.payload as { seat?: string };
      if (!state.turn) return 'game not started';
      if (seat !== state.turn.current) return `it is not ${seat}'s turn`;
      if (state.turn.phase === 'natives') return 'choose a policy towards the natives first';
      if (state.turn.phase === 'spoils') return 'deal with the prisoners and the village first';
      if (state.turn.phase !== 'act') return 'cannot end the turn while discarding';
      const ending = currentExplorer(state);
      return advance(ending ? eatAndHunt(state, ending) : state);
    }
    case 'voyage/booked': {
      const { seat, port, ticketCardId } = event.payload as { seat?: string; port?: string; ticketCardId?: unknown };
      if (!state.turn) return 'game not started';
      if (seat !== state.turn.current) return `it is not ${seat}'s turn`;
      if (state.turn.phase !== 'act') return 'cannot sail while discarding';
      const explorer = currentExplorer(state)!;
      if (explorer.location.kind !== 'europe') return 'the explorer is not in Europe';
      if (!port || !(port in BOARD.ports)) return 'voyage/booked needs a port of entry';
      let fare = PASSAGE_FARE;
      if (ticketCardId !== undefined && ticketCardId !== null) {
        if (!isCardId(ticketCardId) || !explorer.hand.includes(ticketCardId)) return 'the ticket is not in the hand';
        const d = card(ticketCardId).donation;
        if (d.kind !== 'ticket' || d.port !== port) return `that card is not a free ticket to ${port}`;
        fare = 0;
      }
      const raised = handValue(explorer.hand);
      if (raised < fare) return `passage costs $${fare}; only $${raised} raised`;
      // The whole hand becomes the expedition budget; any ticket not used is lost with it.
      const sailed: ExplorerState = { ...explorer, hand: [], drawnRound: {}, money: raised - fare, location: { kind: 'voyage', port: port as PortId } };
      return { ...replaceExplorer(state, sailed), deck: { ...state.deck!, discard: [...state.deck!.discard, ...explorer.hand] } };
    }
    case 'cards/discarded': {
      const { seat, cardIds } = event.payload as { seat?: string; cardIds?: unknown };
      if (!state.turn) return 'game not started';
      if (seat !== state.turn.current) return `it is not ${seat}'s turn`;
      if (state.turn.phase !== 'discard') return 'no discard is pending';
      const explorer = currentExplorer(state)!;
      if (!Array.isArray(cardIds) || cardIds.length === 0 || !cardIds.every((id) => isCardId(id) && explorer.hand.includes(id)))
        return 'cards/discarded needs cards from the hand';
      const ids = cardIds as CardId[];
      const drawnRound = { ...explorer.drawnRound };
      for (const id of ids) delete drawnRound[id];
      const trimmed: ExplorerState = { ...explorer, hand: explorer.hand.filter((id) => !ids.includes(id)), drawnRound };
      const turn = state.turn;
      const after: GameState = { ...replaceExplorer(state, trimmed), deck: { ...state.deck!, discard: [...state.deck!.discard, ...ids] } };
      if (trimmed.hand.length > HAND_LIMIT) return after;
      return drawOne({ ...after, turn: { ...turn, phase: 'act' } }, trimmed);
    }
    case 'natives/policy': {
      const { seat, policy } = event.payload as { seat?: string; policy?: unknown };
      if (!state.turn) return 'game not started';
      if (seat !== state.turn.current) return `it is not ${seat}'s turn`;
      if (state.turn.phase !== 'natives') return 'no natives to face';
      if (typeof policy !== 'number' || !Number.isInteger(policy) || policy < 1 || policy > 5) return 'natives/policy needs a policy from 1 to 5';
      const explorer = currentExplorer(state)!;
      const hex = (explorer.location as { kind: 'hex'; hex: HexId }).hex;
      const turn = { ...state.turn, phase: 'act' as const, policy };
      if (policy === 2) {
        // Immediate retreat: back where he came from; the marker comes off and the credit with it (G-53).
        const back = explorer.cameFrom;
        if (!back) return 'nowhere to retreat to';
        const m = state.map[hex];
        const map = m ? { ...state.map, [hex]: { ...m, markers: m.markers.filter((s) => s !== explorer.seat) } } : state.map;
        const port = PORTS.find((p) => p.hex === back);
        const location: ExplorerState['location'] = port ? { kind: 'port', port: port.id } : { kind: 'hex', hex: back };
        return { ...replaceExplorer(state, { ...explorer, location, cameFrom: null }), map, turn };
      }
      // Policies 1, 3, 4 and 5 face the natives' reaction (rules §8.2) and perhaps a fight (§8.3).
      const tribe = state.tribes[state.map[hex].tribe!];
      const result = react(state.rng!, {
        policy, distanceToPort: distanceToNearestPort(hex), warriors: tribe.warriors, chart: explorer.chart!,
        localKnowledge: guideFromAdjacent(explorer, hex), attitude: tribe.attitude,
        inDesert: terrainOf(state, hex) === 'desert', mounted: modeFor(explorer.chart!, false) === 'mounted'
      });
      const log: RollRecord[] = [
        ...turn.log,
        { kind: 'reaction', seat: explorer.seat, hex, rolls: result.reaction.rolls, modifiers: result.reaction.modifiers, total: result.reaction.total, outcome: result.reaction.hostile ? `hostile (${result.reaction.total} over ${result.reaction.target})` : `not hostile (${result.reaction.total} within ${result.reaction.target})` }
      ];
      if (result.combat.length) log.push({ kind: 'combat', seat: explorer.seat, hex, rolls: result.combat, outcome: result.summary });
      let rng = result.rng;
      let tribes = { ...state.tribes, [tribe.id]: { ...tribe, warriors: result.warriors } };
      let next: GameState = { ...replaceExplorer(state, { ...explorer, chart: result.chart }), rng, tribes, turn: { ...turn, log, moved: turn.moved || policy === 1 } };
      if (result.outcome === 'defeat') {
        // Consequences of defeat (rules §8.4): killed, held prisoner, or an escape with what the table allows.
        const d = consequencesOfDefeat(rng, result.chart);
        rng = d.rng;
        const beaten = { ...tribes[tribe.id], attitude: tribe.attitude - 1 - (d.fate === 'killed' ? 1 : 0) };
        tribes = { ...tribes, [tribe.id]: beaten };
        log.push({ kind: 'defeat', seat: explorer.seat, hex, rolls: d.rolls, outcome: d.summary });
        const location: ExplorerState['location'] = d.fate === 'killed' ? { kind: 'dead' } : d.fate === 'prisoner' ? { kind: 'captive', hex, tribe: tribe.id, had: result.chart } : { kind: 'hex', hex };
        const chart = d.fate === 'killed' ? null : d.fate === 'prisoner' ? null : d.chart;
        return { ...replaceExplorer(next, { ...explorer, location, chart }), rng, tribes, turn: { ...turn, log, moved: true } };
      }
      if (result.outcome === 'victory') {
        // Results of victory (rules §8.4): prisoners join as bearers until released; then the village.
        const v = resultsOfVictory(rng, result.chart.askaris, result.warriors, policy);
        rng = v.rng;
        log.push({ kind: 'victory', seat: explorer.seat, hex, rolls: v.rolls, outcome: v.summary });
        const chart = { ...result.chart, bearers: result.chart.bearers + v.prisoners, camels: result.chart.camels + (terrainOf(state, hex) === 'desert' ? v.prisoners : 0) };
        tribes = { ...tribes, [tribe.id]: { ...tribes[tribe.id], warriors: result.warriors - v.prisoners } };
        next = { ...replaceExplorer(next, { ...explorer, chart }), rng, tribes, turn: { ...turn, log, moved: turn.moved || policy === 1 } };
        const after = currentExplorer(next)!;
        if (v.villageFound) return spoilsOrLoot(next, after, tribes[tribe.id], v.prisoners, policy, tribe.warriors);
        return { ...next, tribes: { ...tribes, [tribe.id]: { ...tribes[tribe.id], pending: { by: explorer.seat, prisoners: v.prisoners, policy, original: tribe.warriors } } } };
      }
      return next;
    }
    case 'natives/spoils': {
      const { seat, choice } = event.payload as { seat?: string; choice?: unknown };
      if (!state.turn) return 'game not started';
      if (seat !== state.turn.current) return `it is not ${seat}'s turn`;
      if (state.turn.phase !== 'spoils') return 'no village to deal with';
      if (choice !== 'release' && choice !== 'keep') return 'natives/spoils needs release or keep';
      const explorer = currentExplorer(state)!;
      const hex = (explorer.location as { kind: 'hex'; hex: HexId }).hex;
      const tribe = state.tribes[state.map[hex].tribe!];
      if (choice === 'keep') return lootVillage(state, explorer, tribe);
      // Release every prisoner: the tribe's attitude rises by three (towards this explorer, G-61) and the village is left alone.
      const chart = { ...explorer.chart!, bearers: explorer.chart!.bearers - tribe.pending!.prisoners };
      const record: RollRecord = { kind: 'victory', seat: explorer.seat, hex, rolls: [], outcome: `${tribe.pending!.prisoners} prisoners released: the tribe is grateful` };
      return { ...replaceExplorer(state, { ...explorer, chart }), tribes: { ...state.tribes, [tribe.id]: { ...tribe, warriors: tribe.warriors + tribe.pending!.prisoners, attitude: tribe.attitude + 3, pending: null } }, turn: { ...state.turn, phase: 'act', log: [...state.turn.log, record] } };
    }
    case 'water/taken': {
      const { seat, rations } = event.payload as { seat?: string; rations?: unknown };
      if (!state.turn) return 'game not started';
      if (seat !== state.turn.current) return `it is not ${seat}'s turn`;
      const explorer = currentExplorer(state)!;
      if (!explorer.chart) return 'the expedition is not outfitted';
      if (typeof rations !== 'number' || !Number.isInteger(rations) || rations === 0) return 'water/taken needs a whole number of rations';
      if (rations > 0 && !waterAvailable(state, explorer)) return 'there is no water here';
      const water = explorer.chart.water + rations;
      if (water < 0) return `only ${explorer.chart.water} water rations to pour out`;
      return replaceExplorer(state, { ...explorer, chart: { ...explorer.chart, water } });
    }
    case 'expedition/outfitted': {
      const { seat, purchases } = event.payload as { seat?: string; purchases?: unknown };
      if (!state.turn) return 'game not started';
      if (seat !== state.turn.current) return `it is not ${seat}'s turn`;
      const explorer = currentExplorer(state)!;
      if (explorer.location.kind !== 'port') return 'the explorer is not at a port of entry';
      if (explorer.chart) return 'the expedition is already outfitted';
      if (!purchases || typeof purchases !== 'object') return 'expedition/outfitted needs purchases';
      const p = purchases as Record<string, unknown>;
      const bought = {} as Purchases;
      for (const item of ITEMS) {
        const n = p[item] ?? 0;
        if (typeof n !== 'number' || !Number.isInteger(n) || n < 0) return `bad count for ${item}`;
        if (n > 0 && !availableAt(item, explorer.location.port)) return `${item} are not sold at ${explorer.location.port}`;
        bought[item] = n;
      }
      const total = cost(bought);
      if (total > explorer.money) return `the expedition costs $${total}; the budget is $${explorer.money}`;
      // Whatever is not spent on the expedition is lost (rules §5). Guides hired here call this hex home.
      const home = BOARD.ports[explorer.location.port].hex;
      return replaceExplorer(state, { ...explorer, chart: { ...bought, water: 0, guideHomes: bought.guides > 0 ? { [home]: bought.guides } : {} }, money: 0 });
    }
    default:
      return state;
  }
}
