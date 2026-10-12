import { beforeEach, describe, expect, it } from 'vitest';
import { createLocalRepository, localGameExists, localHostUid } from './local-repository';

beforeEach(() => localStorage.clear());

describe('createLocalRepository', () => {
  it('delivers appended events to subscribers and persists them', async () => {
    const repo = createLocalRepository('ABCDE', 'host');
    const seen: number[] = [];
    repo.subscribe((events) => seen.push(events.length), () => {});
    await repo.append('game/created', { gameId: 'ABCDE', seats: { bottom: 1, top: 0, left: 0, right: 0 } });
    expect(seen).toEqual([0, 1]);
    expect(localGameExists('ABCDE')).toBe(true);

    const again = createLocalRepository('ABCDE', 'host');
    let reloaded = 0;
    again.subscribe((events) => (reloaded = events.length), () => {});
    expect(reloaded).toBe(1);
  });
  it('continues the per-actor sequence after a reload', async () => {
    const first = createLocalRepository('ABCDE', 'host');
    await first.append('game/created', {});
    const second = createLocalRepository('ABCDE', 'host');
    await second.append('seat/taken', { seat: 'bottom-1' });
    let ids: string[] = [];
    second.subscribe((e) => (ids = e.map((x) => x.id)), () => {});
    expect(ids).toEqual(['host-00000001', 'host-00000002']);
  });
});

describe('localHostUid', () => {
  it('is stable per browser', () => expect(localHostUid()).toBe(localHostUid()));
});
