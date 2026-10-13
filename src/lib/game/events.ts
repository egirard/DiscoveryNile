// The event envelope. The vocabulary of `type` grows slice by slice; the envelope does not.
export const SCHEMA_VERSION = 1;
export const REDUCER_VERSION = 1;

export type GameEventType = 'game/created' | 'seat/taken' | 'seat/left' | 'explorer/commissioned' | 'game/started' | 'turn/ended' | 'cards/discarded' | 'voyage/booked' | 'expedition/outfitted' | 'expedition/moved' | 'water/taken' | 'natives/policy' | 'natives/spoils' | 'natives/offered' | 'natives/traded' | 'natives/done' | 'specialty/performed' | 'expedition/reorganised' | 'cache/recovered' | 'expedition/returned' | 'hex/published' | 'explorer/retired' | 'expedition/joined' | 'expedition/split' | 'game/end-voted' | 'game/ended' | 'game/continued' | 'turn/undone';

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
