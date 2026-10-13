import { describe, expect, it } from 'vitest';
import { ITEM_NAMES, SAMPLES, movementOptions, mountSoldAt, outfitLike } from './outfit';
import { ITEMS, NO_PURCHASES, cost, type Chart, type Purchases } from './prices';
import { modeFor } from '$features/exploration/movement';

const chart = (p: Partial<Purchases>, water = 0): Chart => ({ ...NO_PURCHASES, ...p, water, guideHomes: {} });

describe('how the expedition can move (rules §5, §7.1)', () => {
  it('names every item of the price list', () => {
    for (const item of ITEMS) expect(ITEM_NAMES[item]).toBeTruthy();
  });
  it('an explorer alone walks: nothing to carry, no canoe, no mount', () => {
    const m = movementOptions(chart({}));
    expect(m).toMatchObject({ people: 1, load: 0, overlandCarry: 0, overland: true, canoeHexes: 0, canoeSeats: false, portage: false, mountedCarry: null, mounted: false });
  });
  it('the foot sample walks: 17 bearers carry 170 of 161', () => {
    const m = movementOptions(chart(SAMPLES.foot));
    expect(m).toMatchObject({ people: 28, load: 161, overlandCarry: 170, overland: true, canoeHexes: 0, portage: true, mounted: false });
  });
  it('the canoe sample paddles four hexes with eight bearers a canoe, can portage, and cannot walk with its canoes on its shoulders', () => {
    const m = movementOptions(chart(SAMPLES.canoe));
    expect(m).toMatchObject({ people: 24, load: 179, overlandCarry: 0, overland: false, canoeHexes: 4, canoeSeats: true, portage: true, mountedCarry: null, mounted: false });
  });
  it('canoe speed falls with the paddlers: 3 hexes with four to seven, 2 with two or three, 1 with one, 1 drifting', () => {
    expect(movementOptions(chart({ canoes: 2, bearers: 14 })).canoeHexes).toBe(3);
    expect(movementOptions(chart({ canoes: 2, bearers: 5 })).canoeHexes).toBe(2);
    expect(movementOptions(chart({ canoes: 2, bearers: 2 })).canoeHexes).toBe(1);
    expect(movementOptions(chart({ canoes: 1, bearers: 0 })).canoeHexes).toBe(1);
    expect(movementOptions(chart({ canoes: 1, bearers: 7 })).portage).toBe(false);
    expect(movementOptions(chart({ canoes: 1, bearers: 8 })).portage).toBe(true);
  });
  it('canoes need a seat for everyone: 24 in two canoes, not 25', () => {
    expect(movementOptions(chart({ canoes: 2, bearers: 16, askaris: 7 })).canoeSeats).toBe(true);
    expect(movementOptions(chart({ canoes: 2, bearers: 16, askaris: 8 })).canoeSeats).toBe(false);
  });
  it('a canoe takes eight bearers from the loads overland: with nine bearers one carries ten', () => {
    expect(movementOptions(chart({ canoes: 1, bearers: 9, food: 10 })).overland).toBe(true);
    expect(movementOptions(chart({ canoes: 1, bearers: 9, food: 11 })).overland).toBe(false);
    expect(movementOptions(chart({ canoes: 1, bearers: 7 })).overlandCarry).toBeNull();
  });
  it('the mounted sample rides: eleven horses for eight people, the riders carrying five each and the two bearers leading three spare horses with twenty', () => {
    const m = movementOptions(chart(SAMPLES.mounted));
    expect(m).toMatchObject({ people: 8, load: 71, mountedCarry: 8 * 5 + 3 * 20, mounted: true, overlandCarry: 145, overland: true });
    expect(modeFor(chart(SAMPLES.mounted), false)).toBe('mounted');
  });
  it('mounted needs a mount for everyone, loads within what riders and led animals carry, and no canoes to shoulder', () => {
    expect(movementOptions(chart({ horses: 4, askaris: 4 })).mountedCarry).toBeNull();
    expect(movementOptions(chart({ horses: 5, askaris: 4, food: 25 })).mounted).toBe(true);
    expect(movementOptions(chart({ horses: 5, askaris: 4, food: 26 })).mounted).toBe(false);
    expect(modeFor(chart({ horses: 5, askaris: 4, food: 26 }), false)).toBe('foot');
    expect(movementOptions(chart({ horses: 8, bearers: 1, food: 30 })).mountedCarry).toBe(2 * 5 + 3 * 20); // six spare horses, one bearer leads three
    expect(movementOptions(chart({ horses: 2, canoes: 1 })).mounted).toBe(false);
  });
  it('water weighs four', () => {
    expect(movementOptions(chart({ bearers: 1, food: 2 }, 2)).load).toBe(10);
  });
});

