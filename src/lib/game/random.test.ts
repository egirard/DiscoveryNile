import { describe, expect, it } from 'vitest';
import { createRandom, shuffle } from './random';

describe('createRandom', () => {
  it('produces the same sequence for the same seed', () => {
    const a = createRandom(1234);
    const b = createRandom(1234);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it('produces different sequences for different seeds', () => {
    expect(createRandom(1)()).not.toEqual(createRandom(2)());
  });
  it('stays within [0, 1)', () => {
    const r = createRandom(99);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('shuffle', () => {
  it('is a permutation and does not mutate its input', () => {
    const input = [1, 2, 3, 4, 5, 6];
    const out = shuffle(input, createRandom(7));
    expect(input).toEqual([1, 2, 3, 4, 5, 6]);
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });
  it('is deterministic for a seed', () => {
    expect(shuffle([1, 2, 3, 4, 5], createRandom(42))).toEqual(shuffle([1, 2, 3, 4, 5], createRandom(42)));
  });
});
