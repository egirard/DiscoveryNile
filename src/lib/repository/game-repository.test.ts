import { beforeEach, describe, expect, it } from 'vitest';
import { orderEventStream } from './game-repository';
import { event, resetSequence } from '$lib/game/test-fixtures';

beforeEach(resetSequence);

describe('orderEventStream', () => {
  it('puts acknowledged events before pending ones and drops acknowledged duplicates', () => {
    const a = event('game/created');
    const b = event('seat/taken');
    const c = event('seat/left');
    const out = orderEventStream([b, a], [c, b]);
    expect(out.map((e) => e.id)).toEqual([a.id, b.id, c.id]);
  });
  it('breaks equal timestamps by id', () => {
    const a = { ...event('game/created'), createdAtMillis: 5 };
    const b = { ...event('seat/taken'), createdAtMillis: 5 };
    expect(orderEventStream([b, a], []).map((e) => e.id)).toEqual([a.id, b.id]);
  });
});
