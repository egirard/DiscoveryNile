// Relay attachment. The relay is a dumb JSON-over-WebSocket forwarder (see scripts/relay.ts):
// one host publishes, any number of viewers receive, viewers send intents that are stamped
// with the seat they claimed. Nothing here knows the game.
import type { GameEvent } from '$lib/game/events';

export type RelayRole = 'host' | 'viewer';

export interface Intent {
  seat: string;
  action: string;
  [key: string]: unknown;
}

export interface RelayMessage {
  kind: 'publish' | 'intent' | 'hello';
  session: string;
  role?: RelayRole;
  seat?: string;
  events?: GameEvent[];
  geometry?: unknown;
  intent?: Intent;
}

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
      send({ kind: 'hello', session, role, seat: handlers.seat });
      if (last) send(last); // a reconnecting host republishes for late joiners
      handlers.onStatus?.('synced');
    };
    ws.onmessage = (raw) => {
      let message: RelayMessage;
      try {
        message = JSON.parse(String(raw.data));
      } catch {
        return;
      }
      if (message.kind === 'publish' && message.events) handlers.onEvents?.(message.events, message.geometry);
      if (message.kind === 'intent' && message.intent) handlers.onIntent?.(message.intent);
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
      last = { kind: 'publish', session, events, geometry };
      send(last);
    },
    close() {
      closed = true;
      ws?.close();
    }
  };
}

export function sendIntent(handle: { send: (m: RelayMessage) => void }, session: string, intent: Intent) {
  handle.send({ kind: 'intent', session, intent });
}
