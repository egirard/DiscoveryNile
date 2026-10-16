import { test, expect, type Page } from '@playwright/test';
import { TestStepHelper } from '../helpers/test-step-helper';
import { takeCards } from '../helpers/cards';
import { endTurnFromRail } from '../helpers/turn';

async function commission(page: Page, seat: string) {
  await page.getByTestId(`seat-join-${seat}`).click();
  await page.getByTestId(`commission-${seat}`).click();
  await expect(page.getByTestId(`explorer-token-${seat}`)).toBeVisible();
}
const state = (page: Page) => page.evaluate(() => window.__TABLETOP__!.getState());
/** End the current seat's turn, discarding first if it is over the hand limit. */
async function passTurn(page: Page) {
  const s = await state(page);
  const seat = s.turn!.current;
  if (s.turn!.phase === 'discard') {
    const hand = s.explorers.find((e) => e.seat === seat)!.hand;
    await page.getByTestId(`card-${hand[0]}-${seat}`).click();
  }
  await endTurnFromRail(page, seat);
}
async function tap(page: Page, id: string, times: number) {
  for (let i = 0; i < times; i++) await page.getByTestId(id).click();
}
async function outfit(page: Page, seat: string, purchases: Record<string, number>) {
  await expect(page.getByTestId(`expedition-chart-${seat}`)).toBeVisible();
  for (const [item, n] of Object.entries(purchases)) await tap(page, `buy-${item}-${seat}`, n % 10);
  await page.getByTestId(`chart-step-10-${seat}`).click();
  for (const [item, n] of Object.entries(purchases)) await tap(page, `buy-${item}-${seat}`, Math.floor(n / 10));
  await page.getByTestId(`confirm-outfit-${seat}`).click();
  await page.getByTestId(`confirm-outfit-yes-${seat}`).click();
  await expect(page.getByTestId(`chart-summary-${seat}`)).toBeVisible();
}

test.describe('024 - Return to Europe', () => {
  test('back at a port the explorer dismisses the expedition and sails home free; next turn he is in Europe drawing cards again', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'Return to Europe',
      'To publish, an explorer must get back to Europe. At any port of entry (landed there, or standing on its hex) the rail offers the voyage home: the men are dismissed with the supplies as their bonus, the chart is cleared, and the government pays the passage. The explorer is at sea for the rest of the round and back in Europe at the start of his next turn, when the Europe turn resumes with a card drawn. His markers, known hexes, specimens and good works stay with him for publishing (025).'
    );

    // Seed 863 as in scenarios 013, 014, 021 and 023: bottom-1 pays passage to Mombasa and keeps $700. Hunting 1,1.
    await page.goto('/table/?new=1&gameId=ABCDE&seed=863&dice=6,6,6,6,1,1,1,1&dice-hunting=1,1');
    await commission(page, 'bottom-1');
    await commission(page, 'top-1');
    await page.getByTestId('start-game').click();
    await takeCards(page); // the hands dealt wait in full at the edges (prompt 44)
    expect((await state(page)).turn!.current).toBe('bottom-1');
    await page.getByTestId('sail-bottom-1').click();
    await page.getByTestId('choose-port-mombasa').click();
    await page.getByTestId('confirm-sail-bottom-1').click();
    await passTurn(page);
    await passTurn(page); // round 2: bottom-1 lands at Mombasa and that turn is skipped
    await passTurn(page);
    await outfit(page, 'bottom-1', { askaris: 5, bearers: 15, food: 100 });
    await expect(page.getByTestId('sail-home-bottom-1')).toBeVisible(); // in port: the way home is open
    await page.getByTestId('move-target-c25r11').click();
    await expect(page.getByTestId('sail-home-bottom-1')).toHaveCount(0); // in the field: not from here
    await passTurn(page);
    await passTurn(page);
    await page.getByTestId('move-target-c25r12').click();
    await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c25r12');
    await expect(page.getByTestId('sail-home-bottom-1')).toBeVisible();
    await page.getByTestId('sail-home-bottom-1').click();

    await steps.step('homeward', {
      description: 'Back on Mombasa\'s hex the explorer dismisses the expedition and sails: the token shows at sea, the chart is gone, and the rail notes the free passage',
      verifications: [
        { spec: 'The token is at sea and the chart summary is gone; the state records the homeward voyage', check: async () => {
          await expect(page.getByTestId('at-sea-bottom-1')).toBeVisible();
          await expect(page.getByTestId('chart-summary-bottom-1')).toHaveCount(0);
          await expect(page.getByTestId('cache-note-bottom-1')).toHaveText('the expedition is dismissed at Mombasa; passage home is free');
          const s = await state(page);
          const e = s.explorers.find((x) => x.seat === 'bottom-1')!;
          expect(e.location).toEqual({ kind: 'homeward', port: 'mombasa' });
          expect(e.chart).toBeNull();
          expect(e.known).toEqual(['c25r12', 'c25r11']);
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    await passTurn(page);
    await passTurn(page);

    await steps.step('back-in-europe', {
      description: 'The next turn opens in Europe: a donation card is drawn, the sail control is back, and the hexes he walked stay known to him',
      verifications: [
        { spec: 'The explorer is in Europe with one card and the sail control; c25r11 (pre-printed veldt, so never marked) stays known to him', check: async () => {
          await expect(page.getByTestId('explorer-token-bottom-1')).toHaveAttribute('data-location', 'europe');
          await expect(page.getByTestId('hand-bottom-1')).toHaveAttribute('data-count', '1');
          await expect(page.getByTestId('sail-bottom-1')).toBeVisible();
          const s = await state(page);
          expect(s.turn).toMatchObject({ current: 'bottom-1', round: 5 });
          expect(s.explorers.find((x) => x.seat === 'bottom-1')!.location).toEqual({ kind: 'europe' });
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    steps.generateDocs();
  });
});
