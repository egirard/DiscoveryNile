import type { GameEvent, GameEventType } from './events';
import type { GameState } from './state';

// Exposed on window.__TABLETOP__ in dev and E2E builds only, so scenarios can assert on state.
export interface TabletopDebug {
  getState(): GameState;
  getEvents(): GameEvent[];
  getSeed(): number | null;
  append(type: GameEventType, payload: Record<string, unknown>): Promise<void>;
}

export const isDebugBuild = import.meta.env.DEV || import.meta.env.VITE_E2E === 'true';

export function exposeDebug(debug: TabletopDebug) {
  if (isDebugBuild && typeof window !== 'undefined') window.__TABLETOP__ = debug;
}
