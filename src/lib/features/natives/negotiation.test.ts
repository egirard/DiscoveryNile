import { describe, expect, it } from 'vitest';
import { rngScripted } from '$lib/game/random';
import { attemptPoison, giveEverything, offerGifts, tradeGoods, tradePrices } from './negotiation';

const rng = (combat: number[]) => rngScripted(1, { combat });

describe('negotiation (rules §8.5)', () => {
  it('gifts times the larger die against the warriors', () => {
    expect(offerGifts(rng([3, 6]), 2, 12)).toMatchObject({ satisfied: true, summary: '2 gifts offered: the larger die 6 × 2 = 12, reaching 12 warriors: the chief is satisfied' });
    expect(offerGifts(rng([5, 5]), 2, 12)).toMatchObject({ satisfied: false });
    expect(offerGifts(rng([6, 6]), 0, 1)).toMatchObject({ satisfied: false });
  });
  it('giving everything returns three dice of gifts', () => {
    expect(giveEverything(rng([6, 6, 6]))).toMatchObject({ gifts: 18 });
  });
  it('poison kills on 1–2, is survived on 3 with a bonus, fails above', () => {
    expect(attemptPoison(rng([2]), 0).result).toBe('dies');
    expect(attemptPoison(rng([3]), 0).result).toBe('recovers');
    expect(attemptPoison(rng([2]), 1).result).toBe('recovers');
    expect(attemptPoison(rng([4]), 0).result).toBe('fails');
  });
  it('prices roll a die per item for sale, animals in the desert and canoes on water', () => {
    expect(tradeGoods({ desert: false, water: false })).toEqual(['food', 'bearers', 'guides', 'askaris']);
    expect(tradeGoods({ desert: true, water: true })).toEqual(['camels', 'horses', 'canoes', 'food', 'bearers', 'guides', 'askaris']);
    const p = tradePrices(rng([3, 2, 4, 1]), { desert: false, water: false });
    expect(p.prices).toEqual({ food: 3, bearers: 2, guides: 4, askaris: 1 });
    expect(p.rolls).toHaveLength(4);
  });
});
