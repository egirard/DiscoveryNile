// The health of the dice (PROMPTS.md, prompt 57): every throw the game consumed, from the diagnostics capture, and
// the dice that look consumed twice.
//
//   bun run diag:dice                     the latest session: its summary and every suspect die
//   bun run diag:dice LIVBV               that session (a room code under diagnostics/)
//   bun run diag:dice -- --all            every session captured, latest first
//   bun run diag:dice -- --since 12:30    throws from that clock time today (or a full ISO time)
//   bun run diag:dice -- --list           every throw consumed, one line each, before the verdicts
//
// A die is RE-USED when it was taken at the place of a die taken before while the engine saw nothing move in the
// tray; the same face at the same place after a throw is listed "to check". Run it after a session, or in a loop,
// to watch the dicecam over time: a healthy capture ends in "none re-used". Exits 1 when a die was re-used.
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { localClock, parseLog, select } from '../src/lib/diagnostics/context';
import { consumptions, diceHealth, purposeOf } from '../src/lib/diagnostics/dice';

const root = process.env.DIAG_DIR ?? join(process.cwd(), 'diagnostics');
const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const session = args.find((a) => !a.startsWith('--') && a !== flag('--since'));

async function sessions(): Promise<string[]> {
  const names = await readdir(root).catch(() => [] as string[]);
  const out: { name: string; modified: Date }[] = [];
  for (const name of names) {
    const s = await stat(join(root, name)).catch(() => null);
    if (s?.isDirectory()) out.push({ name, modified: s.mtime });
  }
  return out.sort((a, b) => b.modified.getTime() - a.modified.getTime()).map((s) => s.name);
}

let since = flag('--since');
if (since && /^\d\d:\d\d(:\d\d)?$/.test(since)) {
  const [h, m, sec = '0'] = since.split(':');
  const at = new Date();
  at.setHours(Number(h), Number(m), Number(sec), 0);
  since = at.toISOString();
}

const all = await sessions();
const chosen = args.includes('--all') ? all : session ? [session] : all.slice(0, 1);
if (!chosen.length) {
  console.log(`nothing captured under ${root}: run \`bun run diag\` beside the dev server and play with physical dice`);
  process.exit(0);
}
let reused = 0;
for (const name of chosen) {
  const text = await Bun.file(join(root, name, 'log.ndjson')).text().catch(() => '');
  const lines = since ? select(parseLog(text), { since }) : parseLog(text);
  if (args.includes('--list')) {
    for (const c of consumptions(lines)) {
      const dice = c.dice.map((d) => `${d.value}${d.x === null || d.y === null ? '' : `@${d.x.toFixed(2)},${d.y.toFixed(2)}`}`).join(' ');
      console.log(`  ${localClock(c.at)}  ${c.seat}  ${dice || 'the rest from the table'} (${c.source}${c.moved === false ? ', nothing moved' : c.moved === null ? '' : ', after a throw'}) ${purposeOf(c.prompt)}`);
    }
  }
  const report = diceHealth(name, lines, localClock);
  for (const line of report) console.log(line);
  reused += report.filter((l) => l.includes('RE-USED:')).length;
}
process.exit(reused ? 1 : 0);
