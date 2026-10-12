import type { GameEvent } from '$lib/game/events';
import { NO_SICKNESS, type ExplorerState, type GameState, type Specialty } from '$lib/game/state';
import { parseSeatId } from '$lib/tabletop/seats';

export const SPECIALTIES: readonly Specialty[] = ['evangelism', 'medicine', 'zoology', 'geology'];

export function explorerAt(state: GameState, seat: string): ExplorerState | undefined {
  return state.explorers.find((e) => e.seat === seat && e.location.kind !== 'dead');
}

export function reduceExplorers(state: GameState, event: GameEvent): GameState | string {
  switch (event.type) {
    case 'explorer/commissioned': {
      const { seat, specialties } = event.payload as { seat?: string; specialties?: unknown };
      const parsed = seat ? parseSeatId(seat) : null;
      if (!parsed) return 'explorer/commissioned needs a valid seat id';
      const seatState = state.seats.find((s) => s.id === parsed.id);
      if (!seatState) return `no such seat ${parsed.id}`;
      if (!seatState.uid) return `seat ${parsed.id} is empty`;
      if (explorerAt(state, parsed.id)) return `seat ${parsed.id} already has an explorer`;
      if (!Array.isArray(specialties) || !specialties.every((s) => SPECIALTIES.includes(s as Specialty)))
        return 'explorer/commissioned needs a list of specialties';
      const unique = [...new Set(specialties as Specialty[])].sort((a, b) => SPECIALTIES.indexOf(a) - SPECIALTIES.indexOf(b));
      const explorer: ExplorerState = { seat: parsed.id, specialties: unique, location: { kind: 'europe' }, sick: NO_SICKNESS, hand: [], drawnRound: {}, money: 0, chart: null, known: [] };
      return { ...state, explorers: [...state.explorers, explorer] };
    }
    default:
      return state;
  }
}
