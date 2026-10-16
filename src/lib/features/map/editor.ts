// The map editor's pure part (PROMPTS.md, prompt 47): the board as `board.json` holds it, a brush applied to a hex, the
// changes between two boards, the checks the capture server makes before it writes the file, and the file's exact text.
// The transcription from the photograph (tools/mapfit, RQ-5) misread some hexes; the editor at /editor/ corrects them by
// hand and sends the whole board to the capture server as a `save` command, which writes `board.json` in the source tree.
import type { PortId, Terrain } from './manifest';
import { DIRECTIONS, directionTo, neighbour, parseHexId, type Direction, type HexId } from './hex';

export const TERRAINS: readonly Terrain[] = ['desert', 'mountain', 'swamp', 'jungle', 'veldt', 'lake', 'jungle-swamp', 'jungle-mountain'];

/** What a hex can be painted: a terrain, blank (land to be explored) or sea (no hex at all). */
export type Brush = Terrain | 'blank' | 'sea';
export const BRUSHES: readonly Brush[] = [...TERRAINS, 'blank', 'sea'];

export interface RawHex {
  col: number;
  row: number;
  terrain: Terrain | null;
  port?: PortId;
}
export interface RawRiver {
  id: string;
  name: string;
  drainage?: number;
  offMapHexes?: number;
  joins?: string;
  continuesOffMap?: boolean;
  /** The direction the river leaves its first hex into the sea, when not straight on from its second hex (prompt 51). */
  mouth?: Direction;
  path: string[];
  cataracts: string[];
}
/** `board.json` as it is: the keys in this order. */
export interface RawBoard {
  cols: number;
  rows: number;
  hexes: Record<string, RawHex>;
  ports: Record<string, { name: string; hex: string }>;
  rivers: RawRiver[];
}

export interface HexChange {
  kind: 'hex';
  id: HexId;
  from: Brush;
  to: Brush;
}
/** A river added, removed or altered (prompt 48): what changed, in words, for the list and the log. */
export interface RiverChange {
  kind: 'river';
  id: string;
  name: string;
  summary: string;
}
export type Change = HexChange | RiverChange;

/** What a hex is on a board: its terrain, blank, or sea when it is not on the board. */
export function brushAt(board: RawBoard, id: string): Brush {
  const h = board.hexes[id];
  return h ? (h.terrain ?? 'blank') : 'sea';
}

function rowMajor(a: RawHex, b: RawHex): number {
  return a.row - b.row || a.col - b.col;
}

/** The hexes of a river, pre-printed: these stay land. */
function onRiver(board: RawBoard, id: string): RawRiver | undefined {
  return board.rivers.find((r) => r.path.includes(id) || r.cataracts.includes(id));
}

/**
 * The board with the brush applied to the hex, or the reason it cannot be: a port and a river hex stay land. A hex made
 * land keeps the file's row-major order; a hex made sea leaves it.
 */
export function paint(board: RawBoard, id: HexId, brush: Brush): RawBoard | string {
  const at = parseHexId(id);
  if (!at) return `${id} is not a hex`;
  if (at.col < 0 || at.col >= board.cols || at.row < 0 || at.row >= board.rows) return `${id} is off the board`;
  const current = board.hexes[id];
  if (brush === 'sea') {
    if (!current) return board;
    if (current.port) return `${id} is the port of ${board.ports[current.port]?.name ?? current.port}: it stays land`;
    const river = onRiver(board, id);
    if (river) return `${id} carries the ${river.name}: it stays land`;
    const hexes = { ...board.hexes };
    delete hexes[id];
    return { ...board, hexes };
  }
  const terrain: Terrain | null = brush === 'blank' ? null : brush;
  if (current && current.terrain === terrain) return board;
  const next: RawHex = current ? { ...current, terrain } : { col: at.col, row: at.row, terrain };
  const entries = Object.entries({ ...board.hexes, [id]: next }).sort(([, a], [, b]) => rowMajor(a, b));
  return { ...board, hexes: Object.fromEntries(entries) };
}

