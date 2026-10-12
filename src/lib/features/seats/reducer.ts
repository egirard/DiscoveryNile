import type { GameEvent } from '$lib/game/events';
import type { GameState, SeatState } from '$lib/game/state';
import { parseSeatId, seatsFor, type SeatLayout } from '$lib/tabletop/seats';

// A reducer step returns the new state, a string diagnostic, or the same state object
// to say "not mine".
export function reduceSeats(state: GameState, event: GameEvent): GameState | string {
  switch (event.type) {
    case 'game/created': {
      if (state.gameId) return 'game already created';
      const { gameId, seats } = event.payload as { gameId?: string; seats?: SeatLayout };
      if (!gameId || !seats) return 'game/created needs gameId and seats';
      const seatStates: SeatState[] = seatsFor(seats).map((s) => ({ id: s.id, uid: null, name: null }));
      return { ...state, gameId, hostUid: event.actorUid, seats: seatStates };
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
