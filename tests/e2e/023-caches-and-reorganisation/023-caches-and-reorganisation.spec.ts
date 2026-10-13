import { test, expect, type Page } from '@playwright/test';
import { TestStepHelper } from '../helpers/test-step-helper';

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
  await page.getByTestId(`end-turn-${seat}`).click();
  await page.getByTestId(`confirm-end-turn-${seat}`).click();
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

test.describe('023 - Caches and reorganisation', () => {
  test('goods are cached under a marker and men dismissed from a panel at the edge; the cache is dug up on a later turn with a die', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'Caches and reorganisation',
      'On any turn the expedition can be reorganised from a panel at the player\'s edge: rations, gifts, muskets, canoes and water are cached on the hex under a cache marker in the seat colour; guides, bearers and askaris are dismissed and vanish; camels and horses are turned loose or eaten for ten rations each. Returning to a cache of one\'s own on a later turn, a die is rolled: on a 1 or 2 it has disappeared, otherwise its goods rejoin the chart. Other explorers\' caches are only findable once the hex is published.'
    );

    // Seed 863 as in scenarios 013, 014 and 021: bottom-1 pays passage to Mombasa and keeps $700; the disaster card the
    // next morning is card 1 (an askari killed). Hunting 1,1: no game. Cache die 5: the cache is recovered.
    await page.goto('/table/?new=1&gameId=ABCDE&seed=863&dice=6,6,6,6,1,1,1,1&dice-hunting=1,1&dice-cache=5');
    await commission(page, 'bottom-1');
    await commission(page, 'top-1');
    await page.getByTestId('start-game').click();
    expect((await state(page)).turn!.current).toBe('bottom-1');
    await page.getByTestId('sail-bottom-1').click();
    await page.getByTestId('choose-port-mombasa').click();
    await page.getByTestId('confirm-sail-bottom-1').click();
    await passTurn(page);
    await passTurn(page); // round 2: bottom-1 lands at Mombasa and that turn is skipped
    await passTurn(page);
    await outfit(page, 'bottom-1', { askaris: 5, bearers: 15, food: 100, muskets: 5 });
    await page.getByTestId('move-target-c25r11').click();
    await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c25r11');
    await page.getByTestId('reorganise-bottom-1').click();
    await expect(page.getByTestId('reorganise-panel-bottom-1')).toBeVisible();
    await page.getByTestId('reorganise-step-bottom-1').click(); // ×10
    await tap(page, 'cache-food-bottom-1', 2);
    await page.getByTestId('cache-muskets-bottom-1').click();
    await page.getByTestId('reorganise-step-bottom-1').click(); // ×1
    await tap(page, 'dismiss-bearers-bottom-1', 5);

    await steps.step('cached', {
      description: 'On the veldt north of Mombasa twenty rations and five muskets are cached under the bottom seat\'s marker, and five bearers are dismissed: the chart shows 80 rations, no muskets and 10 bearers',
      verifications: [
        { spec: 'A cache marker in the seat colour sits on c25r11; the chart has 80 food, 10 bearers and no muskets', check: async () => {
          await expect(page.getByTestId('cache-c25r11-bottom-1')).toBeAttached();
          await expect(page.getByTestId('have-food-bottom-1')).toHaveAttribute('data-count', '80');
          await expect(page.getByTestId('have-bearers-bottom-1')).toHaveAttribute('data-count', '10');
          await expect(page.getByTestId('have-muskets-bottom-1')).toHaveCount(0);
          await expect(page.getByTestId('cache-note-bottom-1').last()).toHaveText('1 bearer dismissed');
          const s = await state(page);
          expect(Object.values(s.caches)).toEqual([{ id: 1, hex: 'c25r11', seat: 'bottom-1', round: 3, contents: { food: 20, muskets: 5 } }]);
          expect(s.explorers.find((e) => e.seat === 'bottom-1')!.chart).toMatchObject({ food: 80, muskets: 0, bearers: 10 });
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    await page.getByTestId('reorganise-close-bottom-1').click();
    await expect(page.getByTestId('reorganise-panel-bottom-1')).toHaveCount(0);
    await passTurn(page);
    await passTurn(page);
    await expect(page.getByTestId('turn-marker-bottom-1')).toHaveAttribute('data-current', 'true');
    await page.getByTestId('reorganise-bottom-1').click();
    await expect(page.getByTestId('recover-cache-1-bottom-1')).toBeVisible();
    await page.getByTestId('recover-cache-1-bottom-1').click();

    await steps.step('recovered', {
      description: 'Next turn the panel lists the cache; digging it up rolls a 5, so the twenty rations and five muskets rejoin the chart and the marker is lifted',
      verifications: [
        { spec: 'The cache die and note show at the rail; the marker is gone; the chart regains the goods', check: async () => {
          await expect(page.getByTestId('cache-note-bottom-1').last()).toHaveText('the cache is recovered: 20 food, 5 muskets');
          await expect(page.getByTestId('cache-c25r11-bottom-1')).toHaveCount(0);
          await expect(page.getByTestId('have-muskets-bottom-1')).toHaveAttribute('data-count', '5');
          await expect(page.getByTestId('have-food-bottom-1')).toHaveAttribute('data-count', '84');
          const s = await state(page);
          expect(s.caches).toEqual({});
          expect(s.explorers.find((e) => e.seat === 'bottom-1')!.chart).toMatchObject({ food: 84, muskets: 5 });
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    steps.generateDocs();
  });
});
