// Reload the table(s) playing a captured session, through the capture server's command stream
// (docs/diagnostics.md, PROMPTS.md prompt 26): after a fix, the game replays from its events on the new code.
//
//   bun run diag:reload            the latest captured session
//   bun run diag:reload ABCDE      that session
//
// DIAG_URL names the server (default http://127.0.0.1:3002); DIAG_DIR the capture directory the latest session is read from.
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

const url = (process.env.DIAG_URL ?? 'http://127.0.0.1:3002').replace(/\/+$/, '');
const root = process.env.DIAG_DIR ?? join(process.cwd(), 'diagnostics');
let session: string | undefined = process.argv[2];
if (!session) {
  let latest: { name: string; at: number } | null = null;
  for (const name of await readdir(root).catch(() => [] as string[])) {
    const s = await stat(join(root, name)).catch(() => null);
    if (s?.isDirectory() && (!latest || s.mtimeMs > latest.at)) latest = { name, at: s.mtimeMs };
  }
  session = latest?.name;
}
if (!session) {
  console.log(`no session captured under ${root}`);
  process.exit(1);
}
const res = await fetch(`${url}/diag/${session}/command`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'reload' }) }).catch((e: Error) => e);
if (res instanceof Error) {
  console.log(`no capture server at ${url}: ${res.message}`);
  process.exit(1);
}
const { delivered } = (await res.json()) as { delivered: number };
console.log(`session ${session}: reload sent to ${delivered} table${delivered === 1 ? '' : 's'}`);
process.exit(delivered > 0 ? 0 : 1);
