import { test, expect, type Page } from '@playwright/test';
import { TestStepHelper } from '../helpers/test-step-helper';
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

test.describe('023 - Caches and reorganisation', () => {
  test('goods are cached under a marker and men dismissed from a panel at the edge; the cache is dug up on a later turn with a die', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'Caches and reorganisation',
      'On any turn the expedition can be reorganised from the camp panel at the player\'s edge: rations, gifts, muskets and canoes are cached on the hex under a cache marker in the seat colour; guides, bearers and askaris are dismissed and vanish; camels and horses are turned loose or eaten for ten rations each. The panel shows how the expedition as it stands can move, lists the caches on the hex with what each holds, and gives goods back out of a cache made this turn item by item. Returning to a cache of one\'s own on a later turn, a die is rolled: on a 1 or 2 it has disappeared, otherwise its goods rejoin the chart. Other explorers\' caches are only findable once the hex is published.'
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
    // The panel is dragged by its title (prompt 45): up and to the right, out of the way of the board's edge.
    const campPanel = page.getByTestId('reorganise-edge-bottom-1');
    const campHome = (await campPanel.boundingBox())!;
    const campTitle = (await page.getByTestId('reorganise-panel-bottom-1').getByText('Camp', { exact: true }).boundingBox())!;
    await page.mouse.move(campTitle.x + campTitle.width / 2, campTitle.y + campTitle.height / 2);
    await page.mouse.down();
    await page.mouse.move(campTitle.x + campTitle.width / 2 + 60, campTitle.y + campTitle.height / 2 - 140, { steps: 5 });
    await page.mouse.up();
    await expect(campPanel).toHaveAttribute('data-moved', 'true');

    await steps.step('camp-dragged', {
      description: 'The camp panel is dragged by its title sixty pixels right and a hundred and forty up, with no handle or other affordance: a panel at the edge can be moved out of the way while it is open',
      verifications: [
        { spec: 'The panel stands where it was dragged, its controls still working; nothing in the game changed', check: async () => {
          const moved = (await campPanel.boundingBox())!;
          expect(Math.round(moved.x - campHome.x)).toBe(60);
          expect(Math.round(moved.y - campHome.y)).toBe(-140);
          await expect(page.getByTestId('reorganise-step-bottom-1')).toBeVisible();
          expect((await state(page)).caches).toEqual({});
        } }
      ]
    });

    // Closed and opened again, the panel is back in its place: the move is forgotten with the panel.
    await page.getByTestId('reorganise-close-bottom-1').click();
    await expect(page.getByTestId('reorganise-panel-bottom-1')).toHaveCount(0);
    await page.getByTestId('reorganise-bottom-1').click();
    await expect(page.getByTestId('reorganise-panel-bottom-1')).toBeVisible();
    await expect(campPanel).toHaveAttribute('data-moved', 'false');
    expect((await campPanel.boundingBox())!).toEqual(campHome);
    await page.getByTestId('reorganise-step-bottom-1').click(); // ×10
    await tap(page, 'cache-food-bottom-1', 2);
    await page.getByTestId('cache-muskets-bottom-1').click();
    await page.getByTestId('reorganise-step-bottom-1').click(); // ×1
    await tap(page, 'dismiss-bearers-bottom-1', 5);

    await steps.step('cached', {
      description: 'On the veldt north of Mombasa twenty rations and five muskets are cached under the bottom seat\'s marker, and five bearers are dismissed, the eight taps one line at the rail: the chart shows 80 rations, no muskets and 10 bearers; the panel shows the cached goods in a column to the right of the expedition\'s, item by item, with the control that takes them back between the two columns, and how the lightened expedition can move',
      verifications: [
        { spec: 'The cached column holds 20 food and 5 muskets, each with its take-back control between the columns; the muskets\' row stays though none are left; the movement notes count 15 people', check: async () => {
          await expect(page.getByTestId('cache-row-1-bottom-1')).toHaveAttribute('data-open', 'true');
          await expect(page.getByTestId('cache-item-food-1-bottom-1')).toHaveAttribute('data-count', '20');
          await expect(page.getByTestId('cache-item-muskets-1-bottom-1')).toHaveAttribute('data-count', '5');
          await expect(page.getByTestId('take-food-1-bottom-1')).toBeVisible();
          await expect(page.getByTestId('take-muskets-1-bottom-1')).toBeVisible();
          await expect(page.getByTestId('reorganise-row-muskets-bottom-1').locator('.have').first()).toHaveAttribute('data-count', '0');
          await expect(page.getByTestId('cache-muskets-bottom-1')).toHaveCount(0);
          await expect(page.getByTestId('cache-contents-1-bottom-1')).toHaveCount(0);
          await expect(page.getByTestId('recover-cache-1-bottom-1')).toHaveCount(0);
          await expect(page.getByTestId('camp-capacity-bottom-1')).toHaveAttribute('data-people', '16');
          await expect(page.getByTestId('mode-foot-bottom-1')).toHaveAttribute('data-ok', 'true');
        } },
        { spec: 'A cache marker in the seat colour sits on c25r11; the chart has 80 food, 10 bearers and no muskets; the eight taps are one line of the log', check: async () => {
          await expect(page.getByTestId('cache-c25r11-bottom-1')).toBeAttached();
          await expect(page.getByTestId('have-food-bottom-1')).toHaveAttribute('data-count', '80');
          await expect(page.getByTestId('have-bearers-bottom-1')).toHaveAttribute('data-count', '10');
          await expect(page.getByTestId('have-muskets-bottom-1')).toHaveCount(0);
          await expect(page.getByTestId('cache-note-bottom-1').last()).toHaveText('20 food, 5 muskets cached; 5 bearers dismissed'); // one line for the camp (prompt 39)
          const s = await state(page);
          expect(Object.values(s.caches)).toEqual([{ id: 1, hex: 'c25r11', seat: 'bottom-1', round: 3, contents: { food: 20, muskets: 5 } }]);
          expect(s.explorers.find((e) => e.seat === 'bottom-1')!.chart).toMatchObject({ food: 80, muskets: 0, bearers: 10 });
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    await page.getByTestId('reorganise-step-bottom-1').click(); // ×10
    await page.getByTestId('take-food-1-bottom-1').click();
    await page.getByTestId('reorganise-step-bottom-1').click(); // ×1

    await steps.step('taken-back', {
      description: 'Ten of the cached rations are taken back with the control between the columns: the chart has 90 rations and the cached column holds ten with the muskets',
      verifications: [
        { spec: 'The cached column holds 10 food and 5 muskets, the chart 90 food; the camp\'s line grew by the taking', check: async () => {
          await expect(page.getByTestId('cache-item-food-1-bottom-1')).toHaveAttribute('data-count', '10');
          await expect(page.getByTestId('cache-item-muskets-1-bottom-1')).toHaveAttribute('data-count', '5');
          await expect(page.getByTestId('have-food-bottom-1')).toHaveAttribute('data-count', '90');
          await expect(page.getByTestId('cache-note-bottom-1').last()).toHaveText('20 food, 5 muskets cached; 5 bearers dismissed; 10 food taken back from the cache');
          const s = await state(page);
          expect(s.caches[1].contents).toEqual({ food: 10, muskets: 5 });
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
    await expect(page.getByTestId('cache-row-1-bottom-1')).toHaveAttribute('data-open', 'false');
    await expect(page.getByTestId('cache-contents-1-bottom-1')).toHaveText('10 food, 5 muskets');
    await expect(page.getByTestId('take-food-1-bottom-1')).toHaveCount(0);
    await expect(page.getByTestId('recover-cache-1-bottom-1')).toBeVisible();
    await page.getByTestId('recover-cache-1-bottom-1').click();

    await steps.step('recovered', {
      description: 'Next turn the panel lists the cache with its ten rations and five muskets, to be dug up rather than taken from; digging it up rolls a 5, so the goods rejoin the chart and the marker is lifted',
      verifications: [
        { spec: 'The cache die and note show at the rail; the marker is gone; the chart regains the goods', check: async () => {
          await expect(page.getByTestId('cache-note-bottom-1').last()).toHaveText('the cache is recovered on a 5 (1 or 2 and it would be gone): 10 food, 5 muskets');
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
