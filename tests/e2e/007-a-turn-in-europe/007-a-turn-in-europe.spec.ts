import { test, expect, type Page } from '@playwright/test';
import { TestStepHelper } from '../helpers/test-step-helper';

async function commission(page: Page, seat: string) {
  await page.getByTestId(`seat-join-${seat}`).click();
  await page.getByTestId(`commission-${seat}`).click();
  await expect(page.getByTestId(`explorer-token-${seat}`)).toBeVisible();
}

const state = (page: Page) => page.evaluate(() => window.__TABLETOP__!.getState());

async function endTurn(page: Page, seat: string) {
  await page.getByTestId(`end-turn-${seat}`).click();
  await page.getByTestId(`confirm-end-turn-${seat}`).click();
  await expect(page.getByTestId(`turn-marker-${seat}`)).toHaveAttribute('data-current', 'false');
}

test.describe('007 - A turn in Europe', () => {
  test('a Europe turn draws a card, ends with confirmation, expires free tickets, and enforces the hand limit', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'A turn in Europe',
      'Each turn an explorer stays in Europe: expired free tickets are discarded, a hand above five must be trimmed by tapping cards, then one card is drawn. The current seat alone shows the hourglass that ends the turn (to wait is the other choice besides sailing); a tap puts the check mark on the hourglass itself with the "✕" to its left, in the ship\'s place, and the turn passes clockwise once confirmed. Money raised is totalled at each rail.'
    );

    await page.goto('/table/?new=1&gameId=ABCDE&seed=1234');
    await commission(page, 'bottom-1');
    await commission(page, 'top-1');
    await page.getByTestId('start-game').click();
    const s0 = await state(page);
    const first = s0.turn!.current;
    const second = first === 'bottom-1' ? 'top-1' : 'bottom-1';

    await steps.step('turn-begins-draw', {
      description: 'The first player has drawn a sixth card as the turn begins; only that seat shows the ship and the hourglass, and a money total; the roll for first player is the other seat\'s latest line',
      verifications: [
        { spec: 'The current seat holds six cards and the other five; the draw pile is 37', check: async () => {
          await expect(page.getByTestId(`hand-${first}`)).toHaveAttribute('data-count', '6');
          await expect(page.getByTestId(`hand-${second}`)).toHaveAttribute('data-count', '5');
          await expect(page.getByTestId('deck-draw')).toHaveAttribute('data-count', '37');
        } },
        { spec: 'The hourglass is offered at the current seat only, and no discard is pending', check: async () => {
          await expect(page.getByTestId(`end-turn-${first}`)).toBeVisible();
          await expect(page.locator('[data-testid^="end-turn-"]')).toHaveCount(1);
          await expect(page.locator('[data-testid^="discard-prompt-"]')).toHaveCount(0);
        } },
        { spec: 'The first player\'s latest line is the card drawn; the other seat\'s is its roll for first player, with four dice and no dice at the rail besides', check: async () => {
          await expect(page.getByTestId(`action-note-${first}`)).toHaveText(/^drew /);
          await expect(page.getByTestId(`roll-first-player-${second}`).locator('.die')).toHaveCount(4);
          await expect(page.getByTestId(`roll-first-player-${second}`)).toHaveAttribute('data-outcome', /^total \d+$/);
          await expect(page.locator('[data-testid^="roll-off-"]')).toHaveCount(0);
        } },
        { spec: 'Each rail totals the money in its hand', check: async () => {
          const s = await state(page);
          for (const e of s.explorers) {
            const shown = await page.locator(`[data-testid^="card-"][data-testid$="-${e.seat}"][data-kind="money"] .amount`).allTextContents();
            const total = shown.reduce((sum, t) => sum + Number(t.replace('$', '')), 0);
            await expect(page.getByTestId(`money-${e.seat}`)).toHaveText(`$${total}`);
          }
        } }
      ]
    });

    await page.getByTestId(`end-turn-${first}`).click();

    await steps.step('hourglass-asks-to-confirm', {
      description: 'A tap on the hourglass: the check mark overlays the hourglass where it stands, and the ship\'s place to its left holds the "✕" that keeps the turn going',
      verifications: [
        { spec: 'The confirmation is on the hourglass and the cancel sits to its left, where the ship was', check: async () => {
          const confirm = page.getByTestId(`confirm-end-turn-${first}`);
          const cancel = page.getByTestId(`cancel-end-turn-${first}`);
          await expect(confirm).toBeVisible();
          await expect(cancel).toBeVisible();
          await expect(page.getByTestId(`sail-${first}`)).toHaveCount(0);
          await expect(page.getByTestId(`end-turn-${first}`)).toHaveCount(0);
          const [c, x] = await Promise.all([confirm.boundingBox(), cancel.boundingBox()]);
          expect(x!.x + x!.width).toBeLessThanOrEqual(c!.x + 1);
          expect(Math.abs(x!.y - c!.y)).toBeLessThan(2);
        } }
      ]
    });

    await page.getByTestId(`cancel-end-turn-${first}`).click();
    await expect(page.getByTestId(`end-turn-${first}`)).toBeVisible();
    await expect(page.getByTestId(`sail-${first}`)).toBeVisible();
    await endTurn(page, first);

    await steps.step('end-turn-confirmed', {
      description: 'After confirming, the turn marker moved clockwise; the next explorer drew a card, which is now its latest line; the roll for first player stays in the log behind it',
      verifications: [
        { spec: 'The second seat is current and has drawn to six; the first keeps six', check: async () => {
          await expect(page.getByTestId(`turn-marker-${second}`)).toHaveAttribute('data-current', 'true');
          await expect(page.getByTestId(`hand-${second}`)).toHaveAttribute('data-count', '6');
          await expect(page.getByTestId(`hand-${first}`)).toHaveAttribute('data-count', '6');
          await expect(page.getByTestId('deck-draw')).toHaveAttribute('data-count', '36');
        } },
        { spec: 'No roll for first player is at either rail now; the hourglass moved with the marker', check: async () => {
          await expect(page.locator('[data-testid^="roll-first-player-"]')).toHaveCount(0);
          await expect(page.getByTestId(`action-note-${second}`)).toHaveText(/^drew /);
          await expect(page.getByTestId(`end-turn-${second}`)).toBeVisible();
          await expect(page.getByTestId(`end-turn-${first}`)).toHaveCount(0);
          const s = await state(page);
          expect(s.turn).toMatchObject({ current: second, round: 1, phase: 'act' });
        } }
      ]
    });

    const s1 = await state(page);
    const openingTickets = s1.explorers.find((e) => e.seat === first)!.hand.filter((id) => isTicket(id));
    await endTurn(page, second);

    await steps.step('ticket-expires', {
      description: 'Round two: the first player\'s unused free tickets from the deal were discarded before drawing',
      verifications: [
        { spec: 'It is round 2 at the first seat; the opening tickets are in the discard pile and not in the hand', check: async () => {
          const s = await state(page);
          expect(s.turn).toMatchObject({ current: first, round: 2 });
          expect(openingTickets.length).toBeGreaterThan(0);
          for (const id of openingTickets) {
            expect(s.deck!.discard).toContain(id);
            await expect(page.getByTestId(`card-${id}-${first}`)).toHaveCount(0);
          }
          await expect(page.getByTestId('deck-discard')).toHaveAttribute('data-count', String(s.deck!.discard.length));
        } }
      ]
    });

    // Keep taking turns until a hand exceeds the limit at the start of a turn (bounded; deterministic for the seed).
    for (let i = 0; i < 12; i++) {
      const s = await state(page);
      if (s.turn!.phase === 'discard') break;
      await endTurn(page, s.turn!.current);
    }
    const sd = await state(page);
    expect(sd.turn!.phase).toBe('discard');
    const seat = sd.turn!.current;
    const over = sd.explorers.find((e) => e.seat === seat)!.hand;

    await steps.step('hand-limit', {
      description: 'A seat starts its turn with six cards: it must tap a card to discard before it can draw or end the turn',
      verifications: [
        { spec: 'The discard prompt is shown, the cards are tappable, and the end-turn control is withheld', check: async () => {
          await expect(page.getByTestId(`discard-prompt-${seat}`)).toBeVisible();
          await expect(page.getByTestId(`end-turn-${seat}`)).toHaveCount(0);
          expect(over.length).toBeGreaterThan(5);
          await expect(page.getByTestId(`card-${over[0]}-${seat}`)).toHaveClass(/selectable/);
        } }
      ]
    });

    await page.getByTestId(`card-${over[0]}-${seat}`).click();

    await steps.step('discarded-and-drawn', {
      description: 'The chosen card went to the discard pile, a card was drawn, and the turn may now end',
      verifications: [
        { spec: 'The hand is back to six with the chosen card gone and a new one drawn; the end-turn control is back', check: async () => {
          await expect(page.getByTestId(`card-${over[0]}-${seat}`)).toHaveCount(0);
          await expect(page.getByTestId(`hand-${seat}`)).toHaveAttribute('data-count', '6');
          await expect(page.getByTestId(`end-turn-${seat}`)).toBeVisible();
          const s = await state(page);
          expect(s.turn!.phase).toBe('act');
          expect(s.deck!.discard).toContain(over[0]);
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    steps.generateDocs();
  });
});

function isTicket(id: string): boolean {
  // Ticket card numbers from the deck CSV (docs/rules-reference).
  return [2, 15, 22, 30, 31, 32, 33, 34, 35, 36, 39, 43].includes(Number(id.replace('card-', '')));
}
