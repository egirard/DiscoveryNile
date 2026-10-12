import type { GameEvent } from '$lib/game/events';
import type { GameState, SeatState } from '$lib/game/state';
import { parseSeatId, seatsFor, type SeatLayout } from '$lib/tabletop/seats';
import { rngFromSeed, rngScripted } from '$lib/game/random';

// A reducer step returns the new state, a string diagnostic, or the same state object
// to say "not mine".
export function reduceSeats(state: GameState, event: GameEvent): GameState | string {
  switch (event.type) {
    case 'game/created': {
      if (state.gameId) return 'game already created';
      const { gameId, seats, seed, dice } = event.payload as { gameId?: string; seats?: SeatLayout; seed?: unknown; dice?: unknown };
      if (!gameId || !seats) return 'game/created needs gameId and seats';
      const seatStates: SeatState[] = seatsFor(seats).map((s) => ({ id: s.id, uid: null, name: null }));
      // Every roll in the game derives from this seed (docs/rules.md D-1). A game created without
      // one falls back to a hash of its room code so replay stays deterministic.
      const seedValue = typeof seed === 'number' && Number.isFinite(seed) ? seed : hashCode(gameId);
      // Scripted dice (tests, scenarios) are consumed before the generator takes over: a list for the
      // main stream, or a map of stream name to list.
      const isList = (v: unknown): v is number[] => Array.isArray(v) && v.every((d) => typeof d === 'number');
      const script = isList(dice) ? (dice.length ? dice : null)
        : dice && typeof dice === 'object' && Object.values(dice).every(isList) && Object.values(dice).some((v) => (v as number[]).length) ? (dice as Record<string, number[]>) : null;
      const rng = script ? rngScripted(seedValue, script) : rngFromSeed(seedValue);
      return { ...state, gameId, hostUid: event.actorUid, seats: seatStates, rng };
    }
    // The occupant is `payload.uid` when the host appends on behalf of a table tap or a phone
    // intent, and the actor otherwise (a client that appends its own events, e.g. Firebase).
    case 'seat/taken': {
      const { seat, name, uid } = event.payload as { seat?: string; name?: string; uid?: string };
      const occupant = uid ?? event.actorUid;
      const parsed = seat ? parseSeatId(seat) : null;
      if (!parsed) return 'seat/taken needs a valid seat id';
      const target = state.seats.find((s) => s.id === parsed.id);
      if (!target) return `no such seat ${parsed.id}`;
      if (target.uid && target.uid !== occupant) return `seat ${parsed.id} is taken`;
      if (state.seats.some((s) => s.uid === occupant && s.id !== parsed.id)) return 'occupant already seated';
      return {
        ...state,
        seats: state.seats.map((s) => (s.id === parsed.id ? { ...s, uid: occupant, name: name ?? null } : s))
      };
    }
    case 'seat/left': {
      const { uid } = event.payload as { uid?: string };
      const occupant = uid ?? event.actorUid;
      const target = state.seats.find((s) => s.uid === occupant);
      if (!target) return 'occupant is not seated';
      return { ...state, seats: state.seats.map((s) => (s.id === target.id ? { ...s, uid: null, name: null } : s)) };
    }
    default:
      return state;
  }
}

function hashCode(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}
