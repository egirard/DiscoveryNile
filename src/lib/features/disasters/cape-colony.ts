// Cape Colony (rules §10): the pre-printed hexes along the Orange and Vaal and everything south of
// the Orange. No disaster is drawn there and nobody starves. A published hex joins it when it
// lies south of the Orange or its river drains into the Orange or Vaal (open-questions G-37, G-81).
import { RIVERS, hexAt } from '$features/map/manifest';
import { neighbour, parseHexId, type HexId } from '$features/map/hex';
import type { MappedHex } from '$lib/game/state';

const orange = RIVERS.find((r) => r.id === 'orange')!;
const vaal = RIVERS.find((r) => r.id === 'vaal')!;
const onRiver = new Set([...orange.path, ...vaal.path]);
const orangeRowByCol = new Map<number, number>();
for (const id of orange.path) {
  const { col, row } = parseHexId(id)!;
  orangeRowByCol.set(col, Math.max(orangeRowByCol.get(col) ?? 0, row));
}
const cols = [...orangeRowByCol.keys()];
const westEnd = Math.min(...cols), eastEnd = Math.max(...cols);

/** The Orange's row in this column, continued level beyond its ends. */
function orangeRow(col: number): number {
  if (col < westEnd) return orangeRowByCol.get(westEnd)!;
  if (col > eastEnd) return orangeRowByCol.get(eastEnd)!;
  return orangeRowByCol.get(col) ?? orangeRow(col - 1);
}

function southOfOrange(id: HexId): boolean {
  const { col, row } = parseHexId(id)!;
  return row > orangeRow(col);
}

/** A published hex's river, followed downstream through published hexes, reaches the Orange or Vaal. */
function drainsToOrange(id: HexId, map: Record<string, MappedHex>): boolean {
  let at = id;
  for (let step = 0; step < 64; step++) {
    if (onRiver.has(at)) return true;
    const m = map[at];
    if (!m?.publishedBy || !m.river || m.river.out === null) return false;
    const next = neighbour(at, m.river.out);
    if (!next) return false;
    at = next;
  }
  return false;
}

export function inCapeColony(id: HexId, map: Record<string, MappedHex> = {}): boolean {
  if (onRiver.has(id)) return true; // the printed course counts even where the hex itself is blank
  if (map[id]?.publishedBy) return southOfOrange(id) || drainsToOrange(id, map);
  if (!hexAt(id)?.terrain) return false; // blank hexes are not pre-printed
  return southOfOrange(id);
}
