// The board of Source of the Nile as data: which hexes exist, their pre-printed terrain, the ports
// of entry and the pre-printed rivers. Transcribed from the board photograph in the pinned rules
// reference (docs/rules-reference.md); `board.json` is generated, see docs/rules.md RQ-5.
import board from './board.json';
import type { Direction, HexId } from './hex';

export type Terrain = 'desert' | 'mountain' | 'swamp' | 'jungle' | 'veldt' | 'lake' | 'jungle-swamp' | 'jungle-mountain';

export type PortId =
  | 'khartoum' | 'mombasa' | 'zanzibar' | 'kilwa' | 'quilimane' | 'lourenco-marques' | 'durban'
  | 'port-elizabeth' | 'capetown' | 'benguela' | 'luanda' | 'calabar' | 'brass';

export interface BoardHex {
  id: HexId;
  col: number;
  row: number;
  /** Pre-printed terrain, or null for a blank hex to be explored. */
  terrain: Terrain | null;
  port?: PortId;
}

export interface Port {
  id: PortId;
  name: string;
  hex: HexId;
}

export interface River {
  id: string;
  name: string;
  /** Drainage-basin number printed at the mouth (rules §7.4). Absent on tributaries. */
  drainage?: number;
  /** Hexes of river beyond the board edge that count toward its length (the Nile, the Niger). */
  offMapHexes?: number;
  /** Tributary: the river it joins; the first hex of `path` is the junction hex on that river. */
  joins?: string;
  continuesOffMap?: boolean;
  /** The direction the river leaves its first hex into the sea, when not straight on from its second hex (the map editor, prompt 51). */
  mouth?: Direction;
  /** From the mouth (or junction) inland. */
  path: HexId[];
  cataracts: HexId[];
}

interface RawHex { col: number; row: number; terrain: Terrain | null; port?: PortId }

const hexes: Record<string, BoardHex> = {};
for (const [id, raw] of Object.entries(board.hexes as Record<string, RawHex>)) {
  hexes[id] = { id: id as HexId, col: raw.col, row: raw.row, terrain: raw.terrain, ...(raw.port ? { port: raw.port } : {}) };
}

export const BOARD = {
  cols: board.cols as number,
  rows: board.rows as number,
  hexes: hexes as Record<HexId, BoardHex>,
  ports: Object.fromEntries(Object.entries(board.ports as Record<string, { name: string; hex: string }>).map(([id, p]) => [id, { id: id as PortId, name: p.name, hex: p.hex as HexId }])) as Record<PortId, Port>,
  rivers: board.rivers as River[]
};

export const LAND_HEXES: readonly BoardHex[] = Object.values(hexes);
export const PORTS: readonly Port[] = Object.values(BOARD.ports);
export const RIVERS: readonly River[] = BOARD.rivers;

export function hexAt(id: string): BoardHex | undefined {
  return hexes[id];
}

export function isLand(id: string): boolean {
  return id in hexes;
}

/** Blank hexes: on the board, no pre-printed terrain. The rules say 452; the transcription has 447 (RQ-5). */
export function blankHexes(): BoardHex[] {
  return LAND_HEXES.filter((h) => h.terrain === null);
}

// ---- Rivers -------------------------------------------------------------------------------

import { directionTo } from './hex';

export interface RiverEdge {
  river: string;
  /** Direction from this hex to the adjacent hex on the same river. */
  direction: Direction;
  /** True when the adjacent hex is nearer the mouth (downstream). */
  downstream: boolean;
}

/** Every river edge leaving `id` along a pre-printed river: who it connects to and which way is downstream. */
export function riverEdges(id: HexId): RiverEdge[] {
  const out: RiverEdge[] = [];
  for (const r of RIVERS) {
    const i = r.path.indexOf(id);
    if (i < 0) continue;
    if (i > 0) out.push({ river: r.id, direction: directionTo(id, r.path[i - 1])!, downstream: true });
    if (i < r.path.length - 1) out.push({ river: r.id, direction: directionTo(id, r.path[i + 1])!, downstream: false });
  }
  return out;
}

export function riversAt(id: HexId): River[] {
  return RIVERS.filter((r) => r.path.includes(id));
}

export function hasRiver(id: HexId): boolean {
  return RIVERS.some((r) => r.path.includes(id));
}

export function isCataract(id: HexId): boolean {
  return RIVERS.some((r) => r.cataracts.includes(id));
}

/** The hex where each main river meets the sea (or the board edge for the Nile): the first of its path. */
export function riverMouths(): { river: River; hex: HexId }[] {
  return RIVERS.filter((r) => !r.joins).map((r) => ({ river: r, hex: r.path[0] }));
}
