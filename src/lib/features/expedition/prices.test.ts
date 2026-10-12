import { describe, expect, it } from 'vitest';
import { availableAt, capacity, cost, NO_PURCHASES, PRICES } from './prices';

describe('price list (rules §5)', () => {
  it('matches the Expedition Price List', () => {
    expect(PRICES).toEqual({ guides: 50, bearers: 10, askaris: 50, camels: 50, horses: 50, canoes: 50, muskets: 10, food: 2, gifts: 2 });
  });
  it('sells camels only at Khartoum and horses only at the Cape ports', () => {
    expect(availableAt('camels', 'khartoum')).toBe(true);
    expect(availableAt('camels', 'mombasa')).toBe(false);
    expect(availableAt('horses', 'capetown')).toBe(true);
    expect(availableAt('horses', 'durban')).toBe(true);
    expect(availableAt('horses', 'port-elizabeth')).toBe(true);
    expect(availableAt('horses', 'khartoum')).toBe(false);
    expect(availableAt('canoes', 'khartoum')).toBe(true);
  });
  it('prices the three sample expeditions at $1000, $970 and $1000', () => {
    expect(cost({ ...NO_PURCHASES, canoes: 2, bearers: 16, guides: 1, askaris: 6, muskets: 4, gifts: 50, food: 125 })).toBe(1000);
    expect(cost({ ...NO_PURCHASES, horses: 11, askaris: 4, guides: 1, bearers: 2, muskets: 1, gifts: 20, food: 50 })).toBe(970);
    expect(cost({ ...NO_PURCHASES, guides: 1, askaris: 9, bearers: 17, muskets: 1, gifts: 20, food: 140 })).toBe(1000);
  });
});

describe('capacity', () => {
  it('counts men and loads, bearers carrying ten each', () => {
    const c = capacity({ ...NO_PURCHASES, guides: 1, askaris: 9, bearers: 17, muskets: 1, gifts: 20, food: 140, water: 0 });
    expect(c.men).toBe(28);
    expect(c.load).toBe(161);
    expect(c.carry).toBe(170);
    expect(c.onFoot).toBe(false);
  });
  it('flags an expedition that cannot carry its supplies', () => {
    const c = capacity({ ...NO_PURCHASES, bearers: 2, food: 50, water: 0 });
    expect(c.carry).toBe(20);
    expect(c.onFoot).toBe(true);
  });
  it('lets bearers lead three animals each, carrying nothing themselves, animals twenty when led', () => {
    const c = capacity({ ...NO_PURCHASES, horses: 11, askaris: 4, guides: 1, bearers: 2, muskets: 1, gifts: 20, food: 50, water: 0 });
    expect(c.handlersWanted).toBe(4);
    // two bearers lead six horses (120); five horses are ridden (25); no bearer carries
    expect(c.carry).toBe(145);
    expect(c.onFoot).toBe(false);
  });
  it('counts canoe seats and paddlers; water weighs four', () => {
    const c = capacity({ ...NO_PURCHASES, canoes: 2, bearers: 16, guides: 1, askaris: 6, muskets: 4, gifts: 50, food: 125, water: 3 });
    expect(c.canoeSeats).toBe(24);
    expect(c.paddlersWanted).toBe(16);
    expect(c.men).toBe(24);
    expect(c.load).toBe(125 + 50 + 4 + 12);
    expect(c.onFoot).toBe(false);
    expect(capacity({ ...NO_PURCHASES, canoes: 1, bearers: 0, water: 0 }).onFoot).toBe(true);
  });
});
