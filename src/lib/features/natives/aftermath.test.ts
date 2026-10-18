import { describe, expect, it } from 'vitest';
import { NO_PURCHASES, type Chart } from '$features/expedition/prices';
import { rngScripted } from '$lib/game/random';
import { consequencesOfDefeat, fateOf, loot, resultsOfVictory, searchVillage } from './aftermath';

const chart = (p: Partial<Chart>): Chart => ({ ...NO_PURCHASES, water: 0, guideHomes: {}, ...p });
const had = chart({ askaris: 5, bearers: 6, camels: 2, food: 100 });
const rng = (combat: number[]) => rngScripted(1, { combat });

describe('consequences of defeat (rules §8.4)', () => {
  it('maps the die to a fate, with the captive\'s −3', () => {
    expect([1, 2, 3, 4, 5, 6].map(fateOf)).toEqual(['killed', 'prisoner', 'alone', 'musket', 'one-roll', 'two-rolls']);
    expect(fateOf(6 - 3)).toBe('alone');
    expect(fateOf(0)).toBe('killed');
  });
  it('escaping alone leaves nothing; a 4 keeps a musket and nine rations', () => {
    const alone = consequencesOfDefeat(rng([3]), had);
    expect(alone).toMatchObject({ fate: 'alone', summary: 'defeat 3: the explorer escapes alone' });
    expect(alone.chart).toEqual(chart({}));
    const musket = consequencesOfDefeat(rng([4]), had);
    expect(musket.chart).toMatchObject({ muskets: 1, food: 9, askaris: 0 });
    expect(musket.summary).toBe('defeat 4: the explorer escapes alone, with a musket and 9 rations');
  });
  it('survival rolls give only what the expedition had, re-rolling impossible results, loaded items with a load roll', () => {
    // 6: two rolls. First: 5 (horse, none had) re-rolled to 4 (camel), load 2 → 10 rations. Second: 3 (askari).
    const r = consequencesOfDefeat(rng([6, 5, 4, 2, 3]), had);
    expect(r.fate).toBe('two-rolls');
    expect(r.rolls.map((x) => x.label)).toEqual(['defeat', 'survival', 'survival', 'load', 'survival']);
    expect(r.chart).toMatchObject({ muskets: 1, food: 19, camels: 1, askaris: 1 });
    expect(r.summary).toBe('defeat 6: the explorer escapes alone, with a musket and 9 rations, a camel (survival 4) with 10 rations (load 2), an askari (survival 3)');
    const captive = consequencesOfDefeat(rng([2]), had, -3);
    expect(captive).toMatchObject({ fate: 'killed', rolls: [{ label: 'escape', value: 2 }] });
  });
});

describe('results of victory', () => {
  it('takes prisoners from the askaris less a die, capped at the surviving warriors; a six takes none', () => {
    expect(resultsOfVictory(rng([1, 3, 4]), 5, 6, 3)).toMatchObject({ prisoners: 4, noQuarter: false, villageFound: true, summary: 'prisoners: 5 askaris − 1 = 4 taken; village 3 + 4 = 7, within 4 prisoners + policy 3 = 7: the village is found' });
    expect(resultsOfVictory(rng([2, 6, 6]), 5, 2, 3)).toMatchObject({ prisoners: 2, villageFound: false });
    expect(resultsOfVictory(rng([6, 1, 2]), 5, 6, 3)).toMatchObject({ prisoners: 0, noQuarter: true, villageFound: true, summary: 'prisoners: a 6, no quarter, none taken; village 1 + 2 = 3, within 0 prisoners + policy 3 = 3: the village is found' });
    expect(searchVillage(rng([2, 2]), 0, 3)).toMatchObject({ found: false });
    expect(searchVillage(rng([1, 2]), 0, 3)).toMatchObject({ found: true });
  });
  it('loots a die per original warrior', () => {
    const r = loot(rng([1, 2, 3, 4, 5, 6, 6]), 7, 'veldt', false);
    expect(r).toMatchObject({ rations: 10, gifts: 1, camels: 0, canoes: 0, summary: 'looted 10 rations, 1 gift (a die a warrior: 1 to 4 that many rations, 5 a gift, 6 nothing)' });
    expect(loot(rng([6, 6]), 2, 'desert', false)).toMatchObject({ camels: 2 });
    expect(loot(rng([6]), 1, 'jungle', true)).toMatchObject({ canoes: 1 });
    expect(loot(rng([5, 5, 5, 5, 5, 5, 5, 5, 5, 5]), 10, 'veldt', false).rolls).toHaveLength(10);
  });
});
