import { describe, expect, it } from 'vitest';
import { rngScripted } from '$lib/game/random';
import { geologyFinds, preach, study, treat, zoologyFinds } from './specialties';

const rng = (specialty: number[]) => rngScripted(1, { specialty });

describe('specimens (rules §9)', () => {
  it('zoology finds by terrain, 1 with water', () => {
    expect(zoologyFinds('lake', false)).toEqual([1]);
    expect(zoologyFinds('veldt', false)).toEqual([2, 3]);
    expect(zoologyFinds('jungle-swamp', false)).toEqual([2, 3, 4]);
    expect(zoologyFinds('jungle-mountain', true)).toEqual([1, 2, 3, 4, 5]);
    expect(zoologyFinds('desert', true)).toEqual([1, 6]);
  });
  it('geology finds by terrain, never in a lake, 6 with a river', () => {
    expect(geologyFinds('lake', true)).toEqual([]);
    expect(geologyFinds('jungle', false)).toEqual([1]);
    expect(geologyFinds('jungle-swamp', false)).toEqual([1]);
    expect(geologyFinds('veldt', true)).toEqual([1, 2, 6]);
    expect(geologyFinds('jungle-mountain', false)).toEqual([1, 2]);
    expect(geologyFinds('mountain', false)).toEqual([1, 2, 3, 4]);
    expect(geologyFinds('desert', false)).toEqual([1, 2, 3]);
  });
  it('a study rolls one die on the specialty stream', () => {
    expect(study(rng([2]), 'zoology', 'veldt', false, false)).toMatchObject({ found: true, summary: 'a zoological specimen is found' });
    expect(study(rng([5]), 'zoology', 'veldt', false, false)).toMatchObject({ found: false });
    expect(study(rng([6]), 'geology', 'veldt', true, false)).toMatchObject({ found: true });
  });
});

describe('preaching and medicine', () => {
  it('preaching moves the attitude by the table, with poison attempts on 4 and 5', () => {
    expect(preach(rng([1]))).toMatchObject({ attitude: 0, poisonAttempts: 0 });
    expect(preach(rng([4]))).toMatchObject({ attitude: 3, poisonAttempts: 2 });
    expect(preach(rng([6]))).toMatchObject({ attitude: 5, poisonAttempts: 0, summary: 'the chief asks to be baptised (attitude +5)' });
  });
  it('medicine may kill or sicken the doctor, and scores on 5 and 6; captives treat at −1', () => {
    expect(treat(rng([1]), false)).toMatchObject({ explorerDies: true });
    expect(treat(rng([2]), false)).toMatchObject({ explorerSick: true });
    expect(treat(rng([3]), false)).toMatchObject({ attitude: -1, poisonAttempts: 1 });
    expect(treat(rng([5]), false)).toMatchObject({ attitude: 1, points: 1, poisonAttempts: 1 });
    expect(treat(rng([6]), false)).toMatchObject({ attitude: 2, points: 2, poisonAttempts: 2 });
    expect(treat(rng([6]), true)).toMatchObject({ attitude: 1, points: 1 });
  });
});
