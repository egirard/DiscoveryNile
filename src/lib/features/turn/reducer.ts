import { describeCard } from './actions';
import type { GameEvent } from '$lib/game/events';
import type { ExplorerState, GameState, RollOff, RollRecord } from '$lib/game/state';
import type { HexId } from '$features/map/hex';
import { d6, dice, shuffleWith } from '$lib/game/random';
import { CARD_IDS, card, handValue, isCardId, type CardId } from '$features/cards/deck';
import { BOARD, PORTS, type PortId } from '$features/map/manifest';
import { ITEMS, availableAt, cost, type Purchases } from '$features/expedition/prices';
import type { SeatId } from '$lib/tabletop/seats';
import { drawDisaster, inTheField, situationOf } from '$features/disasters/draw';
import { oasisSearch, oasisSearchable, researchPending, standingHex, terrainOf } from '$features/exploration/reducer';
import { preach, study, treat, type TreatResult } from '$features/natives/specialties';
import { hostilities, react, type ReactionResult } from '$features/natives/reaction';
import { SELLABLE, attemptPoison, giveEverything, offerGifts, tradePrices } from '$features/natives/negotiation';
import { consequencesOfDefeat, loot, resultsOfVictory, searchVillage } from '$features/natives/aftermath';
import type { Tribe } from '$lib/game/state';
import type { Chart, Item } from '$features/expedition/prices';
import { distanceToNearestPort } from '$features/natives/discovery';
import { modeFor } from '$features/exploration/movement';
import { directionTo } from '$features/map/hex';
import { drink, dryDesert, feed, hunt, sicknessRound, starve } from '$features/rations/rations';
import { addScore, homecoming, publishable, scoreOf, valueOf } from '$features/scoring/score';
import type { GameEnd } from '$lib/game/state';
import { fmtPoints } from '$features/scoring/transits';
import { perish } from '$features/explorers/fate';
import { addCharts, alive, chartOf, holderOf, leaveParty, members, partyOf, subtractChart } from '$features/expedition/party';
import type { Party } from '$lib/game/state';

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
function drawOne(state: GameState, explorer: ExplorerState, noted = false): GameState {
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
  // The draw that opens a turn in Europe is the turn's first entry in the log; a draw earned by publishing is in that record already.
  const log = noted ? [...state.turn!.log, { kind: 'action', seat: explorer.seat, rolls: [], outcome: `drew ${describeCard(top)}` } as RollRecord] : state.turn!.log;
  return { ...replaceExplorer(state, next), rng, deck: { draw: rest, discard }, turn: { ...state.turn!, log } };
}

/** Hand the turn to the next seat clockwise; a new round starts when the order wraps, and the agreed limit ends the game. */
function advance(state: GameState): GameState {
  const { order, current, round, roundLimit } = state.turn!;
  const living = (seat: SeatId) => state.explorers.some((e) => e.seat === seat && e.location.kind !== 'dead');
  let i = order.indexOf(current);
  let nextRound = round;
  for (let step = 0; step < order.length; step++) {
    if (i + 1 >= order.length) nextRound++;
    i = (i + 1) % order.length;
    if (roundLimit !== null && nextRound > roundLimit) return endGame(state, 'limit');
    if (living(order[i])) return beginTurn({ ...state, rollOff: null, turn: { ...state.turn!, round: nextRound } }, order[i]);
  }
  return state; // no living explorer: the players end the game by consensus (G-62)
}

/**
 * The game's end (rules: Description of Game; RQ-10): every explorer in Europe publishes all he can, then every explorer
 * retires; the standings are the seats' points and the highest wins (a tie is shared). The map stays for a continuation.
 */
export function endGame(state: GameState, reason: GameEnd['reason']): GameState {
  let next: GameState = state;
  const turn = state.turn!;
  for (const e of state.explorers) {
    if (e.location.kind === 'dead') continue;
    let me = alive(next, e.seat)!;
    if (me.location.kind === 'europe') {
      for (const hex of publishable(next, me.seat)) {
        const value = valueOf(next, hex, me.seat, turn.round);
        const m = next.map[hex];
        next = { ...addScore(next, me.seat, value.entries), map: { ...next.map, [hex]: { ...m, markers: [], publishedBy: me.seat } }, superlatives: [...next.superlatives, ...value.superlatives] };
        me = alive(next, me.seat)!;
      }
    }
    const where = me.location.kind === 'europe' ? 'retired in Europe at the end of the game' : me.location.kind === 'captive' ? 'retired in captivity at the end of the game' : 'retired in Africa at the end of the game';
    next = perish(next, alive(next, me.seat)!, 'retired', where);
  }
  const standings = state.seats.filter((s) => s.uid).map((s) => ({ seat: s.id, points: scoreOf(next, s.id) })).sort((a, b) => b.points - a.points);
  const top = standings[0]?.points ?? 0;
  const winners = standings.filter((s) => s.points === top && standings.length > 0).map((s) => s.seat);
  return { ...next, ended: { round: turn.round, reason, standings, winners }, endVotes: [] };
}

/**
 * The start of a turn. In Europe (rules §4): expired free tickets go to the discard pile, then
 * the hand limit applies (the player chooses what to discard), then one card is drawn. At sea:
 * the explorer lands at the chosen port and this turn is the one the rules say is skipped.
 */
