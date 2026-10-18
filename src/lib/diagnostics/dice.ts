// Where every die went (PROMPTS.md, prompt 57). The table writes one `dice/consumed` line to the diagnostics capture
// each time a throw enters the game: the faces, where each die lay in the picture, what the throw was used for, what
// else lay in the tray, and whether the engine saw anything move since the last throw was taken. The offline check
// (`bun run diag:dice`, scripts/diag-dice.ts) reads those lines back and tells a die that was consumed twice: a die
// taken at the place of a die taken before while nothing moved in the tray is the same die, whatever face the
// engine read this time; the same face at the same place after a throw may be a die that landed on its own spot,
// and is listed to check. Pure, and free of the app's aliases, so the E2E scenario and the script can import it.
import { MOVED_LESS_THAN } from '../features/dice/dicecam';

export interface Point {
  x: number;
  y: number;
}

/** One die as consumed: its face, where it lay (a fraction of the frame; null when the engine did not say, or the face was tapped), how surely it was read. */
export interface ConsumedDie {
  value: number;
  x: number | null;
  y: number | null;
  confidence: number | null;
}

/** A die lying in the tray, as the table keeps it. */
export interface LyingDie {
  value: number;
  x: number;
  y: number;
}

/** The `dice/consumed` line's data. */
export interface DiceConsumed {
  seat: string;
  /** How the values entered: read by the dicecam, tapped as faces, or rolled by the table for the rest of a gathered throw. */
  source: 'dicecam' | 'tap' | 'auto';
  /** The engine's name for the throw (dicecam only). */
  rollId: string | null;
  dice: ConsumedDie[];
  /** The dice of the reading that rest where they lay, not taken. */
  lying: LyingDie[];
  /** What the table ignored as the tray as it lay when the ask opened, and the throw last taken. */
  ignored: LyingDie[];
  /** The engine saw the dice move (a `rolling` message) since the last throw was taken. */
  moved: boolean;
  /** What the throw was used for: the held event, the ask's words, the stream, how many dice and which part of a gathered throw. */
  for: { event: string; eventId: string; prompt: string; stream: string; count: number; have: number; rolled: number };
}

/** The ask as the table holds it (`AwaitingDice`), the part the record needs. */
export interface AskHeld {
  seat: string;
  count: number;
  have: readonly number[];
  prompt: string;
  stream: string;
  rolled: readonly unknown[];
  event: { id: string; type: string };
}

/** A reading taken by the dicecam: the engine's name, every die it showed, where the dice taken lay, and the lies the table ignored. */
export interface ReadingTaken {
  rollId: string;
  dice: readonly { value: number; confidence: number; normalizedPosition?: Point }[];
  lay: readonly (Point | null)[];
  ignore: readonly { dice: readonly LyingDie[] }[];
}

const samePlace = (a: Point, b: Point, within: number) => Math.abs(a.x - b.x) < within && Math.abs(a.y - b.y) < within;

/** The record of a throw consumed: from a dicecam reading, from faces tapped (`read` null), or the table rolling the rest (`source` auto, no values). */
export function consumedRecord(ask: AskHeld, seat: string, values: readonly number[], read: ReadingTaken | null, source: DiceConsumed['source'], moved: boolean): DiceConsumed {
  const taken = new Set<number>();
  const dice: ConsumedDie[] = values.map((value, i) => {
    const p = read?.lay[i] ?? null;
    const at = p ? read!.dice.findIndex((d, j) => !taken.has(j) && d.normalizedPosition && samePlace(d.normalizedPosition, p, 1e-6)) : -1;
    if (at >= 0) taken.add(at);
    const d = at >= 0 ? read!.dice[at] : null;
    return { value, x: p?.x ?? null, y: p?.y ?? null, confidence: d ? Number(d.confidence.toFixed(2)) : null };
  });
  const lying: LyingDie[] = read ? read.dice.filter((_, j) => !taken.has(j)).map((d) => ({ value: d.value, x: d.normalizedPosition?.x ?? -1, y: d.normalizedPosition?.y ?? -1 })) : [];
  const ignored: LyingDie[] = read ? read.ignore.flatMap((lie) => lie.dice.filter((d) => d.x >= 0).map((d) => ({ value: d.value, x: d.x, y: d.y }))) : [];
  return {
    seat,
    source,
    rollId: read?.rollId ?? null,
    dice,
    lying,
    ignored,
    moved,
    for: { event: ask.event.type, eventId: ask.event.id, prompt: ask.prompt, stream: ask.stream, count: ask.count, have: ask.have.length, rolled: ask.rolled.length }
  };
}

