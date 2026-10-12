import { describe, expect, it } from 'vitest';
import { createRandom, shuffle, rngFromSeed, rngScripted, nextRandom, dice, shuffleWith } from './random';

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

describe('serialisable PRNG', () => {
  it('matches createRandom for the same seed', () => {
    const closure = createRandom(99);
    let s = rngFromSeed(99);
    for (let i = 0; i < 20; i++) {
      const r = nextRandom(s);
      s = r.state;
      expect(r.value).toBe(closure());
    }
  });
  it('rolls dice in 1..6 and is deterministic', () => {
    const a = dice(rngFromSeed(7), 1000);
    const b = dice(rngFromSeed(7), 1000);
    expect(a.values).toEqual(b.values);
    expect(Math.min(...a.values)).toBe(1);
    expect(Math.max(...a.values)).toBe(6);
    expect(a.state).not.toBe(rngFromSeed(7));
  });
  it('shuffles the same way as shuffle(createRandom)', () => {
    const items = [...Array(48).keys()];
    expect(shuffleWith(items, rngFromSeed(1234)).items).toEqual(shuffle(items, createRandom(1234)));
  });
});

describe('scripted dice', () => {
  it('serves the script first, then the generator, and shuffles from the generator only', () => {
    const s = rngScripted(1234, [6, 1, 3]);
    const r = dice(s, 5);
    expect(r.values.slice(0, 3)).toEqual([6, 1, 3]);
    expect(r.values.slice(3)).toEqual(dice(rngFromSeed(1234), 2).values);
    expect(shuffleWith([1, 2, 3, 4], rngScripted(7, [6, 6])).items).toEqual(shuffleWith([1, 2, 3, 4], rngFromSeed(7)).items);
    expect((rngScripted(1, [0, 9, 2.7]) as { script: number[] }).script).toEqual([1, 6, 2]);
  });
});
