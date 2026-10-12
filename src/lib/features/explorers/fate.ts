// Death and retirement (rules §12, Scoring): the explorer's markers come off, every unpublished hex
// that only he had visited is erased with whatever it held (its tribe, its caches: "secrets that die
// with him"; later explorers will find his discoveries were only rumours and generate the hex
// anew), his own caches vanish, and he is out of play. Points already scored stay with the seat.
import { NO_SICKNESS, type ExplorerState, type GameState } from '$lib/game/state';

export interface Fate {
  kind: 'died' | 'retired';
  round: number;
  /** For the obituary at the rail: 'killed by the natives at c24r12', 'retired in Europe' … */
  cause: string;
}

export function perish(state: GameState, explorer: ExplorerState, kind: Fate['kind'], cause: string): GameState {
  const seat = explorer.seat;
  const map: GameState['map'] = {};
  const erased = new Set<string>();
  for (const [id, m] of Object.entries(state.map)) {
    const markers = m.markers.filter((s) => s !== seat);
    if (!m.publishedBy && m.markers.includes(seat) && markers.length === 0) {
      erased.add(id);
      continue;
    }
    map[id] = markers.length === m.markers.length ? m : { ...m, markers };
  }
  const tribes = Object.fromEntries(Object.entries(state.tribes).filter(([, t]) => !erased.has(t.hex)));
  const caches = Object.fromEntries(Object.entries(state.caches).filter(([, c]) => c.seat !== seat && !erased.has(c.hex)));
  const gone: ExplorerState = {
    ...explorer,
    location: { kind: 'dead' },
    chart: null,
    research: null,
    lastMeal: null,
    cameFrom: null,
    sick: NO_SICKNESS,
    hand: [],
    drawnRound: {},
    specimens: { zoology: 0, geology: 0 },
    goodWorks: { evangelism: 0, medicine: 0 },
    fate: { kind, round: state.turn?.round ?? 0, cause }
  };
  const explorers = state.explorers.map((e) => {
    if (e.seat === seat && e.location.kind !== 'dead') return gone;
    return erased.size && e.known.some((h) => erased.has(h)) ? { ...e, known: e.known.filter((h) => !erased.has(h)) } : e;
  });
  // A hand left in Europe goes to the discard pile.
  const deck = explorer.hand.length && state.deck ? { ...state.deck, discard: [...state.deck.discard, ...explorer.hand] } : state.deck;
  return { ...state, map, tribes, caches, explorers, deck };
}

/** The last explorer a seat lost, for the obituary at its rail while no new one is commissioned. */
export function fallenAt(state: GameState, seat: string): ExplorerState | undefined {
  return state.explorers.filter((e) => e.seat === seat && e.location.kind === 'dead').at(-1);
}
