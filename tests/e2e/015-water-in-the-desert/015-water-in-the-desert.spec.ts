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

test.describe('015 - Water in the desert', () => {
  test('water is taken where there is water, drunk each evening in the dry desert, and its lack kills', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'Water in the desert',
      'Water is free wherever there is water, so on the camp panel the explorer can take or pour out water rations ten at a time; each weighs four food rations. In a desert hex with neither river nor known oasis the evening costs one water ration per man and four per horse or camel. When the water runs short the guides, then bearers, then askaris go without and die; thirsty animals are shot for their meat.'
    );

    // Seed 2 with the dice script 6,6,6,6 1,1,1,1 (roll-off: bottom-1 first) and hunting 1,1 (no game in the
    // desert either night). Shuffles are not scripted: with this seed bottom-1 pays passage to Khartoum and keeps
    // $750, and the first two disaster cards drawn in the desert are for the mountain (37) and the jungle (6).
    await page.goto('/table/?new=1&gameId=ABCDE&seed=2&dice=6,6,6,6,1,1,1,1&dice-hunting=1,1');
    await commission(page, 'bottom-1');
    await commission(page, 'top-1');
    await page.getByTestId('start-game').click();
    expect((await state(page)).turn!.current).toBe('bottom-1');
    await page.getByTestId('sail-bottom-1').click();
    await page.getByTestId('choose-port-khartoum').click();
    await page.getByTestId('confirm-sail-bottom-1').click();
    await passTurn(page);
    await passTurn(page); // round 2: bottom-1 lands at Khartoum and that turn is skipped
    await passTurn(page);
    await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c20r1');
    await outfit(page, 'bottom-1', { bearers: 10, askaris: 2, camels: 3, food: 40 });
    // Water is taken on the camp panel, opened from the rail (prompt 34).
    await page.getByTestId('reorganise-bottom-1').click();
    await expect(page.getByTestId('camp-water-bottom-1')).toHaveAttribute('data-count', '0');
    await expect(page.getByTestId('pour-water-bottom-1')).toHaveCount(0);
    await tap(page, 'take-water-bottom-1', 3);

    await steps.step('water-taken', {
      description: 'At Khartoum, on the Nile, the caravan of thirteen men and three camels fills thirty water rations with three taps on the camp panel, which shows the water with the pour-out control beside it, and how the caravan can move with the load',
      verifications: [
        { spec: 'The chart and the panel show 30 water; the take and pour controls are on the panel, with the movement notes', check: async () => {
          await expect(page.getByTestId('have-water-bottom-1')).toHaveAttribute('data-count', '30');
          await expect(page.getByTestId('camp-water-bottom-1')).toHaveAttribute('data-count', '30');
          await expect(page.getByTestId('take-water-bottom-1')).toBeVisible();
          await expect(page.getByTestId('pour-water-bottom-1')).toBeVisible();
          await expect(page.getByTestId('camp-capacity-bottom-1')).toHaveAttribute('data-people', '13');
          await expect(page.getByTestId('camp-capacity-bottom-1')).toHaveAttribute('data-load', '160'); // 40 rations and 30 water at four each
          await expect(page.getByTestId('camp-capacity-bottom-1')).toHaveAttribute('data-carry', '150'); // nine bearers at 10, the tenth leading the three camels at 20 each
          await expect(page.getByTestId('mode-foot-bottom-1')).toHaveAttribute('data-ok', 'false');
          const s = await state(page);
          expect(s.explorers.find((e) => e.seat === 'bottom-1')!.chart).toMatchObject({ water: 30, food: 40, bearers: 10, askaris: 2, camels: 3 });
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    await page.getByTestId('reorganise-close-bottom-1').click();
    await page.getByTestId('move-target-c21r1').click();
    await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c21r1');
    await page.getByTestId('reorganise-bottom-1').click(); // a dry desert hex: no water to take
    await expect(page.getByTestId('water-controls-bottom-1')).toHaveCount(0);
    await expect(page.getByTestId('no-water-bottom-1')).toHaveText('no water here');
    await page.getByTestId('reorganise-close-bottom-1').click();
    await passTurn(page);

    await steps.step('dry-camp', {
      description: 'The caravan camps in the dry desert west of the Nile: no game, thirteen rations eaten, and twenty-five water drunk, five left',
      verifications: [
        { spec: 'The meal note reads the evening\'s food and water; the chart shows 27 food and 5 water', check: async () => {
          await expect(page.getByTestId('meal-note-bottom-1')).toHaveText('no game, 13 men ate (13 from the stores); drank 25 water, 5 left');
          await expect(page.getByTestId('have-water-bottom-1')).toHaveAttribute('data-count', '5');
          await expect(page.getByTestId('have-food-bottom-1')).toHaveAttribute('data-count', '27');
          const s = await state(page);
          expect(s.explorers.find((e) => e.seat === 'bottom-1')!.chart).toMatchObject({ water: 5, food: 27 });
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    await passTurn(page); // top-1; round 4: bottom-1 draws a mountain card (no effect) and stays put
    await expect(page.getByTestId('turn-marker-bottom-1')).toHaveAttribute('data-current', 'true');
    await passTurn(page);

    await steps.step('thirst', {
      description: 'The second night only five rations remain: the explorer and the askaris drink, two bearers get the last of it, eight bearers die of thirst and the three camels are shot for their meat',
      verifications: [
        { spec: 'The meal note tells of the deaths; the chart shows 2 bearers, no camels, no water and 44 food', check: async () => {
          await expect(page.getByTestId('meal-note-bottom-1')).toHaveText('no game, 13 men ate (13 from the stores); drank 5 water, 8 bearers died of thirst, 3 camels shot for want of water (30 rations)');
          await expect(page.getByTestId('have-bearers-bottom-1')).toHaveAttribute('data-count', '2');
          await expect(page.getByTestId('have-camels-bottom-1')).toHaveCount(0);
          await expect(page.getByTestId('have-water-bottom-1')).toHaveCount(0);
          await expect(page.getByTestId('have-food-bottom-1')).toHaveAttribute('data-count', '44');
          const s = await state(page);
          const e = s.explorers.find((x) => x.seat === 'bottom-1')!;
          expect(e.chart).toMatchObject({ bearers: 2, askaris: 2, camels: 0, water: 0, food: 44 });
          expect(e.sick.explorer).toBe(false);
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    steps.generateDocs();
  });
});
