import { describe, expect, it } from 'vitest';
import { rngFromSeed, d6 } from '$lib/game/random';
import { generateTerrain, lostCheck, passableOnFoot, terrainLostModifier, terrainLookup } from './generate';
import { neighbour, type HexId } from './hex';
import type { Terrain } from './manifest';

/** A seed whose first die is `value`. */
function seedRolling(value: number, offset = 0): number {
  for (let seed = 1; seed < 100000; seed++) {
    let s = rngFromSeed(seed);
    for (let i = 0; i < offset; i++) s = d6(s).state;
    if (d6(s).value === value) return seed;
  }
  throw new Error('no seed');
}

describe('lost check (rules §7.2)', () => {
  it('uses the terrain of the hex being left', () => {
    expect(terrainLostModifier('veldt')).toEqual({ label: 'veldt', value: -1 });
    expect(terrainLostModifier('desert').value).toBe(-1);
    expect(terrainLostModifier('lake').value).toBe(-1);
    expect(terrainLostModifier('swamp').value).toBe(-2);
    expect(terrainLostModifier('mountain').value).toBe(-2);
    expect(terrainLostModifier('jungle').value).toBe(-3);
    expect(terrainLostModifier('jungle-swamp').value).toBe(-5);
    expect(terrainLostModifier('jungle-mountain').value).toBe(-5);
  });
  it('is lost when the modified roll is zero or less', () => {
    const one = rngFromSeed(seedRolling(1));
    const r1 = lostCheck(one, { from: 'veldt', river: null, guide: null, ailing: false });
    expect(r1.result).toMatchObject({ lost: true, total: 0, automatic: false });
    const two = rngFromSeed(seedRolling(2));
    expect(lostCheck(two, { from: 'veldt', river: null, guide: null, ailing: false }).result.lost).toBe(false);
    expect(lostCheck(two, { from: 'mountain', river: null, guide: null, ailing: false }).result.lost).toBe(true);
    expect(lostCheck(two, { from: 'mountain', river: null, guide: 'adjacent', ailing: false }).result.lost).toBe(false);
    expect(lostCheck(two, { from: 'veldt', river: null, guide: null, ailing: true }).result.lost).toBe(true);
    const six = rngFromSeed(seedRolling(6));
    expect(lostCheck(six, { from: 'jungle-swamp', river: null, guide: null, ailing: false }).result).toMatchObject({ lost: false, total: 1 });
  });
  it('never gets lost downstream or with a guide from this hex, and rolls at −1 upstream', () => {
    const one = rngFromSeed(seedRolling(1));
    expect(lostCheck(one, { from: 'jungle', river: 'downstream', guide: null, ailing: false }).result).toMatchObject({ lost: false, automatic: true });
    expect(lostCheck(one, { from: 'jungle', river: null, guide: 'home', ailing: false }).result).toMatchObject({ lost: false, automatic: true });
    const r = lostCheck(one, { from: 'jungle', river: 'upstream', guide: null, ailing: false });
    expect(r.result.modifiers[0]).toEqual({ label: 'following the river upstream', value: -1 });
    expect(r.result.total).toBe(0);
  });
  it('advances the rng only when a die is rolled', () => {
    const s = rngFromSeed(3);
    expect(lostCheck(s, { from: 'veldt', river: 'downstream', guide: null, ailing: false }).rng).toBe(s);
    expect(lostCheck(s, { from: 'veldt', river: null, guide: null, ailing: false }).rng).not.toBe(s);
  });
});

