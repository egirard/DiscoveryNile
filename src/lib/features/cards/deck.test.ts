import { describe, expect, it } from 'vitest';
import { CARDS, CARD_IDS, card, handValue, isCardId } from './deck';

describe('the deck (deck CSV at the pin)', () => {
  it('has 48 cards numbered 1 to 48', () => {
    expect(CARDS).toHaveLength(48);
    expect(CARDS.map((c) => c.number)).toEqual([...Array(48).keys()].map((i) => i + 1));
    expect(new Set(CARD_IDS).size).toBe(48);
  });
  it('splits into 33 money donations, 12 free tickets and 3 cards with no donation (RQ-12)', () => {
    const kinds = CARDS.map((c) => c.donation.kind);
    expect(kinds.filter((k) => k === 'money')).toHaveLength(33);
    expect(kinds.filter((k) => k === 'ticket')).toHaveLength(12);
    expect(kinds.filter((k) => k === 'none')).toHaveLength(3);
  });
  it('tickets name real ports with normalised ids (RQ-11)', () => {
    const ports = CARDS.filter((c) => c.donation.kind === 'ticket').map((c) => (c.donation as { port: string }).port).sort();
    expect(ports).toEqual(['benguela', 'brass', 'calabar', 'capetown', 'durban', 'kilwa', 'lourenco-marques', 'luanda', 'mombasa', 'port-elizabeth', 'quilimane', 'zanzibar']);
  });
  it('money ranges from $5 to $500 and includes the two whimsical specials', () => {
    const amounts = CARDS.filter((c) => c.donation.kind === 'money').map((c) => (c.donation as { amount: number }).amount);
    expect(Math.min(...amounts)).toBe(5);
    expect(Math.max(...amounts)).toBe(500);
    expect(card('card-4').donation).toMatchObject({ kind: 'money', amount: 77 });
    expect(card('card-10').donation).toMatchObject({ kind: 'money', amount: 5 });
  });
  it('keeps the disaster face', () => {
    expect(card('card-1').disaster.context).toBe('VELDT');
    expect(card('card-29').disaster.type).toContain('Cannibals');
  });
  it('values a hand by its money only', () => {
    expect(handValue(['card-1', 'card-2', 'card-8'])).toBe(200);
    expect(isCardId('card-48')).toBe(true);
    expect(isCardId('card-49')).toBe(false);
    expect(() => card('card-49')).toThrow();
  });
});
