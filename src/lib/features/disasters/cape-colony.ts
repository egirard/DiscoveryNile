// Cape Colony (rules §10): the pre-printed hexes along the Orange and Vaal and everything south of
// the Orange. No disaster is drawn there and nobody starves. Published tributaries join it when
// publication exists (open-questions G-37).
import { RIVERS, hexAt } from '$features/map/manifest';
import { parseHexId, type HexId } from '$features/map/hex';

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

export function inCapeColony(id: HexId): boolean {
  if (onRiver.has(id)) return true; // the printed course counts even where the hex itself is blank
  if (!hexAt(id)?.terrain) return false; // blank hexes are not pre-printed
  const { col, row } = parseHexId(id)!;
  return row > orangeRow(col);
}