// ---- Reading the capture back --------------------------------------------------------------------------------------

/** A line of `log.ndjson` as `parseLog` (context.ts) gives it. */
export interface CapturedLine {
  at: string;
  kind: string;
  data: unknown;
}

/** One throw consumed, as the capture tells it. */
export interface Consumption {
  at: string;
  seat: string;
  source: DiceConsumed['source'];
  rollId: string | null;
  dice: ConsumedDie[];
  /** Whether anything moved since the last throw was taken; null when the capture cannot say (lines from before the record existed, no readings). */
  moved: boolean | null;
  prompt: string;
  event: string;
}

interface ReadingLogged {
  rollId: string;
  dice: { value: number; confidence: number; at: Point | null }[];
  verdict: string;
}
interface AppendedLogged {
  type: string;
  payload: Record<string, unknown>;
}

/**
 * Every throw consumed in a capture: the `dice/consumed` lines, and for the part of a capture written before that
 * line existed (the LIVBV room has run since the 17th), the throws rebuilt from a reading judged `taken …`, the
 * `dice/asked` it answered, the `dice/rolled` appended right after it (its `lay` says where the dice taken were) and
 * whether a `dicecam/rolling` line came between it and the throw taken before; a `dice/rolled` with no reading
 * before it was tapped or rolled by the table.
 */
export function consumptions(lines: readonly CapturedLine[]): Consumption[] {
  const out: Consumption[] = [];
  let asked: { seat?: string; prompt?: string } | null = null;
  let moved = false;
  const recordedNear = (i: number) => lines.slice(i + 1, i + 5).some((l) => l.kind === 'dice/consumed') || lines.slice(Math.max(0, i - 4), i).some((l) => l.kind === 'dice/consumed');
  lines.forEach((l, i) => {
    if (l.kind === 'dice/asked') asked = l.data as { seat?: string; prompt?: string };
    else if (l.kind === 'dicecam/rolling') moved = true;
    else if (l.kind === 'dice/consumed') {
      const d = l.data as DiceConsumed;
      out.push({ at: l.at, seat: d.seat, source: d.source, rollId: d.rollId, dice: d.dice, moved: d.moved, prompt: d.for.prompt, event: d.for.event });
      moved = false;
    } else if (l.kind === 'dicecam/reading') {
      const r = l.data as ReadingLogged;
      if (typeof r.verdict !== 'string' || !r.verdict.startsWith('taken') || recordedNear(i)) return;
      const appended = lines.slice(i + 1, i + 4).find((x) => x.kind === 'event/appended' && (x.data as AppendedLogged).type === 'dice/rolled');
      const payload = appended ? ((appended.data as AppendedLogged).payload as { values?: number[]; lay?: (Point | null)[] }) : null;
      const values = payload?.values ?? r.verdict.replace(/^taken /, '').split(',')[0].trim().split(' ').map(Number);
      const taken = new Set<number>();
      const dice = values.map((value, k): ConsumedDie => {
        const p = payload?.lay?.[k] ?? null;
        let at = p ? r.dice.findIndex((d, j) => !taken.has(j) && d.at && samePlace(d.at, p, 1e-6)) : -1;
        if (at < 0 && !p && r.dice.length === values.length) at = k;
        if (at >= 0) taken.add(at);
        const d = at >= 0 ? r.dice[at] : null;
        return { value, x: p?.x ?? d?.at?.x ?? null, y: p?.y ?? d?.at?.y ?? null, confidence: d?.confidence ?? null };
      });
      out.push({ at: l.at, seat: asked?.seat ?? '?', source: 'dicecam', rollId: r.rollId, dice, moved, prompt: asked?.prompt ?? '', event: '' });
      moved = false;
    } else if (l.kind === 'event/appended') {
      const e = l.data as AppendedLogged;
      if (e.type !== 'dice/rolled' || recordedNear(i)) return;
      const before = lines.slice(Math.max(0, i - 3), i).find((x) => x.kind === 'dicecam/reading' && String((x.data as ReadingLogged).verdict).startsWith('taken'));
      if (before) return;
      const { seat, values, auto } = e.payload as { seat?: string; values?: number[]; auto?: boolean };
      out.push({ at: l.at, seat: seat ?? asked?.seat ?? '?', source: auto ? 'auto' : 'tap', rollId: null, dice: (values ?? []).map((value) => ({ value, x: null, y: null, confidence: null })), moved: null, prompt: asked?.prompt ?? '', event: '' });
    }
  });
  return out;
}