/** Every hex that differs between the two boards, in row-major order, then every river that differs, in the file's order. */
export function changesBetween(from: RawBoard, to: RawBoard): Change[] {
  const ids = new Set([...Object.keys(from.hexes), ...Object.keys(to.hexes)]);
  const hexes: HexChange[] = [];
  for (const id of ids) {
    const a = brushAt(from, id), b = brushAt(to, id);
    if (a !== b) hexes.push({ kind: 'hex', id: id as HexId, from: a, to: b });
  }
  const at = (id: string) => parseHexId(id)!;
  hexes.sort((x, y) => at(x.id).row - at(y.id).row || at(x.id).col - at(y.id).col);
  const rivers: RiverChange[] = [];
  const seen = new Set<string>();
  for (const r of [...from.rivers, ...to.rivers]) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    const a = from.rivers.find((x) => x.id === r.id), b = to.rivers.find((x) => x.id === r.id);
    const summary = riverDifference(a, b);
    if (summary) rivers.push({ kind: 'river', id: r.id, name: (b ?? a)!.name, summary });
  }
  return [...hexes, ...rivers];
}

/** How a river differs, in words: added, removed, or each field that changed; empty when it does not. */
export function riverDifference(a: RawRiver | undefined, b: RawRiver | undefined): string {
  if (!a && !b) return '';
  if (!a) return `added, ${b!.path.length} ${b!.path.length === 1 ? 'hex' : 'hexes'}`;
  if (!b) return 'removed';
  const parts: string[] = [];
  if (a.name !== b.name) parts.push(`named ${b.name}`);
  if (a.drainage !== b.drainage) parts.push(b.drainage === undefined ? 'drainage number removed' : `drainage ${b.drainage}`);
  if (a.offMapHexes !== b.offMapHexes) parts.push(b.offMapHexes === undefined ? 'no hexes off the map' : `${b.offMapHexes} hexes off the map`);
  if (a.joins !== b.joins) parts.push(b.joins === undefined ? 'joins no river' : `joins ${b.joins}`);
  if (Boolean(a.continuesOffMap) !== Boolean(b.continuesOffMap)) parts.push(b.continuesOffMap ? 'continues off the map' : 'ends on the map');
  if (a.mouth !== b.mouth) parts.push(b.mouth === undefined ? 'mouth straight on' : `mouth to the ${DIRECTION_NAMES[b.mouth]}`);
  if (a.path.join() !== b.path.join()) {
    const added = b.path.filter((h) => !a.path.includes(h)), removed = a.path.filter((h) => !b.path.includes(h));
    if (added.length) parts.push(`+${added.join(' ')}`);
    if (removed.length) parts.push(`−${removed.join(' ')}`);
    if (!added.length && !removed.length) parts.push('path reordered');
  }
  if (a.cataracts.join() !== b.cataracts.join()) {
    const added = b.cataracts.filter((h) => !a.cataracts.includes(h)), removed = a.cataracts.filter((h) => !b.cataracts.includes(h));
    if (added.length) parts.push(`cataract at ${added.join(' ')}`);
    if (removed.length) parts.push(`no cataract at ${removed.join(' ')}`);
  }
  return parts.join('; ');
}

// ---- Rivers (prompt 48) ---------------------------------------------------------------------

/** A river's fields in the file's order, undefined ones left out. */
export function normaliseRiver(r: RawRiver): RawRiver {
  return {
    id: r.id,
    name: r.name,
    ...(r.drainage !== undefined ? { drainage: r.drainage } : {}),
    ...(r.offMapHexes !== undefined ? { offMapHexes: r.offMapHexes } : {}),
    ...(r.joins !== undefined ? { joins: r.joins } : {}),
    ...(r.continuesOffMap ? { continuesOffMap: true } : {}),
    ...(r.mouth !== undefined ? { mouth: r.mouth } : {}),
    path: r.path,
    cataracts: r.cataracts
  };
}

/**
 * The direction a river leaves its mouth hex for the sea (prompt 51): the one it names, else straight on from its
 * second hex when the hex there is sea; null for a tributary or a river whose course does not reach the sea.
 */
