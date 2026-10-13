// A dumb JSON-over-WebSocket relay for development and E2E, speaking the subset of the ARViewer
// session protocol the clients use (see src/lib/repository/relay.ts): one table per session
// publishes `state`; viewers receive the cached state on join and every later one; viewers'
// `action` messages are stamped with the seat they joined with and forwarded to the table.
//   bun run scripts/relay.ts     (RELAY_PORT, default 3001; GET /health for readiness)
import type { ServerWebSocket } from 'bun';

interface Client { session?: string; role?: 'table' | 'viewer'; seat?: string; viewerId?: string }
interface Session { table: ServerWebSocket<Client> | null; viewers: Set<ServerWebSocket<Client>>; state: string | null }

const sessions = new Map<string, Session>();
const session = (id: string): Session => {
  let s = sessions.get(id);
  if (!s) sessions.set(id, (s = { table: null, viewers: new Set(), state: null }));
  return s;
};
let nextViewer = 1;
const send = (ws: ServerWebSocket<Client> | null, m: unknown) => ws?.send(JSON.stringify(m));

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
      let m: { type: string; session?: string; role?: 'table' | 'viewer'; seat?: string; state?: unknown; action?: string; [key: string]: unknown };
      try { m = JSON.parse(String(raw)); } catch { return; }
      if (m.type === 'join' && typeof m.session === 'string' && m.session.length <= 32) {
        const s = session(m.session);
        ws.data.session = m.session;
        if (m.role === 'table') {
          if (s.table && s.table !== ws) s.table.close();
          s.table = ws;
          ws.data.role = 'table';
          for (const v of s.viewers) send(v, { type: 'host', connected: true });
        } else {
          ws.data.role = 'viewer';
          ws.data.seat = typeof m.seat === 'string' ? m.seat : undefined;
          ws.data.viewerId = `v${nextViewer++}`;
          s.viewers.add(ws);
          if (s.state) ws.send(s.state);
        }
        send(ws, { type: 'joined', role: ws.data.role, viewers: s.viewers.size, viewerId: ws.data.viewerId, seat: ws.data.seat, tableConnected: Boolean(s.table) });
        send(s.table, { type: 'peers', viewers: s.viewers.size });
        return;
      }
      const s = ws.data.session ? sessions.get(ws.data.session) : undefined;
      if (!s) return;
      if (m.type === 'state' && ws.data.role === 'table') {
        s.state = JSON.stringify({ type: 'state', state: m.state });
        for (const v of s.viewers) v.send(s.state);
      } else if (m.type === 'action' && ws.data.role === 'viewer') {
        // Stamp identity here, so the table never trusts a viewer's claim.
        send(s.table, { ...m, viewerId: ws.data.viewerId, seat: ws.data.seat });
      }
    },
    close(ws) {
      const s = ws.data.session ? sessions.get(ws.data.session) : undefined;
      if (!s) return;
      if (s.table === ws) {
        s.table = null;
        for (const v of s.viewers) send(v, { type: 'host', connected: false });
      }
      s.viewers.delete(ws);
      send(s.table, { type: 'peers', viewers: s.viewers.size });
      if (!s.table && s.viewers.size === 0) sessions.delete(ws.data.session!);
    }
  }
});

console.log(`relay listening on ws://127.0.0.1:${port}`);
