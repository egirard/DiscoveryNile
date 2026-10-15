// The diagnostics capture read back (docs/diagnostics.md, PROMPTS.md prompt 23): the lines the table wrote
// while people played, each as one readable line, and the game as its captured stream reduces, so that
// feedback on a moment of play ("the hunt die was ignored just now") comes with what the table saw and did.
// Pure: `scripts/diag-context.ts` reads the files and prints what these return.
import type { GameEvent } from '$lib/game/events';
import type { GameState } from '$lib/game/state';

export interface LogLine {
  /** ISO time the server stamped the line with. */
  at: string;
  kind: string;
  data: unknown;
}

/** `log.ndjson`: `<ISO time> {"kind":…,"data":…}` per line; lines that do not parse are kept as `kind: '?'`. */
export function parseLog(text: string): LogLine[] {
  const out: LogLine[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const stamped = /^\d{4}-\d\d-\d\dT\S+ /.exec(line);
    const at = stamped ? stamped[0].trimEnd() : '';
    const body = stamped ? line.slice(stamped[0].length) : line;
    try {
      const parsed = JSON.parse(body) as { kind?: unknown; data?: unknown };
      out.push({ at, kind: typeof parsed.kind === 'string' ? parsed.kind : '?', data: parsed.data ?? null });
    } catch {
      out.push({ at, kind: '?', data: body });
    }
  }
  return out;
}

/** The clock time of a stamp, as UTC unless the caller words it otherwise (the script uses the local clock). */
export type Clock = (iso: string) => string;
export const utcClock: Clock = (iso) => (iso.length >= 19 ? iso.slice(11, 19) : iso);
export const localClock: Clock = (iso) => (iso ? new Date(iso).toLocaleTimeString('en-GB', { hour12: false }) : '');
const short = (v: unknown) => {
  const s = JSON.stringify(v);
  return s.length > 160 ? `${s.slice(0, 157)}…` : s;
};

/** One line of the timeline, the kinds the table writes most worded, the rest as their JSON. */
export function describeLine(l: LogLine, clock: Clock = utcClock): string {
  const d = l.data as Record<string, unknown> | null;
  const t = clock(l.at);
  switch (l.kind) {
    case 'event/appended': {
      const e = d as unknown as GameEvent;
      return `${t}  ${e.type}  ${short(e.payload)}`;
    }
    case 'events/loaded':
      return `${t}  (opened with ${d?.count} events, the last ${d?.last ?? 'none'})`;
    case 'dice/asked': {
      const rolled = Array.isArray(d?.rolled) ? (d!.rolled as { values: number[] }[]).map((r) => r.values.join(' ')).join('; ') : '';
      const have = Array.isArray(d?.have) && (d!.have as number[]).length ? ` (${(d!.have as number[]).length} of ${d?.count} in: ${(d!.have as number[]).join(' ')})` : '';
      return `${t}  asked ${d?.seat}: ${d?.prompt}${have}${rolled ? ` (already ${rolled})` : ''}`;
    }
    case 'dicecam/reading': {
      const dice = Array.isArray(d?.dice) ? (d!.dice as { value: number; confidence: number; at: { x: number; y: number } | null }[]).map((x) => `${x.value}@${x.at ? `${x.at.x.toFixed(2)},${x.at.y.toFixed(2)}` : '?'}(${x.confidence})`).join(' ') : '';
      return `${t}  dicecam ${d?.rollId} ${dice || 'empty'} → ${d?.verdict}`;
    }
    case 'dicecam/rolling':
      return `${t}  dicecam rolling${d?.asked ? '' : ' (nothing asked)'}`;
    case 'dicecam/status':
      return `${t}  dicecam ${String(d)}`;
    case 'dicecam/error':
      return `${t}  dicecam error: ${String(d)}`;
    case 'window/error':
      return `${t}  ERROR ${d?.message} (${d?.source}:${d?.line})`;
    case 'window/unhandledrejection':
      return `${t}  REJECTION ${d?.reason}`;
    default:
      return `${t}  ${l.kind}  ${short(l.data)}`;
  }
}

/** The lines on or after `since` (an ISO time), or the last `last` of them when no time is given. */
export function select(lines: LogLine[], options: { since?: string; last?: number }): LogLine[] {
  if (options.since) return lines.filter((l) => l.at >= options.since!);
  return lines.slice(-(options.last ?? 40));
}

/** The game as it stands: the turn, what is asked, the latest lines of the turn's log, the diagnostics. */
export function summariseState(state: GameState): string[] {
  const out: string[] = [];
  if (!state.gameId) return ['no game'];
  const physical = typeof state.rng === 'object' && state.rng !== null && (state.rng as { physical?: boolean }).physical === true;
  out.push(`game ${state.gameId}, ${state.seats.filter((s) => s.uid).length} seats taken${physical ? ', physical dice' : ''}${state.ended ? ', ended' : ''}`);
  if (state.turn) out.push(`round ${state.turn.round}, ${state.turn.current}'s turn`);
  else if (state.rollOff) out.push('rolling for first player');
  if (state.awaiting) {
    const a = state.awaiting;
    out.push(`awaiting ${a.seat}: ${a.prompt}${a.rolled.length ? ` (already ${a.rolled.map((r) => r.values.join(' ')).join('; ')})` : ''} for ${a.event.type}`);
  }
  const log = state.turn?.log ?? [];
  for (const r of log.slice(-6)) {
    const dice = r.rolls.map((x) => x.value).join(' ');
    out.push(`  ${r.kind}${r.needed ? ` needs ${r.needed}` : ''}${dice ? ` [${dice}]` : ''}${r.outcome ? ` ${r.outcome}` : ''}`);
  }
  for (const d of state.diagnostics) out.push(`diagnostic: ${d.reason} (${d.eventId})`);
  return out;
}
