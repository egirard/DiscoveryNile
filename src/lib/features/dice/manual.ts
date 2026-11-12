// Manual dice (PROMPTS.md, prompt 66): a tray drawn on the table that stands in for the dicecam, for playing and
// developing without a camera. A tap throws dice the table makes up and the tray speaks for the engine in its own
// protocol (`rolling`, then settled readings with every die's geometry), so a throw goes the way a camera's does:
// judged by `consider`, sent with where it lay, written to the capture. This module is the pure part: where the
// dice land, the reading as the engine would post it, the words of the status line, and the setting itself.
import type { Random } from '$lib/game/random';
import { PIPS } from '$lib/ui/pips';
import { DICE_AT_HAND, MOVED_LESS_THAN, statusText, type EngineMessage, type Point, type SeenDie } from './dicecam';

/** The picture the tray is drawn in and read from, in the pixels a camera frame would have. */
export const FRAME = { width: 640, height: 360 };
/** A die's side, and the tray's floor inside its rim. */
export const DIE = 56;
export const FLOOR = { x: 36, y: 36, width: FRAME.width - 72, height: FRAME.height - 72 };
/** How long the dice are in the air, and how long after the first reading the second, agreeing one follows. */
export const ROLL_MS = 260;
export const AGREE_MS = 120;

/** A die lying in the tray: its face, its centre in frame pixels and how it is turned (degrees). */
export interface Placed {
  value: number;
  x: number;
  y: number;
  turn: number;
}

/**
 * The throw a tap makes. A tap on the tray picks every die up and throws the dice wanted (as many as the tray holds
 * at once; with nothing asked, as many as lay there, one at least). "One die" tosses a single die in beside those
 * already thrown for the same ask; dice lying from an earlier ask (`stale`) are picked up first, as is a full tray.
 */
export function manualThrow(tray: Placed[], wanted: number, one: boolean, stale: boolean): { kept: Placed[]; count: number } {
  if (one) return { kept: stale || tray.length >= DICE_AT_HAND ? [] : tray, count: 1 };
  return { kept: [], count: Math.min(DICE_AT_HAND, wanted > 0 ? wanted : Math.max(1, tray.length)) };
}

/** Candidates tried for each die: the one farthest from everything else is where it lands. */
const CANDIDATES = 60;

/**
 * Throw `count` dice into the tray beside the dice `kept`: each lands clear of the others and of the places in
 * `avoid` (frame pixels: where dice lay before, which the table would read as dice resting, not thrown).
 */
export function throwDice(random: Random, kept: Placed[], avoid: Point[], count: number): Placed[] {
  const taken: Point[] = [...kept, ...avoid];
  const margin = DIE * 0.75;
  const out: Placed[] = [];
  for (let i = 0; i < count; i++) {
    let best: Point = { x: FRAME.width / 2, y: FRAME.height / 2 };
    let room = -1;
    for (let c = 0; c < CANDIDATES; c++) {
      const p = { x: FLOOR.x + margin + random() * (FLOOR.width - 2 * margin), y: FLOOR.y + margin + random() * (FLOOR.height - 2 * margin) };
      const nearest = taken.reduce((least, t) => Math.min(least, Math.hypot(p.x - t.x, p.y - t.y)), Infinity);
      if (nearest > room) {
        room = nearest;
        best = p;
      }
    }
    const die = { value: 1 + Math.floor(random() * 6), x: Math.round(best.x), y: Math.round(best.y), turn: Math.round(random() * 90 - 45) };
    taken.push(die);
    out.push(die);
  }
  return out;
}

/** A die this far (frame pixels) from where a die lay is never read as that die resting: the judge's own measure, corner to corner. */
export const CLEAR_OF = Math.hypot(MOVED_LESS_THAN * FRAME.width, MOVED_LESS_THAN * FRAME.height);

function turned(die: Placed, dx: number, dy: number): Point {
  const a = (die.turn * Math.PI) / 180;
  return { x: die.x + dx * Math.cos(a) - dy * Math.sin(a), y: die.y + dx * Math.sin(a) + dy * Math.cos(a) };
}

/** The die as the engine would report it: its face, sure, with the geometry the dicecam's overlay draws. */
export function seen(die: Placed): SeenDie {
  const half = DIE / 2;
  const corners = ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as const).map(([sx, sy]) => turned(die, sx * half, sy * half));
  const xs = corners.map((p) => p.x);
  const ys = corners.map((p) => p.y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  return {
    value: die.value,
    confidence: 0.99,
    askew: false,
    normalizedPosition: { x: die.x / FRAME.width, y: die.y / FRAME.height },
    boundingBox: { x: left, y: top, width: Math.max(...xs) - left, height: Math.max(...ys) - top },
    contour: corners,
    face: ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as const).map(([sx, sy]) => turned(die, sx * (half - 4), sy * (half - 4))),
    pips: PIPS[die.value].map(([px, py]) => turned(die, ((px - 12) / 24) * DIE, ((py - 12) / 24) * DIE))
  };
}

/** A settled reading of the tray as the engine posts it: the dice left to right. */
export function settled(rollId: string, tray: Placed[], kind: 'initial' | 'update'): Extract<EngineMessage, { type: 'settled' }> {
  return { type: 'settled', rollId, kind, frame: { ...FRAME }, dice: [...tray].sort((a, b) => a.x - b.x || a.y - b.y).map(seen) };
}

/** A seed for the tray's dice from the game's code and how far the game has run: the same in a scenario, another at every table. */
export function seedOf(text: string, n: number): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return (Math.imul(h ^ n, 16777619) >>> 0) || 1;
}

/** What the tray's tap will do, in the tray's own words. */
export function tapText(wanted: number, trayHolds: number): string {
  const n = manualThrow(new Array<Placed>(trayHolds), wanted, false, false).count;
  return n === 1 ? 'Tap to roll one die' : `Tap to roll ${n} dice`;
}

/** The status line under the prompt when the dice are manual: what to tap, then what was thrown as the dicecam's line has it. */
export function manualStatusText(count: number, seenDice: number | null, stale: boolean, gathered: boolean): string {
  if (seenDice && !stale) return statusText('active', count, seenDice, true, false, gathered);
  const now = Math.min(count, DICE_AT_HAND);
  const roll = now === 1 ? 'Tap the dice tray to roll one die' : `Tap the dice tray to roll ${now} dice`;
  return gathered ? `${roll}; ${count} more ${count === 1 ? 'die' : 'dice'} wanted` : roll;
}

// ---- The setting ---------------------------------------------------------------------------------------------
// Manual dice belong to the table's device, like the screen's size: kept per browser, set from the options screen
// or with `?manual-dice=1` (0 to clear).
const KEY = 'tabletop:dice:manual:v1';

export function readManualDice(search = typeof location === 'undefined' ? '' : location.search): boolean {
  const fromQuery = new URLSearchParams(search).get('manual-dice');
  if (fromQuery !== null) {
    const on = fromQuery !== '0' && fromQuery !== 'false' && fromQuery !== 'off';
    writeManualDice(on);
    return on;
  }
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function writeManualDice(on: boolean): void {
  try {
    if (on) localStorage.setItem(KEY, '1');
    else localStorage.removeItem(KEY);
  } catch {
    /* private mode */
  }
}