export function seaward(board: RawBoard, r: RawRiver): Direction | null {
  if (r.joins || r.path.length === 0) return null;
  if (r.mouth !== undefined) return r.mouth;
  if (r.path.length < 2) return null;
  const d = directionTo(r.path[1] as HexId, r.path[0] as HexId);
  return d !== null && !board.hexes[neighbour(r.path[0] as HexId, d)] ? d : null;
}

function withRiver(board: RawBoard, id: string, river: RawRiver): RawBoard {
  return { ...board, rivers: board.rivers.map((r) => (r.id === id ? normaliseRiver(river) : r)) };
}

/** A new river with no hexes yet, named after its number; its id and the board holding it. */
export function addRiver(board: RawBoard): { board: RawBoard; id: string } {
  let n = board.rivers.length + 1;
  while (board.rivers.some((r) => r.id === `river-${n}`)) n++;
  const id = `river-${n}`;
  return { board: { ...board, rivers: [...board.rivers, { id, name: `River ${n}`, path: [], cataracts: [] }] }, id };
}

/** The board without the river, or the reason: a river another joins stays. */
export function removeRiver(board: RawBoard, id: string): RawBoard | string {
  const river = board.rivers.find((r) => r.id === id);
  if (!river) return `no river ${id}`;
  const tributary = board.rivers.find((r) => r.joins === id);
  if (tributary) return `the ${tributary.name} joins the ${river.name}: it stays`;
  return { ...board, rivers: board.rivers.filter((r) => r.id !== id) };
}

/** The river's name, drainage number, hexes off the map, the river it joins or whether it continues off the map. */
export function updateRiver(board: RawBoard, id: string, patch: Partial<Pick<RawRiver, 'name' | 'drainage' | 'offMapHexes' | 'joins' | 'continuesOffMap'>>): RawBoard | string {
  const river = board.rivers.find((r) => r.id === id);
  if (!river) return `no river ${id}`;
  if (patch.joins !== undefined && patch.joins !== null && (patch.joins === id || !board.rivers.some((r) => r.id === patch.joins))) return `no river ${patch.joins} to join`;
  if (patch.name !== undefined && !patch.name.trim()) return 'a river needs a name';
  const next: RawRiver = { ...river, ...patch };
  for (const key of ['drainage', 'offMapHexes', 'joins'] as const) if (next[key] === undefined || (next[key] as unknown) === null || (next[key] as unknown) === '') delete next[key];
  if (!next.continuesOffMap) delete next.continuesOffMap;
  return withRiver(board, id, next);
}

/**
 * A tap on a hex with the river tool (prompt 48): a hex at either end of the river's path comes off it; a land hex
 * adjacent to the inland end is added there, one adjacent to the mouth becomes the new mouth; the first hex starts an
 * empty river. A hex in the middle of the path, a sea hex or a hex apart from the river is refused with the reason.
 */
export function riverTap(board: RawBoard, id: string, hex: HexId): RawBoard | string {
  const river = board.rivers.find((r) => r.id === id);
  if (!river) return `no river ${id}`;
  const { path } = river;
  const i = path.indexOf(hex);
  if (i >= 0) {
    if (i !== 0 && i !== path.length - 1) return `${hex} is in the middle of the ${river.name}: take the hexes off from an end`;
    return withRiver(board, id, { ...river, path: path.filter((h) => h !== hex), cataracts: river.cataracts.filter((h) => h !== hex) });
  }
  if (!board.hexes[hex]) return `${hex} is sea: a river runs on land`;
  if (path.length === 0) return withRiver(board, id, { ...river, path: [hex] });
  if (directionTo(path[path.length - 1] as HexId, hex) !== null) return withRiver(board, id, { ...river, path: [...path, hex] });
  if (directionTo(path[0] as HexId, hex) !== null) return withRiver(board, id, { ...river, path: [hex, ...path] });
  return `${hex} is not next to either end of the ${river.name} (${path[0]} to ${path[path.length - 1]})`;
}

