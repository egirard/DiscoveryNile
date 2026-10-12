import type { GameEvent } from '$lib/game/events';
import type { GameState, RollOff } from '$lib/game/state';
import { dice, shuffleWith } from '$lib/game/random';
import { CARD_IDS } from '$features/cards/deck';
import type { SeatId } from '$lib/tabletop/seats';

export const OPENING_HAND = 5;

/** Seats holding a living explorer, in clockwise table order. */
export function explorerSeats(state: GameState): SeatId[] {
  return state.seats.filter((s) => state.explorers.some((e) => e.seat === s.id && e.location.kind !== 'dead')).map((s) => s.id);
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

      // The deck: a seeded shuffle, then five cards to each explorer in turn order.
      const shuffled = shuffleWith(CARD_IDS, rng);
      rng = shuffled.state;
      const draw = shuffled.items;
      const hands = new Map<SeatId, typeof draw>(order.map((s) => [s, []]));
      for (let i = 0; i < OPENING_HAND; i++) for (const seat of order) hands.get(seat)!.push(draw.shift()!);

      return {
        ...state,
        rng,
        rollOff,
        turn: { order, current: winner, round: 1, phase: 'europe' },
        deck: { draw, discard: [] },
        explorers: state.explorers.map((e) => (hands.has(e.seat) ? { ...e, hand: hands.get(e.seat)! } : e))
      };
    }
    default:
      return state;
  }
}
