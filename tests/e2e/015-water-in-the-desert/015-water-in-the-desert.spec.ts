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

test.describe('015 - Water in the desert', () => {
  test('water is carried of itself wherever there is water, told when poured away for want of room, drunk each evening in the dry desert, and its lack kills', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'Water in the desert',
      'Water is free wherever there is water, and the expedition carries as much of it as its bearers and animals have room for, of itself, wherever it stands by water (prompt 60); each ration weighs four food rations, so the water is the slack of the load, drawn again as the load lightens and poured away as the carriers go. Goods taken on crowd the water out, and the camp panel then says how much was brought and what to cache to carry it all again, so the player may keep the water and leave other things instead (prompt 61). In a dry desert hex nothing is drawn, and the camp panel offers to pour water out to lighten the load. In a desert hex with neither river nor known oasis the evening costs one water ration per man and four per horse or camel. When the water runs short the guides, then bearers, then askaris go without and die; thirsty animals are shot for their meat.'
    );

    // Seed 2 with the dice script 6,6,6,6 1,1,1,1 (roll-off: bottom-1 first) and hunting 1,1 (no game in the
    // desert either night). Shuffles are not scripted: with this seed bottom-1 pays passage to Khartoum and keeps
    // $750, and the first two disaster cards drawn in the desert are for the mountain (37) and the jungle (6).
    await page.goto('/table/?new=1&gameId=ABCDE&seed=2&dice=6,6,6,6,1,1,1,1&dice-hunting=1,1');
    await commission(page, 'bottom-1');
    await commission(page, 'top-1');
    await page.getByTestId('start-game').click();
    await takeCards(page); // the hands dealt wait in full at the edges (prompt 44)
    expect((await state(page)).turn!.current).toBe('bottom-1');
    await page.getByTestId('sail-bottom-1').click();
    await page.getByTestId('choose-port-khartoum').click();
    await page.getByTestId('confirm-sail-bottom-1').click();
    await passTurn(page);
    await passTurn(page); // round 2: bottom-1 lands at Khartoum and that turn is skipped
    await passTurn(page);
    await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c20r1');
    await outfit(page, 'bottom-1', { bearers: 10, askaris: 2, camels: 3, food: 30 });
    // The camp panel, opened from the rail (prompt 34), shows the water the caravan carries of itself at the Nile (prompt 60).
    await page.getByTestId('reorganise-bottom-1').click();
    await expect(page.getByTestId('camp-water-bottom-1')).toHaveAttribute('data-count', '30');

    await steps.step('water-carried', {
      description: 'At Khartoum, on the Nile, the caravan of thirteen men and three camels already carries thirty water rations, all its bearers and camels have room for beside the thirty rations of food: the camp panel shows the water with no control to take or pour it, the note that as much as can be carried is carried, and how the caravan can move with the load',
      verifications: [
        { spec: 'The chart and the panel show 30 water without a tap; no take or pour control, the note instead, with the movement notes', check: async () => {
          await expect(page.getByTestId('have-water-bottom-1')).toHaveAttribute('data-count', '30');
          await expect(page.getByTestId('camp-water-bottom-1')).toHaveAttribute('data-count', '30');
          await expect(page.getByTestId('take-water-bottom-1')).toHaveCount(0);
          await expect(page.getByTestId('pour-water-bottom-1')).toHaveCount(0);
          await expect(page.getByTestId('water-auto-bottom-1')).toHaveText('as much as can be carried');
          await expect(page.getByTestId('camp-capacity-bottom-1')).toHaveAttribute('data-people', '13');
          await expect(page.getByTestId('camp-capacity-bottom-1')).toHaveAttribute('data-load', '150'); // 30 rations and 30 water at four each: all the caravan carries (prompt 43)
          await expect(page.getByTestId('camp-capacity-bottom-1')).toHaveAttribute('data-carry', '150'); // nine bearers at 10, the tenth leading the three camels at 20 each
          await expect(page.getByTestId('mode-foot-bottom-1')).toHaveAttribute('data-ok', 'true'); // the whole load carried: the caravan may set out (prompt 43)
          const s = await state(page);
          expect(s.explorers.find((e) => e.seat === 'bottom-1')!.chart).toMatchObject({ water: 30, food: 30, bearers: 10, askaris: 2, camels: 3 });
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    // Goods taken on crowd water out (prompt 61): ten rations cached make room for two more water; taken back, the two
    // are poured away, and the panel says what was brought and what to cache to carry it all again.
    await page.getByTestId('reorganise-step-bottom-1').click(); // ×10
    await page.getByTestId('cache-food-bottom-1').click();
    await expect(page.getByTestId('camp-water-bottom-1')).toHaveAttribute('data-count', '32');
    await page.getByTestId('take-food-1-bottom-1').click();
    await expect(page.getByTestId('camp-water-bottom-1')).toHaveAttribute('data-count', '30');

    await steps.step('water-poured-for-want-of-room', {
      description: 'Ten rations cached at Khartoum made room for two more water, drawn at once; taken back out of the cache, the rations crowd the two water out again, and the water row says that two of the thirty-two were poured away for want of room and that eight units of goods cached would bring them back',
      verifications: [
        { spec: 'The panel shows 30 water, the note of 2 of 32 poured away, and the cache this turn empty', check: async () => {
          await expect(page.getByTestId('camp-water-bottom-1')).toHaveAttribute('data-count', '30');
          await expect(page.getByTestId('water-shed-bottom-1')).toHaveText('2 of 32 poured away for want of room: cache 8 units of goods and it is drawn again');
          await expect(page.getByTestId('water-shed-bottom-1')).toHaveAttribute('data-brought', '32');
          await expect(page.getByTestId('water-auto-bottom-1')).toHaveCount(0);
          await expect(page.getByTestId('cache-item-food-1-bottom-1')).toHaveCount(0);
          const s = await state(page);
          expect(s.explorers.find((e) => e.seat === 'bottom-1')!).toMatchObject({ waterShed: 2, chart: { water: 30, food: 30 } });
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    await page.getByTestId('cache-food-bottom-1').click();
    await expect(page.getByTestId('camp-water-bottom-1')).toHaveAttribute('data-count', '32');

    await steps.step('water-kept-by-caching', {
      description: 'The player chooses to cache the ten rations rather than lose the water: the two water are drawn again, the note is gone, and the cache column holds the rations',
      verifications: [
        { spec: 'The panel shows 32 water with the plain note again and 10 food cached; nothing poured away', check: async () => {
          await expect(page.getByTestId('camp-water-bottom-1')).toHaveAttribute('data-count', '32');
          await expect(page.getByTestId('water-shed-bottom-1')).toHaveCount(0);
          await expect(page.getByTestId('water-auto-bottom-1')).toHaveText('as much as can be carried');
          await expect(page.getByTestId('cache-item-food-1-bottom-1')).toHaveAttribute('data-count', '10');
          const s = await state(page);
          expect(s.explorers.find((e) => e.seat === 'bottom-1')!).toMatchObject({ waterShed: 0, chart: { water: 32, food: 20 } });
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    // The rations back in hand for the desert (30 food, 30 water, two poured away again), ×1 again, and the camp closed.
    await page.getByTestId('take-food-1-bottom-1').click();
    await expect(page.getByTestId('camp-water-bottom-1')).toHaveAttribute('data-count', '30');
    await page.getByTestId('reorganise-step-bottom-1').click(); // ×1
    await page.getByTestId('reorganise-close-bottom-1').click();
    await page.getByTestId('move-target-c21r1').click();
    await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c21r1');
    await page.getByTestId('reorganise-bottom-1').click(); // a dry desert hex: no water to draw; what is carried may be poured out
    await expect(page.getByTestId('no-water-bottom-1')).toHaveText('no water here');
    await expect(page.getByTestId('take-water-bottom-1')).toHaveCount(0);
    await expect(page.getByTestId('pour-water-bottom-1')).toHaveAttribute('aria-label', 'Pour out 10 water rations');
    await expect(page.getByTestId('camp-water-bottom-1')).toHaveAttribute('data-count', '30');
    await page.getByTestId('reorganise-close-bottom-1').click();
    await passTurn(page);

    await steps.step('dry-camp', {
      description: 'The caravan camps in the dry desert west of the Nile: no game, thirteen rations eaten, and twenty-five water drunk, five left',
      verifications: [
        { spec: 'The meal note reads the evening\'s food and water; the chart shows 27 food and 5 water', check: async () => {
          await expect(page.getByTestId('meal-note-bottom-1')).toHaveText('nothing per hunter: no game, 13 men ate (13 from the stores); drank 25 water, 5 left');
          await expect(page.getByTestId('have-water-bottom-1')).toHaveAttribute('data-count', '5');
          await expect(page.getByTestId('have-food-bottom-1')).toHaveAttribute('data-count', '17');
          const s = await state(page);
          expect(s.explorers.find((e) => e.seat === 'bottom-1')!.chart).toMatchObject({ water: 5, food: 17 });
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
          await expect(page.getByTestId('meal-note-bottom-1')).toHaveText('nothing per hunter: no game, 13 men ate (13 from the stores); drank 5 water, 8 bearers died of thirst, 3 camels shot for want of water (30 rations)');
          await expect(page.getByTestId('have-bearers-bottom-1')).toHaveAttribute('data-count', '2');
          await expect(page.getByTestId('have-camels-bottom-1')).toHaveCount(0);
          await expect(page.getByTestId('have-water-bottom-1')).toHaveCount(0);
          await expect(page.getByTestId('have-food-bottom-1')).toHaveAttribute('data-count', '34');
          const s = await state(page);
          const e = s.explorers.find((x) => x.seat === 'bottom-1')!;
          expect(e.chart).toMatchObject({ bearers: 2, askaris: 2, camels: 0, water: 0, food: 34 });
          expect(e.sick.explorer).toBe(false);
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    steps.generateDocs();
  });
});
