import { beforeEach, describe, expect, it } from 'vitest';
import { reduce } from './reduce';
import { created, event, resetSequence } from './test-fixtures';

beforeEach(resetSequence);

describe('reduce', () => {
  it('starts empty', () => {
    expect(reduce([])).toMatchObject({ gameId: null, seats: [], diagnostics: [] });
  });
  it('records a diagnostic for a duplicate id and does not apply it twice', () => {
    const c = created();
    const s = reduce([c, c]);
    expect(s.diagnostics).toEqual([{ eventId: c.id, reason: 'duplicate event id' }]);
    expect(s.seats).toHaveLength(4);
  });
  it('records a diagnostic for an incompatible version', () => {
    const bad = { ...created(), reducerVersion: 999 };
    expect(reduce([bad]).diagnostics[0].reason).toMatch(/incompatible version/);
  });
  it('records a diagnostic for an unknown type without changing state', () => {
    const s = reduce([created(), event('nope' as never)]);
    expect(s.seats).toHaveLength(4);
    expect(s.diagnostics[0].reason).toMatch(/unknown event type/);
  });
});
