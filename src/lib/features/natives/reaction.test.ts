import { describe, expect, it } from 'vitest';
import { NO_PURCHASES, type Chart } from '$features/expedition/prices';
import { rngScripted } from '$lib/game/random';
import { react, reactionModifiers, type ReactionInput } from './reaction';

const chart = (p: Partial<Chart>): Chart => ({ ...NO_PURCHASES, water: 0, guideHomes: {}, ...p });
const base: ReactionInput = { policy: 3, distanceToPort: 1, warriors: 12, chart: chart({ askaris: 5, bearers: 6, muskets: 0, food: 100 }), localKnowledge: false, attitude: 0, regard: 0, inDesert: false, mounted: false };
const run = (combat: number[], input: Partial<ReactionInput> = {}) => react(rngScripted(1, { combat }), { ...base, ...input });

describe('native reaction (rules §8.2)', () => {
  it('adds the distance, the policy, and the askari and local-knowledge adjustments', () => {
    expect(reactionModifiers(base).map((m) => m.value)).toEqual([1, 3]);
    expect(reactionModifiers({ ...base, policy: 5, chart: chart({ bearers: 3 }) }).map((m) => m.label)).toEqual(['distance to port', 'policy 5', 'no askaris', 'unarmed']);
    expect(reactionModifiers({ ...base, policy: 5, localKnowledge: true, attitude: -1 }).map((m) => m.value)).toEqual([1, 5, 1, -1]);
    expect(reactionModifiers({ ...base, attitude: -1, regard: 3 }).map((m) => m.label)).toEqual(['distance to port', 'policy 3', 'attitude', 'regard for you']);
    expect(reactionModifiers({ ...base, policy: 4, localKnowledge: true }).map((m) => m.label)).toEqual(['distance to port', 'policy 4']);
  });
  it('target at or above the three dice means no hostility this turn', () => {
    const r = run([1, 1, 2]);
    expect(r.reaction).toMatchObject({ target: 4, total: 4, hostile: false });
    expect(r).toMatchObject({ outcome: 'calm', combat: [], warriors: 12 });
  });
  it('hostile natives hide when d6 × askaris ÷ policy beats the warriors', () => {
    const r = run([6, 6, 6, 6], { warriors: 5, policy: 4, chart: chart({ askaris: 4 }) });
    expect(r.outcome).toBe('hide');
    expect(r.combat).toEqual([{ label: 'strength', value: 6 }]);
    expect(r.summary).toBe('hostile; nerve 6 × 4 askaris ÷ policy 4 = 6, more than 5 warriors: the natives hide');
  });
});

describe('combat (rules §8.3)', () => {
  it('not surprised: the volley kills one per askari and the explorer, and a good morale roll drives them off', () => {
    const r = run([6, 6, 6, 1, 6, 6, 2]);
    expect(r.combat.map((x) => x.label)).toEqual(['strength', 'surprise', 'surprise', 'driven off?']);
    expect(r).toMatchObject({ outcome: 'victory', warriors: 6 });
    expect(r.chart.askaris).toBe(5);
    expect(r.summary).toBe('hostile; nerve 1 × 5 askaris ÷ policy 3 = 1, not more than 12 warriors: the natives attack; surprise 6 + 6 = 12, not under policy 3: the expedition is ready; the volley: 5 askaris and the explorer fire, 6 warriors fall; morale 2 × 6 killed = 12, more than the 6 warriors left: the natives are driven off');
  });
  it('a failed morale roll leads to melee: natives strike, the askaris hold, then strike back', () => {
    const r = run([6, 6, 6, 1, 6, 6, 1, 6, 1, 1, 2]);
    expect(r.combat.map((x) => x.label)).toEqual(['strength', 'surprise', 'surprise', 'driven off?', 'natives strike', 'askaris break?', 'askaris strike', 'natives break?']);
    expect(r).toMatchObject({ outcome: 'victory', warriors: 1 });
    expect(r.chart.askaris).toBe(4);
    expect(r.summary).toBe("hostile; nerve 1 × 5 askaris ÷ policy 3 = 1, not more than 12 warriors: the natives attack; surprise 6 + 6 = 12, not under policy 3: the expedition is ready; the volley: 5 askaris and the explorer fire, 6 warriors fall; morale 1 × 6 killed = 6, not more than the 6 warriors left: they close in; the natives strike: 6 warriors ÷ 6 = 1 askari falls; the askaris' nerve 1 × 1 fallen = 1, not over the 5 that stood: the askaris hold; the askaris strike: 4 askaris ÷ 1 + 1 = 5 warriors fall; morale 2 × 5 fallen = 10, more than the 1 warrior left: the natives are driven off");
  });
  it('surprised: no volley; losing every askari or breaking is defeat', () => {
    const wiped = run([6, 6, 6, 1, 1, 1, 2], { warriors: 30 });
    expect(wiped.combat.map((x) => x.label)).toEqual(['strength', 'surprise', 'surprise', 'natives strike']);
    expect(wiped).toMatchObject({ outcome: 'defeat' });
    expect(wiped.chart.askaris).toBe(0);
    expect(wiped.summary).toBe('hostile; nerve 1 × 5 askaris ÷ policy 3 = 1, not more than 30 warriors: the natives attack; surprise 1 + 1 = 2, under policy 3: the expedition is surprised; the natives strike: 30 warriors ÷ 2 = 15, all 5 askaris fall; every askari is dead: defeat');
    const broke = run([6, 6, 6, 1, 1, 1, 5, 6], { warriors: 20 });
    expect(broke.summary).toBe("hostile; nerve 1 × 5 askaris ÷ policy 3 = 1, not more than 20 warriors: the natives attack; surprise 1 + 1 = 2, under policy 3: the expedition is surprised; the natives strike: 20 warriors ÷ 5 = 4 askaris fall; the askaris' nerve 6 × 4 fallen = 24, over the 5 that stood: the askaris break and run: defeat");
    expect(broke.chart.askaris).toBe(1);
  });
  it('surprise is adjusted for mounted expeditions and the desert', () => {
    // Two dice 1,1 = 2 against policy 3: surprised unless mounted outside the desert (+1 → 3, not below 3).
    expect(run([6, 6, 6, 1, 1, 1, 6], { policy: 3 }).summary).toContain('surprised');
    expect(run([6, 6, 6, 1, 1, 1, 6], { policy: 3, mounted: true }).summary).toContain('the volley');
    expect(run([6, 6, 6, 1, 1, 2, 6], { policy: 3, inDesert: true }).summary).toContain('surprised');
  });
});
