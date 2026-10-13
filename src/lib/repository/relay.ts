// Relay attachment. The relay speaks the ARViewer session protocol (github.com/egirard/ARViewer,
// server/server.js; the same relay Jaipur's tabletop uses), so the hosted relay at
// wss://arviewer-relay.onrender.com/ws serves the table without any server of this project's own:
// a client joins a session as the `table` or as a `viewer` holding a seat; the table publishes
// `state`, which the relay caches for late joiners and forwards to every viewer; a viewer sends
// `action` messages, which the relay stamps with its seat and forwards to the table. The local
// relay (scripts/relay.ts) speaks the same subset for development and E2E. Nothing here knows the game.
import type { GameEvent } from '$lib/game/events';

export type RelayRole = 'host' | 'viewer';

export interface Intent {
  seat: string;
  action: string;
  [key: string]: unknown;
}

/** What the table publishes: the whole event log and the screen's geometry. */
export interface Published {
  events: GameEvent[];
  geometry?: unknown;
}

/** Wire messages, as the ARViewer relay defines them (only the kinds this project uses). */
export type RelayMessage =
  | { type: 'join'; session: string; role: 'table' | 'viewer'; seat?: string }
  | { type: 'joined'; role: 'table' | 'viewer'; viewers: number; viewerId?: string; seat?: string; tableConnected: boolean }
  | { type: 'state'; state: Published }
  | { type: 'action'; action: string; viewerId?: string; seat?: string; [key: string]: unknown }
  | { type: 'host'; connected: boolean }
  | { type: 'peers'; viewers: number };

export interface RelayHandle {
  publish(events: GameEvent[], geometry?: unknown): void;
  close(): void;
}

export function relayUrlFromEnvironment(search = typeof location === 'undefined' ? '' : location.search): string | null {
  const q = new URLSearchParams(search).get('relay');
  if (q) return q;
  const env = import.meta.env.VITE_RELAY_URL as string | undefined;
  return env && env.length > 0 ? env : null;
}

/** The relay's role name for ours: the table is the relay's `table`, a phone its `viewer`. */
export const wireRole = (role: RelayRole): 'table' | 'viewer' => (role === 'host' ? 'table' : 'viewer');

export function connectRelay(
  url: string,
  session: string,
  role: RelayRole,
  handlers: {
    seat?: string;
    onEvents?: (events: GameEvent[], geometry?: unknown) => void;
    onIntent?: (intent: Intent) => void;
    onStatus?: (status: 'offline' | 'syncing' | 'synced') => void;
  }
): RelayHandle {
  let ws: WebSocket | null = null;
  let last: RelayMessage | null = null;
  let closed = false;
  let retry = 500;

  const send = (message: RelayMessage) => {
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
  };

  const open = () => {
    if (closed) return;
    handlers.onStatus?.('syncing');
    ws = new WebSocket(url);
    ws.onopen = () => {
      retry = 500;
      send({ type: 'join', session, role: wireRole(role), seat: handlers.seat });
      if (last) send(last); // a reconnecting table republishes for late joiners
      handlers.onStatus?.('synced');
    };
    ws.onmessage = (raw) => {
      let message: RelayMessage;
      try {
        message = JSON.parse(String(raw.data));
      } catch {
        return;
      }
      if (message.type === 'state' && message.state?.events) handlers.onEvents?.(message.state.events, message.state.geometry);
      if (message.type === 'action' && typeof message.seat === 'string') {
        const { type: _type, viewerId: _viewerId, ...rest } = message;
        handlers.onIntent?.({ ...rest, seat: message.seat, action: message.action });
      }
    };
    ws.onclose = () => {
      handlers.onStatus?.('offline');
      if (!closed) setTimeout(open, (retry = Math.min(retry * 2, 8000)));
    };
    ws.onerror = () => ws?.close();
  };
  open();

  return {
    publish(events, geometry) {
      last = { type: 'state', state: { events, geometry } };
      send(last);
    },
    close() {
      closed = true;
      ws?.close();
    }
  };
}
