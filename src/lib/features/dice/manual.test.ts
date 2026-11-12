import { describe, expect, it } from 'vitest';
import { createRandom } from '$lib/game/random';
import { consider, gathering, lieOf, moved, watching, DICE_AT_HAND, type Lie } from './dicecam';
import { CLEAR_OF, DIE, FLOOR, FRAME, manualStatusText, manualThrow, readManualDice, seedOf, seen, settled, tapText, throwDice, type Placed } from './manual';

const places = (dice: Placed[]) => dice.map((d) => ({ x: d.x, y: d.y }));
const apart = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

describe('manual dice (prompt 66)', () => {
  it('a tap throws the dice wanted, as many as the tray holds at once, and one die at least when nothing is asked', () => {
    const tray = throwDice(createRandom(1), [], [], 3);
    expect(manualThrow(tray, 1, false, false)).toEqual({ kept: [], count: 1 });
    expect(manualThrow(tray, 4, false, false)).toEqual({ kept: [], count: 4 });
    expect(manualThrow(tray, 12, false, false)).toEqual({ kept: [], count: DICE_AT_HAND });
    expect(manualThrow(tray, 0, false, false)).toEqual({ kept: [], count: 3 });
    expect(manualThrow([], 0, false, false)).toEqual({ kept: [], count: 1 });
    expect(tapText(1, 3)).toBe('Tap to roll one die');
    expect(tapText(12, 0)).toBe('Tap to roll 4 dice');
    expect(tapText(0, 0)).toBe('Tap to roll one die');
  });
  it('"one die" tosses a single die in beside those thrown for the same ask, picking up dice from before it and a full tray', () => {
    const tray = throwDice(createRandom(2), [], [], 3);
    expect(manualThrow(tray, 4, true, false)).toEqual({ kept: tray, count: 1 });
    expect(manualThrow(tray, 4, true, true)).toEqual({ kept: [], count: 1 });
    const full = throwDice(createRandom(3), [], [], 4);
    expect(manualThrow(full, 0, true, false)).toEqual({ kept: [], count: 1 });
  });
  it('dice land in the tray with a face of one to six, clear of each other and of where dice lay, whatever the seed', () => {
    for (let s = 1; s <= 300; s++) {
      const random = createRandom(s);
      // Three throws of four running: the second avoids the first, the third both, as the table's lies would have it.
      const first = throwDice(random, [], [], 4);
      const second = throwDice(random, [], places(first), 4);
      const third = throwDice(random, [], [...places(first), ...places(second)], 4);
      for (const throwOf of [first, second, third]) {
        for (const d of throwOf) {
          expect(d.value).toBeGreaterThanOrEqual(1);
          expect(d.value).toBeLessThanOrEqual(6);
          expect(d.x).toBeGreaterThanOrEqual(FLOOR.x + DIE / 2);
          expect(d.x).toBeLessThanOrEqual(FLOOR.x + FLOOR.width - DIE / 2);
          expect(d.y).toBeGreaterThanOrEqual(FLOOR.y + DIE / 2);
          expect(d.y).toBeLessThanOrEqual(FLOOR.y + FLOOR.height - DIE / 2);
        }
        for (let i = 0; i < throwOf.length; i++) for (let j = 0; j < i; j++) expect(apart(throwOf[i], throwOf[j]), `seed ${s}`).toBeGreaterThan(DIE * 1.1);
      }
      for (const d of second) for (const o of first) expect(apart(d, o), `seed ${s}`).toBeGreaterThan(CLEAR_OF);
      for (const d of third) for (const o of [...first, ...second]) expect(apart(d, o), `seed ${s}`).toBeGreaterThan(CLEAR_OF);
    }
  });
  it('the same seed throws the same dice; the seed follows the game code and how far the game has run', () => {
    expect(throwDice(createRandom(seedOf('ABCDE', 3)), [], [], 4)).toEqual(throwDice(createRandom(seedOf('ABCDE', 3)), [], [], 4));
    expect(seedOf('ABCDE', 3)).not.toBe(seedOf('ABCDE', 4));
    expect(seedOf('ABCDE', 3)).not.toBe(seedOf('ABCDF', 3));
    expect(seedOf('', 0)).toBeGreaterThan(0);
  });
  it('speaks the engine\'s protocol: a settled reading, the dice left to right, each sure, with its place and the geometry of the overlay', () => {
    const tray: Placed[] = [{ value: 5, x: 400, y: 200, turn: 0 }, { value: 2, x: 120, y: 100, turn: 30 }];
    const m = settled('manual-1', tray, 'initial');
    expect(m).toMatchObject({ type: 'settled', rollId: 'manual-1', kind: 'initial', frame: FRAME });
    expect(m.dice.map((d) => d.value)).toEqual([2, 5]);
    const five = m.dice[1];
    expect(five.confidence).toBeGreaterThan(0.9);
    expect(five.askew).toBe(false);
    expect(five.normalizedPosition).toEqual({ x: 400 / FRAME.width, y: 200 / FRAME.height });
    expect(five.boundingBox).toEqual({ x: 400 - DIE / 2, y: 200 - DIE / 2, width: DIE, height: DIE });
    expect(five.contour).toHaveLength(4);
    expect(five.face).toHaveLength(4);
    expect(five.pips).toHaveLength(5);
    expect(five.pips[2]).toEqual({ x: 400, y: 200 });
    // A turned die's box holds its corners.
    const two = seen(tray[1]);
    expect(two.boundingBox.width).toBeGreaterThan(DIE);
    expect(two.pips).toHaveLength(2);
  });
  it('a throw goes through the dicecam\'s judge: rolling, two readings that agree, taken with where it lay; the next ask\'s throw lands clear of it', () => {
    const random = createRandom(7);
    let lies: Lie[] = [];
    for (let ask = 0; ask < 40; ask++) {
      const count = 1 + (ask % 4);
      const avoid = lies.flatMap((l) => l.dice).map((d) => ({ x: d.x * FRAME.width, y: d.y * FRAME.height }));
      const tray = throwDice(random, [], avoid, count);
      const reading = settled(`manual-${ask}`, tray, 'initial');
      let w = moved(watching(count, ...lies));
      const once = consider(w, reading);
      expect(once.accept).toBeNull();
      expect(once.seen).toBe(count);
      const twice = consider(once.watch, settled(`manual-${ask}`, tray, 'update'));
      expect(twice.accept).toEqual(reading.dice.map((d) => d.value));
      expect(twice.lay).toEqual(reading.dice.map((d) => d.normalizedPosition));
      lies = [lieOf(reading)];
      w = watching(1, ...lies);
      expect(consider(w, reading).stale).toBe(true);
    }
  });
  it('one die at a time fills an ask for four, and a throw of twelve is gathered four at a tap', () => {
    const random = createRandom(11);
    let tray: Placed[] = [];
    let w = moved(watching(4));
    for (let i = 1; i <= 4; i++) {
      const t = manualThrow(tray, 4, true, i === 1);
      tray = [...t.kept, ...throwDice(random, t.kept, [], t.count)];
      const first = consider(w, settled(`manual-${i}`, tray, 'initial'));
      const second = consider(first.watch, settled(`manual-${i}`, tray, 'update'));
      expect(second.seen).toBe(i);
      if (i < 4) expect(second.accept).toBeNull();
      else expect(second.accept).toHaveLength(4);
      w = second.watch;
    }
    let have = 0;
    let last: Lie | null = lieOf(settled('manual-4', tray, 'initial'));
    for (let n = 5; have < 12; n++) {
      const t = manualThrow(tray, 12 - have, false, true);
      expect(t.count).toBe(4);
      tray = throwDice(random, [], places(tray), t.count);
      const g = moved(gathering(12, have, last));
      const second = consider(consider(g, settled(`manual-${n}`, tray, 'initial')).watch, settled(`manual-${n}`, tray, 'update'));
      expect(second.accept).toHaveLength(4);
      have += 4;
      last = lieOf(settled(`manual-${n}`, tray, 'initial'));
    }
  });
  it('the status line says what to tap, then what was thrown', () => {
    expect(manualStatusText(1, null, false, false)).toBe('Tap the dice tray to roll one die');
    expect(manualStatusText(4, 0, false, false)).toBe('Tap the dice tray to roll 4 dice');
    expect(manualStatusText(4, 4, true, false)).toBe('Tap the dice tray to roll 4 dice');
    expect(manualStatusText(12, null, false, true)).toBe('Tap the dice tray to roll 4 dice; 12 more dice wanted');
    expect(manualStatusText(4, 1, false, false)).toBe('One die thrown, 4 dice wanted');
    expect(manualStatusText(4, 4, false, false)).toBe('4 dice thrown, reading the faces…');
  });
  it('the setting is read from the address when given there', () => {
    expect(readManualDice('?manual-dice=1')).toBe(true);
    expect(readManualDice('?manual-dice=0')).toBe(false);
    expect(readManualDice('?manual-dice=off')).toBe(false);
  });
});