/** A die that looks consumed twice. */
export interface Suspect {
  /** `unmoved`: taken at the place of a die taken before while nothing moved in the tray; `same-face`: the same face at the same place within the window, after a throw. */
  kind: 'unmoved' | 'same-face';
  at: string;
  seat: string;
  prompt: string;
  die: ConsumedDie;
  earlier: { at: string; seat: string; prompt: string; die: ConsumedDie };
}

/** The window within which the same face at the same place after a throw is listed to check (two minutes). */
export const SAME_FACE_WITHIN_MS = 120_000;

/**
 * The dice consumed twice, as far as the capture can tell. Each die taken is compared with the dice taken before
 * it, nearest in time first: a die within a die's width (`near`, the table's own `MOVED_LESS_THAN`) of where an
 * earlier die lay while nothing moved since the earlier throw was taken is that die again (a face read differently
 * is a misread of a resting die); after a throw, the same face at the same place within `within` is listed to check.
 */
export function suspects(all: readonly Consumption[], near = MOVED_LESS_THAN, within = SAME_FACE_WITHIN_MS): Suspect[] {
  const out: Suspect[] = [];
  all.forEach((c, i) => {
    for (const die of c.dice) {
      if (die.x === null || die.y === null) continue;
      for (let j = i - 1; j >= 0; j--) {
        const e = all[j];
        const match = e.dice.find((d) => d.x !== null && d.y !== null && samePlace({ x: d.x, y: d.y }, { x: die.x!, y: die.y! }, near));
        if (!match) continue;
        const gap = Date.parse(c.at) - Date.parse(e.at);
        if (c.moved === false) out.push({ kind: 'unmoved', at: c.at, seat: c.seat, prompt: c.prompt, die, earlier: { at: e.at, seat: e.seat, prompt: e.prompt, die: match } });
        else if (match.value === die.value && (Number.isNaN(gap) || gap <= within)) out.push({ kind: 'same-face', at: c.at, seat: c.seat, prompt: c.prompt, die, earlier: { at: e.at, seat: e.seat, prompt: e.prompt, die: match } });
        break;
      }
    }
  });
  return out;
}

/** "Roll a D6 to see if you are lost; 2+ means you're okay" → "to see if you are lost". */
export function purposeOf(prompt: string): string {
  const cut = prompt.split(';')[0].replace(/^Roll (a |\d+ )?D6 /, '').trim();
  return cut || prompt;
}

const place = (d: ConsumedDie) => (d.x === null || d.y === null ? '' : `@${d.x.toFixed(2)},${d.y.toFixed(2)}`);
const clockOf = (iso: string) => (iso.length >= 19 ? iso.slice(11, 19) : iso);

/** One line of the health report for a suspect. */
export function describeSuspect(s: Suspect, clock: (iso: string) => string = clockOf): string {
  const read = s.die.value === s.earlier.die.value ? `the same ${s.die.value}` : `read as a ${s.die.value} where the ${s.earlier.die.value} lay`;
  const head = `${clock(s.at)}  ${s.seat}  ${s.die.value}${place(s.die)} ${purposeOf(s.prompt)}`;
  if (s.kind === 'unmoved') return `${head}  RE-USED: nothing moved since the ${s.earlier.die.value} taken at ${clock(s.earlier.at)} ${purposeOf(s.earlier.prompt)} lay there; ${read}`;
  return `${head}  to check: ${read} at the place of the die taken at ${clock(s.earlier.at)} ${purposeOf(s.earlier.prompt)}, after a throw`;
}

/**
 * The health of the dice in one capture, as lines: a summary (throws and dice consumed, by source, how many re-used
 * and how many to check), then a line per suspect. A capture with nothing consumed says so.
 */
export function diceHealth(session: string, lines: readonly CapturedLine[], clock: (iso: string) => string = clockOf): string[] {
  const all = consumptions(lines);
  if (!all.length) return [`${session}: no dice consumed`];
  const by = (source: DiceConsumed['source']) => all.filter((c) => c.source === source).length;
  const dice = all.reduce((n, c) => n + c.dice.length, 0);
  const found = suspects(all);
  const reused = found.filter((s) => s.kind === 'unmoved');
  const check = found.filter((s) => s.kind === 'same-face');
  const verdict = reused.length ? `${reused.length} RE-USED` : 'none re-used';
  const out = [`${session}: ${all.length} throw${all.length === 1 ? '' : 's'} consumed (${by('dicecam')} by the dicecam, ${by('tap')} tapped, ${by('auto')} rolled by the table), ${dice} dice; ${verdict}${check.length ? `, ${check.length} to check` : ''}`];
  for (const s of found) out.push(`  ${describeSuspect(s, clock)}`);
  return out;
}
