import type { GameEvent } from '$lib/game/events';
import type { ExplorerState, GameState, RollOff } from '$lib/game/state';
import { dice, shuffleWith } from '$lib/game/random';
import { CARD_IDS, card, isCardId, type CardId } from '$features/cards/deck';
import type { SeatId } from '$lib/tabletop/seats';

export const OPENING_HAND = 5;
export const HAND_LIMIT = 5;

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

/**
 * The start of a Europe turn (rules §4): expired free tickets go to the discard pile, then the
 * hand limit applies (the player chooses what to discard), then one card is drawn.
 */
function beginTurn(state: GameState, seat: SeatId): GameState {
  const turn = { ...state.turn!, current: seat, phase: 'act' as const };
  state = { ...state, turn };
  let explorer = currentExplorer(state)!;
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
        turn: { order, current: winner, round: 1, phase: 'act' },
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
      const { order } = state.turn;
      const i = order.indexOf(state.turn.current);
      const next = order[(i + 1) % order.length];
      const round = i + 1 >= order.length ? state.turn.round + 1 : state.turn.round;
      return beginTurn({ ...state, rollOff: null, turn: { ...state.turn, round } }, next);
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
    default:
      return state;
  }
}
