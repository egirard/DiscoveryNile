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
  /** The engine's id for the throw; a throw is read once, however many readings it sends. */
  rollId: string;
  dice: { value: number; confidence: number; askew?: boolean }[];
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
  /** The throw last taken: its later readings are ignored. */
  taken: string | null;
  /** The last good reading of the current throw, waiting for another that agrees. */
  pending: { rollId: string; values: number[]; agreed: number } | null;
}

export function watching(count: number, taken: string | null = null): Watch {
  return { count, taken, pending: null };
}

export interface Considered {
  watch: Watch;
  /** The values to take, when the reading settles the throw. */
  accept: number[] | null;
  /** How many dice the tray shows, for the status line. */
  seen: number;
}

/** Judge a settled reading against the throw the table waits for. */
export function consider(watch: Watch, reading: Reading): Considered {
  const seen = reading.dice.length;
  if (reading.rollId === watch.taken) return { watch, accept: null, seen };
  const good = seen === watch.count && reading.dice.every((d) => d.confidence >= SURE && !d.askew);
  if (!good) return { watch: { ...watch, pending: null }, accept: null, seen };
  const values = reading.dice.map((d) => d.value);
  const same = watch.pending && watch.pending.rollId === reading.rollId && watch.pending.values.every((v, i) => v === values[i]);
  const agreed = same ? watch.pending!.agreed + 1 : 1;
  if (agreed >= AGREEING_READINGS) return { watch: { ...watch, taken: reading.rollId, pending: null }, accept: values, seen };
  return { watch: { ...watch, pending: { rollId: reading.rollId, values, agreed } }, accept: null, seen };
}

/** The status line under the prompt. */
export function statusText(status: DicecamStatus, count: number, seen: number | null, configured: boolean): string {
  const dice = count === 1 ? 'one die' : `${count} dice`;
  if (!configured) return 'No dicecam on this table: tap the face you rolled';
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
