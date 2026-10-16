// Diagnostics capture server for development. The table has no devtools you can reach while
// people are playing, so the app ships what you need to see to this server instead:
// event streams, state dumps, console errors, relay traffic, geometry, rendered canvases.
//
//   bun run diag            (DIAG_PORT, default 3002; files land in ./diagnostics/)
//
//   PUT  /diag/<session>/<name>        write the body to diagnostics/<session>/<name>
//   POST /diag/<session>/log           append one JSON line to diagnostics/<session>/log.ndjson
//   GET  /diag/<session>/              list files in the session (?suffix=.json to filter)
//   GET  /diag/<session>/<name>        read a file back
//   GET  /diag/<session>/events        a command stream (server-sent events) the table listens to in dev builds
//   POST /diag/<session>/command       send a command to every listener, e.g. { "type": "reload" } (bun run diag:reload);
//                                      { "type": "save", "target": "board", "data": … } instead writes a source file
//                                      (the map editor at /editor/ saving board.json; DIAG_SAVE_ROOT, default the cwd)
//   GET  /health
//
// Modelled on the PUT server from egirard/dicecam, which let the browser save captured frames
// and analysis data to the local disk for later study.
import { mkdir, readdir } from 'node:fs/promises';
import { join, normalize } from 'node:path';
import { serialiseBoard, validateBoard, type SaveCommand } from '../src/lib/features/map/editor';

const port = Number(process.env.DIAG_PORT ?? 3002);
const root = process.env.DIAG_DIR ?? join(process.cwd(), 'diagnostics');
/** Where a `save` command writes: the checkout the server runs in, or DIAG_SAVE_ROOT. */
const saveRoot = process.env.DIAG_SAVE_ROOT ?? process.cwd();

/**
 * The files a `save` command may write, by target (PROMPTS.md, prompt 47): the client names a target, never a path, and
 * the server checks the data before it writes. `board` is the map editor's: the whole board, written as board.json.
 */
const SAVE_TARGETS: Record<string, { path: string; check: (data: unknown) => string | null; text: (data: unknown) => string }> = {
  board: { path: 'src/lib/features/map/board.json', check: validateBoard, text: (data) => serialiseBoard(data as SaveCommand['data']) }
};
async function save(command: Partial<SaveCommand>): Promise<{ status: number; body: Record<string, unknown> }> {
  const target = typeof command.target === 'string' ? SAVE_TARGETS[command.target] : undefined;
  if (!target) return { status: 400, body: { error: `unknown save target ${String(command.target)}` } };
  const problem = target.check(command.data);
  if (problem) return { status: 400, body: { error: problem } };
  const path = join(saveRoot, target.path);
  await Bun.write(path, target.text(command.data));
  return { status: 200, body: { saved: target.path, changes: Array.isArray(command.changes) ? command.changes.length : 0 } };
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
  'Access-Control-Allow-Headers': '*'
};
const respond = (body: BodyInit | null, status = 200, headers: Record<string, string> = {}) =>
  new Response(body, { status, headers: { ...cors, ...headers } });

/** Only simple names: letters, digits, dot, dash, underscore. Never a path. */
const safe = (s: string) => /^[A-Za-z0-9._-]{1,120}$/.test(s) && !s.startsWith('.');

/** The tables listening for commands, per session (PROMPTS.md, prompt 26): a reload after a fix, so the game replays on the new code. */
const listeners = new Map<string, Set<ReadableStreamDefaultController<Uint8Array>>>();
const encoder = new TextEncoder();
function subscribe(session: string): Response {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
      c.enqueue(encoder.encode(': listening\n\n'));
      if (!listeners.has(session)) listeners.set(session, new Set());
      listeners.get(session)!.add(c);
    },
    cancel() {
      listeners.get(session)?.delete(controller);
    }
  });
  return respond(stream, 200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store' });
}
function broadcast(session: string, command: unknown): number {
  const set = listeners.get(session);
  if (!set) return 0;
  const chunk = encoder.encode(`data: ${JSON.stringify(command)}\n\n`);
  let delivered = 0;
  for (const c of set) {
    try {
      c.enqueue(chunk);
      delivered++;
    } catch {
      set.delete(c);
    }
  }
  return delivered;
}

Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return respond(null, 204);
    if (url.pathname === '/health') return respond('ok');

    const m = /^\/diag\/([^/]+)\/([^/]*)$/.exec(url.pathname);
    if (!m) return respond('not found', 404);
    const [, session, name] = m;
    if (!safe(session) || (name && !safe(name))) return respond('bad name', 400);
    const dir = normalize(join(root, session));
    await mkdir(dir, { recursive: true });

    if (req.method === 'GET' && name === 'events') return subscribe(session);
    if (req.method === 'POST' && name === 'command') {
      let command: unknown;
      try {
        command = await req.json();
      } catch {
        return respond('bad command', 400);
      }
      const file = join(dir, 'log.ndjson');
      const existing = (await Bun.file(file).exists()) ? await Bun.file(file).text() : '';
      if (command && typeof command === 'object' && (command as { type?: unknown }).type === 'save') {
        // A save writes a file here instead of reaching the tables; the log keeps the command without its data.
        const { data: _data, ...rest } = command as Partial<SaveCommand>;
        const result = await save(command as Partial<SaveCommand>);
        await Bun.write(file, `${existing}${new Date().toISOString()} ${JSON.stringify({ kind: 'command', data: { command: rest, ...result.body } })}\n`);
        return respond(JSON.stringify(result.body), result.status, { 'Content-Type': 'application/json' });
      }
      const delivered = broadcast(session, command);
      await Bun.write(file, `${existing}${new Date().toISOString()} ${JSON.stringify({ kind: 'command', data: { command, delivered } })}\n`);
      return respond(JSON.stringify({ delivered }), 200, { 'Content-Type': 'application/json' });
    }
    if (req.method === 'PUT' && name) {
      await Bun.write(join(dir, name), await req.arrayBuffer());
      return respond('ok');
    }
    if (req.method === 'POST' && name === 'log') {
      const line = (await req.text()).replace(/\n/g, ' ');
      const file = join(dir, 'log.ndjson');
      const existing = (await Bun.file(file).exists()) ? await Bun.file(file).text() : '';
      await Bun.write(file, `${existing}${new Date().toISOString()} ${line}\n`);
      return respond('ok');
    }
    if (req.method === 'GET' && !name) {
      const suffix = url.searchParams.get('suffix') ?? '';
      const files = (await readdir(dir)).filter((f) => f.endsWith(suffix)).sort();
      return respond(JSON.stringify(files), 200, { 'Content-Type': 'application/json' });
    }
    if (req.method === 'GET' && name) {
      const file = Bun.file(join(dir, name));
      return (await file.exists()) ? respond(file) : respond('not found', 404);
    }
    return respond('method not allowed', 405);
  }
});

console.log(`diagnostics server on http://127.0.0.1:${port}, writing to ${root}`);
