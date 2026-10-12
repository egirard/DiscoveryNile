import { describe, expect, it } from 'vitest';
import { d6, dice, rngFromSeed } from '$lib/game/random';
import { neighbour, opposite, type Direction, type HexId } from './hex';
import type { Terrain } from './manifest';
import { printedCourse, resolveWater, riverDirection, type HexKnowledge, type Knowledge, type RiverCourse } from './rivers';

const H: HexId = 'c12r12';
const blank: HexKnowledge = { terrain: null, mapped: false, river: null, needsContinuation: false };
const mapped = (terrain: Terrain, river: RiverCourse | null = null): HexKnowledge => ({ terrain, mapped: true, river, needsContinuation: false });
const course = (p: Partial<RiverCourse>): RiverCourse => ({ in: [], out: null, source: false, cataract: false, waterfallFeet: null, ...p });
const knowing = (map: Partial<Record<Direction, HexKnowledge>>): Knowledge => (id) => {
  for (const d of [1, 2, 3, 4, 5, 6] as Direction[]) if (neighbour(H, d) === id) return map[d] ?? blank;
  return blank;
};

/** A seed whose dice, in order, start with the given values. */
function seedFor(values: number[]): number {
  for (let seed = 1; seed < 2_000_000; seed++) {
    let s = rngFromSeed(seed);
    let ok = true;
    for (const v of values) {
      const r = d6(s);
      s = r.state;
      if (r.value !== v) { ok = false; break; }
    }
    if (ok) return seed;
  }
  throw new Error(`no seed for ${values}`);
}

describe('printed rivers as courses', () => {
  it('reads the White Nile at c20r2: out toward Khartoum, in from c19r3', () => {
    const c = printedCourse('c20r2')!;
    expect(c.out).toBe(1);
    expect(c.in).toEqual([4]);
    expect(printedCourse('c10r10')).toBeNull();
  });
  it('tells downstream from upstream', () => {
    const c = printedCourse('c20r2');
    expect(riverDirection(c, 1)).toBe('downstream');
    expect(riverDirection(c, 4)).toBe('upstream');
    expect(riverDirection(c, 6)).toBeNull();
    expect(riverDirection(null, 1)).toBeNull();
  });
});

describe('case 3: no rivers known (rules §7.4)', () => {
  it('odd roll: no river', () => {
    const r = resolveWater(rngFromSeed(seedFor([1])), H, 'veldt', knowing({}));
    expect(r.result.river).toBeNull();
    expect(r.result.rolls).toEqual([{ label: 'a river source?', value: 1 }]);
  });
  it('even roll then a direction into the unexplored: a source flowing that way, then a cataract check', () => {
    const r = resolveWater(rngFromSeed(seedFor([2, 3, 6])), H, 'veldt', knowing({}));
    expect(r.result.river).toMatchObject({ in: [], out: 3, source: true, cataract: false });
    expect(r.result.rolls.map((x) => x.label)).toEqual(['a river source?', 'which way it flows', 'cataract?']);
  });
  it('even roll toward a mapped dry neighbour: nothing', () => {
    const r = resolveWater(rngFromSeed(seedFor([4, 2])), H, 'veldt', knowing({ 2: mapped('veldt') }));
    expect(r.result.river).toBeNull();
  });
  it('in desert a source is an oasis instead', () => {
    const r = resolveWater(rngFromSeed(seedFor([6, 5])), H, 'desert', knowing({}));
    expect(r.result).toMatchObject({ oasis: true, river: null });
  });
});

describe('case 1: a river is known to flow out of the new hex', () => {
  const expecting = (d: Direction) => mapped('veldt', course({ in: [opposite(d)], out: 2 }));
  it('connects to an inflow without rolling for the course', () => {
    const know = knowing({ 1: expecting(1), 4: mapped('jungle', course({ out: opposite(4) })) });
    const r = resolveWater(rngFromSeed(seedFor([6])), H, 'veldt', know);
    expect(r.result.river).toMatchObject({ in: [4], out: 1, source: false });
    expect(r.result.rolls[0].label).toBe('cataract?');
  });
  it('rolls where it comes from: an unexplored neighbour continues it', () => {
    const r = resolveWater(rngFromSeed(seedFor([3, 6])), H, 'veldt', knowing({ 1: expecting(1) }));
    expect(r.result.river).toMatchObject({ in: [3], out: 1, source: false });
  });
  it('ends in this hex when the rolled direction is explored dry land', () => {
    const r = resolveWater(rngFromSeed(seedFor([3, 6])), H, 'veldt', knowing({ 1: expecting(1), 3: mapped('veldt') }));
    expect(r.result.river).toMatchObject({ in: [], out: 1, source: true });
  });
  it('continues a pre-printed river end', () => {
    const end: HexKnowledge = { terrain: 'jungle', mapped: true, river: course({ out: 5 }), needsContinuation: true };
    const r = resolveWater(rngFromSeed(seedFor([2, 6])), H, 'veldt', knowing({ 4: end }));
    expect(r.result.river).toMatchObject({ in: [2], out: 4 });
  });
  it('two rivers leaving: the hex becomes water', () => {
    const r = resolveWater(rngFromSeed(seedFor([3])), H, 'veldt', knowing({ 1: expecting(1), 2: expecting(2) }));
    expect(r.result.terrain).toBe('swamp');
    expect(r.result.river).toBeNull();
    expect(resolveWater(rngFromSeed(seedFor([1])), H, 'veldt', knowing({ 1: expecting(1), 2: expecting(2) })).result.terrain).toBe('lake');
    expect(resolveWater(rngFromSeed(seedFor([6])), H, 'veldt', knowing({ 1: expecting(1), 2: expecting(2) })).result.terrain).toBe('jungle-swamp');
  });
});

