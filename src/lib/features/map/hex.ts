// Pointy-top hex grid with offset coordinates ("odd-r": odd rows are shifted half a hex to the
// right). Ids are `c<col>r<row>`. The six directions are numbered 1–6 clockwise from north-east,
// exactly as the board's directional indicator, so that a die roll is a direction.
//
//        6   1
//      5   ⬢   2
//        4   3

export type HexId = `c${number}r${number}`;
export type Direction = 1 | 2 | 3 | 4 | 5 | 6;
export const DIRECTIONS: readonly Direction[] = [1, 2, 3, 4, 5, 6];

export interface Offset {
  col: number;
  row: number;
}

export function hexId(col: number, row: number): HexId {
  return `c${col}r${row}`;
}

export function parseHexId(id: string): Offset | null {
  const m = /^c(\d+)r(\d+)$/.exec(id);
  return m ? { col: Number(m[1]), row: Number(m[2]) } : null;
}

// Cube coordinates make distance and rotation trivial.
interface Cube {
  q: number;
  r: number;
  s: number;
}

function toCube({ col, row }: Offset): Cube {
  const q = col - (row - (row & 1)) / 2;
  const r = row;
  return { q, r, s: -q - r };
}

function fromCube({ q, r }: Cube): Offset {
  return { col: q + (r - (r & 1)) / 2, row: r };
}

// Cube deltas per direction, 1 = NE clockwise to 6 = NW.
const DELTAS: Record<Direction, Cube> = {
  1: { q: 1, r: -1, s: 0 },
  2: { q: 1, r: 0, s: -1 },
  3: { q: 0, r: 1, s: -1 },
  4: { q: -1, r: 1, s: 0 },
  5: { q: -1, r: 0, s: 1 },
  6: { q: 0, r: -1, s: 1 }
};

/** The neighbour in a direction, whether or not it exists on the board (callers check the manifest). */
export function neighbour(id: HexId, direction: Direction): HexId {
  const o = parseHexId(id);
  if (!o) throw new Error(`bad hex id ${id}`);
  const c = toCube(o);
  const d = DELTAS[direction];
  const n = fromCube({ q: c.q + d.q, r: c.r + d.r, s: c.s + d.s });
  return hexId(n.col, n.row);
}

export function neighbours(id: HexId): HexId[] {
  return DIRECTIONS.map((d) => neighbour(id, d));
}

/** The direction from `from` to an adjacent `to`, or null if they are not adjacent. */
export function directionTo(from: HexId, to: HexId): Direction | null {
  for (const d of DIRECTIONS) if (neighbour(from, d) === to) return d;
  return null;
}

/** The opposite direction (1 ↔ 4, 2 ↔ 5, 3 ↔ 6). */
export function opposite(direction: Direction): Direction {
  return (((direction + 2) % 6) + 1) as Direction;
}

export function distance(a: HexId, b: HexId): number {
  const pa = parseHexId(a);
  const pb = parseHexId(b);
  if (!pa || !pb) throw new Error(`bad hex id ${a} or ${b}`);
  const ca = toCube(pa);
  const cb = toCube(pb);
  return Math.max(Math.abs(ca.q - cb.q), Math.abs(ca.r - cb.r), Math.abs(ca.s - cb.s));
}

/** Centre of a hex in a pointy-top layout with the given circumradius; row 0 col 0 at the origin. */
export function toPixel({ col, row }: Offset, radius: number): { x: number; y: number } {
  const w = Math.sqrt(3) * radius;
  const x = w * (col + (row & 1) * 0.5);
  const y = 1.5 * radius * row;
  return { x, y };
}

/** SVG polygon points for a pointy-top hex centred at (x, y). */
export function hexPoints(x: number, y: number, radius: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    pts.push(`${(x + radius * Math.cos(angle)).toFixed(2)},${(y + radius * Math.sin(angle)).toFixed(2)}`);
  }
  return pts.join(' ');
}
