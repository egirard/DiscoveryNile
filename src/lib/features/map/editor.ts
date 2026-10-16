// The map editor's pure part (PROMPTS.md, prompt 47): the board as `board.json` holds it, a brush applied to a hex, the
// changes between two boards, the checks the capture server makes before it writes the file, and the file's exact text.
// The transcription from the photograph (tools/mapfit, RQ-5) misread some hexes; the editor at /editor/ corrects them by
// hand and sends the whole board to the capture server as a `save` command, which writes `board.json` in the source tree.
import type { PortId, Terrain } from './manifest';
import { parseHexId, type HexId } from './hex';

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
  id: HexId;
  from: Brush;
  to: Brush;
}

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

/** Every hex that differs between the two boards, in row-major order. */
export function changesBetween(from: RawBoard, to: RawBoard): HexChange[] {
  const ids = new Set([...Object.keys(from.hexes), ...Object.keys(to.hexes)]);
  const out: HexChange[] = [];
  for (const id of ids) {
    const a = brushAt(from, id), b = brushAt(to, id);
    if (a !== b) out.push({ id: id as HexId, from: a, to: b });
  }
  const at = (id: string) => parseHexId(id)!;
  return out.sort((x, y) => at(x.id).row - at(y.id).row || at(x.id).col - at(y.id).col);
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
  for (const r of b.rivers) {
    if (!r || typeof r.id !== 'string' || typeof r.name !== 'string' || !Array.isArray(r.path) || !Array.isArray(r.cataracts)) return 'a river needs an id, a name, a path and cataracts';
    for (const id of [...r.path, ...r.cataracts]) if (!b.hexes[id]) return `the ${r.name} runs through ${id}, which is not land`;
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
  changes: HexChange[];
  data: RawBoard;
}
