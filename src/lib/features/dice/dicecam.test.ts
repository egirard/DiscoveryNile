import { describe, expect, it } from 'vitest';
import { cameraFailure, consider, dockNote, isEngineMessage, lieOf, moved, sameLie, statusText, watching, type Reading } from './dicecam';

const reading = (rollId: string, values: number[], confidence = 0.9, askew = false): Reading => ({ rollId, dice: values.map((value) => ({ value, confidence, askew })) });
/** A reading with the dice placed in a row, the i-th at x = 0.2 + 0.2 i, shifted by `dx`. */
const lying = (rollId: string, values: number[], dx = 0): Reading => ({ rollId, dice: values.map((value, i) => ({ value, confidence: 0.9, askew: false, normalizedPosition: { x: Number((0.2 + 0.2 * i + dx).toFixed(2)), y: 0.5 } })) });

describe('reading the dicecam', () => {
  it('takes a throw once two readings of it agree, and never the same throw twice', () => {
    let w = watching(1, lieOf(lying('r0', [2])));
    let c = consider(w, reading('r1', [4]));
    expect(c.accept).toBeNull();
    expect(c.seen).toBe(1);
    c = consider(c.watch, reading('r1', [4]));
    expect(c.accept).toEqual([4]);
    // The next ask opens on the throw just taken: its readings are the tray as it lies, not a throw.
    w = watching(1, lieOf(reading('r1', [4])));
    c = consider(w, reading('r1', [4]));
    expect(c.accept).toBeNull();
    expect(c.stale).toBe(true);
    c = consider(consider(w, reading('r2', [2])).watch, reading('r2', [2]));
    expect(c.accept).toEqual([2]);
    expect(c.stale).toBe(false);
  });
  it('ignores the dice lying where they were, whatever the engine now calls the throw, until they have moved', () => {
    // bottom-1's four dice are taken; a hand reaching in gives the same lie a new id for top-1's ask.
    let c = consider(consider(watching(4, lieOf(lying('r0', []))), lying('r1', [6, 6, 6, 6])).watch, lying('r1', [6, 6, 6, 6]));
    expect(c.accept).toEqual([6, 6, 6, 6]);
    const taken = lieOf(lying('r1', [6, 6, 6, 6]));
    expect(taken.dice).toEqual([{ value: 6, x: 0.2, y: 0.5 }, { value: 6, x: 0.4, y: 0.5 }, { value: 6, x: 0.6, y: 0.5 }, { value: 6, x: 0.8, y: 0.5 }]);
    expect(sameLie(lying('r2', [6, 6, 6, 6]), taken)).toBe(true);
    expect(sameLie(lying('r2', [6, 6, 6, 6], 0.03), taken)).toBe(true); // a nudge is not a throw
    expect(sameLie(lying('r2', [6, 6, 6, 6], 0.1), taken)).toBe(false); // moved a die's width
    expect(sameLie(lying('r2', [6, 6, 6, 5]), taken)).toBe(false); // a face changed
    expect(sameLie(lying('r2', [6, 6, 6]), taken)).toBe(false); // one picked up
    expect(sameLie(reading('r2', [6, 6, 6, 6]), taken)).toBe(false); // no places known: the name decides
    expect(sameLie(reading('r1', [6, 6, 6, 6]), taken)).toBe(true);
    c = consider(watching(4, taken), lying('r2', [6, 6, 6, 6]));
    expect(c.stale).toBe(true);
    expect(c.accept).toBeNull();
    expect(c.seen).toBe(4);
    c = consider(consider(c.watch, lying('r3', [1, 1, 1, 1], 0.05)).watch, lying('r3', [1, 1, 1, 1], 0.05));
    expect(c.accept).toEqual([1, 1, 1, 1]);
    expect(lieOf(reading('r4', [2])).dice).toEqual([{ value: 2, x: -1, y: -1 }]);
    expect(statusText('active', 1, 1, true, true)).toBe('Waiting for a D6 roll');
    expect(statusText('active', 4, 4, true, true)).toBe('Waiting for a roll of 4 D6');
  });
  it('reads a throw the engine still calls by the last one\'s name: a die tossed in without the motion being seen', () => {
    // The lost die, a one, was taken as r1; the hunt's die lands as a five, the engine having missed the toss (prompt 21).
    const w = watching(1, lieOf(lying('r1', [1])));
    expect(consider(w, lying('r1', [1])).stale).toBe(true);
    let c = consider(w, lying('r1', [5]));
    expect(c.stale).toBe(false);
    c = consider(c.watch, lying('r1', [5]));
    expect(c.accept).toEqual([5]);
    // The same face landing a die\'s width away is a throw too.
    c = consider(consider(w, lying('r1', [1], 0.08)).watch, lying('r1', [1], 0.08));
    expect(c.accept).toEqual([1]);
  });
  it('takes the tray as found at the start of the run for what already lay there, and ignores both lies it is given', () => {
    // No reading is known when the first ask opens: the engine\'s first is the dice lying there from before the game.
    let c = consider(watching(4), lying('r1', [2, 2, 2, 2]));
    expect(c.stale).toBe(true);
    expect(c.watch.ignore).toEqual([lieOf(lying('r1', [2, 2, 2, 2]))]);
    c = consider(c.watch, lying('r1', [2, 2, 2, 2]));
    expect(c.stale).toBe(true);
    c = consider(consider(c.watch, lying('r1', [6, 6, 6, 6])).watch, lying('r1', [6, 6, 6, 6]));
    expect(c.accept).toEqual([6, 6, 6, 6]);
    // Unless the engine saw the dice roll first: then the first reading is the throw.
    c = consider(moved(watching(1)), lying('r1', [3]));
    expect(c.stale).toBe(false);
    expect(consider(c.watch, lying('r1', [3])).accept).toEqual([3]);
    expect(moved(c.watch)).toBe(c.watch);
    // An ask opening on a nudged tray ignores the throw taken and the tray as it lies, and reads what differs.
    const w = watching(1, lieOf(lying('r1', [4])), lieOf(lying('r2', [4], 0.03)));
    expect(w.firstIsLie).toBe(false);
    expect(consider(w, lying('r3', [4], 0.02)).stale).toBe(true);
    expect(consider(w, lying('r3', [4], 0.05)).stale).toBe(true);
    expect(consider(w, lying('r3', [4], 0.1)).stale).toBe(false);
    expect(watching(1, null, null)).toMatchObject({ ignore: [], firstIsLie: true });
  });
  it('starts over when the readings disagree, the count is wrong, a die is askew or a face is unsure', () => {
    const w = watching(2, lieOf(lying('r0', [])));
    let c = consider(w, reading('r1', [3, 5]));
    c = consider(c.watch, reading('r1', [3, 6]));
    expect(c.accept).toBeNull();
    c = consider(c.watch, reading('r1', [3, 6]));
    expect(c.accept).toEqual([3, 6]);
    expect(consider(w, reading('r1', [3])).seen).toBe(1);
    expect(consider(consider(w, reading('r1', [3])).watch, reading('r1', [3])).accept).toBeNull();
    expect(consider(consider(w, reading('r1', [3, 5], 0.5)).watch, reading('r1', [3, 5], 0.5)).accept).toBeNull();
    expect(consider(consider(w, reading('r1', [3, 5], 0.9, true)).watch, reading('r1', [3, 5], 0.9, true)).accept).toBeNull();
    // A bad reading in between breaks the run.
    c = consider(w, reading('r1', [3, 5]));
    c = consider(c.watch, reading('r1', [3, 5, 1]));
    c = consider(c.watch, reading('r1', [3, 5]));
    expect(c.accept).toBeNull();
  });
  it("recognises the engine's messages and words the status line and the dock's note", () => {
    expect(isEngineMessage({ type: 'ready', protocol: 2, version: 'x' })).toBe(true);
    expect(isEngineMessage({ dicecam: 'ready' })).toBe(false);
    expect(isEngineMessage(null)).toBe(false);
    expect(statusText('active', 1, null, true)).toBe('Watching the dicecam for one die');
    expect(statusText('active', 4, 0, true)).toBe('Watching the dicecam for 4 dice');
    expect(statusText('active', 4, 2, true)).toBe('2 dice seen, 4 dice wanted');
    expect(statusText('active', 1, 3, true)).toBe('3 dice seen, one die wanted');
    expect(statusText('active', 4, 4, true)).toBe('4 dice seen, reading the faces…');
    expect(statusText('no-camera', 1, null, true)).toBe('No camera found: tap the face you rolled');
    expect(statusText('no-engine', 1, null, true)).toBe('The dicecam could not be loaded: tap the face you rolled');
    expect(statusText('loading', 1, null, true)).toBe('Loading the dicecam…');
    expect(statusText('active', 1, null, false)).toBe('No dicecam on this table: tap the face you rolled');
    expect(dockNote('active')).toBeNull();
    expect(dockNote('starting')).toBe('Starting the camera…');
    expect(dockNote('permission-denied')).toBe('Camera not allowed');
  });
  it('names what a failed camera request means', () => {
    expect(cameraFailure(new DOMException('denied', 'NotAllowedError'))).toBe('permission-denied');
    expect(cameraFailure(new DOMException('none', 'NotFoundError'))).toBe('no-camera');
    expect(cameraFailure(new DOMException('busy', 'NotReadableError'))).toBe('camera-in-use');
    expect(cameraFailure(new TypeError('no mediaDevices'))).toBe('unsupported');
    expect(cameraFailure('?')).toBe('error');
  });
});
