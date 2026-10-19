// The dicecam (PROMPTS.md, prompts 18 and 19): WebCamTool's dice analysis (https://github.com/egirard/WebCamTool),
// loaded as a worker from that project's hosted build, reads the camera frames the table posts it and reports the
// tray; see docs/dicecam.md. This module is the pure part: the engine's messages as the table reads them, the
// reading of a report into the throw the table is waiting for, and the words of the status line.

/** The engine's protocol the table speaks (WebCamTool's `src/lib/dicecam/protocol.ts`). */
export const PROTOCOL = 2;

/** The dicecam's state on the table: the camera's, then the engine's. */
export type DicecamStatus =
  | 'starting'
  | 'loading'
  | 'active'
  | 'permission-denied'
  | 'no-camera'
  | 'camera-in-use'
  | 'unsupported'
  | 'reconnecting'
  | 'error'
  | 'no-engine';

export type MotionStatus = 'calibrating' | 'rolling' | 'settled' | 'recalibrating';

export interface Point {
  x: number;
  y: number;
}

/** One die as read, with the geometry (frame pixels) the overlay draws. */
export interface SeenDie {
  value: number;
  confidence: number;
  askew?: boolean;
  /** Where the die lies, as a fraction of the frame. */
  normalizedPosition?: Point;
  boundingBox: { x: number; y: number; width: number; height: number };
  contour: Point[];
  face: Point[];
  pips: Point[];
}

/** The tray as the engine finds it. */
export interface Roi {
  detected: boolean;
  polygon: Point[];
  confidence: number;
}

/** One settled reading of the tray: the dice left to right. */
export interface Reading {
  /** The engine's name for the throw, renewed when its motion detector sees the dice roll. */
  rollId: string;
  dice: { value: number; confidence: number; askew?: boolean; normalizedPosition?: Point }[];
}

/** How the dice lay at one reading: what each showed and where (a fraction of the frame; -1 unknown). */
export interface Lie {
  rollId: string;
  dice: { value: number; x: number; y: number }[];
}

/** Dice within this much of the frame (about a die's width) of where they lay are the same dice, not thrown. */
export const MOVED_LESS_THAN = 0.06;

/**
 * The reading shows the same lie: the same count and faces, each die within a die's width of where it lay. A die
 * whose place is unknown is the same die when the engine still calls the throw by the same name.
 */
export function sameLie(reading: Reading, lie: Lie | null): boolean {
  if (!lie || reading.dice.length !== lie.dice.length) return false;
  return reading.dice.every((d, i) => {
    const t = lie.dice[i];
    if (d.value !== t.value) return false;
    if (!d.normalizedPosition || t.x < 0) return reading.rollId === lie.rollId;
    return Math.abs(d.normalizedPosition.x - t.x) < MOVED_LESS_THAN && Math.abs(d.normalizedPosition.y - t.y) < MOVED_LESS_THAN;
  });
}

/**
 * The dice of the reading that were thrown (PROMPTS.md, prompt 36): each die is judged on its own against the
 * lies given, the tray as it lay. A die with the same face up within a die's width of where a die lay is that die,
 * resting; every other die (a new one tossed in beside the others, one picked up and rolled again, one that
 * changed its face or its place) is the throw. A die whose place is unknown rests when the engine still calls the
 * tray by one of the lies' names and the die at its place in that lie showed the same face. Each die of a lie can
 * be claimed by one die of the reading only.
 *
 * A die showing another face where a die lay is a throw only when the engine saw the dice move since the last
 * throw was taken (`motion`, prompt 58): until then it is a resting die misread, its face flickering in the
 * engine's reading, and it rests, counted as `misread`. That is how the table took a die twice at the user's
 * table (scenario 041): a 3 read as a 1 and as a 3 again, each change taken as a throw.
 */
export function thrown(reading: Reading, lies: Lie[], motion: boolean): { thrown: Reading['dice']; resting: number; misread: number } {
  const places = lies.flatMap((lie) => lie.dice.filter((d) => d.x >= 0));
  const claimed = new Set<number>();
  const near = (p: Point, t: { x: number; y: number }) => Math.abs(p.x - t.x) < MOVED_LESS_THAN && Math.abs(p.y - t.y) < MOVED_LESS_THAN;
  const byName = (d: Reading['dice'][number], i: number, sameFace: boolean) => lies.some((lie) => lie.rollId === reading.rollId && lie.dice.length === reading.dice.length && (!sameFace || lie.dice[i].value === d.value));
  // First the dice resting with the face they showed, then, while nothing has moved, the dice resting under another face.
  const rests = reading.dice.map((d, i) => {
    if (!d.normalizedPosition) return byName(d, i, true);
    const at = places.findIndex((t, j) => !claimed.has(j) && t.value === d.value && near(d.normalizedPosition!, t));
    if (at >= 0) claimed.add(at);
    return at >= 0;
  });
  let misread = 0;
  if (!motion) reading.dice.forEach((d, i) => {
    if (rests[i]) return;
    let at = -1;
    if (!d.normalizedPosition) rests[i] = byName(d, i, false);
    else {
      at = places.findIndex((t, j) => !claimed.has(j) && near(d.normalizedPosition!, t));
      if (at >= 0) { claimed.add(at); rests[i] = true; }
    }
    if (rests[i]) misread++;
  });
  const values = reading.dice.filter((_, i) => !rests[i]);
  return { thrown: values, resting: reading.dice.length - values.length, misread };
}

