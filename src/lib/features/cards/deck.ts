// The 48 cards: a donation face used in Europe and a disaster face used in Africa. Generated
// from the vendored deck CSV (the sole authority for card data, docs/rules-reference.md) by
// tools/cards/build.py. Port spellings are normalised to port ids (RQ-11).
import cards from './cards.json';
import type { PortId } from '$features/map/manifest';

export type CardId = `card-${number}`;

export type Donation =
  | { kind: 'money'; amount: number; note?: string }
  | { kind: 'ticket'; port: PortId }
  | { kind: 'none' };

export interface Card {
  id: CardId;
  number: number;
  disaster: { text: string; context: string; type: string };
  donation: Donation;
}

export const CARDS: readonly Card[] = cards as Card[];
export const CARD_IDS: readonly CardId[] = CARDS.map((c) => c.id);

const byId = new Map(CARDS.map((c) => [c.id, c] as const));

export function card(id: string): Card {
  const c = byId.get(id as CardId);
  if (!c) throw new Error(`no such card ${id}`);
  return c;
}

export function isCardId(id: unknown): id is CardId {
  return typeof id === 'string' && byId.has(id as CardId);
}

/** Money a hand is worth, ignoring tickets and blanks. */
export function handValue(ids: readonly CardId[]): number {
  return ids.reduce((sum, id) => {
    const d = card(id).donation;
    return sum + (d.kind === 'money' ? d.amount : 0);
  }, 0);
}