describe('basic terrain generation (rules §7.3)', () => {
  const blankAround: Record<string, Terrain> = {};
  const lookupWith = (known: Record<string, Terrain>) => terrainLookup(Object.fromEntries(Object.entries(known).map(([k, t]) => [k, { terrain: t }])));
  const centre: HexId = 'c12r12'; // deep interior: every neighbour is blank on the printed board

  it('copies the terrain of a mapped neighbour in the rolled direction', () => {
    const d = 2;
    const seed = seedRolling(d);
    const known = { [neighbour(centre, d)]: 'jungle-swamp' as Terrain };
    const r = generateTerrain(rngFromSeed(seed), centre, lookupWith(known));
    expect(r.result).toEqual({ terrain: 'jungle-swamp', rolls: [{ label: 'direction (try 1)', value: 2 }], copiedFrom: 2 });
  });
  it('tries a second direction before the random table', () => {
    const seed = seedRolling(5, 1); // second die is 5
    const first = d6(rngFromSeed(seed)).value;
    const known = { [neighbour(centre, 5)]: 'desert' as Terrain };
    if (first === 5) return; // both dice point the same way; covered by the first test
    const r = generateTerrain(rngFromSeed(seed), centre, lookupWith(known));
    expect(r.result.copiedFrom).toBe(5);
    expect(r.result.terrain).toBe('desert');
    expect(r.result.rolls).toHaveLength(2);
  });
  it('rolls the random table when no neighbour is mapped, with the composite roll for jungle, swamp and mountain', () => {
    // find seeds whose third die is each table value
    for (let value = 1; value <= 6; value++) {
      let seed = 0;
      for (let s = 1; s < 200000 && !seed; s++) {
        let st = rngFromSeed(s);
        const a = d6(st); st = a.state;
        const b = d6(st); st = b.state;
        const c = d6(st);
        if (a.value !== 1 && a.value !== 2 && b.value !== 1 && b.value !== 2 && c.value === value) seed = s; // tries hit blank neighbours whatever the direction
      }
      const r = generateTerrain(rngFromSeed(seed), centre, lookupWith(blankAround));
      const expected = ['desert', 'mountain', 'swamp', 'jungle', 'veldt', 'lake'][value - 1];
      expect(r.result.rolls[2]).toEqual({ label: 'random terrain', value });
      expect(r.result.terrain.startsWith(expected) || r.result.terrain.endsWith(expected)).toBe(true);
      if (value === 4) {
        expect(r.result.rolls).toHaveLength(4);
        const comp = r.result.rolls[3].value;
        expect(r.result.terrain).toBe(comp === 3 ? 'jungle-swamp' : comp === 2 ? 'jungle-mountain' : 'jungle');
      }
      if (value === 2 || value === 3) {
        expect(r.result.rolls).toHaveLength(4);
        const comp = r.result.rolls[3].value;
        expect(r.result.terrain).toBe(comp === 4 ? (value === 3 ? 'jungle-swamp' : 'jungle-mountain') : expected);
      }
      if (value === 1 || value === 5 || value === 6) expect(r.result.rolls).toHaveLength(3);
    }
  });
  it('applies note A (desert beside jungle becomes veldt) and note B (jungle beside desert becomes veldt), skipping the composite roll beside desert', () => {
    const find = (value: number) => {
      for (let s = 1; s < 200000; s++) {
        let st = rngFromSeed(s);
        const a = d6(st); st = a.state;
        const b = d6(st); st = b.state;
        const c = d6(st);
        if (a.value === 6 && b.value === 6 && c.value === value) return s; // both tries point at direction 6, which we leave blank
      }
      throw new Error('no seed');
    };
    const jungleAt3 = { [neighbour(centre, 3)]: 'jungle' as Terrain };
    const desertAt3 = { [neighbour(centre, 3)]: 'desert' as Terrain };
    expect(generateTerrain(rngFromSeed(find(1)), centre, lookupWith(jungleAt3)).result.terrain).toBe('veldt');
    expect(generateTerrain(rngFromSeed(find(4)), centre, lookupWith(desertAt3)).result.terrain).toBe('veldt');
    const swampBesideDesert = generateTerrain(rngFromSeed(find(3)), centre, lookupWith(desertAt3));
    expect(swampBesideDesert.result.terrain).toBe('swamp');
    expect(swampBesideDesert.result.rolls).toHaveLength(3);
  });
  it('knows what feet can enter', () => {
    expect(passableOnFoot('veldt')).toBe(true);
    expect(passableOnFoot('mountain')).toBe(true);
    expect(passableOnFoot('lake')).toBe(false);
    expect(passableOnFoot('swamp')).toBe(false);
    expect(passableOnFoot('jungle-swamp')).toBe(false);
    expect(passableOnFoot(null)).toBe(true);
  });
});
