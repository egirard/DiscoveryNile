// A dumb JSON-over-WebSocket relay for development and E2E. It knows nothing about the game:
// one host per session publishes; viewers receive the last publication on join and every
// later one; viewers' intents are stamped with the seat they claimed and forwarded to the host.
//   bun run scripts/relay.ts     (RELAY_PORT, default 3001; GET /health for readiness)
import type { ServerWebSocket } from 'bun';

interface Client { session?: string; role?: 'host' | 'viewer'; seat?: string }
interface Session { host: ServerWebSocket<Client> | null; viewers: Set<ServerWebSocket<Client>>; last: string | null }

const sessions = new Map<string, Session>();
const session = (id: string): Session => {
  let s = sessions.get(id);
  if (!s) sessions.set(id, (s = { host: null, viewers: new Set(), last: null }));
  return s;
};

const port = Number(process.env.RELAY_PORT ?? 3001);

Bun.serve<Client>({
  port,
  fetch(req, server) {
    const url = new URL(req.url);
    if (url.pathname === '/health') return new Response('ok');
    if (server.upgrade(req, { data: {} })) return;
    return new Response('relay', { status: 200 });
  },
  websocket: {
    message(ws, raw) {
      let m: { kind: string; session?: string; role?: 'host' | 'viewer'; seat?: string; intent?: Record<string, unknown> };
      try { m = JSON.parse(String(raw)); } catch { return; }
      if (!m.session) return;
      const s = session(m.session);
      if (m.kind === 'hello') {
        ws.data.session = m.session;
        ws.data.role = m.role;
        ws.data.seat = m.seat;
        if (m.role === 'host') s.host = ws;
        else {
          s.viewers.add(ws);
          if (s.last) ws.send(s.last);
        }
      } else if (m.kind === 'publish' && ws.data.role === 'host') {
        s.last = String(raw);
        for (const v of s.viewers) v.send(s.last);
      } else if (m.kind === 'intent' && ws.data.role === 'viewer' && m.intent) {
        s.host?.send(JSON.stringify({ kind: 'intent', session: m.session, intent: { ...m.intent, seat: ws.data.seat } }));
      }
    },
    close(ws) {
      const s = ws.data.session ? sessions.get(ws.data.session) : undefined;
      if (!s) return;
      if (s.host === ws) s.host = null;
      s.viewers.delete(ws);
    }
  }
});

console.log(`relay listening on ws://127.0.0.1:${port}`);
