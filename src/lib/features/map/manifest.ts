// The board of Source of the Nile as data: which hexes exist, their pre-printed terrain, the ports
// of entry and the pre-printed rivers. Transcribed from the board photograph in the pinned rules
// reference (docs/rules-reference.md); `board.json` is generated, see docs/rules.md RQ-5.
import board from './board.json';
import type { HexId } from './hex';

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