describe('spending a budget like a sample expedition', () => {
  it('sells horses at the Cape ports, camels at Khartoum, no mount elsewhere', () => {
    expect(mountSoldAt('port-elizabeth')).toBe('horses');
    expect(mountSoldAt('khartoum')).toBe('camels');
    expect(mountSoldAt('mombasa')).toBeNull();
  });
  it('reproduces the samples at $1000; the mounted sample\'s forfeited $30 goes on rations and gifts', () => {
    expect(outfitLike('canoe', 1000, 'mombasa')).toEqual(SAMPLES.canoe);
    expect(outfitLike('foot', 1000, 'mombasa')).toEqual(SAMPLES.foot);
    expect(outfitLike('mounted', 1000, 'durban')).toEqual({ ...SAMPLES.mounted, food: 61, gifts: 24 });
  });
  it('rides camels at Khartoum and offers no mounted outfit where nothing is sold', () => {
    const p = outfitLike('mounted', 1000, 'khartoum');
    expect(p).toEqual({ ...SAMPLES.mounted, horses: 0, camels: 11, food: 61, gifts: 24 });
    expect(outfitLike('mounted', 1000, 'mombasa')).toEqual(NO_PURCHASES);
  });
  it('spends $1100 at Port Elizabeth on each outfit, keeping its way of moving', () => {
    // Two canoes seat 24, so the extra $100 cannot hire a seventeenth bearer, nor a third canoe with the eight paddlers it would need.
    const canoe = outfitLike('canoe', 1100, 'port-elizabeth');
    expect(canoe).toEqual({ ...NO_PURCHASES, canoes: 2, bearers: 16, guides: 1, askaris: 6, muskets: 5, gifts: 63, food: 157 });
    expect(cost(canoe)).toBe(1100);
    expect(movementOptions(chart(canoe))).toMatchObject({ canoeHexes: 4, canoeSeats: true, portage: true, overland: false });
    const mounted = outfitLike('mounted', 1100, 'port-elizabeth');
    expect(mounted).toEqual({ ...NO_PURCHASES, horses: 13, askaris: 4, guides: 1, bearers: 2, muskets: 1, gifts: 24, food: 61 });
    expect(cost(mounted)).toBe(1100);
    expect(movementOptions(chart(mounted))).toMatchObject({ people: 8, load: 86, mountedCarry: 8 * 5 + 5 * 20, mounted: true });
    const foot = outfitLike('foot', 1100, 'port-elizabeth');
    expect(foot).toEqual({ ...NO_PURCHASES, guides: 1, bearers: 18, askaris: 10, muskets: 1, gifts: 22, food: 157 });
    expect(cost(foot)).toBe(1098);
    expect(movementOptions(chart(foot))).toMatchObject({ people: 30, load: 180, overlandCarry: 180, overland: true });
  });
  it('keeps the mode at every budget from $200 to $3000 and leaves little unspent', () => {
    for (let budget = 200; budget <= 3000; budget += 50) {
      const canoe = outfitLike('canoe', budget, 'mombasa');
      const mc = movementOptions(chart(canoe));
      expect(canoe.canoes, `canoe at $${budget}`).toBeGreaterThan(0);
      expect(mc.canoeHexes, `canoe at $${budget}`).toBe(4);
      expect(mc.canoeSeats, `canoe at $${budget}`).toBe(true);
      expect(budget - cost(canoe), `canoe at $${budget}`).toBeLessThan(2);
      const foot = outfitLike('foot', budget, 'mombasa');
      expect(movementOptions(chart(foot)).overland, `foot at $${budget}`).toBe(true);
      expect(budget - cost(foot), `foot at $${budget}`).toBeLessThan(10);
      const mounted = outfitLike('mounted', budget, 'capetown');
      expect(movementOptions(chart(mounted)).mounted, `mounted at $${budget}`).toBe(true);
      expect(budget - cost(mounted), `mounted at $${budget}`).toBeLessThan(50);
    }
  });
});
