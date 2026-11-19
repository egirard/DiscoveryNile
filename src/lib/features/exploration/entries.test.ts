import { describe, expect, it } from 'vitest';
import type { RollRecord } from '$lib/game/state';
import { entriesOf, hasMore } from './entries';

const r = (kind: string, more: Record<string, unknown> = {}) => ({ kind, seat: 'bottom-1', rolls: [], outcome: kind, ...more }) as unknown as RollRecord;

describe('the log by operation (prompt 90)', () => {
  it('makes one entry of a step, told by its summary, and one of each line outside an operation', () => {
    const lines = [r('disaster'), r('lost-check', { hex: 'c24r12' }), r('terrain', { hex: 'c24r12', op: 'Explored c24r12', brief: 'veldt' }), r('water', { hex: 'c24r12' }), r('natives', { hex: 'c24r12', brief: 'tribe 1, 8 warriors' }), r('action'), r('hunting', { op: 'End of turn' })];
    const entries = entriesOf(lines, 10);
    expect(entries.map((e) => [e.summary, e.lines.length, e.index])).toEqual([[null, 1, 10], ['Explored c24r12 => Veldt; tribe 1, 8 warriors', 4, 14], [null, 1, 15], ['End of turn', 1, 16]]);
    expect(entries.map(hasMore)).toEqual([false, true, false, true]);
  });
  it('tells lines no rule has named one by one, and offers the asks of a line that has them', () => {
    const entries = entriesOf([r('lost-check', { hex: 'c1r1' }), r('terrain', { hex: 'c1r1' }), r('cache', { asks: [{ prompt: 'p', values: [3], result: '=> Recovered' }] })]);
    expect(entries.map((e) => e.summary)).toEqual([null, null, null]);
    expect(entries.map(hasMore)).toEqual([false, false, true]);
  });
});
