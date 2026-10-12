import type { GameEvent } from '$lib/game/events';
import type { ExplorerState, GameState, RollOff } from '$lib/game/state';
import { dice, shuffleWith } from '$lib/game/random';
import { CARD_IDS, card, handValue, isCardId, type CardId } from '$features/cards/deck';
import { BOARD, type PortId } from '$features/map/manifest';
import { ITEMS, availableAt, cost, type Purchases } from '$features/expedition/prices';
import type { SeatId } from '$lib/tabletop/seats';
import { drawDisaster } from '$features/disasters/draw';

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
  const i = order.indexOf(current);
  const next = order[(i + 1) % order.length];
  return beginTurn({ ...state, rollOff: null, turn: { ...state.turn!, round: i + 1 >= order.length ? round + 1 : round } }, next);
}

/**
 * The start of a turn. In Europe (rules §4): expired free tickets go to the discard pile, then
 * the hand limit applies (the player chooses what to discard), then one card is drawn. At sea:
 * the explorer lands at the chosen port and this turn is the one the rules say is skipped.
 */
function beginTurn(state: GameState, seat: SeatId): GameState {
  const turn = { ...state.turn!, current: seat, phase: 'act' as const, moved: false, movement: null, log: [] };
  state = { ...state, turn };
  let explorer = currentExplorer(state)!;
  if (explorer.location.kind === 'voyage') {
    const port = explorer.location.port;
    const landed = replaceExplorer(state, { ...explorer, location: { kind: 'port', port }, known: [BOARD.ports[port].hex] });
    return advance(landed);
  }
  if (explorer.location.kind === 'hex') return drawDisaster(state, explorer);
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
        turn: { order, current: winner, round: 1, phase: 'act', moved: false, movement: null, log: [] },
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
      if (state.turn.phase !== 'act') return 'cannot end the turn while discarding';
      return advance(state);
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
