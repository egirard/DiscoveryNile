import { describe, expect, it } from 'vitest';
import { consider, isDicecamMessage, statusText, watching, type Reading } from './dicecam';

const reading = (rollId: string, values: number[], confidence = 0.9, askew = false): Reading => ({ rollId, dice: values.map((value) => ({ value, confidence, askew })) });

describe('reading the dicecam', () => {
  it('takes a throw once two readings of it agree, and never the same throw twice', () => {
    let w = watching(1);
    let c = consider(w, reading('r1', [4]));
    expect(c.accept).toBeNull();
    expect(c.seen).toBe(1);
    c = consider(c.watch, reading('r1', [4]));
    expect(c.accept).toEqual([4]);
    expect(c.watch.taken).toBe('r1');
    c = consider(c.watch, reading('r1', [4]));
    expect(c.accept).toBeNull();
    w = watching(1, c.watch.taken);
    c = consider(w, reading('r1', [4]));
    expect(c.accept).toBeNull(); // the dice still lying there from the last throw
    c = consider(consider(w, reading('r2', [2])).watch, reading('r2', [2]));
    expect(c.accept).toEqual([2]);
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
  it('recognises the dicecam\'s messages and words the status line', () => {
    expect(isDicecamMessage({ dicecam: 'ready' })).toBe(true);
    expect(isDicecamMessage({ source: 'other' })).toBe(false);
    expect(isDicecamMessage(null)).toBe(false);
    expect(statusText('active', 1, null, true)).toBe('Watching the dicecam for one die');
    expect(statusText('active', 4, 0, true)).toBe('Watching the dicecam for 4 dice');
    expect(statusText('active', 4, 2, true)).toBe('2 dice seen, 4 dice wanted');
    expect(statusText('active', 1, 3, true)).toBe('3 dice seen, one die wanted');
    expect(statusText('active', 4, 4, true)).toBe('4 dice seen, reading the faces…');
    expect(statusText('no-camera', 1, null, true)).toBe('The dicecam finds no camera: tap the face you rolled');
    expect(statusText('active', 1, null, false)).toBe('No dicecam on this table: tap the face you rolled');
  });
});
