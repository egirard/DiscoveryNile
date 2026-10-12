import { eventId, REDUCER_VERSION, SCHEMA_VERSION, type GameEvent, type GameEventType } from './events';

let seq = 0;

export function resetSequence() {
  seq = 0;
}

export function event(
  type: GameEventType,
  payload: Record<string, unknown> = {},
  actorUid = 'host'
): GameEvent {
  seq += 1;
  return {
    id: eventId(actorUid, seq),
    type,
    payload,
    actorUid,
    clientSeq: seq,
    createdAtMillis: 1_700_000_000_000 + seq,
    schemaVersion: SCHEMA_VERSION,
    reducerVersion: REDUCER_VERSION
  };
}

export const created = (gameId = 'ABCDE', seats = { bottom: 1, top: 1, left: 1, right: 1 }, seed = 1234) =>
  event('game/created', { gameId, seats, seed });
