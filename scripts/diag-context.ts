// What the table saw and did while people played, from the diagnostics capture (docs/diagnostics.md):
//
//   bun run diag:context                  the latest session: its last 40 lines and the game as it stands
//   bun run diag:context ABCDE            that session (a room code under diagnostics/)
//   bun run diag:context -- --last 100    more lines
//   bun run diag:context -- --since 12:30 lines from that clock time today (or a full ISO time)
//   bun run diag:context -- --list        the sessions captured, latest first
//
// The capture is written by `bun run diag` (scripts/diag-server.ts) as the table plays with the dev server.
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { reduce } from '../src/lib/game/reduce';
import type { GameEvent } from '../src/lib/game/events';
import { describeLine, localClock, parseLog, select, summariseState } from '../src/lib/diagnostics/context';

const root = process.env.DIAG_DIR ?? join(process.cwd(), 'diagnostics');
const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const session = args.find((a) => !a.startsWith('--') && a !== flag('--last') && a !== flag('--since'));

async function sessions(): Promise<{ name: string; modified: Date }[]> {
  const names = await readdir(root).catch(() => [] as string[]);
  const out = [];
  for (const name of names) {
    const s = await stat(join(root, name)).catch(() => null);
    if (s?.isDirectory()) out.push({ name, modified: s.mtime });
  }
  return out.sort((a, b) => b.modified.getTime() - a.modified.getTime());
}

const all = await sessions();
if (args.includes('--list')) {
  for (const s of all) console.log(`${s.modified.toISOString()}  ${s.name}`);
  process.exit(0);
}
const chosen = session ?? all[0]?.name;
if (!chosen) {
  console.log(`nothing captured under ${root}: run \`bun run diag\` beside the dev server and play`);
  process.exit(0);
}
const dir = join(root, chosen);
const logText = await Bun.file(join(dir, 'log.ndjson')).text().catch(() => '');
const lines = parseLog(logText);
// `--since 12:30` is a local clock time today; the stamps in the log are UTC.
let since = flag('--since');
if (since && /^\d\d:\d\d(:\d\d)?$/.test(since)) {
  const [h, m, sec = '0'] = since.split(':');
  const at = new Date();
  at.setHours(Number(h), Number(m), Number(sec), 0);
  since = at.toISOString();
}
const last = Number(flag('--last') ?? 40);

console.log(`session ${chosen} (${lines.length} lines, local clock)`);
for (const l of select(lines, { since, last })) console.log(describeLine(l, localClock));
console.log('');
const events = (await Bun.file(join(dir, 'events.json')).json().catch(() => null)) as GameEvent[] | null;
if (!events) console.log('no events.json yet');
else for (const line of summariseState(reduce(events))) console.log(line);
