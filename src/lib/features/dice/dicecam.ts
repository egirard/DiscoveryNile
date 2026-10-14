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

/** What the table is waiting for and what it has seen so far. */
export interface Watch {
  count: number;
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
  /** The last good reading of the current throw, waiting for another that agrees. */
  pending: { rollId: string; values: number[]; agreed: number } | null;
}

/** Watch for a throw of `count` dice, ignoring the lies given (the last throw taken, the tray as it lies now). */
export function watching(count: number, ...lies: (Lie | null)[]): Watch {
  const ignore = lies.filter((l): l is Lie => l !== null);
  return { count, ignore, firstIsLie: ignore.length === 0, pending: null };
}

/** The engine saw the dice roll: the next reading is a throw even when none was known before. */
export function moved(watch: Watch): Watch {
  return watch.firstIsLie ? { ...watch, firstIsLie: false } : watch;
}

export interface Considered {
  watch: Watch;
  /** The values to take, when the reading settles the throw. */
  accept: number[] | null;
  /** How many dice the tray shows, for the status line. */
  seen: number;
  /** The reading is the tray as it already lay, not a throw. */
  stale: boolean;
}

/** Judge a settled reading against the throw the table waits for. */
export function consider(watch: Watch, reading: Reading): Considered {
  const seen = reading.dice.length;
  if (watch.firstIsLie) return { watch: { ...watch, ignore: [lieOf(reading)], firstIsLie: false, pending: null }, accept: null, seen, stale: true };
  if (watch.ignore.some((lie) => sameLie(reading, lie))) return { watch: { ...watch, pending: null }, accept: null, seen, stale: true };
  const good = seen === watch.count && reading.dice.every((d) => d.confidence >= SURE && !d.askew);
  if (!good) return { watch: { ...watch, pending: null }, accept: null, seen, stale: false };
  const values = reading.dice.map((d) => d.value);
  const same = watch.pending && watch.pending.rollId === reading.rollId && watch.pending.values.every((v, i) => v === values[i]);
  const agreed = same ? watch.pending!.agreed + 1 : 1;
  if (agreed >= AGREEING_READINGS) return { watch: { ...watch, pending: null }, accept: values, seen, stale: false };
  return { watch: { ...watch, pending: { rollId: reading.rollId, values, agreed } }, accept: null, seen, stale: false };
}

/** The status line under the prompt. */
export function statusText(status: DicecamStatus, count: number, seen: number | null, configured: boolean, stale = false): string {
  const dice = count === 1 ? 'one die' : `${count} dice`;
  if (!configured) return 'No dicecam on this table: tap the face you rolled';
  if (status === 'active' && stale) return count === 1 ? 'Waiting for a D6 roll' : `Waiting for a roll of ${count} D6`;
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
      if (seen === count) return `${dice[0].toUpperCase()}${dice.slice(1)} seen, reading the faces…`;
      return `${seen === 1 ? 'One die' : `${seen} dice`} seen, ${dice} wanted`;
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