function beginTurn(state: GameState, seat: SeatId): GameState {
  const turn = { ...state.turn!, current: seat, phase: 'act' as const, moved: false, movement: null, policy: null, trade: null, log: [] };
  state = { ...state, turn };
  let explorer = currentExplorer(state)!;
  if (explorer.location.kind === 'voyage') {
    const port = explorer.location.port;
    const party = partyOf(state, explorer);
    // A joint expedition lands together on its leader's turn; a companion's turn at sea is skipped (rules §13).
    if (party && party.leader !== explorer.seat) return advance(state);
    const crew = party ? members(state, explorer).filter((m) => m.location.kind === 'voyage') : [explorer];
    let landed = state;
    for (const m of crew) landed = replaceExplorer(landed, { ...m, location: { kind: 'port', port }, known: [BOARD.ports[port].hex] });
    return advance(landed);
  }
  if (explorer.location.kind === 'homeward') {
    // Back in Europe the turn after leaving Africa (rules §12); the Europe turn then runs as usual.
    // Specimens and the specialties' good works score on landing (G-79).
    const landed = BOARD.ports[explorer.location.port].hex;
    const brought = homecoming(explorer, turn.round);
    explorer = { ...explorer, location: { kind: 'europe' }, specimens: { zoology: 0, geology: 0 }, goodWorks: { evangelism: 0, medicine: 0 } };
    state = addScore(replaceExplorer(state, explorer), seat, brought);
    if (brought.length) {
      const points = brought.reduce((sum, e) => sum + e.points, 0);
      const record: RollRecord = { kind: 'published', seat, hex: landed, rolls: [], outcome: `home with ${brought.map((e) => e.detail).join(' and ')}: ${points} point${points === 1 ? '' : 's'}` };
      state = { ...state, turn: { ...state.turn!, log: [...state.turn!.log, record] } };
    }
  }
  if (explorer.location.kind === 'captive') return escapeAttempt(state, explorer);
  if (explorer.location.kind === 'hex') {
    const hex = explorer.location.hex;
    state = villageRetry(state, explorer);
    explorer = currentExplorer(state)!;
    const rechecked = oasisRecheck(state, explorer);
    const drawn = drawDisaster(rechecked, currentExplorer(rechecked)!);
    if (!currentExplorer(drawn)) return drawn; // the card killed him: the seat's turn stays open to read the rail, then passes
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
  return drawOne(state, explorer, true);
}

export { replaceExplorer };

/** Hunting and the meal at the end of a turn in the field (rules §11): recorded on the explorer for its rail. */
function eatAndHunt(state: GameState, explorer: ExplorerState): GameState {
  if (!inTheField(explorer, state.map)) return state;
  const camp = situationOf(state, explorer)!;
  const askaris = Math.max(0, explorer.chart!.askaris - explorer.sick.askaris);
  // A defensive stand (policy 1) forbids hunting (rules §8.1): the die is still rolled but no game is taken.
  const crew = members(state, explorer); // a joint expedition's explorers eat and drink from the one chart (rules §13)
  const h = hunt(state.rng!, camp, askaris, crew.some((m) => m.specialties.includes('zoology')));
  if (state.turn!.policy === 1) h.result = { ...h.result, game: 0 };
  const meal = feed(explorer.chart!, explorer.sick, camp, h.result.game, crew.length);
  const water = drink(meal.chart, camp, crew.length);
  const hex = (explorer.location as { hex: string }).hex as HexId;
  const parts = [meal.summary];
  if (water) parts.push(water.summary);
  let sick = water?.explorerThirsty ? { ...explorer.sick, explorer: true } : explorer.sick;
  // Starvation, desertion and sickness (rules §11) on the 'sickness' stream.
  const hunger = starve(water?.chart ?? meal.chart, sick, meal.hungryMen);
  if (hunger.summary) parts.push(hunger.summary);
  const round = sicknessRound(h.rng, hunger.chart, sick, hunger.starving, explorer.specialties.includes('medicine'));
  if (round.summary) parts.push(round.summary);
  sick = round.sick;
  const rolls = [...h.result.rolls, ...round.rolls];
  const lastMeal: RollRecord = { kind: 'hunting', seat: explorer.seat, hex, rolls, modifiers: h.result.modifiers, total: h.result.total, outcome: parts.join('; ') };
  if (round.explorerDied) return { ...perish(state, { ...explorer, sick, lastMeal }, 'died', `died of sickness at ${hex}`), rng: round.rng };
  return { ...replaceExplorer(state, { ...explorer, chart: round.chart, sick, lastMeal }), rng: round.rng };
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
  const { hex, tribe, had, goodwill } = explorer.location as { kind: 'captive'; hex: HexId; tribe: number; had: Chart; goodwill: number };
  const r = consequencesOfDefeat(state.rng!, had, -3 + goodwill);
  const record: RollRecord = { kind: 'captivity', seat: explorer.seat, hex, rolls: r.rolls, outcome: r.fate === 'prisoner' ? 'still held prisoner' : r.summary };
  const turn = { ...state.turn!, log: [...state.turn!.log, record], moved: true };
  if (r.fate === 'killed') {
    const t = state.tribes[tribe];
    return { ...perish({ ...state, tribes: { ...state.tribes, [tribe]: { ...t, attitude: t.attitude - 1 } } }, explorer, 'died', `killed in captivity by tribe ${tribe} at ${hex}`), rng: r.rng, turn };
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
  const holder = holderOf(state, explorer);
  const had = holder.chart!;
  const chart = { ...had, food: had.food + l.rations, gifts: had.gifts + l.gifts, camels: had.camels + l.camels, canoes: had.canoes + l.canoes };
  const record: RollRecord = { kind: 'loot', seat: explorer.seat, hex, rolls: l.rolls, outcome: l.summary };
  return { ...replaceExplorer(state, { ...holder, chart }), rng: l.rng, tribes: { ...state.tribes, [tribe.id]: { ...tribe, pending: null } }, turn: { ...state.turn!, phase: 'act', log: [...state.turn!.log, record] } };
}

function reactionInput(state: GameState, explorer: ExplorerState, tribe: Tribe, hex: HexId, policy: number) {
  const holder = holderOf(state, explorer);
  return {
    policy, distanceToPort: distanceToNearestPort(hex), warriors: tribe.warriors, chart: holder.chart!,
    localKnowledge: guideFromAdjacent(holder, hex) || tribe.negotiatedBy.includes(explorer.seat) || !!state.map[hex]?.publishedBy, attitude: tribe.attitude, regard: tribe.regard[explorer.seat] ?? 0,
    inDesert: terrainOf(state, hex) === 'desert', mounted: modeFor(holder.chart!, false) === 'mounted'
  };
}

/** After the natives' response: the fight's losses, defeat's consequences, victory's spoils, or a calm chief to negotiate with. */
function settle(state: GameState, explorer: ExplorerState, tribe: Tribe, hex: HexId, policy: number, result: Omit<ReactionResult, 'reaction'>): GameState {
  const turn = state.turn!;
  const log: RollRecord[] = [...turn.log];
  if (result.combat.length) log.push({ kind: 'combat', seat: explorer.seat, hex, rolls: result.combat, outcome: result.summary });
  let rng = state.rng!;
  let tribes = { ...state.tribes, [tribe.id]: { ...tribe, warriors: result.warriors } };
  const holder = holderOf(state, explorer); // the fight is the whole joint expedition's (rules §13)
  let next: GameState = { ...replaceExplorer(state, { ...holder, chart: result.chart }), rng, tribes, turn: { ...turn, log } };
  if (result.outcome === 'defeat') {
    // Consequences of defeat (rules §8.4): killed, held prisoner, or an escape with what the table allows. Each explorer
    // of a joint expedition consults the table for himself, and the party breaks up (rules §13).
    const crew = members(next, explorer);
    tribes = { ...tribes, [tribe.id]: { ...tribes[tribe.id], attitude: tribe.attitude - 1 } };
    let after: GameState = { ...next, tribes };
    for (const m of crew) {
      const d = consequencesOfDefeat(rng, result.chart);
      rng = d.rng;
      log.push({ kind: 'defeat', seat: m.seat, hex, rolls: d.rolls, outcome: crew.length > 1 ? `${m.seat}: ${d.summary}` : d.summary });
      after = leaveParty(after, m.seat, null);
      const me = alive(after, m.seat)!;
      if (d.fate === 'killed') {
        after = perish({ ...after, tribes: { ...after.tribes, [tribe.id]: { ...after.tribes[tribe.id], attitude: after.tribes[tribe.id].attitude - 1 } } }, me, 'died', `killed by tribe ${tribe.id} at ${hex}`);
        continue;
      }
      const location: ExplorerState['location'] = d.fate === 'prisoner' ? { kind: 'captive', hex, tribe: tribe.id, had: result.chart, goodwill: 0 } : { kind: 'hex', hex };
      after = replaceExplorer(after, { ...me, location, chart: d.fate === 'prisoner' ? null : d.chart });
    }
    return { ...after, rng, turn: { ...turn, phase: 'act', log, moved: true } };
  }
  if (result.outcome === 'victory') {
    // Results of victory (rules §8.4): prisoners join as bearers until released; then the village.
    const v = resultsOfVictory(rng, result.chart.askaris, result.warriors, policy);
    rng = v.rng;
    log.push({ kind: 'victory', seat: explorer.seat, hex, rolls: v.rolls, outcome: v.summary });
    const chart = { ...result.chart, bearers: result.chart.bearers + v.prisoners, camels: result.chart.camels + (terrainOf(state, hex) === 'desert' ? v.prisoners : 0) };
    const defeatedBy = tribe.defeatedBy.includes(explorer.seat) ? tribe.defeatedBy : [...tribe.defeatedBy, explorer.seat];
    tribes = { ...tribes, [tribe.id]: { ...tribes[tribe.id], warriors: result.warriors - v.prisoners, defeatedBy } };
    next = { ...replaceExplorer(next, { ...holder, chart }), rng, tribes, turn: { ...turn, phase: 'act', log } };
    const after = currentExplorer(next)!;
    if (v.villageFound) return spoilsOrLoot(next, after, tribes[tribe.id], v.prisoners, policy, tribe.warriors);
    return { ...next, tribes: { ...tribes, [tribe.id]: { ...tribes[tribe.id], pending: { by: explorer.seat, prisoners: v.prisoners, policy, original: tribe.warriors } } } };
  }
  if (result.outcome === 'calm' && (policy === 3 || policy === 5)) return { ...next, turn: { ...next.turn!, phase: 'negotiate' } };
  return { ...next, turn: { ...next.turn!, phase: 'act' } };
}

/** A satisfied chief permits trade: prices are rolled for this tribe and turn (rules §8.5). */
function permitTrade(state: GameState, tribe: Tribe): GameState {
  const explorer = currentExplorer(state)!;
  const hex = (explorer.location as { kind: 'hex'; hex: HexId }).hex;
  const camp = situationOf(state, explorer)!;
  const prices = tradePrices(state.rng!, { desert: camp.terrain === 'desert', water: camp.river || camp.terrain === 'lake' || (camp.terrain !== null && camp.terrain.includes('swamp')) });
  const record: RollRecord = { kind: 'trade', seat: explorer.seat, hex, rolls: prices.rolls, outcome: 'the chief permits trade: ' + Object.entries(prices.prices).map(([item, price]) => (item === 'food' ? `${price} rations per gift` : `${item.slice(0, -1)} ${price}`)).join(', ') };
  const negotiatedBy = tribe.negotiatedBy.includes(explorer.seat) ? tribe.negotiatedBy : [...tribe.negotiatedBy, explorer.seat];
  return { ...state, rng: prices.rng, tribes: { ...state.tribes, [tribe.id]: { ...state.tribes[tribe.id], negotiatedBy } }, turn: { ...state.turn!, phase: 'trade', trade: { tribe: tribe.id, prices: prices.prices }, log: [...state.turn!.log, record] } };
}

/** The port of entry the explorer is at: landed there, or standing on its hex (rules §12). */
export function portOf(explorer: ExplorerState): PortId | null {
  if (explorer.location.kind === 'port') return explorer.location.port;
  if (explorer.location.kind === 'hex') { const hex = explorer.location.hex; return PORTS.find((p) => p.hex === hex)?.id ?? null; }
  return null;
}

/** Specialties the explorer still owes this tribe while the chief's permission stands (rules §9: "must"). */
export function worksOwed(state: GameState, explorer: ExplorerState): ('evangelism' | 'medicine')[] {
  if (!state.turn?.trade) return [];
  const tribe = state.tribes[state.turn.trade.tribe];
  const owed: ('evangelism' | 'medicine')[] = [];
  if (explorer.specialties.includes('evangelism') && !tribe.preachedBy.includes(explorer.seat)) owed.push('evangelism');
  if (explorer.specialties.includes('medicine') && !tribe.treatedBy.includes(explorer.seat)) owed.push('medicine');
  return owed;
}

/** A guide hired in a hex adjacent to this one (rules §8.2: "a guide from an adjacent hex"). */
function guideFromAdjacent(explorer: ExplorerState, hex: HexId): boolean {
  return Object.entries(explorer.chart?.guideHomes ?? {}).some(([home, n]) => n > 0 && directionTo(hex, home as HexId) !== null);
}

/** Water is free wherever there is water: anywhere but a dry desert hex (rules §5). */
export function waterAvailable(state: GameState, explorer: ExplorerState): boolean {
  if (!chartOf(state, explorer)) return false;
  if (explorer.location.kind === 'port') return true;
  const camp = situationOf(state, explorer);
  return !!camp && !dryDesert(camp);
}

export const WATER_STEP = 10;

const TURN_EVENTS = new Set<string>(['game/started', 'turn/ended', 'voyage/booked', 'cards/discarded', 'natives/policy', 'natives/offered', 'natives/traded', 'natives/done', 'specialty/performed', 'natives/spoils', 'expedition/returned', 'explorer/retired', 'hex/published', 'expedition/joined', 'expedition/split', 'expedition/reorganised', 'cache/recovered', 'water/taken', 'expedition/outfitted', 'game/end-voted', 'game/ended']);

export function reduceTurn(state: GameState, event: GameEvent): GameState | string {
  if (state.ended && TURN_EVENTS.has(event.type)) return 'the game is over';
  switch (event.type) {
    case 'game/end-voted': {
      // Ending by consensus (RQ-10): each seat with an explorer votes at its own edge; the last vote ends the game.
      const { seat } = event.payload as { seat?: string };
      if (!state.turn) return 'game not started';
      const voters = explorerSeats(state);
      if (!seat || !voters.includes(seat as SeatId)) return 'only a seat with an explorer votes';
      const endVotes = state.endVotes.includes(seat as SeatId) ? state.endVotes.filter((s) => s !== seat) : [...state.endVotes, seat as SeatId];
      if (voters.every((s) => endVotes.includes(s))) return endGame({ ...state, endVotes }, 'consensus');
      return { ...state, endVotes };
    }
    case 'game/ended': {
      // Ending by agreement (RQ-10): any seat ends the game from the options screen once the players agree at the table.
      if (!state.turn) return 'game not started';
      return endGame(state, 'consensus');
    }
    case 'game/continued': {
      // A new game on the same map (rules: Description of Game): what was published stays known, with its tribes and the
      // records to beat; the scores start afresh and every seat commissions a new explorer.
      if (!state.ended) return 'the game has not ended';
      return { ...state, explorers: [], turn: null, deck: null, rollOff: null, scores: {}, endVotes: [], ended: null, parties: {}, caches: {}, games: state.games + 1 };
    }
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
        turn: { order, current: winner, round: 1, roundLimit: (roundLimit as number | null | undefined) ?? null, phase: 'act', moved: false, movement: null, policy: null, trade: null, log: [] },
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
      const ending = currentExplorer(state);
      if (!ending) return advance(state); // the explorer died or retired this turn: the turn passes whatever was pending
      if (state.turn.phase === 'natives') return 'choose a policy towards the natives first';
      if (state.turn.phase === 'spoils') return 'deal with the prisoners and the village first';
      if (state.turn.phase === 'negotiate' || state.turn.phase === 'trade') return 'finish with the chief first';
      if (state.turn.phase !== 'act') return 'cannot end the turn while discarding';
      return advance(eatAndHunt(state, ending));
    }
    case 'voyage/booked': {
      const { seat, port, ticketCardId, with: withSeats } = event.payload as { seat?: string; port?: string; ticketCardId?: unknown; with?: unknown };
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
      // A joint expedition (rules §13): companions in Europe pool their donations (never their tickets) and sail along.
      const companions: ExplorerState[] = [];
      if (withSeats !== undefined && withSeats !== null) {
        if (!Array.isArray(withSeats)) return 'voyage/booked: with must list seats';
        for (const s of withSeats) {
          const c = typeof s === 'string' ? alive(state, s as SeatId) : undefined;
          if (!c || c.seat === explorer.seat) return `no companion at ${String(s)}`;
          if (c.location.kind !== 'europe') return `${c.seat} is not in Europe`;
          if (c.party !== null || companions.includes(c)) return `${c.seat} is already in a joint expedition`;
          companions.push(c);
        }
      }
      const pooled = companions.reduce((sum, c) => sum + handValue(c.hand), 0);
      const raised = handValue(explorer.hand) + pooled;
      if (raised < fare) return `passage costs $${fare}; only $${raised} raised`;
      // The whole hand becomes the expedition budget; any ticket not used is lost with it.
      const id = Math.max(0, ...Object.keys(state.parties).map(Number)) + 1;
      const sailed: ExplorerState = { ...explorer, hand: [], drawnRound: {}, money: raised - fare, location: { kind: 'voyage', port: port as PortId }, transit: null, party: companions.length ? id : null };
      let next = replaceExplorer(state, sailed);
      let discard = [...state.deck!.discard, ...explorer.hand];
      for (const c of companions) {
        next = replaceExplorer(next, { ...c, hand: [], drawnRound: {}, money: 0, location: { kind: 'voyage', port: port as PortId }, transit: null, party: id });
        discard = [...discard, ...c.hand];
      }
      if (!companions.length) return { ...next, deck: { ...state.deck!, discard } };
      const party: Party = { id, leader: explorer.seat, members: [explorer.seat, ...companions.map((c) => c.seat)] };
      const record: RollRecord = { kind: 'party', seat: explorer.seat, hex: BOARD.ports[port as PortId].hex, rolls: [], outcome: `a joint expedition with ${companions.map((c) => c.seat).join(', ')}: $${pooled} pooled, $${raised - fare} to spend at ${BOARD.ports[port as PortId].name}` };
      return { ...next, deck: { ...state.deck!, discard }, parties: { ...state.parties, [id]: party }, turn: { ...state.turn, log: [...state.turn.log, record] } };
    }
    case 'expedition/joined': {
      // Expeditions meeting in a hex join forces (rules §13): one chart, held by the other's leader, unless either stands on the defensive or retreats.
      const { seat, with: other } = event.payload as { seat?: string; with?: unknown };
      if (!state.turn) return 'game not started';
      if (seat !== state.turn.current) return `it is not ${seat}'s turn`;
      if (state.turn.phase !== 'act') return 'not now';
      const explorer = currentExplorer(state)!;
      const hex = standingHex(explorer);
      if (!hex || explorer.location.kind === 'captive') return 'the explorer is not free in Africa';
      if (explorer.party !== null) return 'already in a joint expedition';
      if (state.turn.policy === 1 || state.turn.policy === 2) return 'not while standing on the defensive or retreating';
      const target = typeof other === 'string' ? alive(state, other as SeatId) : undefined;
      if (!target || target.seat === explorer.seat) return 'expedition/joined needs another explorer';
      if (standingHex(target) !== hex || target.location.kind === 'captive') return `${target.seat} is not here`;
      const theirs = partyOf(state, target);
      const holder = theirs ? holderOf(state, target) : target;
      if (!holder.chart && !explorer.chart) return 'neither expedition is outfitted';
      const chart = holder.chart && explorer.chart ? addCharts(holder.chart, explorer.chart) : (holder.chart ?? explorer.chart)!;
      const sick = { ...holder.sick, guides: holder.sick.guides + explorer.sick.guides, bearers: holder.sick.bearers + explorer.sick.bearers, askaris: holder.sick.askaris + explorer.sick.askaris, animals: holder.sick.animals + explorer.sick.animals };
      const id = theirs?.id ?? Math.max(0, ...Object.keys(state.parties).map(Number)) + 1;
      const party: Party = theirs ? { ...theirs, members: [...theirs.members, explorer.seat] } : { id, leader: target.seat, members: [target.seat, explorer.seat] };
      let next = replaceExplorer(state, { ...holder, chart, sick, party: id });
      next = replaceExplorer(next, { ...alive(next, explorer.seat)!, chart: null, party: id, sick: { ...explorer.sick, guides: 0, bearers: 0, askaris: 0, animals: 0 } });
      next = replaceExplorer(next, { ...alive(next, target.seat)!, party: id });
      const men = chart.guides + chart.bearers + chart.askaris;
      const record: RollRecord = { kind: 'party', seat: explorer.seat, hex, rolls: [], outcome: `${explorer.seat} joins ${holder.seat}'s expedition: ${party.members.length} explorers, ${men} men, moving on ${party.members.map((s) => s).join(' and ')}'s last turn each round` };
      return { ...next, parties: { ...next.parties, [id]: party }, turn: { ...state.turn, log: [...state.turn.log, record] } };
    }
    case 'expedition/split': {
      // Any member may leave with an agreed share of the expedition (rules §13); the rest stays with the party.
      const { seat, take } = event.payload as { seat?: string; take?: unknown };
      if (!state.turn) return 'game not started';
      if (seat !== state.turn.current) return `it is not ${seat}'s turn`;
      if (state.turn.phase !== 'act') return 'not now';
      const explorer = currentExplorer(state)!;
      const party = partyOf(state, explorer);
      if (!party) return 'not in a joint expedition';
      const holder = holderOf(state, explorer);
      const share = take && typeof take === 'object' ? (take as Partial<Record<Item, number>>) : {};
      const div = subtractChart(holder.chart!, share);
      if (typeof div === 'string') return div;
      let next = holder.seat === explorer.seat ? state : replaceExplorer(state, { ...holder, chart: div.rest });
      next = leaveParty(next, explorer.seat, div.taken);
      const listed = Object.entries(share).filter(([, n]) => n).map(([k, n]) => `${n} ${k}`).join(', ') || 'nothing';
      const record: RollRecord = { kind: 'party', seat: explorer.seat, hex: standingHex(explorer)!, rolls: [], outcome: `${explorer.seat} leaves the joint expedition with ${listed}` };
      return { ...next, turn: { ...state.turn, log: [...state.turn.log, record] } };
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
        return { ...replaceExplorer(state, { ...explorer, location, cameFrom: null, research: null }), map, turn };
      }
      // Policies 1, 3, 4 and 5 face the natives' reaction (rules §8.2) and perhaps a fight (§8.3).
      const tribe = state.tribes[state.map[hex].tribe!];
      const result = react(state.rng!, reactionInput(state, explorer, tribe, hex, policy));
      const log: RollRecord[] = [
        ...turn.log,
        { kind: 'reaction', seat: explorer.seat, hex, rolls: result.reaction.rolls, modifiers: result.reaction.modifiers, total: result.reaction.total, outcome: result.reaction.hostile ? `hostile (${result.reaction.total} over ${result.reaction.target})` : `not hostile (${result.reaction.total} within ${result.reaction.target})` }
      ];
      return settle({ ...state, rng: result.rng, turn: { ...turn, log, moved: turn.moved || policy === 1 } }, explorer, tribe, hex, policy, result);
    }
    case 'natives/offered': {
      const { seat, gifts, everything, decline } = event.payload as { seat?: string; gifts?: unknown; everything?: unknown; decline?: unknown };
      if (!state.turn) return 'game not started';
      if (seat !== state.turn.current) return `it is not ${seat}'s turn`;
      if (state.turn.phase !== 'negotiate') return 'no chief to negotiate with';
      const explorer = currentExplorer(state)!;
      const hex = (explorer.location as { kind: 'hex'; hex: HexId }).hex;
      const tribe = state.tribes[state.map[hex].tribe!];
      const holder = holderOf(state, explorer);
      const chart = holder.chart!;
      if (decline === true) return { ...state, turn: { ...state.turn, phase: 'act' } };
      if (everything === true) {
        // Everything but the men (rules §8.5): the chief is always satisfied and returns three dice of gifts.
        const g = giveEverything(state.rng!);
        const stripped: Chart = { ...chart, camels: 0, horses: 0, canoes: 0, muskets: 0, food: 0, gifts: g.gifts, water: 0 };
        const record: RollRecord = { kind: 'negotiation', seat: explorer.seat, hex, rolls: g.rolls, outcome: `everything given: the chief is satisfied and returns ${g.gifts} gifts` };
        return permitTrade({ ...replaceExplorer(state, { ...holder, chart: stripped }), rng: g.rng, turn: { ...state.turn, log: [...state.turn.log, record] } }, tribe);
      }
      if (typeof gifts !== 'number' || !Number.isInteger(gifts) || gifts < 0) return 'natives/offered needs a number of gifts, everything, or decline';
      if (gifts > chart.gifts) return `only ${chart.gifts} gifts to offer`;
      const o = offerGifts(state.rng!, gifts, tribe.warriors);
      const given = { ...chart, gifts: chart.gifts - gifts }; // offered gifts are the chief's either way (G-64)
      const record: RollRecord = { kind: 'negotiation', seat: explorer.seat, hex, rolls: o.rolls, outcome: o.summary };
      const next: GameState = { ...replaceExplorer(state, { ...holder, chart: given }), rng: o.rng, turn: { ...state.turn, log: [...state.turn.log, record] } };
      if (o.satisfied) return permitTrade(next, tribe);
      // Insulted: the chief considers an attack again; too weak, he tries poison (rules §8.5).
      const h = hostilities(next.rng!, reactionInput(next, currentExplorer(next)!, tribe, hex, state.turn.policy ?? 5));
      const afterHostilities = { ...next, rng: h.rng };
      if (h.outcome !== 'hide') return settle(afterHostilities, currentExplorer(afterHostilities)!, tribe, hex, state.turn.policy ?? 5, h);
      const e2 = currentExplorer(afterHostilities)!;
      const poison = attemptPoison(h.rng, e2.poisonBonus);
      const log: RollRecord[] = [...afterHostilities.turn!.log, { kind: 'combat', seat: e2.seat, hex, rolls: h.combat, outcome: h.summary }, { kind: 'poison', seat: e2.seat, hex, rolls: poison.rolls, outcome: poison.summary }];
      const turn = { ...afterHostilities.turn!, phase: 'act' as const, log, moved: true };
      if (poison.result === 'dies') return { ...perish(afterHostilities, e2, 'died', `poisoned by the chief of tribe ${tribe.id} at ${hex}`), rng: poison.rng, turn };
      if (poison.result === 'recovers') return { ...replaceExplorer(afterHostilities, { ...e2, poisonBonus: e2.poisonBonus + 1 }), rng: poison.rng, turn };
      return { ...afterHostilities, rng: poison.rng, turn };
    }
    case 'natives/traded': {
      const { seat, item, count, direction } = event.payload as { seat?: string; item?: unknown; count?: unknown; direction?: unknown };
      if (!state.turn) return 'game not started';
      if (seat !== state.turn.current) return `it is not ${seat}'s turn`;
      if (state.turn.phase !== 'trade' || !state.turn.trade) return 'no trade is open';
      const prices = state.turn.trade.prices;
      if (typeof item !== 'string' || !(item in prices)) return 'that is not for sale here';
      if (typeof count !== 'number' || !Number.isInteger(count) || count <= 0) return 'natives/traded needs a count';
      if (direction !== 'buy' && direction !== 'sell') return 'natives/traded needs buy or sell';
      const explorer = currentExplorer(state)!;
      const hex = (explorer.location as { kind: 'hex'; hex: HexId }).hex;
      const holder = holderOf(state, explorer);
      const chart = { ...holder.chart! };
      const it = item as Item;
      const price = prices[it]!;
      let outcome: string;
      if (direction === 'buy') {
        if (it === 'food') {
          // Rations: `price` per gift; `count` is gifts spent.
          if (chart.gifts < count) return `only ${chart.gifts} gifts`;
          chart.gifts -= count;
          chart.food += price * count;
          outcome = `bought ${price * count} rations for ${count} gift${count === 1 ? '' : 's'}`;
        } else {
          const cost = price * count;
          if (chart.gifts < cost) return `${count} ${it} cost ${cost} gifts; only ${chart.gifts}`;
          if (it === 'askaris' && chart.muskets < count) return `an askari needs a musket; only ${chart.muskets}`;
          chart.gifts -= cost;
          chart[it] += count;
          if (it === 'askaris') chart.muskets -= count;
          outcome = `bought ${count} ${count === 1 ? it.slice(0, -1) : it} for ${cost} gift${cost === 1 ? '' : 's'}${it === 'askaris' ? ` and ${count} musket${count === 1 ? '' : 's'}` : ''}`;
        }
      } else {
        if (!SELLABLE.includes(it)) return `${it} cannot be sold`;
        if (it === 'food') {
          // `count` is gifts wanted: `price` rations each.
          const rations = price * count;
          if (chart.food < rations) return `${count} gifts need ${rations} rations; only ${chart.food}`;
          chart.food -= rations;
          chart.gifts += count;
          outcome = `sold ${rations} rations for ${count} gift${count === 1 ? '' : 's'}`;
        } else {
          if (chart[it] < count) return `only ${chart[it]} ${it}`;
          chart[it] -= count;
          chart.gifts += price * count;
          outcome = `sold ${count} ${count === 1 ? it.slice(0, -1) : it} for ${price * count} gifts`;
        }
      }
      const record: RollRecord = { kind: 'trade', seat: explorer.seat, hex, rolls: [], outcome };
      return { ...replaceExplorer(state, { ...holder, chart }), turn: { ...state.turn, log: [...state.turn.log, record] } };
    }
    case 'natives/done': {
      const { seat } = event.payload as { seat?: string };
      if (!state.turn) return 'game not started';
      if (seat !== state.turn.current) return `it is not ${seat}'s turn`;
      if (state.turn.phase !== 'trade') return 'no trade is open';
      const owed = worksOwed(state, currentExplorer(state)!);
      if (owed.length) return `the ${owed[0] === 'evangelism' ? 'missionary must preach' : 'doctor must treat the tribe'} first`;
      return { ...state, turn: { ...state.turn, phase: 'act' } };
    }
    case 'specialty/performed': {
      const { seat, specialty } = event.payload as { seat?: string; specialty?: unknown };
      if (!state.turn) return 'game not started';
      if (seat !== state.turn.current) return `it is not ${seat}'s turn`;
      const explorer = currentExplorer(state)!;
      if (specialty !== 'zoology' && specialty !== 'geology' && specialty !== 'evangelism' && specialty !== 'medicine') return 'specialty/performed needs a specialty';
      if (!explorer.specialties.includes(specialty)) return `the explorer is no ${specialty === 'zoology' ? 'zoologist' : specialty === 'geology' ? 'geologist' : specialty === 'evangelism' ? 'missionary' : 'doctor'}`;
      if (specialty === 'zoology' || specialty === 'geology') {
        if (state.turn.phase !== 'act') return 'not now';
        if (state.turn.moved) return 'the turn is spent';
        if (!researchPending(explorer).includes(specialty)) return 'nothing to study here';
        const hex = (explorer.location as { kind: 'hex'; hex: HexId }).hex;
        const camp = situationOf(state, explorer)!;
        const r = study(state.rng!, specialty, camp.terrain!, camp.river, camp.oasis);
        const specimens = { ...explorer.specimens, [specialty]: explorer.specimens[specialty] + (r.found ? 1 : 0) };
        const research = { hex, done: [...explorer.research!.done, specialty as 'zoology' | 'geology'] };
        const record: RollRecord = { kind: 'specialty', seat: explorer.seat, hex, rolls: r.rolls, outcome: r.summary };
        return { ...replaceExplorer(state, { ...explorer, specimens, research }), rng: r.rng, turn: { ...state.turn, moved: true, log: [...state.turn.log, record] } };
      }
      // Evangelism and medicine: with the chief's permission (the trade phase), or in captivity without it.
      const captive = explorer.location.kind === 'captive';
      if (!captive && state.turn.phase !== 'trade') return 'the chief has not permitted it';
      const hex = (explorer.location as { kind: 'hex' | 'captive'; hex: HexId }).hex;
      const tribe = state.tribes[captive ? (explorer.location as { tribe: number }).tribe : state.map[hex].tribe!];
      const doneList = specialty === 'evangelism' ? tribe.preachedBy : tribe.treatedBy;
      if (doneList.includes(explorer.seat)) return `the ${specialty === 'evangelism' ? 'missionary has preached' : 'doctor has treated'} here already`;
      const work = specialty === 'evangelism' ? preach(state.rng!) : treat(state.rng!, captive);
      let rng = work.rng;
      const log: RollRecord[] = [...state.turn.log, { kind: 'specialty', seat: explorer.seat, hex, rolls: work.rolls, outcome: work.summary }];
      const tribes = { ...state.tribes, [tribe.id]: { ...tribe, attitude: tribe.attitude + work.attitude, preachedBy: specialty === 'evangelism' ? [...tribe.preachedBy, explorer.seat] : tribe.preachedBy, treatedBy: specialty === 'medicine' ? [...tribe.treatedBy, explorer.seat] : tribe.treatedBy } };
      const points = specialty === 'evangelism' ? Math.max(0, work.attitude) : (work as TreatResult).points;
      const goodWorks = { ...explorer.goodWorks, [specialty]: explorer.goodWorks[specialty] + points };
      let next: ExplorerState = { ...explorer, goodWorks };
      if (captive && work.attitude > 0) next = { ...next, location: { ...(explorer.location as { kind: 'captive'; hex: HexId; tribe: number; had: Chart; goodwill: number }), goodwill: (explorer.location as { goodwill: number }).goodwill + work.attitude } };
      const t = work as { explorerDies?: boolean; explorerSick?: boolean };
      if (t.explorerDies) return { ...perish({ ...state, tribes }, next, 'died', `died of disease treating tribe ${tribe.id} at ${hex}`), rng, turn: { ...state.turn, log, moved: true } };
      if (t.explorerSick) next = { ...next, sick: { ...next.sick, explorer: true } };
      // The chief's and the witch doctor's poison (rules §9), until one succeeds.
      for (let i = 0; i < work.poisonAttempts; i++) {
        const poison = attemptPoison(rng, next.poisonBonus);
        rng = poison.rng;
        log.push({ kind: 'poison', seat: explorer.seat, hex, rolls: poison.rolls, outcome: poison.summary });
        if (poison.result === 'dies') return { ...perish({ ...state, tribes }, next, 'died', `poisoned by tribe ${tribe.id} at ${hex}`), rng, turn: { ...state.turn, log, moved: true } };
        if (poison.result === 'recovers') next = { ...next, poisonBonus: next.poisonBonus + 1 };
      }
      return { ...replaceExplorer(state, next), rng, tribes, turn: { ...state.turn, log } };
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
      // Release every prisoner: the tribe's regard for this explorer rises by three (rules §8.6) and the village is left alone.
      const holder = holderOf(state, explorer);
      const chart = { ...holder.chart!, bearers: holder.chart!.bearers - tribe.pending!.prisoners };
      const record: RollRecord = { kind: 'victory', seat: explorer.seat, hex, rolls: [], outcome: `${tribe.pending!.prisoners} prisoners released: the tribe is grateful` };
      return { ...replaceExplorer(state, { ...holder, chart }), tribes: { ...state.tribes, [tribe.id]: { ...tribe, warriors: tribe.warriors + tribe.pending!.prisoners, regard: { ...tribe.regard, [explorer.seat]: (tribe.regard[explorer.seat] ?? 0) + 3 }, pending: null } }, turn: { ...state.turn, phase: 'act', log: [...state.turn.log, record] } };
    }
    case 'expedition/returned': {
      // At a port of entry the explorer dismisses his men, leaves them the supplies, and sails home free (rules §12).
      const { seat } = event.payload as { seat?: string };
      if (!state.turn) return 'game not started';
      if (seat !== state.turn.current) return `it is not ${seat}'s turn`;
      if (state.turn.phase !== 'act') return 'not now';
      const explorer = currentExplorer(state)!;
      const party = partyOf(state, explorer);
      if (!explorer.chart && !party) return 'the expedition is not outfitted';
      const port = portOf(explorer);
      if (!port) return 'the explorer is not at a port of entry';
      // Leaving a joint expedition at the port: the men stay with the companions (rules §13).
      const left = party ? leaveParty(state, explorer.seat, null) : state;
      const me = alive(left, explorer.seat)!;
      const record: RollRecord = { kind: 'cache', seat: explorer.seat, hex: BOARD.ports[port].hex, rolls: [], outcome: `the expedition is dismissed at ${BOARD.ports[port].name}; passage home is free` };
      return { ...replaceExplorer(left, { ...me, location: { kind: 'homeward', port }, chart: null, lastMeal: null, research: null, cameFrom: null }), turn: { ...state.turn, moved: true, log: [...state.turn.log, record] } };
    }
    case 'explorer/retired': {
      // At any time on his own turn (rules §12): the explorer leaves play; his markers come off and his unvisited hexes are erased.
      const { seat } = event.payload as { seat?: string };
      if (!state.turn) return 'game not started';
      if (seat !== state.turn.current) return `it is not ${seat}'s turn`;
      const explorer = currentExplorer(state);
      if (!explorer) return 'no explorer to retire';
      if (explorer.location.kind === 'voyage' || explorer.location.kind === 'homeward') return 'the explorer is at sea';
      const where = explorer.location.kind === 'europe' ? 'retired in Europe' : explorer.location.kind === 'captive' ? `retired in captivity, abandoned to tribe ${explorer.location.tribe}` : `retired in Africa at ${standingHex(explorer)}`;
      return { ...perish(state, explorer, 'retired', where), turn: { ...state.turn, phase: 'act', trade: null, moved: true } };
    }
    case 'hex/published': {
      // In Europe (rules §12): claim a hex under one's marker, even one mapped by another; every marker comes off,
      // the hex is known to all, its points are scored and one donation card is drawn.
      const { seat, hex } = event.payload as { seat?: string; hex?: unknown };
      if (!state.turn) return 'game not started';
      if (seat !== state.turn.current) return `it is not ${seat}'s turn`;
      if (state.turn.phase !== 'act') return 'not now';
      const explorer = currentExplorer(state)!;
      if (explorer.location.kind !== 'europe') return 'hexes are published in Europe';
      if (typeof hex !== 'string' || !state.map[hex]) return 'hex/published needs a hex mapped in play';
      const m = state.map[hex];
      if (m.publishedBy) return `${hex} is already published`;
      if (!m.markers.includes(explorer.seat)) return `no marker of ${seat} on ${hex}`;
      const value = valueOf(state, hex as HexId, explorer.seat, state.turn.round);
      const record: RollRecord = { kind: 'published', seat: explorer.seat, hex: hex as HexId, rolls: [], outcome: `${hex} published (${value.parts.join(', ')}): ${fmtPoints(value.points)} point${value.points === 1 ? '' : 's'}, a card drawn` };
      const published: GameState = { ...addScore(state, explorer.seat, value.entries), map: { ...state.map, [hex]: { ...m, markers: [], publishedBy: explorer.seat } }, superlatives: [...state.superlatives, ...value.superlatives], turn: { ...state.turn, log: [...state.turn.log, record] } };
      return drawOne(published, explorer);
    }
    case 'expedition/reorganised': {
      // Any turn (rules §5): cache goods under a marker, dismiss men, turn animals loose or eat them.
      const { seat, action, item, count } = event.payload as { seat?: string; action?: unknown; item?: unknown; count?: unknown };
      if (!state.turn) return 'game not started';
      if (seat !== state.turn.current) return `it is not ${seat}'s turn`;
      if (state.turn.phase !== 'act') return 'not now';
      const explorer = currentExplorer(state)!;
      const holder = holderOf(state, explorer);
      if (!holder.chart) return 'the expedition is not outfitted';
      const hex = standingHex(explorer);
      if (!hex || explorer.location.kind === 'captive') return 'the explorer is not free in Africa';
      if (typeof count !== 'number' || !Number.isInteger(count) || count <= 0) return 'expedition/reorganised needs a count';
      if (typeof item !== 'string' || !ITEMS.includes(item as Item)) return 'expedition/reorganised needs an item';
      const it = item as Item;
      const chart = { ...holder.chart };
      if (chart[it] < count) return `only ${chart[it]} ${it}`;
      const men: Item[] = ['guides', 'bearers', 'askaris'];
      const animals: Item[] = ['camels', 'horses'];
      let outcome: string;
      let caches = state.caches;
      if (action === 'cache') {
        if (men.includes(it) || animals.includes(it)) return `${it} cannot be cached`;
        chart[it] -= count;
        const mine = Object.values(caches).find((c) => c.hex === hex && c.seat === explorer.seat && c.round === state.turn!.round);
        if (mine) caches = { ...caches, [mine.id]: { ...mine, contents: { ...mine.contents, [it]: (mine.contents[it] ?? 0) + count } } };
        else { const id = Math.max(0, ...Object.keys(caches).map(Number)) + 1; caches = { ...caches, [id]: { id, hex, seat: explorer.seat, round: state.turn.round, contents: { [it]: count } } }; }
        outcome = `${count} ${it} cached`;
      } else if (action === 'dismiss') {
        if (!men.includes(it)) return `${it} cannot be dismissed`;
        chart[it] -= count;
        outcome = `${count} ${count === 1 ? it.slice(0, -1) : it} dismissed`;
      } else if (action === 'release') {
        if (!animals.includes(it)) return `${it} cannot be turned loose`;
        chart[it] -= count;
        outcome = `${count} ${count === 1 ? it.slice(0, -1) : it} turned loose`;
      } else if (action === 'eat') {
        if (!animals.includes(it)) return `${it} cannot be eaten`;
        chart[it] -= count;
        chart.food += 10 * count;
        outcome = `${count} ${count === 1 ? it.slice(0, -1) : it} eaten: ${10 * count} rations`;
      } else return 'expedition/reorganised needs cache, dismiss, release or eat';
      const record: RollRecord = { kind: 'cache', seat: explorer.seat, hex, rolls: [], outcome };
      return { ...replaceExplorer(state, { ...holder, chart }), caches, turn: { ...state.turn, log: [...state.turn.log, record] } };
    }
    case 'cache/recovered': {
      const { seat, cacheId } = event.payload as { seat?: string; cacheId?: unknown };
      if (!state.turn) return 'game not started';
      if (seat !== state.turn.current) return `it is not ${seat}'s turn`;
      if (state.turn.phase !== 'act') return 'not now';
      const explorer = currentExplorer(state)!;
      const holder = holderOf(state, explorer);
      if (!holder.chart) return 'the expedition is not outfitted';
      const hex = standingHex(explorer);
      const cache = typeof cacheId === 'number' ? state.caches[cacheId] : undefined;
      if (!cache) return 'no such cache';
      if (!hex || explorer.location.kind === 'captive' || cache.hex !== hex) return 'the cache is not here';
      if (cache.seat !== explorer.seat && !state.map[hex]?.publishedBy) return 'another explorer\u2019s cache: only findable once the hex is published (RQ-3)';
      if (cache.round >= state.turn.round) return 'a cache is dug up on a later turn';
      // Returning to a cache: on a 1 or 2 it has disappeared (rules §5).
      const r = d6(state.rng!, 'cache');
      const { [cache.id]: _gone, ...rest } = state.caches;
      void _gone;
      const gone = r.value <= 2;
      const chart = { ...holder.chart };
      if (!gone) for (const [k, n] of Object.entries(cache.contents)) chart[k as Item] += n ?? 0;
      const listed = Object.entries(cache.contents).map(([k, n]) => `${n} ${k}`).join(', ');
      const record: RollRecord = { kind: 'cache', seat: explorer.seat, hex, rolls: [{ label: 'cache', value: r.value }], outcome: gone ? `the cache has disappeared (${listed})` : `the cache is recovered: ${listed}` };
      return { ...replaceExplorer(state, { ...holder, chart }), rng: r.state, caches: rest, turn: { ...state.turn, log: [...state.turn.log, record] } };
    }
    case 'water/taken': {
      const { seat, rations } = event.payload as { seat?: string; rations?: unknown };
      if (!state.turn) return 'game not started';
      if (seat !== state.turn.current) return `it is not ${seat}'s turn`;
      const explorer = currentExplorer(state)!;
      const holder = holderOf(state, explorer);
      if (!holder.chart) return 'the expedition is not outfitted';
      if (typeof rations !== 'number' || !Number.isInteger(rations) || rations === 0) return 'water/taken needs a whole number of rations';
      if (rations > 0 && !waterAvailable(state, explorer)) return 'there is no water here';
      const water = holder.chart.water + rations;
      if (water < 0) return `only ${holder.chart.water} water rations to pour out`;
      return replaceExplorer(state, { ...holder, chart: { ...holder.chart, water } });
    }
    case 'expedition/outfitted': {
      const { seat, purchases } = event.payload as { seat?: string; purchases?: unknown };
      if (!state.turn) return 'game not started';
      if (seat !== state.turn.current) return `it is not ${seat}'s turn`;
      const explorer = currentExplorer(state)!;
      if (explorer.location.kind !== 'port') return 'the explorer is not at a port of entry';
      if (explorer.chart) return 'the expedition is already outfitted';
      const party = partyOf(state, explorer);
      if (party && party.leader !== explorer.seat) return 'a companion of a joint expedition does not outfit: its leader does';
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
