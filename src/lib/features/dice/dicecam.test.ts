import { describe, expect, it } from 'vitest';
import { cameraFailure, consider, dockNote, isEngineMessage, sameLie, statusText, takenFrom, watching, type Reading } from './dicecam';

const reading = (rollId: string, values: number[], confidence = 0.9, askew = false): Reading => ({ rollId, dice: values.map((value) => ({ value, confidence, askew })) });
/** A reading with the dice placed in a row, the i-th at x = 0.2 + 0.2 i, shifted by `dx`. */
const lying = (rollId: string, values: number[], dx = 0): Reading => ({ rollId, dice: values.map((value, i) => ({ value, confidence: 0.9, askew: false, normalizedPosition: { x: Number((0.2 + 0.2 * i + dx).toFixed(2)), y: 0.5 } })) });

describe('reading the dicecam', () => {
  it('takes a throw once two readings of it agree, and never the same throw twice', () => {
    let w = watching(1);
    let c = consider(w, reading('r1', [4]));
    expect(c.accept).toBeNull();
    expect(c.seen).toBe(1);
    c = consider(c.watch, reading('r1', [4]));
    expect(c.accept).toEqual([4]);
    expect(c.watch.taken?.rollId).toBe('r1');
    c = consider(c.watch, reading('r1', [4]));
    expect(c.accept).toBeNull();
    expect(c.stale).toBe(true);
    w = watching(1, c.watch.taken);
    c = consider(w, reading('r1', [4]));
    expect(c.accept).toBeNull(); // the dice still lying there from the last throw
    expect(c.stale).toBe(true);
    c = consider(consider(w, reading('r2', [2])).watch, reading('r2', [2]));
    expect(c.accept).toEqual([2]);
    expect(c.stale).toBe(false);
  });
  it('ignores the last throw\'s dice lying where they were, whatever the engine now calls the throw, until they have moved', () => {
    // bottom-1's four dice are taken; a hand reaching in gives the same lie a new id for top-1's ask.
    let c = consider(consider(watching(4), lying('r1', [6, 6, 6, 6])).watch, lying('r1', [6, 6, 6, 6]));
    expect(c.accept).toEqual([6, 6, 6, 6]);
    const taken = c.watch.taken!;
    expect(taken.lie).toEqual([{ value: 6, x: 0.2, y: 0.5 }, { value: 6, x: 0.4, y: 0.5 }, { value: 6, x: 0.6, y: 0.5 }, { value: 6, x: 0.8, y: 0.5 }]);
    expect(sameLie(lying('r2', [6, 6, 6, 6]), taken)).toBe(true);
    expect(sameLie(lying('r2', [6, 6, 6, 6], 0.03), taken)).toBe(true); // a nudge is not a throw
    expect(sameLie(lying('r2', [6, 6, 6, 6], 0.1), taken)).toBe(false); // moved a die's width
    expect(sameLie(lying('r2', [6, 6, 6, 5]), taken)).toBe(false); // a face changed
    expect(sameLie(lying('r2', [6, 6, 6]), taken)).toBe(false); // one picked up
    expect(sameLie(reading('r2', [6, 6, 6, 6]), taken)).toBe(false); // no positions known: the id decides
    c = consider(watching(4, taken), lying('r2', [6, 6, 6, 6]));
    expect(c.stale).toBe(true);
    expect(c.accept).toBeNull();
    expect(c.seen).toBe(4);
    c = consider(consider(c.watch, lying('r3', [1, 1, 1, 1], 0.05)).watch, lying('r3', [1, 1, 1, 1], 0.05));
    expect(c.accept).toEqual([1, 1, 1, 1]);
    expect(takenFrom(reading('r4', [2])).lie).toEqual([{ value: 2, x: -1, y: -1 }]);
    expect(statusText('active', 1, 1, true, true)).toBe('The last throw still lies in the tray: pick the dice up and roll one die');
    expect(statusText('active', 4, 4, true, true)).toBe('The last throw still lies in the tray: pick the dice up and roll 4 dice');
  });
  it('starts over when the readings disagree, the count is wrong, a die is askew or a face is unsure', () => {
    const w = watching(2);
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