export function lieOf(reading: Reading): Lie {
  return { rollId: reading.rollId, dice: reading.dice.map((d) => ({ value: d.value, x: d.normalizedPosition?.x ?? -1, y: d.normalizedPosition?.y ?? -1 })) };
}

/** What the engine posts (the part of its protocol the table reads). */
export type EngineMessage =
  | { type: 'ready'; protocol: number; version: string }
  | { type: 'tick'; motion: { status: MotionStatus; progress?: number }; frame: { width: number; height: number } }
  | { type: 'roi'; roi: Roi | null }
  | { type: 'rolling' }
  | { type: 'removed'; remaining: number }
  | { type: 'settled'; rollId: string; kind: 'initial' | 'update'; frame: { width: number; height: number }; dice: SeenDie[] }
  | { type: 'error'; message: string };

export function isEngineMessage(data: unknown): data is EngineMessage {
  return typeof data === 'object' && data !== null && typeof (data as { type?: unknown }).type === 'string';
}

/** A reading counts only when every die is read this surely; the dicecam's own "confident" bar. */
export const SURE = 0.7;
/** A throw is taken once this many consecutive readings agree, so one misread face never enters the game. */
export const AGREEING_READINGS = 2;

/**
 * A throw of more dice than this is gathered over several throws (PROMPTS.md, prompt 33): the game's four dice
 * thrown again and again until the count is in, each throw taken as it settles, or the table rolling the rest.
 */
export const DICE_AT_HAND = 4;

/** What the table is waiting for and what it has seen so far. */
export interface Watch {
  /** Dice still wanted: the whole throw, or what is left of one gathered in parts. */
  count: number;
  /** The throw is gathered over several throws (more than `DICE_AT_HAND` dice asked): a throw of fewer dice than wanted is taken too. */
  gathered: boolean;
  /**
   * Lies that are not the throw: the tray as it lay when the ask opened (the last throw taken, whoever threw it,
   * or dice lying there from before) and the throw last taken. A reading that shows one of them, within a die's
   * width, is ignored whatever the engine calls it, and a reading that shows anything else is a throw, whatever
   * the engine calls it: the engine's roll id follows its motion detector, which a hand reaching in trips and a
   * die tossed in from outside the picture can miss (PROMPTS.md, prompts 20 and 21).
   */
  ignore: Lie[];
  /** No reading is known yet (the start of the run): the first to come is the tray as found, not a throw. */
  firstIsLie: boolean;
  /**
   * The engine saw the dice move (`rolling`) since the last throw was taken (prompt 58). Until it has, a die
   * showing another face where a die lay is a resting die misread, not a throw.
   */
  motion: boolean;
  /** The last good reading of the current throw, waiting for another that agrees. */
  pending: { rollId: string; values: number[]; agreed: number } | null;
}

/** Watch for a throw of `count` dice, ignoring the lies given (the last throw taken, the tray as it lies now). */
export function watching(count: number, ...lies: (Lie | null)[]): Watch {
  return gathering(count, 0, ...lies);
}

/** Watch for the rest of a throw of `count` dice of which `have` are in (prompt 33), ignoring the lies given. */
export function gathering(count: number, have: number, ...lies: (Lie | null)[]): Watch {
  const ignore = lies.filter((l): l is Lie => l !== null);
  return { count: count - have, gathered: count > DICE_AT_HAND, ignore, firstIsLie: ignore.length === 0, motion: false, pending: null };
}

/**
 * The engine saw the dice roll: the next reading is a throw even when none was known before, and a die showing
 * another face where a die lay is a throw, not a misread (prompt 58).
 */
export function moved(watch: Watch): Watch {
  return { ...watch, firstIsLie: false, motion: true };
}

export interface Considered {
  watch: Watch;
  /** The values to take, when the reading settles the throw. */
  accept: number[] | null;
  /** Where each die taken lies, a fraction of the frame (null when the engine did not say), sent with the throw (prompt 37). */
  lay: (Point | null)[] | null;
  /** How many dice were thrown (not resting where they lay), for the status line. */
  seen: number;
  /** How many dice rest where they lay, for the console's line. */
  resting: number;
  /** How many of those rest under another face than they showed, read as a flicker and not a throw since nothing moved (prompt 58). */
  misread: number;
  /** The reading is the tray as it already lay, not a throw. */
  stale: boolean;
}