/** A cataract marked or unmarked on a hex of a river's path: the river given, else whichever river runs there. */
export function toggleCataract(board: RawBoard, hex: HexId, riverId?: string): RawBoard | string {
  const river = (riverId ? board.rivers.filter((r) => r.id === riverId) : board.rivers).find((r) => r.path.includes(hex));
  if (!river) return riverId ? `${hex} is not on the ${board.rivers.find((r) => r.id === riverId)?.name ?? riverId}` : `no river runs through ${hex}`;
  const on = river.cataracts.includes(hex);
  const cataracts = on ? river.cataracts.filter((h) => h !== hex) : river.path.filter((h) => h === hex || river.cataracts.includes(h));
  return withRiver(board, river.id, { ...river, cataracts });
}

/** The land hexes a tap with the river tool would add: next to the inland end, and next to the mouth. */
export function riverCandidates(board: RawBoard, id: string): HexId[] {
  const river = board.rivers.find((r) => r.id === id);
  if (!river || river.path.length === 0) return [];
  const ends = [river.path[river.path.length - 1], river.path[0]] as HexId[];
  const out = new Set<HexId>();
  for (const [hid, h] of Object.entries(board.hexes)) {
    if (river.path.includes(hid)) continue;
    if (ends.some((e) => directionTo(e, hid as HexId) !== null)) out.add(hid as HexId);
    void h;
  }
  return [...out];
}

export function counts(board: RawBoard): { land: number; blank: number } {
  const hexes = Object.values(board.hexes);
  return { land: hexes.length, blank: hexes.filter((h) => h.terrain === null).length };
}

/**
 * Whether the data is a board the file can hold: the grid, every hex keyed by its own place with a known terrain or null,
 * every port on a hex that names it, every river on land. The reason when not.
 */
export function validateBoard(data: unknown): string | null {
  if (!data || typeof data !== 'object') return 'the board is not an object';
  const b = data as Partial<RawBoard>;
  if (!Number.isInteger(b.cols) || !Number.isInteger(b.rows) || b.cols! <= 0 || b.rows! <= 0) return 'cols and rows must be positive integers';
  if (!b.hexes || typeof b.hexes !== 'object' || Array.isArray(b.hexes)) return 'hexes must be an object';
  if (!b.ports || typeof b.ports !== 'object' || Array.isArray(b.ports)) return 'ports must be an object';
  if (!Array.isArray(b.rivers)) return 'rivers must be an array';
  for (const [id, h] of Object.entries(b.hexes)) {
    const at = parseHexId(id);
    if (!at) return `${id} is not a hex id`;
    if (!h || typeof h !== 'object') return `${id} is not a hex`;
    if (h.col !== at.col || h.row !== at.row) return `${id} is keyed at c${h.col}r${h.row}`;
    if (at.col < 0 || at.col >= b.cols! || at.row < 0 || at.row >= b.rows!) return `${id} is off the ${b.cols}×${b.rows} board`;
    if (h.terrain !== null && !TERRAINS.includes(h.terrain)) return `${id} has an unknown terrain ${String(h.terrain)}`;
    if (h.port !== undefined && (typeof h.port !== 'string' || b.ports[h.port]?.hex !== id)) return `${id} names a port ${String(h.port)} that is not there`;
    for (const key of Object.keys(h)) if (!['col', 'row', 'terrain', 'port'].includes(key)) return `${id} has an unknown field ${key}`;
  }
  for (const [id, p] of Object.entries(b.ports)) {
    if (!p || typeof p.name !== 'string' || typeof p.hex !== 'string') return `port ${id} needs a name and a hex`;
    if (b.hexes[p.hex]?.port !== id) return `port ${id} is not on its hex ${p.hex}`;
  }
  const riverIds = new Set<string>();
  for (const r of b.rivers) {
    if (!r || typeof r.id !== 'string' || typeof r.name !== 'string' || !Array.isArray(r.path) || !Array.isArray(r.cataracts)) return 'a river needs an id, a name, a path and cataracts';
    if (riverIds.has(r.id)) return `two rivers are called ${r.id}`;
    riverIds.add(r.id);
    if (!r.name.trim()) return `the river ${r.id} has no name`;
    if (r.path.length === 0) return `the ${r.name} has no hexes`;
    for (const id of [...r.path, ...r.cataracts]) if (!b.hexes[id]) return `the ${r.name} runs through ${id}, which is not land`;
    if (new Set(r.path).size !== r.path.length) return `the ${r.name} runs through a hex twice`;
    for (let i = 1; i < r.path.length; i++) if (directionTo(r.path[i - 1] as HexId, r.path[i] as HexId) === null) return `the ${r.name} jumps from ${r.path[i - 1]} to ${r.path[i]}`;
    for (const id of r.cataracts) if (!r.path.includes(id)) return `the ${r.name} has a cataract at ${id}, off its course`;
    if (r.drainage !== undefined && !(Number.isInteger(r.drainage) && r.drainage > 0)) return `the ${r.name} has a bad drainage number`;
    if (r.offMapHexes !== undefined && !(Number.isInteger(r.offMapHexes) && r.offMapHexes >= 0)) return `the ${r.name} has a bad count of hexes off the map`;
    if (r.mouth !== undefined) {
      if (!DIRECTIONS.includes(r.mouth)) return `the ${r.name} has a bad mouth direction`;
      if (r.joins !== undefined) return `the ${r.name} joins a river and cannot have a mouth to the sea`;
      if (b.hexes[neighbour(r.path[0] as HexId, r.mouth)]) return `the ${r.name}'s mouth points at land`;
    }
    if (r.joins !== undefined) {
      const parent = b.rivers.find((x) => x.id === r.joins);
      if (!parent || parent === r) return `the ${r.name} joins ${r.joins}, which is no river`;
      if (!parent.path.includes(r.path[0])) return `the ${r.name} joins the ${parent.name} at ${r.path[0]}, which is not on it`;
    }
    for (const key of Object.keys(r)) if (!['id', 'name', 'drainage', 'offMapHexes', 'joins', 'continuesOffMap', 'mouth', 'path', 'cataracts'].includes(key)) return `the ${r.name} has an unknown field ${key}`;
  }
  return null;
}

