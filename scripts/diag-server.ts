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
//   GET  /health
//
// Modelled on the PUT server from egirard/dicecam, which let the browser save captured frames
// and analysis data to the local disk for later study.
import { mkdir, readdir } from 'node:fs/promises';
import { join, normalize } from 'node:path';

const port = Number(process.env.DIAG_PORT ?? 3002);
const root = process.env.DIAG_DIR ?? join(process.cwd(), 'diagnostics');

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
  'Access-Control-Allow-Headers': '*'
};
const respond = (body: BodyInit | null, status = 200, headers: Record<string, string> = {}) =>
  new Response(body, { status, headers: { ...cors, ...headers } });

/** Only simple names: letters, digits, dot, dash, underscore. Never a path. */
const safe = (s: string) => /^[A-Za-z0-9._-]{1,120}$/.test(s) && !s.startsWith('.');

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