/**
 * Judge a settled reading against the throw the table waits for. Each die is judged on its own (prompt 36): the
 * dice resting where they lay are not the throw, the rest are. A throw the tray holds whole is taken when the dice
 * thrown are the count asked for (three lying and a fourth tossed in is a throw of one), or when the tray shows
 * exactly the count and anything in it moved (four thrown again, one of them landing where it lay). A throw
 * gathered in parts takes the dice thrown, one or more, up to what is still wanted. Until the engine has seen the
 * dice move since the last throw was taken, a die read with another face where a die lay rests (prompt 58).
 */
export function consider(watch: Watch, reading: Reading): Considered {
  if (watch.firstIsLie) return { watch: { ...watch, ignore: [lieOf(reading)], firstIsLie: false, pending: null }, accept: null, lay: null, seen: 0, resting: reading.dice.length, misread: 0, stale: true };
  const t = thrown(reading, watch.ignore, watch.motion);
  const seen = t.thrown.length;
  const { resting, misread } = t;
  if (seen === 0) return { watch: { ...watch, pending: null }, accept: null, lay: null, seen, resting, misread, stale: true };
  const whole = !watch.gathered && seen < watch.count && reading.dice.length === watch.count;
  const dice = whole ? reading.dice : t.thrown;
  const fits = whole || seen === watch.count || (watch.gathered && seen < watch.count);
  const good = fits && dice.every((d) => d.confidence >= SURE && !d.askew);
  if (!good) return { watch: { ...watch, pending: null }, accept: null, lay: null, seen, resting, misread, stale: false };
  const values = dice.map((d) => d.value);
  const same = watch.pending && watch.pending.rollId === reading.rollId && watch.pending.values.length === values.length && watch.pending.values.every((v, i) => v === values[i]);
  const agreed = same ? watch.pending!.agreed + 1 : 1;
  if (agreed >= AGREEING_READINGS) return { watch: { ...watch, pending: null }, accept: values, lay: dice.map((d) => d.normalizedPosition ?? null), seen, resting, misread, stale: false };
  return { watch: { ...watch, pending: { rollId: reading.rollId, values, agreed } }, accept: null, lay: null, seen, resting, misread, stale: false };
}

// ---- A die in the picture tapped (PROMPTS.md, prompt 37) ---------------------------------------------------------

/** The die of a reading nearest `point`, within a die's width, or none. */
export function nearestDie<T extends { normalizedPosition?: Point }>(dice: T[], point: Point): T | null {
  let best: T | null = null;
  let nearest = MOVED_LESS_THAN;
  for (const d of dice) {
    if (!d.normalizedPosition) continue;
    const dist = Math.max(Math.abs(d.normalizedPosition.x - point.x), Math.abs(d.normalizedPosition.y - point.y));
    if (dist < nearest) {
      nearest = dist;
      best = d;
    }
  }
  return best;
}

/** A die of the game lying in the tray: the throw it came from, its place in it, the seat that threw it, and the face the game has for it now. */
export interface GameDie {
  eventId: string;
  index: number;
  seat: string;
  value: number;
}

/**
 * The die of the game lying at `point` (a fraction of the frame): the latest `dice/rolled` with a die within a die's
 * width of it, by where the throw lay (`lay`, sent with each throw the dicecam read), its face as the game has it
 * now, corrections that stood (not among `refused`) applied. None when nothing of the game lies there: dice from
 * before the game, or dice moved about between throws.
 */
export function dieAt(events: readonly { id: string; type: string; payload: Record<string, unknown> }[], point: Point, refused: ReadonlySet<string>): GameDie | null {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.type !== 'dice/rolled') continue;
    const { seat, values, lay } = e.payload as { seat?: unknown; values?: unknown; lay?: unknown };
    if (!Array.isArray(values) || !Array.isArray(lay) || typeof seat !== 'string') continue;
    const dice = lay.map((p, index) => ({ index, normalizedPosition: p && typeof p === 'object' ? (p as Point) : undefined }));
    const hit = nearestDie(dice, point);
    if (!hit) continue;
    let value = values[hit.index] as number;
    for (const c of events.slice(i + 1)) {
      if (c.type !== 'dice/corrected' || refused.has(c.id)) continue;
      const q = c.payload as { eventId?: unknown; index?: unknown; value?: unknown };
      if (q.eventId === e.id && q.index === hit.index && typeof q.value === 'number') value = q.value;
    }
    return { eventId: e.id, index: hit.index, seat, value };
  }
  return null;
}

