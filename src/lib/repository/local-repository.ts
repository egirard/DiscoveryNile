// Browser-local event store. Persists across reloads and restarts; the only writer is this
// browser. Other tabs on the same game see appends through the `storage` event.
import { eventId, REDUCER_VERSION, SCHEMA_VERSION, type GameEvent } from '$lib/game/events';
import type { GameRepository } from './game-repository';

const PREFIX = 'tabletop:local';
const eventsKey = (gameId: string) => `${PREFIX}:${gameId}:events:v1`;
const CURRENT_KEY = `${PREFIX}:current-game`;
const HOST_KEY = `${PREFIX}:host-uid`;

function read(gameId: string): GameEvent[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(eventsKey(gameId)) ?? '[]');
    return Array.isArray(parsed) ? (parsed as GameEvent[]) : [];
  } catch {
    return [];
  }
}

/** A stable per-browser identity. No authentication is involved. */
export function localHostUid(): string {
  let uid = localStorage.getItem(HOST_KEY);
  if (!uid) {
    uid = `local-${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
    localStorage.setItem(HOST_KEY, uid);
  }
  return uid;
}

export function currentLocalGame(): string | null {
  return localStorage.getItem(CURRENT_KEY);
}

export function setCurrentLocalGame(gameId: string | null) {
  if (gameId) localStorage.setItem(CURRENT_KEY, gameId);
  else localStorage.removeItem(CURRENT_KEY);
}

export function localGameExists(gameId: string): boolean {
  return read(gameId).length > 0;
}

export function clearLocalGame(gameId: string) {
  localStorage.removeItem(eventsKey(gameId));
}

export function createLocalRepository(gameId: string, actorUid: string): GameRepository {
  const key = eventsKey(gameId);
  let events = read(gameId);
  let clientSeq = events.filter((e) => e.actorUid === actorUid).length;
  let notify: ((events: GameEvent[]) => void) | undefined;

  const onStorage = (e: StorageEvent) => {
    if (e.key !== key) return;
    events = read(gameId);
    notify?.([...events]);
  };

  return {
    async append(type, payload) {
      clientSeq += 1;
      const event: GameEvent = {
        id: eventId(actorUid, clientSeq),
        type,
        payload,
        actorUid,
        clientSeq,
        createdAtMillis: Date.now(),
        schemaVersion: SCHEMA_VERSION,
        reducerVersion: REDUCER_VERSION
      };
      events = [...events, event];
      localStorage.setItem(key, JSON.stringify(events));
      notify?.([...events]);
    },
    subscribe(onEvents, _onError, onStatus) {
      notify = onEvents;
      addEventListener('storage', onStorage);
      onEvents([...events]);
      onStatus?.('synced');
      return () => {
        removeEventListener('storage', onStorage);
        notify = undefined;
      };
    },
    async disconnect() {},
    async reconnect() {}
  };
}
