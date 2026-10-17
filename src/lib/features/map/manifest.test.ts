import { describe, expect, it } from 'vitest';
import { BOARD, LAND_HEXES, PORTS, RIVERS, blankHexes, hasRiver, hexAt, isCataract, isLand, riverEdges, riverMouths, riversAt } from './manifest';
import { directionTo, parseHexId } from './hex';

describe('board manifest', () => {
  it('has a 27 by 42 grid with 625 land hexes', () => {
    expect(BOARD.cols).toBe(27);
    expect(BOARD.rows).toBe(42);
    expect(LAND_HEXES).toHaveLength(625); // 626 as transcribed; Zanzibar's old hex c24r15 is sea (prompt 52)
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
  it('has 450 blank hexes to explore (the rules say 452: RQ-5)', () => {
    expect(blankHexes()).toHaveLength(450); // 447 as transcribed; c18r26, c17r29 and c17r30 were corrected to blank in the editor (prompts 52 and 53)
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
    expect(hexAt('c23r15')?.port).toBe('zanzibar'); // one hex west of the transcription (prompt 52)
    expect(isLand('c24r15')).toBe(false);
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
      expect(r.path.length).toBeGreaterThanOrEqual(1); // a river of one hex is allowed (G-169)
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

describe('river helpers', () => {
  it('finds both Niles at Khartoum and the edges of the White Nile', () => {
    expect(riversAt('c20r1').map((r) => r.id).sort()).toEqual(['blue-nile', 'white-nile']);
    const edges = riverEdges('c20r2');
    expect(edges).toHaveLength(2);
    expect(edges.find((e) => e.downstream)?.direction).toBe(directionTo('c20r2', 'c20r1'));
    expect(edges.find((e) => !e.downstream)?.direction).toBe(directionTo('c20r2', 'c19r3'));
    expect(hasRiver('c20r2')).toBe(true);
    expect(hasRiver('c10r10')).toBe(false);
  });
  it('knows the printed cataracts and the mouths', () => {
    expect(isCataract('c22r5')).toBe(true);
    expect(isCataract('c7r15')).toBe(false); // the Congo's cataract was taken off in the editor
    expect(isCataract('c20r2')).toBe(false);
    expect(riverMouths().map((m) => m.river.id).sort()).toEqual(['congo', 'cunene', 'limpopo', 'niger', 'ogooue', 'orange', 'rufiji', 'white-nile', 'zambezi']);
  });
});
