import { beforeEach, describe, expect, it } from 'vitest';
import { reduce } from '$lib/game/reduce';
import { created, event, resetSequence } from '$lib/game/test-fixtures';

beforeEach(resetSequence);

describe('game/created', () => {
  it('creates the seats for the layout, all empty', () => {
    const s = reduce([created('ABCDE', { bottom: 2, top: 1, left: 0, right: 0 })]);
    expect(s.gameId).toBe('ABCDE');
    expect(s.hostUid).toBe('host');
    expect(s.seats.map((x) => x.id)).toEqual(['bottom-1', 'bottom-2', 'top-1']);
    expect(s.seats.every((x) => x.uid === null)).toBe(true);
  });
  it('rejects a second creation', () => {
    const s = reduce([created(), created()]);
    expect(s.diagnostics[0].reason).toBe('game already created');
  });
});

describe('seat/taken', () => {
  it('seats an actor with a name', () => {
    const s = reduce([created(), event('seat/taken', { seat: 'bottom-1', name: 'Ada' }, 'p1')]);
    expect(s.seats[0]).toEqual({ id: 'bottom-1', uid: 'p1', name: 'Ada' });
    expect(s.diagnostics).toEqual([]);
  });
  it('rejects a taken seat but lets the same actor re-take it', () => {
    const s = reduce([
      created(),
      event('seat/taken', { seat: 'bottom-1' }, 'p1'),
      event('seat/taken', { seat: 'bottom-1' }, 'p2'),
      event('seat/taken', { seat: 'bottom-1', name: 'Ada' }, 'p1')
    ]);
    expect(s.diagnostics.map((d) => d.reason)).toEqual(['seat bottom-1 is taken']);
    expect(s.seats[0].name).toBe('Ada');
  });
  it('uses payload.uid as the occupant when the host appends for a tap or a phone', () => {
    const s = reduce([created(), event('seat/taken', { seat: 'bottom-1', uid: 'table:bottom-1' }), event('seat/taken', { seat: 'top-1', uid: 'phone:abc', name: 'Bo' })]);
    expect(s.seats.map((x) => x.uid)).toEqual(['table:bottom-1', null, 'phone:abc', null]);
    expect(s.diagnostics).toEqual([]);
  });
  it('rejects a second seat for the same occupant', () => {
    const s = reduce([created(), event('seat/taken', { seat: 'bottom-1' }, 'p1'), event('seat/taken', { seat: 'top-1' }, 'p1')]);
    expect(s.diagnostics[0].reason).toBe('occupant already seated');
  });
  it('rejects unknown and malformed seats', () => {
    const s = reduce([created(), event('seat/taken', { seat: 'bottom-9' }), event('seat/taken', { seat: 'x' })]);
    expect(s.diagnostics.map((d) => d.reason)).toEqual(['no such seat bottom-9', 'seat/taken needs a valid seat id']);
  });
});

describe('seat/left', () => {
  it('frees the seat', () => {
    const s = reduce([created(), event('seat/taken', { seat: 'left-1' }, 'p1'), event('seat/left', {}, 'p1')]);
    expect(s.seats.find((x) => x.id === 'left-1')).toEqual({ id: 'left-1', uid: null, name: null });
  });
  it('rejects leaving when not seated', () => {
    expect(reduce([created(), event('seat/left', {}, 'p1')]).diagnostics[0].reason).toBe('occupant is not seated');
  });
});
