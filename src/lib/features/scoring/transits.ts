// Epic transits (rules §12): four crossings of the continent. The first explorer to complete one
// earns a point for every hex of his route he then publishes; the second a half point per hex,
// the third a third, the fourth a quarter; routes must differ, and the pre-printed hexes at the
// north-east edge may not be used (RQ-16, G-91..92).
import type { ExplorerState, GameState, Transit } from '$lib/game/state';
import { BOARD, PORTS, hexAt, type PortId } from '$features/map/manifest';
import { parseHexId, type HexId } from '$features/map/hex';

export type CrossingId = 'khartoum-cape' | 'khartoum-east' | 'khartoum-west' | 'west-east';

export const CROSSING_NAMES: Record<CrossingId, string> = {
  'khartoum-cape': 'Khartoum to Cape Colony',
  'khartoum-east': 'Khartoum to the east coast',
  'khartoum-west': 'Khartoum to the west coast',
  'west-east': 'coast to coast'
};

const CAPE: PortId[] = ['capetown', 'port-elizabeth', 'durban'];
const EAST: PortId[] = ['mombasa', 'zanzibar', 'kilwa', 'quilimane', 'lourenco-marques']; // east coast north of Durban
const WEST: PortId[] = ['benguela', 'luanda', 'calabar', 'brass']; // west coast north of Capetown

/** The bonus per route hex published, by the order in which the crossing was completed. */
export const TRANSIT_BONUS = [1, 1 / 2, 1 / 3, 1 / 4];

export function crossingBetween(a: PortId, b: PortId): CrossingId | null {
  const pair = (x: PortId[], y: PortId[]) => (x.includes(a) && y.includes(b)) || (x.includes(b) && y.includes(a));
  if (pair(['khartoum'], CAPE)) return 'khartoum-cape';
  if (pair(['khartoum'], EAST)) return 'khartoum-east';
  if (pair(['khartoum'], WEST)) return 'khartoum-west';
  if (pair(WEST, EAST)) return 'west-east';
  return null;
}

/** The pre-printed hexes at the north-east edge (the highlands and coast between Khartoum and Mombasa): barred to transits (G-91). */
export function northEast(hex: HexId): boolean {
  const h = hexAt(hex);
  if (!h?.terrain || PORTS.some((p) => p.hex === hex)) return false;
  const { col, row } = parseHexId(hex)!;
  return col >= 22 && row <= 11;
}

export function portAt(hex: HexId): PortId | null {
  return PORTS.find((p) => p.hex === hex)?.id ?? null;
}

/**
 * The explorer has just stepped onto a port hex: if his trip began at a port across the continent, the crossing is
 * complete. The route is every hex he passed through between the two ports; it may not touch the north-east edge,
 * must differ from every earlier route on the crossing, and only four explorers may score a crossing.
 */
export function completeTransit(state: GameState, explorer: ExplorerState, end: PortId): { transit: Transit; note: string } | null {
  if (explorer.transit) return null;
  const startHex = explorer.known[0];
  const start = startHex ? portAt(startHex) : null;
  if (!start || start === end) return null;
  const crossing = crossingBetween(start, end);
  if (!crossing) return null;
  const route = explorer.known.filter((h) => h !== startHex && h !== BOARD.ports[end].hex);
  if (route.some(northEast)) return null;
  const earlier = state.transits.filter((t) => t.crossing === crossing);
  if (earlier.length >= TRANSIT_BONUS.length) return null;
  const same = (a: HexId[], b: HexId[]) => a.length === b.length && a.every((h) => b.includes(h));
  if (earlier.some((t) => same(t.route, route))) return null;
  const order = earlier.length + 1;
  const transit: Transit = { crossing, order, route, from: start, to: end, seat: explorer.seat };
  const toPublish = route.filter((h) => !hexAt(h)?.terrain && state.map[h] && !state.map[h].publishedBy && state.map[h].markers.includes(explorer.seat));
  const bonus = TRANSIT_BONUS[order - 1];
  const note = `epic transit, ${CROSSING_NAMES[crossing]} (${order === 1 ? 'the first' : order === 2 ? 'the second' : order === 3 ? 'the third' : 'the fourth'}): ${toPublish.length} hex${toPublish.length === 1 ? '' : 'es'} to publish at ${fmtPoints(bonus)} point each`;
  return { transit, note };
}

/** Whole points with a vulgar fraction: 3, 3½, ⅓, 2¼ … */
export function fmtPoints(n: number): string {
  const whole = Math.floor(n + 1e-9);
  const frac = n - whole;
  const glyphs: [number, string][] = [[1 / 2, '½'], [1 / 3, '⅓'], [2 / 3, '⅔'], [1 / 4, '¼'], [3 / 4, '¾'], [1 / 6, '⅙'], [5 / 6, '⅚'], [1 / 12, '¹⁄₁₂'], [5 / 12, '⁵⁄₁₂'], [7 / 12, '⁷⁄₁₂'], [11 / 12, '¹¹⁄₁₂']];
  if (frac < 1e-9) return String(whole);
  const g = glyphs.find(([v]) => Math.abs(v - frac) < 1e-6);
  if (!g) return n.toFixed(2);
  return whole ? `${whole}${g[1]}` : g[1];
}
