import { describe, expect, it } from 'vitest';
import { terrainPoints } from './scoring';

describe('terrainPoints (rules §12)', () => {
  it('scores the basic terrains', () => {
    expect(terrainPoints('desert')).toBe(1);
    expect(terrainPoints('veldt')).toBe(1);
    expect(terrainPoints('lake')).toBe(1);
    expect(terrainPoints('jungle')).toBe(2);
    expect(terrainPoints('swamp')).toBe(2);
  });
  it('scores mountains at nothing on their own (RQ-14)', () => {
    expect(terrainPoints('mountain')).toBe(0);
  });
  it('adds the categories of composite terrain', () => {
    expect(terrainPoints('jungle-swamp')).toBe(4);
    expect(terrainPoints('jungle-mountain')).toBe(2);
  });
  it('adds one for a river and two for an oasis', () => {
    expect(terrainPoints('veldt', { river: true })).toBe(2);
    expect(terrainPoints('desert', { oasis: true })).toBe(3);
    expect(terrainPoints('desert', { river: true, oasis: true })).toBe(4);
  });
  it('scores a blank hex at nothing', () => {
    expect(terrainPoints(null)).toBe(0);
  });
});
