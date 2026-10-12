// Wires a repository, the reducer, the relay, and the debug hook into one reactive game.
import { reduce } from './reduce';
import { initialState, type GameState } from './state';
import type { GameEvent, GameEventType } from './events';
import { exposeDebug } from './debug';
import type { GameRepository, SyncStatus } from '$lib/repository/game-repository';
import { connectRelay, relayUrlFromEnvironment, type Intent, type RelayHandle } from '$lib/repository/relay';
import { clearLocalGame, currentLocalGame, localGameExists, setCurrentLocalGame } from '$lib/repository/local-repository';
import { openRepository } from '$lib/repository/select';
import { generateRoomCode } from '$lib/tabletop/room-code';
import { DEFAULT_LAYOUT, type SeatLayout } from '$lib/tabletop/seats';
import { configureDiagnostics, log as diagLog, snapshot as diagSnapshot } from '$lib/diagnostics/diag';

export interface Game {
  gameId: string;
  actorUid: string;
  relayUrl: string | null;
  state: GameState;
  events: GameEvent[];
  status: SyncStatus;
  seed: number | null;
  append(type: GameEventType, payload: Record<string, unknown>): Promise<void>;
  publishGeometry(geometry: unknown): void;
  close(): void;
}

export interface OpenGameOptions {
  layout?: SeatLayout;
  onChange: (game: Game) => void;
  onIntent?: (intent: Intent, game: Game) => void;
}

function readSeed(search: string): number | null {
  const s = Number(new URLSearchParams(search).get('seed'));
  return Number.isFinite(s) && s > 0 ? s : null;
}

/** A fresh game needs a seed for its dice; E2E pins one with ?seed=. */
function randomSeed(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] || 1;
}

export async function openGame(options: OpenGameOptions): Promise<Game> {
  const search = location.search;
  const query = new URLSearchParams(search);
  // ?new=1 starts a fresh game; ?gameId=XXXXX opens (or, with ?new=1, recreates) a specific
  // one, which is how E2E pins the room code. Otherwise the last game in this browser resumes.
  const fresh = query.get('new') === '1';
  const requested = query.get('gameId');
  let gameId = requested ?? (fresh ? null : currentLocalGame());
  if (fresh && gameId) clearLocalGame(gameId);
  if (!gameId) {
    do gameId = generateRoomCode();
    while (localGameExists(gameId));
  }
  setCurrentLocalGame(gameId);
  // Drop one-shot parameters so a reload resumes this game instead of creating another.
  if (query.has('new') || query.has('seed') || query.has('gameId')) {
    for (const k of ['new', 'seed', 'gameId']) query.delete(k);
    const rest = query.toString();
    history.replaceState(history.state, '', `${location.pathname}${rest ? `?${rest}` : ''}`);
  }

  const { repository, actorUid } = await openRepository(gameId);
  const relayUrl = relayUrlFromEnvironment(search);
  // Diagnostics capture (docs/diagnostics.md): inactive unless a server URL is configured.
  configureDiagnostics({ session: gameId, search });
  let diagnosticCount = 0;
  let relay: RelayHandle | null = null;
  let geometry: unknown = undefined;

  const game: Game = {
    gameId,
    actorUid,
    relayUrl,
    state: initialState(),
    events: [],
    status: 'syncing',
    seed: readSeed(search) ?? randomSeed(),
    append: (type, payload) => repository.append(type, payload),
    publishGeometry(g) {
      geometry = g;
      relay?.publish(game.events, geometry);
    },
    close() {
      unsubscribe();
      relay?.close();
    }
  };

  const unsubscribe = repository.subscribe(
    (events) => {
      game.events = events;
      game.state = reduce(events);
      relay?.publish(events, geometry);
      diagLog('events/changed', { count: events.length, last: events.at(-1)?.type ?? null });
      if (game.state.diagnostics.length > diagnosticCount) {
        // Save the exact stream that produced a reducer diagnostic; it can become a unit-test fixture.
        diagnosticCount = game.state.diagnostics.length;
        diagSnapshot(`events-diagnostic-${diagnosticCount}`, { diagnostics: game.state.diagnostics, events });
      }
      options.onChange(game);
    },
    (error) => console.error(error),
    (status) => {
      game.status = status;
      options.onChange(game);
    }
  );

  if (game.events.length === 0) {
    await game.append('game/created', { gameId, seats: options.layout ?? DEFAULT_LAYOUT, seed: game.seed });
  }

  if (relayUrl) {
    relay = connectRelay(relayUrl, gameId, 'host', {
      onIntent: (intent) => {
        diagLog('relay/intent', intent);
        options.onIntent?.(intent, game);
      },
      onStatus: (status) => diagLog('relay/status', status)
    });
    relay.publish(game.events, geometry);
  }

  exposeDebug({
    getState: () => game.state,
    getEvents: () => game.events,
    getSeed: () => game.seed,
    append: game.append
  });

  return game;
}

export function seedFromGame(game: Game): number | null {
  return game.seed;
}

export type { GameRepository };
