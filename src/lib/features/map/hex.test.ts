import { describe, expect, it } from 'vitest';
import { DIRECTIONS, directionTo, distance, hexId, hexPoints, neighbour, neighbours, opposite, parseHexId, toPixel } from './hex';

describe('hex ids', () => {
  it('round-trip through parse', () => {
    expect(parseHexId(hexId(12, 7))).toEqual({ col: 12, row: 7 });
    expect(parseHexId('c0r0')).toEqual({ col: 0, row: 0 });
    expect(parseHexId('12,7')).toBeNull();
    expect(parseHexId('c-1r2')).toBeNull();
  });
});

describe('neighbour (odd-r, directions 1–6 clockwise from north-east)', () => {
  it('on an even row', () => {
    expect(DIRECTIONS.map((d) => neighbour('c5r4', d))).toEqual(['c5r3', 'c6r4', 'c5r5', 'c4r5', 'c4r4', 'c4r3']);
  });
  it('on an odd row (shifted half a hex right)', () => {
    expect(DIRECTIONS.map((d) => neighbour('c5r5', d))).toEqual(['c6r4', 'c6r5', 'c6r6', 'c5r6', 'c4r5', 'c5r4']);
  });
  it('is symmetric: the neighbour in d sees us in the opposite direction', () => {
    for (const id of ['c5r4', 'c5r5', 'c2r2', 'c20r1'] as const) {
      for (const d of DIRECTIONS) {
        const n = neighbour(id, d);
        expect(neighbour(n, opposite(d))).toBe(id);
        expect(directionTo(id, n)).toBe(d);
      }
    }
  });
  it('lists six distinct neighbours and no direction to a non-adjacent hex', () => {
    expect(new Set(neighbours('c7r7')).size).toBe(6);
    expect(directionTo('c7r7', 'c9r7')).toBeNull();
    expect(directionTo('c7r7', 'c7r7')).toBeNull();
  });
  it('opposite pairs 1↔4, 2↔5, 3↔6', () => {
    expect(DIRECTIONS.map(opposite)).toEqual([4, 5, 6, 1, 2, 3]);
  });
});

describe('distance', () => {
  it('is zero to itself and one to every neighbour', () => {
    expect(distance('c3r3', 'c3r3')).toBe(0);
    for (const n of neighbours('c3r3')) expect(distance('c3r3', n)).toBe(1);
    for (const n of neighbours('c3r4')) expect(distance('c3r4', n)).toBe(1);
  });
  it('counts steps along a row and down the grid', () => {
    expect(distance('c2r8', 'c6r8')).toBe(4);
    expect(distance('c20r1', 'c20r5')).toBe(4);
    expect(distance('c20r1', 'c18r6')).toBe(5); // Khartoum to the Sudd along the White Nile
  });
});

describe('pixel layout', () => {
  it('places odd rows half a hex to the right and rows 1.5R apart', () => {
    const r = 10;
    expect(toPixel({ col: 0, row: 0 }, r)).toEqual({ x: 0, y: 0 });
    expect(toPixel({ col: 1, row: 0 }, r).x).toBeCloseTo(Math.sqrt(3) * r);
    expect(toPixel({ col: 0, row: 1 }, r)).toEqual({ x: (Math.sqrt(3) * r) / 2, y: 15 });
    expect(toPixel({ col: 0, row: 2 }, r)).toEqual({ x: 0, y: 30 });
  });
  it('draws a pointy-top hexagon with a vertex straight up', () => {
    const pts = hexPoints(0, 0, 10).split(' ').map((p) => p.split(',').map(Number));
    expect(pts).toHaveLength(6);
    const top = pts.reduce((a, b) => (b[1] < a[1] ? b : a));
    expect(top[0]).toBeCloseTo(0, 1);
    expect(top[1]).toBeCloseTo(-10, 1);
  });
});
