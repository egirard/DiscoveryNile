import { describe, expect, it } from 'vitest';
import board from './board.json';
import type { RawBoard } from './editor';
import { cataractHatch, centreIn, extentsOf, hatchAcross, mouthLabelAt, portAnchor, riverLine } from './art';
import { directionTo, neighbour, toPixel, type HexId } from './hex';

const BOARD = board as RawBoard;
const centre = (id: string) => toPixel(BOARD.hexes[id] ?? parse(id), 10);
const parse = (id: string) => ({ col: Number(/c(\d+)/.exec(id)![1]), row: Number(/r(\d+)/.exec(id)![1]) });

describe('the board as drawn (prompt 52)', () => {
  it('shows the window of the grid the land fills, without the sea around it', () => {
    const e = extentsOf(Object.values(BOARD.hexes));
    expect([e.minCol, e.maxCol, e.minRow, e.maxRow]).toEqual([2, 25, 1, 36]);
    // The hex at the top left of the window sits at its own half-width and a radius in.
    const c = centreIn(e, 10, BOARD.hexes['c2r1']);
    expect(c.y).toBeCloseTo(10);
    expect(c.x).toBeGreaterThan(0);
  });
  it('reaches into the sea at a mouth and draws a hatch across the course at a cataract', () => {
    const niger = BOARD.rivers.find((r) => r.id === 'niger')!;
    expect(riverLine(BOARD, niger, centre, 10)).toHaveLength(niger.path.length + 2); // the reach into the sea, and on off the map
    const limpopo = BOARD.rivers.find((r) => r.id === 'limpopo')!;
    expect(riverLine(BOARD, limpopo, centre, 10)).toHaveLength(1); // cut back to its port, no way out yet
    // A straight course west to east: the hatch stands north to south.
    expect(hatchAcross({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 })).toEqual({ x: -0, y: 1 });
    expect(hatchAcross(null, { x: 1, y: 0 }, { x: 2, y: 0 })).toEqual({ x: -0, y: 1 });
    expect(hatchAcross({ x: 0, y: 0 }, { x: 1, y: 0 }, null)).toEqual({ x: -0, y: 1 });
    expect(hatchAcross(null, { x: 1, y: 0 }, null)).toEqual({ x: 1, y: 0 });
    // The Blue Nile's cataract at its inland end c22r5: across the step from c22r4.
    const blue = BOARD.rivers.find((r) => r.id === 'blue-nile')!;
    const h = cataractHatch(BOARD, blue, 'c22r5', centre);
    const from = centre(blue.path[blue.path.indexOf('c22r5') - 1]), to = centre('c22r5');
    expect(h.x * (to.x - from.x) + h.y * (to.y - from.y)).toBeCloseTo(0);
    expect(Math.hypot(h.x, h.y)).toBeCloseTo(1);
    // The drainage number sits seaward of the mouth: the Niger leaves Brass to the south-west, so the number lies south of it.
    const p = mouthLabelAt(BOARD, niger, centre, 10), m = centre('c2r8');
    expect(p.y).toBeGreaterThan(m.y);
  });
  it('sets a port\'s mark half-way toward the sea, clear of the river through the hex', () => {
    const at = (id: string) => portAnchor(BOARD, BOARD.ports[id].hex as HexId);
    expect(at('mombasa').at).toBe(2.5); // the sea to the east and south-east: half-way to the vertex between
    expect(Math.hypot(at('mombasa').dx, at('mombasa').dy)).toBeCloseTo(0.5);
    expect(at('brass').at).toBe(5); // the Niger leaves Brass to the south-west and comes in from the north-east: the west edge, in the sea
    expect(at('khartoum').at).toBe(6); // the Nile runs off the board north-east and the Niles come in from the south: the north-west edge
    expect(at('zanzibar').at).toBe(2.5); // one hex west of the transcription, the sea to its east and south-east
    for (const [id, p] of Object.entries(BOARD.ports)) {
      const a = at(id);
      const hex = p.hex as HexId;
      // The mark is at an edge's or a vertex's distance, and the place it sits toward has no land beyond it when it is an edge.
      expect(Math.hypot(a.dx, a.dy), id).toBeCloseTo(Number.isInteger(a.at) ? Math.sqrt(3) / 4 : 0.5);
      if (Number.isInteger(a.at)) expect(BOARD.hexes[neighbour(hex, a.at as 1)], `${id} toward ${a.at}`).toBeUndefined();
      // Never within 45° of the river's way through the hex.
      for (const r of BOARD.rivers) {
        const i = r.path.indexOf(hex);
        if (i < 0) continue;
        for (const other of [r.path[i - 1], r.path[i + 1]].filter(Boolean)) {
          const d = directionTo(hex, other as HexId)!;
          const b = ((d - 2) * Math.PI) / 3;
          const ang = Math.atan2(a.dy, a.dx);
          expect(Math.abs(Math.atan2(Math.sin(ang - b), Math.cos(ang - b))), `${id} against the ${r.name}`).toBeGreaterThanOrEqual(Math.PI / 4 - 1e-9);
        }
      }
    }
  });
});
