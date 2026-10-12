import type { GameRepository } from './game-repository';
import { createLocalRepository, localHostUid } from './local-repository';

export type BackendName = 'local' | 'firebase';

export function selectBackend(search = typeof location === 'undefined' ? '' : location.search): BackendName {
  const q = new URLSearchParams(search);
  if (q.get('local') === '1') return 'local';
  if (q.get('firebase') === '1') return 'firebase';
  const env = (import.meta.env.VITE_DEFAULT_BACKEND as string | undefined) ?? 'local';
  return env === 'firebase' ? 'firebase' : 'local';
}

/**
 * Open the repository for a game. Firebase is loaded on demand only when selected, so
 * local-only builds never pull the SDK; without configuration it falls back to local.
 */
export async function openRepository(gameId: string): Promise<{ repository: GameRepository; actorUid: string; backend: BackendName }> {
  const backend = selectBackend();
  if (backend === 'firebase') {
    // Reference: see docs/state-and-persistence.md. A project that uses Firebase adds
    // `firebase` to dependencies and implements ./firebase-repository.ts after jaipur's.
    console.warn('Firebase backend requested but not configured in this template; using local.');
  }
  const actorUid = localHostUid();
  return { repository: createLocalRepository(gameId, actorUid), actorUid, backend: 'local' };
}
