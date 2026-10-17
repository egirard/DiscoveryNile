// How the board is drawn, shared by the table's board (HexBoard) and the map editor (PROMPTS.md, prompt 52) so both
// show the same map: the terrain symbols each terrain draws, the window of the grid that is shown (the land's
// bounding box, no sea around it), a river's line with its reach into the sea, the hatch across a river at a
// cataract, where a port's mark sits in its hex, and where the names and drainage numbers go. Pure geometry; the
// lengths are in units of the hex radius unless a radius is passed.
import { DIRECTIONS, neighbour, toPixel, type HexId } from './hex';
import { seaward, type RawBoard, type RawRiver } from './editor';

export interface Pt {
  x: number;
  y: number;
}

/** The symbols each terrain draws (TerrainSymbols.svelte); desert and lake are a fill alone. */
export const SYMBOLS: Record<string, string[]> = {
  desert: [],
  veldt: ['veldt'],
  swamp: ['swamp'],
  mountain: ['mountain'],
  jungle: ['jungle'],
  lake: [],
  'jungle-swamp': ['jungle', 'swamp'],
  'jungle-mountain': ['jungle', 'mountain']
};

const SQ3 = Math.sqrt(3);

export interface Extents {
  minCol: number;
  maxCol: number;
  minRow: number;
  maxRow: number;
  /** The pixel box of those hexes at radius 1, for `centreIn`. */
  minX: number;
  minY: number;
  w: number;
  h: number;
}

/** The window of the grid that is shown: the bounding box of the land, in rows and columns and in pixels at radius 1. */
export function extentsOf(hexes: Iterable<{ col: number; row: number }>): Extents {
  let minCol = Infinity, maxCol = -Infinity, minRow = Infinity, maxRow = -Infinity;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const h of hexes) {
    minCol = Math.min(minCol, h.col);
    maxCol = Math.max(maxCol, h.col);
    minRow = Math.min(minRow, h.row);
    maxRow = Math.max(maxRow, h.row);
    const { x, y } = toPixel(h, 1);
    minX = Math.min(minX, x - SQ3 / 2);
    maxX = Math.max(maxX, x + SQ3 / 2);
    minY = Math.min(minY, y - 1);
    maxY = Math.max(maxY, y + 1);
  }
  return { minCol, maxCol, minRow, maxRow, minX, minY, w: maxX - minX, h: maxY - minY };
}

/** The centre of a hex in the window, in pixels. */
export function centreIn(e: Extents, radius: number, at: { col: number; row: number }): Pt {
  const p = toPixel(at, radius);
  return { x: p.x - e.minX * radius, y: p.y - e.minY * radius };
}

/** Where direction `d` leaves a pointy-top hex: east is 2, so the angle is (d − 2) × 60° clockwise from east. */
export const bearing = (d: number) => ((d - 2) * Math.PI) / 3;

/** Unit vector from a hex centre toward the midpoint of the edge in direction d. */
export const EDGE: Record<number, [number, number]> = { 1: [0.5, -0.866], 2: [1, 0], 3: [0.5, 0.866], 4: [-0.5, 0.866], 5: [-1, 0], 6: [-0.5, -0.866] };

export const pointsOf = (pts: Pt[]) => pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

/** How far past the mouth a river reaches into the sea, and past its last hex off the map, in radii. */
const REACH = 0.95;

function beyond(from: Pt, toward: Pt, radius: number): Pt {
  const dx = toward.x - from.x, dy = toward.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: from.x + (dx / len) * radius * REACH, y: from.y + (dy / len) * radius * REACH };
}

/** A river as points through its hex centres: reaching into the sea at its mouth the way it leaves (named, or straight on
 *  when the sea lies there), and off the map past its last hex when it continues. */
export function riverLine(board: RawBoard, r: RawRiver, centre: (id: string) => Pt, radius: number): Pt[] {
  const pts = r.path.map(centre);
  const out = seaward(board, r);
  if (out !== null && pts.length) pts.unshift(beyond(pts[0], centre(neighbour(r.path[0] as HexId, out)), radius));
  if (r.continuesOffMap && pts.length > 1) {
    const e = pts[pts.length - 1], p = pts[pts.length - 2];
    pts.push(beyond(e, { x: 2 * e.x - p.x, y: 2 * e.y - p.y }, radius));
  }
  return pts;
}

