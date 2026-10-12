// The event envelope. The vocabulary of `type` grows slice by slice; the envelope does not.
export const SCHEMA_VERSION = 1;
export const REDUCER_VERSION = 1;

export type GameEventType = 'game/created' | 'seat/taken' | 'seat/left' | 'explorer/commissioned' | 'game/started';

export interface GameEvent {
  id: string;
  type: GameEventType;
  payload: Record<string, unknown>;
  actorUid: string;
  clientSeq: number;
  createdAtMillis: number;
  schemaVersion: number;
  reducerVersion: number;
}

export function eventId(actorUid: string, clientSeq: number): string {
  return `${actorUid}-${String(clientSeq).padStart(8, '0')}`;
}