describe('case 2: a river flows into the new hex', () => {
  const flowingIn = (d: Direction) => mapped('jungle', course({ out: opposite(d) }));
  it('crosses to an unexplored or water neighbour chosen by rolling', () => {
    const r = resolveWater(rngFromSeed(seedFor([2, 6])), H, 'veldt', knowing({ 5: flowingIn(5), 2: mapped('veldt') }));
    // 2 is explored dry: rejected; 6 is blank: accepted
    expect(r.result.river).toMatchObject({ in: [5], out: 6 });
    expect(r.result.rolls.filter((x) => x.label === 'where the river goes')).toHaveLength(2);
  });
  it('becomes a great salt lake when every neighbour is explored dry land', () => {
    const all = Object.fromEntries(([1, 2, 3, 4, 6] as Direction[]).map((d) => [d, mapped('veldt')]));
    const r = resolveWater(rngFromSeed(1), H, 'veldt', knowing({ ...all, 5: flowingIn(5) }));
    expect(r.result.terrain).toBe('lake');
    expect(r.result.river).toBeNull();
  });
  it('in desert only explored water can take the river', () => {
    const r = resolveWater(rngFromSeed(1), H, 'desert', knowing({ 5: flowingIn(5) }));
    expect(r.result.terrain).toBe('lake'); // every other neighbour is unexplored: no exit from desert
    const r2 = resolveWater(rngFromSeed(seedFor([2])), H, 'desert', knowing({ 5: flowingIn(5), 2: mapped('lake') }));
    expect(r2.result.river).toMatchObject({ in: [5], out: 2 });
  });
});

describe('water hexes, cataracts and peaks', () => {
  it('a lake, swamp or jungle-swamp has no course, even with rivers around it', () => {
    const r = resolveWater(rngFromSeed(1), H, 'swamp', knowing({ 1: mapped('veldt', course({ in: [4] })) }));
    expect(r.result.river).toBeNull();
    expect(r.result.rolls).toEqual([]);
  });
  it('rolls cataracts by terrain: 1 in jungle or veldt, 1–2 in desert, 2–4 in mountain, with a four-dice height', () => {
    const inflow = { 5: mapped('jungle', course({ out: 2 })) };
    const run = (t: Terrain, dicePrefix: number[], cataractRoll: number, height: number[]) =>
      resolveWater(rngFromSeed(seedFor([...dicePrefix, cataractRoll, ...height])), H, t, knowing({ ...inflow, 2: mapped('lake') }));
    // case 2 with exit 2 (lake): one direction roll (2), then cataract, then height
    expect(run('veldt', [2], 1, [6, 6, 6, 2]).result.river).toMatchObject({ cataract: true, waterfallFeet: 432 });
    expect(run('veldt', [2], 2, []).result.river).toMatchObject({ cataract: false });
    expect(run('desert', [2], 2, [1, 1, 1, 1]).result.river).toMatchObject({ cataract: true, waterfallFeet: null });
    // mountain: three peak dice come first; with an outflow and an inflow the course needs no roll
    const connect = knowing({ 1: mapped('veldt', course({ in: [opposite(1)], out: 2 })), 4: mapped('jungle', course({ out: opposite(4) })) });
    const m = resolveWater(rngFromSeed(seedFor([4, 4, 4, 3])), H, 'mountain', connect);
    expect(m.result.peakFeet).toBe((64 + 100) * 100);
    expect(m.result.river).toMatchObject({ in: [4], out: 1, cataract: true });
    const heightDice = m.result.rolls.filter((x) => x.label.startsWith('waterfall')).map((x) => x.value);
    expect(heightDice).toHaveLength(4);
    const feet = heightDice.reduce((a, b) => a * b, 1);
    expect(m.result.river!.waterfallFeet).toBe(feet >= 400 ? feet : null);
    const low = resolveWater(rngFromSeed(seedFor([1, 1, 1, 1])), H, 'mountain', connect);
    expect(low.result.peakFeet).toBeNull();
    expect(low.result.river).toMatchObject({ cataract: false });
  });
  it('is deterministic and advances the rng', () => {
    const a = resolveWater(rngFromSeed(77), H, 'jungle', knowing({}));
    const b = resolveWater(rngFromSeed(77), H, 'jungle', knowing({}));
    expect(a).toEqual(b);
    expect(a.rng).not.toBe(rngFromSeed(77));
    expect(dice(rngFromSeed(77), 1).values[0]).toBe(a.result.rolls[0].value);
  });
});
