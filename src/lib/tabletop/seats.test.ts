import { describe, expect, it } from 'vitest';
import { DEFAULT_LAYOUT, parseSeatId, positionAlongEdge, rotationFor, seatsFor } from './seats';

describe('seatsFor', () => {
  it('yields one seat per edge for the default layout, bottom first', () => {
    expect(seatsFor(DEFAULT_LAYOUT).map((s) => s.id)).toEqual(['bottom-1', 'right-1', 'top-1', 'left-1']);
  });
  it('supports several seats on one edge and none on another', () => {
    const ids = seatsFor({ bottom: 2, top: 2, left: 0, right: 1 }).map((s) => s.id);
    expect(ids).toEqual(['bottom-1', 'bottom-2', 'right-1', 'top-1', 'top-2']);
  });
});

describe('parseSeatId', () => {
  it('parses a valid id', () => expect(parseSeatId('left-2')).toMatchObject({ edge: 'left', index: 2 }));
  it('rejects garbage', () => {
    expect(parseSeatId('middle-1')).toBeNull();
    expect(parseSeatId('bottom-0')).toBeNull();
    expect(parseSeatId('bottom')).toBeNull();
  });
});

describe('rotationFor', () => {
  it('leaves the bottom upright and turns the top around', () => {
    expect(rotationFor('bottom')).toBe(0);
    expect(rotationFor('top')).toBe(180);
    expect(rotationFor('left')).toBe(90);
    expect(rotationFor('right')).toBe(270);
  });
});

describe('positionAlongEdge', () => {
  it('centres a lone seat and spreads two seats at quarter points', () => {
    expect(positionAlongEdge({ id: 'bottom-1', edge: 'bottom', index: 1, count: 1 })).toBe(0.5);
    expect(positionAlongEdge({ id: 'bottom-1', edge: 'bottom', index: 1, count: 2 })).toBe(0.25);
    expect(positionAlongEdge({ id: 'bottom-2', edge: 'bottom', index: 2, count: 2 })).toBe(0.75);
  });
});
