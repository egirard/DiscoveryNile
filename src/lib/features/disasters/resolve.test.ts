import { describe, expect, it } from 'vitest';
import { card } from '$features/cards/deck';
import { NO_PURCHASES, type Chart } from '$features/expedition/prices';
import { NO_SICKNESS, type Specialty } from '$lib/game/state';
import { rngFromSeed, rngScripted } from '$lib/game/random';
import { applies, resolveDisaster, type Situation } from './resolve';
import { inCapeColony } from './cape-colony';

const chart = (p: Partial<Chart>): Chart => ({ ...NO_PURCHASES, water: 0, guideHomes: {}, ...p });
const veldt: Situation = { terrain: 'veldt', river: false, oasis: false, sea: false };
const FOOT = chart({ askaris: 5, bearers: 15, food: 100 });
const resolve = (n: number, s: Situation, c: Chart, dice: number[] = [], specialties: Specialty[] = []) =>
  resolveDisaster(dice.length ? rngScripted(1, dice) : rngFromSeed(1), card(`card-${n}`), s, { chart: c, sick: NO_SICKNESS, specialties });

describe('disaster card contexts (rules §10)', () => {
  it('matches the card context to the terrain, river, oasis and coast', () => {
    expect(applies(card('card-1'), veldt)).toBe(true); // veldt
    expect(applies(card('card-7'), veldt)).toBe(false); // lake
    expect(applies(card('card-2'), { ...veldt, terrain: 'jungle-swamp' })).toBe(true); // jungle: composites count
    expect(applies(card('card-14'), { ...veldt, terrain: 'jungle-swamp' })).toBe(true); // swamp
    expect(applies(card('card-5'), { ...veldt, terrain: 'jungle', river: true })).toBe(true); // jungle / river
    expect(applies(card('card-5'), { ...veldt, terrain: 'jungle' })).toBe(false);
    expect(applies(card('card-18'), { ...veldt, terrain: 'desert' })).toBe(false); // oasis unknown
    expect(applies(card('card-18'), { ...veldt, terrain: 'desert', oasis: true })).toBe(true);
    expect(applies(card('card-34'), { ...veldt, sea: true })).toBe(true); // lake / sea
    expect(applies(card('card-41'), { ...veldt, terrain: 'mountain' })).toBe(true); // general
  });
  it('a card for another terrain has no effect and the blanks never do', () => {
    const r = resolve(7, veldt, FOOT);
    expect(r).toMatchObject({ applies: false, outcome: 'not here: lake', chart: FOOT, rolls: [] });
    expect(resolve(4, veldt, FOOT)).toMatchObject({ applies: false, outcome: 'no disaster on this card' });
  });
});

describe('disaster effects', () => {
  it('kills the named men and strikes the explorer when there are none of that type', () => {
    expect(resolve(1, veldt, FOOT)).toMatchObject({ applies: true, outcome: '1 askari killed', chart: { askaris: 4 } });
    const none = resolve(42, { ...veldt, terrain: 'jungle' }, FOOT);
    expect(none.outcome).toBe('no such men: the explorer is struck down and dies');
    expect(none.explorerDies).toBe(true);
    expect(none.sick.explorer).toBe(false);
  });
  it('sickness is counted per type and a doctor averts it on a six', () => {
    const r = resolve(6, { ...veldt, terrain: 'jungle' }, FOOT);
    expect(r.sick).toMatchObject({ askaris: 4, bearers: 4 });
    expect(r.outcome).toBe('4 askaris sick, 4 bearers sick');
    const doc = resolve(6, { ...veldt, terrain: 'jungle' }, FOOT, [6], ['medicine']);
    expect(doc.sick).toEqual(NO_SICKNESS);
    expect(doc.rolls).toEqual([{ label: 'doctor', value: 6 }]);
    expect(doc.outcome).toBe('averted by the doctor');
    const fail = resolve(6, { ...veldt, terrain: 'jungle' }, FOOT, [3], ['medicine']);
    expect(fail.sick.askaris).toBe(4);
  });
  it('the rhino charges until shot, one man lost per unanswered charge; zoologists hit on 5', () => {
    // Hunters: explorer + 5 askaris = 6 dice per charge. Charge 1 misses, charge 2 the explorer rolls a 6.
    const r = resolve(23, veldt, FOOT, [1, 2, 3, 4, 5, 1, 6, 1, 1, 1, 1, 1]);
    expect(r.rolls).toHaveLength(12);
    expect(r.chart.bearers).toBe(14);
    expect(r.outcome).toBe('1 bearer killed by the rhino, the rhino is shot on charge 2');
    const zoo = resolve(23, veldt, FOOT, [5, 1, 1, 1, 1, 1], ['zoology']);
    expect(zoo.chart.bearers).toBe(15);
  });
  it('halves, overturns and the bad omens', () => {
    const mounted = chart({ horses: 11, askaris: 4, guides: 1, bearers: 2, muskets: 1, gifts: 20, food: 50 });
    const flood = resolve(12, { ...veldt, terrain: 'mountain' }, mounted);
    expect(flood.chart).toMatchObject({ bearers: 1, askaris: 2, guides: 0, horses: 5 });
    expect(resolve(12, { ...veldt, terrain: 'mountain' }, mounted, [], ['geology']).chart).toEqual(mounted);
    const canoes = chart({ canoes: 2, bearers: 16, food: 100, gifts: 50, muskets: 4 });
    const over = resolve(21, { ...veldt, river: true }, canoes);
    expect(over.chart).toMatchObject({ canoes: 2, food: 50, gifts: 25, muskets: 2 });
    expect(over.outcome).toBe('50 food lost, 25 gifts lost, 2 muskets lost, 1 canoe overturned');
    const omens = resolve(41, veldt, FOOT);
    expect(omens.halted).toBe(true);
    const toll = resolve(16, { ...veldt, terrain: 'desert' }, chart({ gifts: 30 }), [4, 5]);
    expect(toll.chart.gifts).toBe(21);
    expect(toll.outcome).toBe('toll of 9 gifts paid');
    expect(resolve(32, { ...veldt, river: true }, FOOT).chart).toMatchObject({ canoes: 1, gifts: 10, muskets: 1 });
  });
});

describe('Cape Colony', () => {
  it('covers the Orange and Vaal and the hexes south of the Orange, pre-printed only', () => {
    expect(inCapeColony('c13r32')).toBe(true); // on the Orange
    expect(inCapeColony('c14r32')).toBe(true); // on the Vaal, though the hex itself is blank
    expect(inCapeColony('c14r36')).toBe(true); // Port Elizabeth
    expect(inCapeColony('c17r34')).toBe(true); // Durban
    expect(inCapeColony('c16r33')).toBe(true);
    expect(inCapeColony('c25r12')).toBe(false); // Mombasa
    expect(inCapeColony('c15r32')).toBe(false); // blank, north of the river
    expect(inCapeColony('c16r30')).toBe(false);
  });
});
