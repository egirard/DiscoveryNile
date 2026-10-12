import { describe, expect, it } from 'vitest';
import { NO_PURCHASES, type Chart } from '$features/expedition/prices';
import { NO_SICKNESS } from '$lib/game/state';
import { rngScripted } from '$lib/game/random';
import { drink, dryDesert, feed, hunt, huntingModifiers, rationsPerHunter, waterPerTurn, type Camp } from './rations';

const chart = (p: Partial<Chart>): Chart => ({ ...NO_PURCHASES, water: 0, guideHomes: {}, ...p });
const veldt: Camp = { terrain: 'veldt', river: false, oasis: false };
const FOOT = chart({ askaris: 5, bearers: 15, food: 100 });

describe('hunting (rules §11, RQ-7)', () => {
  it('modifies the die by terrain, composites adding their parts, river or oasis once', () => {
    expect(huntingModifiers(veldt)).toEqual([]);
    expect(huntingModifiers({ terrain: 'desert', river: false, oasis: true })).toEqual([{ label: 'desert', value: -4 }, { label: 'oasis', value: 2 }]);
    expect(huntingModifiers({ terrain: 'jungle-swamp', river: true, oasis: false })).toEqual([{ label: 'swamp', value: -1 }, { label: 'jungle', value: 1 }, { label: 'river', value: 2 }]);
    expect(huntingModifiers({ terrain: 'lake', river: false, oasis: false })).toEqual([{ label: 'lake', value: -3 }]);
  });
  it('yields 0, 1, 2 or 3 rations per hunter by the modified total', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7].map(rationsPerHunter)).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
  });
  it('rolls one die on the hunting stream and applies it to the explorer and every askari; a zoologist adds one for himself', () => {
    const r = hunt(rngScripted(1, { hunting: [4] }), veldt, 5, false);
    expect(r.result).toEqual({ rolls: [{ label: 'hunting', value: 4 }], modifiers: [], total: 4, game: 12 });
    const zoo = hunt(rngScripted(1, { hunting: [5] }), veldt, 5, true);
    expect(zoo.result.game).toBe(2 * 5 + 3);
    const desert = hunt(rngScripted(1, { hunting: [6] }), { terrain: 'desert', river: false, oasis: false }, 2, false);
    expect(desert.result).toMatchObject({ total: 2, game: 3 });
  });
});

describe('the meal', () => {
  it('feeds the men from the game first, then the stores; surplus game is wasted', () => {
    const m = feed(FOOT, NO_SICKNESS, veldt, 12);
    expect(m).toMatchObject({ men: 21, fromGame: 12, fromStore: 9, hungryMen: 0 });
    expect(m.chart.food).toBe(91);
    expect(m.summary).toBe('12 rations bagged, 21 men ate (9 from the stores)');
    expect(feed(FOOT, NO_SICKNESS, veldt, 40).chart.food).toBe(100);
  });
  it('horses eat four rations each in the desert', () => {
    const mounted = chart({ horses: 3, askaris: 2, bearers: 1, food: 30 });
    const m = feed(mounted, NO_SICKNESS, { terrain: 'desert', river: false, oasis: false }, 0);
    expect(m).toMatchObject({ men: 4, forHorses: 12, hungryMen: 0, hungryHorses: 0 });
    expect(m.chart.food).toBe(14);
    expect(feed(mounted, NO_SICKNESS, veldt, 0).chart.food).toBe(26);
  });
  it('shoots horses, then camels, for ten rations each before anyone goes hungry', () => {
    const short = chart({ horses: 1, camels: 1, askaris: 4, bearers: 10, food: 3 });
    const m = feed(short, NO_SICKNESS, veldt, 0);
    expect(m.shot).toEqual({ horses: 1, camels: 1 });
    expect(m.chart).toMatchObject({ horses: 0, camels: 0, food: 23 - 15 });
    expect(m.summary).toBe('no game, 15 men ate (15 from the stores), shot for food: 1 horse and 1 camel');
    const starving = feed(chart({ askaris: 4, bearers: 10, food: 3 }), NO_SICKNESS, veldt, 0);
    expect(starving).toMatchObject({ hungryMen: 12 });
    expect(starving.chart.food).toBe(0);
    expect(starving.summary).toContain('12 men go hungry');
  });
});

describe('water in the desert (rules §5, §11)', () => {
  const dry: Camp = { terrain: 'desert', river: false, oasis: false };
  const caravan = chart({ askaris: 2, bearers: 10, camels: 3, food: 40, water: 30 });
  it('is only needed in a dry desert hex and costs one per man and four per animal', () => {
    expect(dryDesert(dry)).toBe(true);
    expect(dryDesert({ ...dry, river: true })).toBe(false);
    expect(dryDesert({ ...dry, oasis: true })).toBe(false);
    expect(dryDesert(veldt)).toBe(false);
    expect(waterPerTurn(caravan)).toBe(13 + 12);
    expect(drink(caravan, veldt)).toBeNull();
  });
  it('everyone drinks when there is enough', () => {
    const d = drink(caravan, dry)!;
    expect(d.chart.water).toBe(5);
    expect(d.died).toEqual({ guides: 0, bearers: 0, askaris: 0, horses: 0, camels: 0 });
    expect(d.summary).toBe('drank 25 water, 5 left');
  });
  it('short of water, guides then bearers then askaris go without and die; thirsty animals are shot for meat', () => {
    const d = drink({ ...caravan, water: 5 }, dry)!;
    expect(d.chart).toMatchObject({ askaris: 2, bearers: 2, camels: 0, water: 0, food: 70 });
    expect(d.died).toMatchObject({ bearers: 8, camels: 3 });
    expect(d.explorerThirsty).toBe(false);
    expect(d.summary).toBe('drank 5 water, 8 bearers died of thirst, 3 camels shot for want of water (30 rations)');
    const alone = drink({ ...caravan, water: 0 }, dry)!;
    expect(alone.explorerThirsty).toBe(true);
    expect(alone.summary).toContain('the explorer is struck down by thirst');
  });
});