/** Half the length of the hatch across a river at a cataract, in radii. */
export const HATCH = 0.36;

/** The hatch across a course at a cataract (prompt 52): the unit vector perpendicular to the course through the hex, read
 *  from the points before and after it (one of them missing at an end of the course). */
export function hatchAcross(prev: Pt | null, cur: Pt, next: Pt | null): Pt {
  let dx = 0, dy = 0;
  if (prev && next) (dx = next.x - prev.x), (dy = next.y - prev.y);
  else if (next) (dx = next.x - cur.x), (dy = next.y - cur.y);
  else if (prev) (dx = cur.x - prev.x), (dy = cur.y - prev.y);
  const len = Math.hypot(dx, dy);
  return len ? { x: -dy / len, y: dx / len } : { x: 1, y: 0 };
}

/** The hatch across river `r` at its cataract hex `id`: the course runs from the hex before (or the sea at the mouth) to the hex after. */
export function cataractHatch(board: RawBoard, r: RawRiver, id: string, centre: (id: string) => Pt): Pt {
  const i = r.path.indexOf(id);
  const c = centre(id);
  if (i < 0) return { x: 1, y: 0 };
  const out = i === 0 ? seaward(board, r) : null;
  const prev = i > 0 ? centre(r.path[i - 1]) : out !== null ? centre(neighbour(id as HexId, out)) : null;
  const next = i < r.path.length - 1 ? centre(r.path[i + 1]) : null;
  return hatchAcross(prev, c, next);
}

/** Where the drainage number sits: just seaward of the mouth, off to one side of the river's reach. */
export function mouthLabelAt(board: RawBoard, r: RawRiver, centre: (id: string) => Pt, radius: number): Pt {
  const m = centre(r.path[0]);
  const out = seaward(board, r);
  let dx = 0, dy = -1;
  if (out !== null) {
    const sea = centre(neighbour(r.path[0] as HexId, out));
    (dx = sea.x - m.x), (dy = sea.y - m.y);
  } else if (r.path.length > 1) {
    const p = centre(r.path[1]);
    (dx = m.x - p.x), (dy = m.y - p.y);
  }
  const len = Math.hypot(dx, dy) || 1;
  return { x: m.x + (dx / len) * radius * 1.15 + (dy / len) * radius * 0.9, y: m.y + (dy / len) * radius * 1.15 - (dx / len) * radius * 0.9 };
}

/** A river's name goes on the seaward side of its drainage number (screen x is map y when the board is turned), clear of
 *  it whatever its width: a bold digit at that size is about 0.48 of a radius wide. */
export function nameSide(r: RawRiver, mouth: Pt, label: Pt, radius: number, rotated: boolean): { x: number; anchor: 'start' | 'end' } {
  const seawardOf = rotated ? label.y - mouth.y : label.x - mouth.x;
  const clear = radius * (0.24 * String(r.drainage ?? '').length + 0.3);
  return seawardOf < 0 ? { x: -clear, anchor: 'end' } : { x: clear, anchor: 'start' };
}

/** Where each port's name sits, in the upright (screen) frame and radius units: in the water off the coast and level with
 *  the port where the coast allows, above the east coast (the sea is up when north is to the left), south of Khartoum
 *  (the Nile's name has the north), south of Port Elizabeth, at Calabar's south-west corner. A port not named here is
 *  labelled above. */
