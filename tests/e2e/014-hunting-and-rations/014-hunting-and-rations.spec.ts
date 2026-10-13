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

test.describe('014 - Hunting and rations', () => {
  test('at the end of each turn in the field the hunters roll for game, the men eat, and the rail shows the meal until the next turn', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'Hunting and rations',
      'When a turn in the field ends, one die is rolled for the hunt with the camp\'s terrain modifiers; the explorer and every askari bag 0, 1, 2 or 3 rations by the result. Each man then eats one ration, game first (surplus game does not keep), then the stores; horses in the desert eat four. When the stores run short, horses and camels are shot for ten rations each. The die and the meal stay at the explorer\'s rail while the other players take their turns, and the food count on the chart drops.'
    );

    // Seed 863 as in scenario 013: bottom-1 pays passage to Mombasa and keeps $700; the main dice script
    // 6,6,6,6 1,1,1,1 makes bottom-1 first. The hunting stream is scripted 4 then 1: fair hunting (two rations
    // for each of six hunters), then no game at all. Disaster cards drawn meanwhile: card 1 kills an askari.
    await page.goto('/table/?new=1&gameId=ABCDE&seed=863&dice=6,6,6,6,1,1,1,1&dice-hunting=4,1');
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
    await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c25r12');
    await outfit(page, 'bottom-1', { askaris: 5, bearers: 15, food: 100 });
    await page.getByTestId('move-target-c25r11').click();
    await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c25r11');
    await passTurn(page);

    await steps.step('fair-hunting', {
      description: 'The turn ends on the veldt: the hunting die shows 4, six hunters bag twelve rations, twenty-one men eat, and the stores drop from 100 to 91 while the top seat plays',
      verifications: [
        { spec: 'The bottom rail shows the hunting die (4) and the meal note', check: async () => {
          await expect(page.getByTestId('turn-marker-top-1')).toHaveAttribute('data-current', 'true');
          await expect(page.getByTestId('roll-hunting-bottom-1')).toHaveAttribute('data-total', '4');
          await expect(page.getByTestId('meal-note-bottom-1')).toHaveText('12 rations bagged, 21 men ate (9 from the stores)');
        } },
        { spec: 'The chart shows 91 food; the state records the meal on the explorer', check: async () => {
          await expect(page.getByTestId('have-food-bottom-1')).toHaveAttribute('data-count', '91');
          const s = await state(page);
          const e = s.explorers.find((x) => x.seat === 'bottom-1')!;
          expect(e.chart).toMatchObject({ askaris: 5, bearers: 15, food: 91 });
          expect(e.lastMeal).toMatchObject({ kind: 'hunting', hex: 'c25r11', rolls: [{ label: 'hunting', value: 4 }], modifiers: [], total: 4 });
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    await passTurn(page); // top-1 ends round 3; round 4: bottom-1 draws card 1 (an askari killed)
    await expect(page.getByTestId('turn-marker-bottom-1')).toHaveAttribute('data-current', 'true');
    await expect(page.getByTestId('have-askaris-bottom-1')).toHaveAttribute('data-count', '4');
    await expect(page.getByTestId('meal-note-bottom-1')).toHaveCount(0);
    await passTurn(page);

    await steps.step('no-game', {
      description: 'Next turn the die shows 1: no game at all, so all twenty men (an askari fell to a buffalo that morning) eat from the stores, which drop to 71',
      verifications: [
        { spec: 'The rail shows a 1 and "no game"; the chart shows 71 food and 4 askaris', check: async () => {
          await expect(page.getByTestId('roll-hunting-bottom-1')).toHaveAttribute('data-total', '1');
          await expect(page.getByTestId('meal-note-bottom-1')).toHaveText('no game, 20 men ate (20 from the stores)');
          await expect(page.getByTestId('have-food-bottom-1')).toHaveAttribute('data-count', '71');
          const s = await state(page);
          expect(s.explorers.find((x) => x.seat === 'bottom-1')!.chart).toMatchObject({ askaris: 4, bearers: 15, food: 71 });
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    steps.generateDocs();
  });
});