/** The text of `board.json`: one-space indentation and non-ASCII escaped, as tools/mapfit/build.py wrote it, no final newline. */
export function serialiseBoard(board: RawBoard): string {
  const ordered: RawBoard = { cols: board.cols, rows: board.rows, hexes: board.hexes, ports: board.ports, rivers: board.rivers };
  return JSON.stringify(ordered, null, 1).replace(/[\u007f-￿]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
}

/** The command the editor sends the capture server: the server writes `board.json` from `data`. */
export interface SaveCommand {
  type: 'save';
  target: 'board';
  changes: Change[];
  data: RawBoard;
}

// ---- The single hex editor (prompt 49) ------------------------------------------------------

/** The rivers through a hex and the directions they leave it in, from the courses: a spoke per neighbouring course hex. */
export function riverSpokes(board: RawBoard, hex: HexId): { direction: Direction; river: RawRiver; sea?: boolean }[] {
  const out: { direction: Direction; river: RawRiver; sea?: boolean }[] = [];
  for (const r of board.rivers) {
    const i = r.path.indexOf(hex);
    if (i < 0) continue;
    for (const other of [r.path[i - 1], r.path[i + 1]]) {
      if (!other) continue;
      const d = directionTo(hex, other as HexId);
      if (d !== null && !out.some((o) => o.direction === d)) out.push({ direction: d, river: r });
    }
    if (i === 0) {
      const d = seaward(board, r);
      if (d !== null && !out.some((o) => o.direction === d)) out.push({ direction: d, river: r, sea: true });
    }
  }
  return out.sort((a, b) => a.direction - b.direction);
}

const isEnd = (r: RawRiver, hex: string) => r.path[0] === hex || r.path[r.path.length - 1] === hex;

/**
 * A spoke of the single hex editor tapped: the river edge between the hex and its neighbour in that direction comes or
 * goes, as a path edit. A spoke already there is cleared by taking the end hex off its course (a course that runs on
 * through both hexes is refused: split it from an end). A spoke added extends the river whose course ends at either hex,
 * else starts a tributary from a hex on a course, else a new river with its mouth at the hex tapped.
 */
export function toggleRiverSpoke(board: RawBoard, hex: HexId, direction: Direction): RawBoard | string {
  const n = neighbour(hex, direction);
  for (const r of board.rivers) {
    const i = r.path.indexOf(hex), j = r.path.indexOf(n);
    if (i < 0 || j < 0 || Math.abs(i - j) !== 1) continue;
    const drop = isEnd(r, hex) ? hex : isEnd(r, n) ? n : null;
    if (!drop) return `the ${r.name} runs on through ${hex} and ${n}: take its hexes off from an end`;
    const orphan = board.rivers.find((t) => t.joins === r.id && t.path[0] === drop);
    if (orphan) return `the ${orphan.name} joins the ${r.name} at ${drop}: move the junction first`;
    return withRiver(board, r.id, { ...r, path: r.path.filter((h) => h !== drop), cataracts: r.cataracts.filter((h) => h !== drop) });
  }
  if (!board.hexes[n]) return mouthToward(board, hex, direction);
  const endingHere = board.rivers.find((r) => isEnd(r, hex) && !r.path.includes(n));
  if (endingHere) return riverTap(board, endingHere.id, n);
  const endingThere = board.rivers.find((r) => isEnd(r, n) && !r.path.includes(hex));
  if (endingThere) return riverTap(board, endingThere.id, hex);
  const through = board.rivers.find((r) => r.path.includes(hex));
  if (through && board.rivers.some((r) => r.path.includes(n))) return `both ${hex} and ${n} already carry rivers that do not meet here`;
  const { board: added, id } = addRiver(board);
  const river = added.rivers.find((r) => r.id === id)!;
  return withRiver(added, id, { ...river, ...(through ? { joins: through.id } : {}), path: [hex, n] });
}

/**
 * A spoke toward the sea (prompt 51): the river reaches the sea from this hex in that direction. The hex becomes the mouth
 * of the river that ends here (its course turned round if this was the inland end, a junction given up), with the
 * direction named unless it is straight on; the same spoke again, when named, lets the mouth go straight on; a hex with
 * no river starts one, its mouth here. A hex in the middle of a course is refused: a river reaches the sea from its mouth.
 */
function mouthToward(board: RawBoard, hex: HexId, direction: Direction): RawBoard | string {
  const through = board.rivers.filter((r) => r.path.includes(hex));
  const river = through.find((r) => isEnd(r, hex)) ?? through[0];
  if (river && !isEnd(river, hex)) return `${hex} is in the middle of the ${river.name}: a river reaches the sea from its mouth, the first hex of its course`;
  if (!river) {
    const { board: added, id } = addRiver(board);
    const fresh = added.rivers.find((r) => r.id === id)!;
    return withRiver(added, id, { ...fresh, mouth: direction, path: [hex] });
  }
  const path = river.path[0] === hex ? river.path : [...river.path].reverse();
  const turned: RawRiver = { ...river, path };
  delete turned.joins;
  const straight = seaward(board, { ...turned, mouth: undefined });
  const current = seaward(board, river.path[0] === hex ? river : turned);
  if (current === direction && river.mouth !== undefined && river.path[0] === hex) {
    // The named mouth tapped again: it goes straight on, if the sea is there.
    const plain = { ...turned };
    delete plain.mouth;
    if (straight === null) return `the ${river.name} reaches the sea here to the ${DIRECTION_NAMES[direction]}; tap another seaward spoke to turn its mouth`;
    return withRiver(board, river.id, plain);
  }
  if (current === direction) return `the ${river.name} reaches the sea here to the ${DIRECTION_NAMES[direction]}; tap another seaward spoke to turn its mouth`;
  if (straight === direction) delete turned.mouth;
  else turned.mouth = direction;
  return withRiver(board, river.id, turned);
}

export const DIRECTION_NAMES: Record<Direction, string> = { 1: 'north-east', 2: 'east', 3: 'south-east', 4: 'south-west', 5: 'west', 6: 'north-west' };
export { DIRECTIONS };