export const PORT_LABELS: Record<string, { dx: number; dy: number; anchor: 'start' | 'middle' | 'end' }> = {
  khartoum: { dx: 1.05, dy: 0, anchor: 'start' },
  mombasa: { dx: 0, dy: -1.05, anchor: 'middle' },
  zanzibar: { dx: 0.3, dy: -1.05, anchor: 'start' },
  kilwa: { dx: 0, dy: -1.05, anchor: 'middle' },
  quilimane: { dx: 0, dy: -1.05, anchor: 'middle' },
  'lourenco-marques': { dx: 0, dy: -1.5, anchor: 'middle' }, // clear of the Limpopo's name at the same mouth
  durban: { dx: 0, dy: -1.05, anchor: 'middle' },
  'port-elizabeth': { dx: 1.05, dy: 0, anchor: 'start' },
  capetown: { dx: 1.05, dy: 0, anchor: 'start' },
  benguela: { dx: 0.3, dy: 1.35, anchor: 'start' }, // the two names lean apart
  luanda: { dx: -0.3, dy: 1.35, anchor: 'end' },
  calabar: { dx: 0.7, dy: 1.15, anchor: 'start' },
  brass: { dx: 0, dy: 1.35, anchor: 'middle' }
};
export const portLabel = (id: string) => PORT_LABELS[id] ?? { dx: 0, dy: -1.05, anchor: 'middle' as const };

/** Half the side of a port's mark, in radii. */
export const MARK = 0.22;

export interface Anchor {
  /** The offset from the hex centre, in radii. */
  dx: number;
  dy: number;
  /** The direction the mark sits toward: 1–6 for half-way to that edge, n.5 for half-way to the vertex clockwise after n. */
  at: number;
}

/** The twelve places a mark can sit: half-way to each edge (√3/4 of a radius out) and to each vertex (half a radius). */
const ANCHORS: Anchor[] = DIRECTIONS.flatMap((d) => [
  { dx: Math.cos(bearing(d)) * (SQ3 / 4), dy: Math.sin(bearing(d)) * (SQ3 / 4), at: d },
  { dx: Math.cos(bearing(d) + Math.PI / 6) * 0.5, dy: Math.sin(bearing(d) + Math.PI / 6) * 0.5, at: d + 0.5 }
]);
const angleOf = (p: Pt) => Math.atan2(p.y, p.x);
const angleAt = (a: Anchor) => Math.atan2(a.dy, a.dx);
const apart = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

/** Where a port's mark sits in its hex (prompt 52): half-way from the centre to an edge or a vertex, so the terrain symbol
 *  in the middle stays readable; on the seaward side (the mean of the directions the sea lies in), and clear of any river
 *  through the hex by 45° or more. The nearer place (an edge) wins a tie, then the lower direction. */
export function portAnchor(board: RawBoard, hex: HexId): Anchor {
  const sea = DIRECTIONS.filter((d) => !board.hexes[neighbour(hex, d)]);
  const rivers: number[] = [];
  for (const r of board.rivers) {
    const i = r.path.indexOf(hex);
    if (i < 0) continue;
    if (i > 0) rivers.push(bearingTo(hex, r.path[i - 1]));
    if (i < r.path.length - 1) rivers.push(bearingTo(hex, r.path[i + 1]));
    const out = i === 0 ? seaward(board, r) : null;
    if (out !== null) rivers.push(bearing(out));
  }
  let clear = ANCHORS.filter((a) => rivers.every((b) => apart(angleAt(a), b) >= Math.PI / 4 - 1e-9));
  if (!clear.length) clear = ANCHORS;
  const towards = (ds: number[]) => ds.reduce((p, d) => ({ x: p.x + Math.cos(bearing(d)), y: p.y + Math.sin(bearing(d)) }), { x: 0, y: 0 });
  let target = towards(sea);
  if (Math.hypot(target.x, target.y) < 1e-9) target = towards(DIRECTIONS.filter((d) => !rivers.some((b) => apart(bearing(d), b) < 1e-9)));
  if (Math.hypot(target.x, target.y) < 1e-9) target = { x: 0, y: -1 };
  const t = angleOf(target);
  const score = (a: Anchor) => Math.cos(apart(angleAt(a), t));
  return clear.reduce((best, a) => {
    const d = score(a) - score(best);
    if (d > 1e-9) return a;
    if (d < -1e-9) return best;
    const nearer = Math.hypot(a.dx, a.dy) - Math.hypot(best.dx, best.dy);
    return nearer < -1e-9 || (Math.abs(nearer) <= 1e-9 && a.at < best.at) ? a : best;
  });
}

function bearingTo(from: HexId, to: string): number {
  const d = DIRECTIONS.find((d) => neighbour(from, d) === to);
  if (d === undefined) throw new Error(`${to} is not beside ${from}`);
  return bearing(d);
}
