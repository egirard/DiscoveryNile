// The dicecam (PROMPTS.md, prompt 18): the WebCamTool page (https://github.com/egirard/WebCamTool) runs in a
// frame on the table and reports what its camera sees with `postMessage`; see docs/dicecam.md for the
// protocol. This module is the pure part: reading a report into the throw the table is waiting for.

/** The camera's state as the dicecam reports it (its `CameraState['status']`), or the frame's own. */
export type DicecamStatus = 'off' | 'connecting' | 'initializing' | 'awaiting-consent' | 'active' | 'permission-denied' | 'no-camera' | 'camera-in-use' | 'reconnecting' | 'unsupported' | 'error';

/** One settled reading of the tray: the dice left to right, as the dicecam's `dice-settled` event carries them. */
export interface Reading {
  /** The dicecam's id for the throw; a throw is read once, however many readings it sends. */
  rollId: string;
  dice: { value: number; confidence: number; askew?: boolean }[];
}

/** A message from the dicecam frame. */
export type DicecamMessage =
  | { dicecam: 'ready' }
  | { dicecam: 'camera'; status: DicecamStatus }
  | { dicecam: 'rolling' }
  | ({ dicecam: 'settled' } & Reading)
  | { dicecam: 'removed'; remaining: number };

export function isDicecamMessage(data: unknown): data is DicecamMessage {
  return typeof data === 'object' && data !== null && typeof (data as { dicecam?: unknown }).dicecam === 'string';
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
    case 'off': return 'The dicecam is off';
    case 'connecting': return 'Connecting to the dicecam…';
    case 'initializing': return 'The dicecam is starting its camera…';
    case 'awaiting-consent': return 'The dicecam needs the camera: allow it in the dicecam, or tap the face you rolled';
    case 'permission-denied': return 'The dicecam may not use the camera: tap the face you rolled';
    case 'no-camera': return 'The dicecam finds no camera: tap the face you rolled';
    case 'camera-in-use': return 'The camera is in use elsewhere: tap the face you rolled';
    case 'reconnecting': return 'The dicecam is reconnecting its camera…';
    case 'unsupported': return 'This browser cannot run the dicecam: tap the face you rolled';
    case 'error': return 'The dicecam has lost its camera: tap the face you rolled';
    case 'active':
      if (seen === null || seen === 0) return `Watching the dicecam for ${dice}`;
      if (seen === count) return `${dice[0].toUpperCase()}${dice.slice(1)} seen, reading the faces…`;
      return `${seen === 1 ? 'One die' : `${seen} dice`} seen, ${dice} wanted`;
  }
}
