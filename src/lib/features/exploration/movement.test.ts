import { describe, expect, it } from 'vitest';
import { NO_PURCHASES, type Chart } from '$features/expedition/prices';
import { budgetFor, canEnter, canoeRate, coastal, modeFor, passable } from './movement';

const chart = (p: Partial<Chart>): Chart => ({ ...NO_PURCHASES, water: 0, guideHomes: {}, ...p });

describe('movement rates (rules §7.1)', () => {
  it('foot: two known hexes or one unknown', () => {
    expect(budgetFor('foot', chart({}))).toMatchObject({ points: 2, unknownCost: 2 });
  });
  it('mounted: four known, or two known and one unknown, or two unknown', () => {
    expect(budgetFor('mounted', chart({ horses: 4 }))).toMatchObject({ points: 4, unknownCost: 2 });
  });
  it('canoe speed by paddlers per canoe', () => {
    expect(canoeRate(8)).toEqual({ known: 4, unknown: 2 });
    expect(canoeRate(7)).toEqual({ known: 3, unknown: 1 });
    expect(canoeRate(3)).toEqual({ known: 2, unknown: 1 });
    expect(canoeRate(1)).toEqual({ known: 1, unknown: 1 });
    expect(canoeRate(0)).toEqual({ known: 1, unknown: 0 });
    expect(budgetFor('canoe', chart({ canoes: 2, bearers: 16 }))).toMatchObject({ points: 4, unknownCost: 2 });
    expect(budgetFor('canoe', chart({ canoes: 2, bearers: 9 }))).toMatchObject({ points: 3, unknownCost: 3 });
    expect(budgetFor('canoe', chart({ canoes: 1, bearers: 0 })).unknownCost).toBe(Infinity);
  });
});

describe('passability', () => {
  it('feet avoid water; horses avoid water; camels also avoid jungle; canoes avoid jungle-swamp', () => {
    expect(passable('foot', 'lake', chart({}))).toBe(false);
    expect(passable('foot', 'jungle', chart({}))).toBe(true);
    expect(passable('mounted', 'swamp', chart({ horses: 2 }))).toBe(false);
    expect(passable('mounted', 'jungle', chart({ horses: 2 }))).toBe(true);
    expect(passable('mounted', 'jungle', chart({ camels: 2 }))).toBe(false);
    expect(passable('mounted', 'jungle-mountain', chart({ camels: 2 }))).toBe(false);
    expect(passable('canoe', 'jungle-swamp', chart({ canoes: 1 }))).toBe(false);
    expect(passable('canoe', 'swamp', chart({ canoes: 1 }))).toBe(true);
    expect(passable('canoe', null, chart({ canoes: 1 }))).toBe(true);
  });
  it('knows the coast', () => {
    expect(coastal('c25r12')).toBe(true); // Mombasa
    expect(coastal('c12r12')).toBe(false);
  });
});

describe('mode of travel', () => {
  it('rides when every man has a mount and the loads are carried', () => {
    expect(modeFor(chart({ horses: 11, askaris: 4, guides: 1, bearers: 2, muskets: 1, gifts: 20, food: 50 }), false)).toBe('mounted');
    expect(modeFor(chart({ horses: 2, askaris: 4 }), false)).toBe('foot');
  });
  it('paddles when the canoes seat everyone and the move is on water, else walks', () => {
    const canoes = chart({ canoes: 2, bearers: 16, guides: 1, askaris: 6, gifts: 50, food: 125 });
    expect(modeFor(canoes, true)).toBe('canoe');
    expect(modeFor(canoes, false)).toBe('foot');
    expect(modeFor(chart({ canoes: 1, bearers: 16, askaris: 6 }), true)).toBe('foot'); // 24 men, 12 seats
  });
});

describe('the ocean shore (RQ-17, prompt 32)', () => {
  const chart = { canoes: 2, bearers: 16, guides: 0, askaris: 0, muskets: 0, gifts: 0, food: 0, horses: 0, camels: 0, water: 0 } as unknown as Parameters<typeof canEnter>[2];
  it('canoes always traverse a coastal hex, jungle-swamp included, but never an inland jungle-swamp', () => {
    expect(canEnter('canoe', 'jungle-swamp', chart, 'c20r25')).toBe(true); // the Zambezi delta west of Quilimane
    expect(canEnter('canoe', 'jungle-swamp', chart, 'c3r8')).toBe(true); // the Niger's delta beside Brass
    expect(canEnter('canoe', 'jungle-swamp', chart, 'c12r12')).toBe(false); // an inland jungle-swamp
    expect(canEnter('foot', 'jungle-swamp', chart, 'c20r25')).toBe(false); // men on foot still cannot
    expect(canEnter('canoe', 'veldt', chart, 'c21r24')).toBe(true);
  });
});
