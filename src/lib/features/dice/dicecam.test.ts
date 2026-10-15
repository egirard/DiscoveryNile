import { describe, expect, it } from 'vitest';
import { cameraFailure, consider, dockNote, gathering, isEngineMessage, lieOf, moved, sameLie, statusText, thrown, watching, type Reading } from './dicecam';

const reading = (rollId: string, values: number[], confidence = 0.9, askew = false): Reading => ({ rollId, dice: values.map((value) => ({ value, confidence, askew })) });
/** A reading with the dice placed in a row, the i-th at x = 0.2 + 0.2 i, shifted by `dx`. */
const lying = (rollId: string, values: number[], dx = 0): Reading => ({ rollId, dice: values.map((value, i) => ({ value, confidence: 0.9, askew: false, normalizedPosition: { x: Number((0.2 + 0.2 * i + dx).toFixed(2)), y: 0.5 } })) });
/** A reading with each die placed by hand: `[face, x, y]`. */
const at = (rollId: string, dice: [number, number, number][]): Reading => ({ rollId, dice: dice.map(([value, x, y]) => ({ value, confidence: 0.9, askew: false, normalizedPosition: { x, y } })) });
/** Two agreeing readings of the same tray. */
const twice = (w: ReturnType<typeof watching>, r: Reading) => consider(consider(w, r).watch, r);

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
    expect(c.seen).toBe(0);
    expect(c.resting).toBe(4);
    c = consider(consider(c.watch, lying('r3', [1, 1, 1, 1], 0.05)).watch, lying('r3', [1, 1, 1, 1], 0.05));
    expect(c.accept).toEqual([1, 1, 1, 1]);
    expect(lieOf(reading('r4', [2])).dice).toEqual([{ value: 2, x: -1, y: -1 }]);
    expect(statusText('active', 1, 1, true, true)).toBe('Waiting for a D6 roll');
    expect(statusText('active', 4, 4, true, true)).toBe('Waiting for a roll of 4 D6');
  });
  it('gathers a throw of more dice than the tray holds over several throws, each taken as it comes (prompt 33)', () => {
    // Twelve dice for the loot: four thrown, taken; the same four lying there, ignored; three more, taken; then only five more wanted.
    let w = gathering(12, 0, lieOf(lying('r0', [])));
    expect(w).toMatchObject({ count: 12, gathered: true });
    let c = consider(consider(w, lying('r1', [1, 2, 3, 4])).watch, lying('r1', [1, 2, 3, 4]));
    expect(c.accept).toEqual([1, 2, 3, 4]);
    w = gathering(12, 4, lieOf(lying('r1', [1, 2, 3, 4])));
    expect(w.count).toBe(8);
    c = consider(w, lying('r2', [1, 2, 3, 4]));
    expect(c.stale).toBe(true);
    c = consider(consider(w, lying('r2', [5, 5, 5])).watch, lying('r2', [5, 5, 5]));
    expect(c.accept).toEqual([5, 5, 5]);
    w = gathering(12, 11, lieOf(lying('r2', [5, 5, 5])));
    c = consider(w, lying('r3', [6, 6]));
    expect(c.accept).toBeNull();
    expect(c.seen).toBe(2);
    expect(statusText('active', 1, 2, true, false, true)).toBe('2 dice thrown, only 1 more die wanted');
    expect(statusText('active', 8, null, true, false, true)).toBe('Watching the dicecam for a throw; 8 more dice wanted');
    expect(statusText('active', 8, 3, true, false, true)).toBe('3 dice thrown, reading the faces…');
    expect(statusText('active', 8, 4, true, true, true)).toBe('Waiting for a throw; 8 more dice wanted');
    expect(statusText('active', 1, null, false, false, true)).toBe('No dicecam on this table: tap each face as it is rolled; 1 more die wanted');
    // A throw the tray holds whole is never taken in parts: four wanted, three seen is not a throw.
    const whole = watching(4, lieOf(lying('r0', [])));
    expect(whole.gathered).toBe(false);
    expect(consider(consider(whole, lying('r1', [1, 2, 3])).watch, lying('r1', [1, 2, 3])).accept).toBeNull();
  });
  it('judges each die on its own: a die tossed in beside those lying there is a throw of one (prompt 36)', () => {
    // Three dice lie from the last throw; one die is wanted; a fourth is tossed in and lands beside them.
    const three = lieOf(at('r1', [[2, 0.2, 0.5], [5, 0.4, 0.5], [3, 0.6, 0.5]]));
    const w = watching(1, three, three);
    let c = consider(w, at('r1', [[2, 0.2, 0.5], [5, 0.4, 0.5], [3, 0.6, 0.5]]));
    expect(c).toMatchObject({ stale: true, seen: 0, resting: 3, accept: null });
    const four = at('r1', [[2, 0.2, 0.5], [5, 0.4, 0.5], [3, 0.6, 0.5], [6, 0.8, 0.6]]);
    expect(thrown(four, [three])).toEqual({ thrown: [four.dice[3]], resting: 3 });
    c = consider(w, four);
    expect(c).toMatchObject({ stale: false, seen: 1, resting: 3, accept: null });
    c = consider(c.watch, four);
    expect(c.accept).toEqual([6]);
    // The next ask opens on all four lying there: none of them is a throw, until one is picked up and rolled.
    const w2 = watching(1, lieOf(four), lieOf(four));
    expect(consider(w2, four)).toMatchObject({ stale: true, seen: 0, resting: 4 });
    // Picked up and rolled again: a new face where it lay, or the same face a die's width away.
    expect(twice(w2, at('r1', [[2, 0.2, 0.5], [5, 0.4, 0.5], [3, 0.6, 0.5], [1, 0.8, 0.6]])).accept).toEqual([1]);
    expect(twice(w2, at('r1', [[2, 0.2, 0.5], [5, 0.4, 0.5], [3, 0.6, 0.5], [6, 0.7, 0.75]])).accept).toEqual([6]);
    // Picked up and rolled, landing where it lay with the same face up: nothing moved that the table can see.
    expect(consider(w2, at('r2', [[2, 0.2, 0.5], [5, 0.4, 0.5], [3, 0.6, 0.5], [6, 0.82, 0.58]])).stale).toBe(true);
    // One of the three picked up and rolled while the others rest, the tray now showing three: a throw of one.
    expect(twice(w2, at('r3', [[2, 0.2, 0.5], [3, 0.6, 0.5], [6, 0.8, 0.6], [4, 0.45, 0.7]])).accept).toEqual([4]);
    expect(twice(w2, at('r3', [[2, 0.2, 0.5], [3, 0.6, 0.5], [6, 0.8, 0.6]])).stale).toBe(true); // one picked up and held
    // The rolled die bumps another a die's width along: two moved, one wanted, so nothing is taken and the line says so.
    c = twice(w2, at('r3', [[2, 0.2, 0.5], [5, 0.5, 0.5], [3, 0.6, 0.5], [4, 0.45, 0.7]]));
    expect(c).toMatchObject({ accept: null, seen: 2, resting: 2, stale: false });
    expect(statusText('active', 1, 2, true)).toBe('2 dice thrown, one die wanted');
    // Three lying and four more thrown in on top of them for a throw of four.
    const w4 = watching(4, three);
    expect(twice(w4, at('r4', [[2, 0.2, 0.5], [5, 0.4, 0.5], [3, 0.6, 0.5], [1, 0.3, 0.7], [1, 0.5, 0.75], [2, 0.7, 0.7], [6, 0.8, 0.3]])).accept).toEqual([1, 1, 2, 6]);
    // The four thrown again, one landing where it lay with the same face: the tray shows the count and moved, so all four are the throw.
    const lastFour = lieOf(at('r5', [[1, 0.3, 0.7], [1, 0.5, 0.75], [2, 0.7, 0.7], [6, 0.8, 0.3]]));
    c = twice(watching(4, lastFour, lastFour), at('r6', [[3, 0.25, 0.4], [1, 0.5, 0.75], [4, 0.6, 0.35], [2, 0.75, 0.6]]));
    expect(c).toMatchObject({ accept: [3, 1, 4, 2], seen: 3, resting: 1 });
    // A die of the throw read unsurely holds the throw; a resting die read unsurely does not.
    const unsure = at('r7', [[2, 0.2, 0.5], [5, 0.4, 0.5], [3, 0.6, 0.5], [6, 0.8, 0.6]]);
    unsure.dice[3].confidence = 0.5;
    expect(twice(w, unsure).accept).toBeNull();
    const restingUnsure = at('r7', [[2, 0.2, 0.5], [5, 0.4, 0.5], [3, 0.6, 0.5], [6, 0.8, 0.6]]);
    restingUnsure.dice[0].confidence = 0.5;
    expect(twice(w, restingUnsure).accept).toEqual([6]);
  });
  it('gathers a long throw one die or a few at a time as the dice pile up in the tray (prompt 36)', () => {
    // Sixteen dice for the shots at the baboons, rolled with four dice: one at a time, then in a group of three.
    let lie = lieOf(at('r0', []));
    let w = gathering(16, 0, lie, lie);
    const tray: [number, number, number][] = [];
    const have: number[] = [];
    for (const [face, x, y] of [[6, 0.3, 0.4], [2, 0.5, 0.6], [6, 0.7, 0.5]] as [number, number, number][]) {
      tray.push([face, x, y]);
      const r = at('r0', tray);
      expect(consider(w, r)).toMatchObject({ seen: 1, resting: tray.length - 1, stale: false });
      const c = twice(w, r);
      expect(c.accept).toEqual([face]);
      have.push(face);
      lie = lieOf(r);
      w = gathering(16, have.length, lie, lie);
    }
    expect(w.count).toBe(13);
    expect(consider(w, at('r1', tray))).toMatchObject({ stale: true, resting: 3 });
    // The three picked up and thrown again with the fourth: four dice at new places, taken as four.
    const four = at('r2', [[1, 0.25, 0.7], [6, 0.45, 0.3], [5, 0.6, 0.65], [2, 0.8, 0.4]]);
    expect(twice(w, four)).toMatchObject({ accept: [1, 6, 5, 2], seen: 4, resting: 0 });
    w = gathering(16, 7, lieOf(four), lieOf(four));
    // Two of them picked up and rolled while two rest: a throw of two.
    const two = at('r2', [[6, 0.45, 0.3], [2, 0.8, 0.4], [3, 0.3, 0.5], [6, 0.6, 0.45]]);
    expect(twice(w, two)).toMatchObject({ accept: [3, 6], seen: 2, resting: 2 });
    // Only two more wanted and three are thrown: nothing is taken, and the line says so.
    w = gathering(16, 14, lieOf(two), lieOf(two));
    const c = twice(w, at('r3', [[6, 0.45, 0.3], [1, 0.3, 0.7], [1, 0.5, 0.7], [4, 0.7, 0.7]]));
    expect(c).toMatchObject({ accept: null, seen: 3, resting: 1 });
    expect(statusText('active', 2, 3, true, false, true)).toBe('3 dice thrown, only 2 more dice wanted');
    expect(statusText('active', 2, 1, true, false, true)).toBe('One die thrown, reading the face…');
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
    expect(statusText('active', 4, 2, true)).toBe('2 dice thrown, 4 dice wanted');
    expect(statusText('active', 1, 3, true)).toBe('3 dice thrown, one die wanted');
    expect(statusText('active', 4, 4, true)).toBe('4 dice thrown, reading the faces…');
    expect(statusText('active', 1, 1, true)).toBe('One die thrown, reading the face…');
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