/** A die being read again at a tap on it: which die of the game, where it lies, and the faces read since. */
export interface Recheck extends GameDie {
  at: Point;
  seen: number[];
}

export type RecheckVerdict = { verdict: 'checking' } | { verdict: 'same' } | { verdict: 'changed'; value: number } | { verdict: 'gone' };

/**
 * Read the die again from a settled reading: the die within a die's width of where it lies is read once more, and
 * two consecutive readings that agree are its face: the same as the game has (`same`) or another (`changed`, to be
 * corrected). A die no longer there is `gone`.
 */
export function rechecked(check: Recheck, reading: Reading): { check: Recheck; result: RecheckVerdict } {
  const die = nearestDie(reading.dice, check.at);
  if (!die) return { check, result: { verdict: 'gone' } };
  const seen = [...check.seen, die.value];
  const next = { ...check, seen };
  const n = seen.length;
  if (n < AGREEING_READINGS || seen[n - 1] !== seen[n - 2]) return { check: next, result: { verdict: 'checking' } };
  return { check: next, result: die.value === check.value ? { verdict: 'same' } : { verdict: 'changed', value: die.value } };
}

/** The dock's note for a die read again (prompt 37). */
export function recheckText(check: GameDie, result: RecheckVerdict): string {
  switch (result.verdict) {
    case 'checking': return 'Reading the die again…';
    case 'same': return `Read again: still a ${check.value}. Tap it again to set its face`;
    case 'changed': return `Read again: a ${result.value}, not a ${check.value}`;
    case 'gone': return 'The die is no longer there';
  }
}

/**
 * The status line under the prompt; `count` is the dice wanted now, `seen` the dice thrown (not resting where they
 * lay, prompt 36), `gathered` says they come over several throws (prompt 33).
 */
export function statusText(status: DicecamStatus, count: number, seen: number | null, configured: boolean, stale = false, gathered = false): string {
  const dice = count === 1 ? 'one die' : `${count} dice`;
  const more = `${count} more ${count === 1 ? 'die' : 'dice'} wanted`;
  const thrownDice = seen === 1 ? 'One die thrown' : `${seen} dice thrown`;
  const reading = `reading the ${seen === 1 ? 'face' : 'faces'}…`;
  if (!configured) return gathered ? `No dicecam on this table: tap each face as it is rolled; ${more}` : 'No dicecam on this table: tap the face you rolled';
  if (status === 'active' && stale) return gathered ? `Waiting for a throw; ${more}` : count === 1 ? 'Waiting for a D6 roll' : `Waiting for a roll of ${count} D6`;
  if (status === 'active' && gathered) {
    if (seen === null || seen === 0) return `Watching the dicecam for a throw; ${more}`;
    if (seen <= count) return `${thrownDice}, ${reading}`;
    return `${thrownDice}, only ${more}`;
  }
  switch (status) {
    case 'starting': return 'Starting the camera…';
    case 'loading': return 'Loading the dicecam…';
    case 'permission-denied': return 'The table may not use the camera: tap the face you rolled';
    case 'no-camera': return 'No camera found: tap the face you rolled';
    case 'camera-in-use': return 'The camera is in use elsewhere: tap the face you rolled';
    case 'unsupported': return 'This browser has no camera access: tap the face you rolled';
    case 'reconnecting': return 'Reconnecting the camera…';
    case 'error': return 'The camera was lost: tap the face you rolled';
    case 'no-engine': return 'The dicecam could not be loaded: tap the face you rolled';
    case 'active':
      if (seen === null || seen === 0) return `Watching the dicecam for ${dice}`;
      if (seen === count) return `${thrownDice}, ${reading}`;
      return `${thrownDice}, ${dice} wanted`;
  }
}

/** The short note in the dicecam's own corner while it is not reading. */
export function dockNote(status: DicecamStatus): string | null {
  switch (status) {
    case 'starting': return 'Starting the camera…';
    case 'loading': return 'Loading the dicecam…';
    case 'permission-denied': return 'Camera not allowed';
    case 'no-camera': return 'No camera';
    case 'camera-in-use': return 'Camera in use elsewhere';
    case 'unsupported': return 'No camera access';
    case 'reconnecting': return 'Reconnecting…';
    case 'error': return 'Camera lost';
    case 'no-engine': return 'Dicecam not loaded';
    case 'active': return null;
  }
}

/** What a failed camera request means, from the error's name as `getUserMedia` reports it. */
export function cameraFailure(error: unknown): DicecamStatus {
  const name = error instanceof DOMException ? error.name : error instanceof Error ? error.name : '';
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return 'permission-denied';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
    case 'ConstraintNotSatisfiedError':
      return 'no-camera';
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return 'camera-in-use';
    case 'TypeError':
      return 'unsupported';
    default:
      return 'error';
  }
}
