import { describe, expect, it } from 'vitest';
import { mmPerPx, pxFor, screenGeometry } from './screen';

describe('mmPerPx', () => {
  it('gives about 0.63 mm/px for a 55" 1080p screen', () => {
    expect(mmPerPx(55, 1920, 1080)).toBeCloseTo(0.634, 2);
  });
  it('gives about 0.31 mm/px for a 27" 1080p screen', () => {
    expect(mmPerPx(27, 1920, 1080)).toBeCloseTo(0.311, 2);
  });
});

describe('pxFor', () => {
  it('sizes a 12 mm target at 27" above the 44 px floor', () => {
    expect(pxFor(12, mmPerPx(27, 1920, 1080))).toBeGreaterThanOrEqual(44);
  });
  it('never goes below the floor', () => expect(pxFor(1, 1)).toBe(44));
});

describe('screenGeometry', () => {
  it('reports a 55" 16:9 screen as roughly 1218 × 685 mm', () => {
    const g = screenGeometry(55, 1920, 1080);
    expect(g.widthMm).toBeCloseTo(1218, 0);
    expect(g.heightMm).toBeCloseTo(685, 0);
  });
});
