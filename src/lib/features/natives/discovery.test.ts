import { describe, expect, it } from 'vitest';
import { rngScripted } from '$lib/game/random';
import { discoverNatives, distanceToNearestPort, nativesOn } from './discovery';

describe('discovery of natives (rules §7.7)', () => {
  it('finds natives on the terrain\'s totals, 7 with water, never in dry desert', () => {
    expect(nativesOn('lake', false)).toEqual([2, 3]);
    expect(nativesOn('veldt', false)).toEqual([2, 3, 4]);
    expect(nativesOn('jungle-swamp', false)).toEqual([2, 3, 4]);
    expect(nativesOn('mountain', false)).toEqual([5, 6]);
    expect(nativesOn('jungle-mountain', true)).toEqual([2, 3, 4, 5, 6, 7]);
    expect(nativesOn('desert', false)).toEqual([]);
    expect(nativesOn('desert', true)).toEqual([7]);
  });
  it('rolls two dice on the natives stream, then three for warriors, the greatest capped at the distance to a port', () => {
    expect(distanceToNearestPort('c24r12')).toBe(1); // beside Mombasa
    const r = discoverNatives(rngScripted(1, { natives: [1, 2, 3, 4, 5] }), 'veldt', false, 'c24r12');
    expect(r.result).toEqual({ rolls: [{ label: 'natives', value: 1 }, { label: 'natives', value: 2 }, { label: 'warriors', value: 3 }, { label: 'warriors', value: 4 }, { label: 'warriors', value: 5 }], needed: '2, 3, 4', found: true, warriors: 12, summary: 'natives on 3: a tribe of 12 warriors, 3 × 4 × 5, the 5 cut to 1 for the distance to Mombasa' });
    const far = discoverNatives(rngScripted(1, { natives: [2, 2, 3, 4, 5] }), 'veldt', false, 'c15r20');
    expect(far.result.warriors).toBe(60);
    const none = discoverNatives(rngScripted(1, { natives: [3, 3] }), 'veldt', false, 'c24r12');
    expect(none.result).toMatchObject({ found: false, warriors: 0 });
    expect(none.result.rolls).toHaveLength(2);
    expect(discoverNatives(rngScripted(1, { natives: [1, 1] }), 'desert', false, 'c21r1').result.rolls).toEqual([]);
  });
});
