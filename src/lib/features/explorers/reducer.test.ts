import { beforeEach, describe, expect, it } from 'vitest';
import { reduce } from '$lib/game/reduce';
import { created, event, resetSequence } from '$lib/game/test-fixtures';

beforeEach(resetSequence);

const seated = () => [created(), event('seat/taken', { seat: 'bottom-1', uid: 'table:bottom-1' })];

describe('explorer/commissioned', () => {
  it('creates an explorer in Europe for a taken seat, with its specialties in canonical order', () => {
    const s = reduce([...seated(), event('explorer/commissioned', { seat: 'bottom-1', specialties: ['zoology', 'medicine'] })]);
    expect(s.explorers).toEqual([{ seat: 'bottom-1', specialties: ['medicine', 'zoology'], location: { kind: 'europe' }, sick: { explorer: false, guides: 0, bearers: 0, askaris: 0, animals: 0 }, hand: [], drawnRound: {}, money: 0, chart: null, lastMeal: null, known: [], cameFrom: null, poisonBonus: 0 }]);
    expect(s.diagnostics).toEqual([]);
  });
  it('allows an ordinary explorer with no specialties and one with all four', () => {
    const s = reduce([
      ...seated(),
      event('seat/taken', { seat: 'top-1', uid: 'table:top-1' }),
      event('explorer/commissioned', { seat: 'bottom-1', specialties: [] }),
      event('explorer/commissioned', { seat: 'top-1', specialties: ['geology', 'zoology', 'medicine', 'evangelism', 'geology'] })
    ]);
    expect(s.explorers.map((e) => e.specialties)).toEqual([[], ['evangelism', 'medicine', 'zoology', 'geology']]);
  });
  it('rejects an empty seat, an unknown seat, a second explorer, and bad specialties', () => {
    const s = reduce([
      ...seated(),
      event('explorer/commissioned', { seat: 'top-1', specialties: [] }),
      event('explorer/commissioned', { seat: 'bottom-9', specialties: [] }),
      event('explorer/commissioned', { seat: 'bottom-1', specialties: ['alchemy'] }),
      event('explorer/commissioned', { seat: 'bottom-1', specialties: [] }),
      event('explorer/commissioned', { seat: 'bottom-1', specialties: [] })
    ]);
    expect(s.diagnostics.map((d) => d.reason)).toEqual([
      'seat top-1 is empty',
      'no such seat bottom-9',
      'explorer/commissioned needs a list of specialties',
      'seat bottom-1 already has an explorer'
    ]);
    expect(s.explorers).toHaveLength(1);
  });
});
