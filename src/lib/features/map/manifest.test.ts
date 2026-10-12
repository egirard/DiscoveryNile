import { describe, expect, it } from 'vitest';
import { BOARD, LAND_HEXES, PORTS, RIVERS, blankHexes, hexAt, isLand } from './manifest';
import { directionTo, parseHexId } from './hex';

describe('board manifest', () => {
  it('has a 27 by 42 grid with 626 land hexes', () => {
    expect(BOARD.cols).toBe(27);
    expect(BOARD.rows).toBe(42);
    expect(LAND_HEXES).toHaveLength(626);
  });
  it('ids match their coordinates and lie inside the grid', () => {
    for (const h of LAND_HEXES) {
      expect(parseHexId(h.id)).toEqual({ col: h.col, row: h.row });
      expect(h.col).toBeGreaterThanOrEqual(0);
      expect(h.col).toBeLessThan(BOARD.cols);
      expect(h.row).toBeGreaterThanOrEqual(0);
      expect(h.row).toBeLessThan(BOARD.rows);
    }
  });
  it('has 447 blank hexes to explore (the rules say 452: RQ-5)', () => {
    expect(blankHexes()).toHaveLength(447);
  });
  it('pre-prints only the six basic terrains and the two jungle composites, no lakes', () => {
    const allowed = new Set(['desert', 'mountain', 'swamp', 'jungle', 'veldt', 'jungle-swamp', 'jungle-mountain']);
    for (const h of LAND_HEXES) if (h.terrain) expect(allowed.has(h.terrain), h.id).toBe(true);
    expect(LAND_HEXES.some((h) => h.terrain === 'lake')).toBe(false);
  });
  it('answers land queries', () => {
    expect(isLand('c20r1')).toBe(true);
    expect(isLand('c0r0')).toBe(false);
    expect(hexAt('c20r1')?.port).toBe('khartoum');
  });
});

describe('ports of entry', () => {
  it('are the thirteen named in the rules, each on its own land hex', () => {
    expect(PORTS.map((p) => p.id).sort()).toEqual(
      ['benguela', 'brass', 'calabar', 'capetown', 'durban', 'khartoum', 'kilwa', 'lourenco-marques', 'luanda', 'mombasa', 'port-elizabeth', 'quilimane', 'zanzibar']
    );
    expect(new Set(PORTS.map((p) => p.hex)).size).toBe(13);
    for (const p of PORTS) {
      expect(isLand(p.hex), p.id).toBe(true);
      expect(hexAt(p.hex)?.port).toBe(p.id);
    }
  });
});

describe('pre-printed rivers', () => {
  it('run through adjacent land hexes from the mouth inland', () => {
    for (const r of RIVERS) {
      expect(r.path.length).toBeGreaterThanOrEqual(2);
      for (let i = 0; i < r.path.length; i++) {
        expect(isLand(r.path[i]), `${r.id} ${r.path[i]}`).toBe(true);
        if (i > 0) expect(directionTo(r.path[i - 1], r.path[i]), `${r.id} ${r.path[i - 1]}→${r.path[i]}`).not.toBeNull();
      }
      for (const c of r.cataracts) expect(r.path).toContain(c);
    }
  });
  it('carry the drainage numbers read from the board', () => {
    const drainage = Object.fromEntries(RIVERS.filter((r) => r.drainage).map((r) => [r.id, r.drainage]));
    expect(drainage).toEqual({ 'white-nile': 35, niger: 6, ogooue: 10, congo: 25, cunene: 10, orange: 14, limpopo: 13, zambezi: 16, rufiji: 10 });
    expect(RIVERS.find((r) => r.id === 'white-nile')?.offMapHexes).toBe(25);
  });
  it('tributaries start on the river they join', () => {
    for (const r of RIVERS.filter((r) => r.joins)) {
      const main = RIVERS.find((m) => m.id === r.joins)!;
      expect(main.path).toContain(r.path[0]);
    }
  });
  it('never cross a swamp hex except to end in it', () => {
    for (const r of RIVERS) {
      r.path.slice(0, -1).forEach((id) => {
        expect(['swamp', 'jungle-swamp', 'lake']).not.toContain(hexAt(id)!.terrain);
      });
    }
  });
  it('the Nile reaches the board at Khartoum and ends in the Sudd', () => {
    const nile = RIVERS.find((r) => r.id === 'white-nile')!;
    expect(nile.path[0]).toBe('c20r1');
    expect(hexAt(nile.path.at(-1)!)?.terrain).toBe('swamp');
  });
});
