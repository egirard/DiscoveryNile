import type { GameEvent, GameEventType } from '$lib/game/events';

export type SyncStatus = 'offline' | 'syncing' | 'synced';

export interface GameRepository {
  append(type: GameEventType, payload: Record<string, unknown>): Promise<void>;
  subscribe(
    onEvents: (events: GameEvent[]) => void,
    onError: (error: Error) => void,
    onStatus?: (status: SyncStatus) => void
  ): () => void;
  disconnect(): Promise<void>;
  reconnect(): Promise<void>;
}

const byRemote = (a: GameEvent, b: GameEvent) => a.createdAtMillis - b.createdAtMillis || a.id.localeCompare(b.id);
const byPending = (a: GameEvent, b: GameEvent) => a.clientSeq - b.clientSeq || a.id.localeCompare(b.id);

/** Acknowledged events first (by time, then id), then unacknowledged ones (by sequence). */
export function orderEventStream(remote: GameEvent[], pending: GameEvent[]): GameEvent[] {
  const ids = new Set(remote.map((e) => e.id));
  return [...[...remote].sort(byRemote), ...pending.filter((e) => !ids.has(e.id)).sort(byPending)];
}
