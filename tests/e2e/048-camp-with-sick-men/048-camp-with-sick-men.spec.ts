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

test.describe('048 - The camp with sick men', () => {
  test('the camp tells the sick beside the men, counts them in how the expedition could move, and dismisses the well or the sick as chosen', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'The camp with sick men',
      'The camp panel remembers who is sick (prompt 76). A type of man with sick among it shows how many ("4", "3 sick"); the line that says how the expedition could move counts as the board does, a sick bearer carrying nothing and every sick man twenty units of what is carried, and says when the sick cannot all be carried. Dismiss sends the well away; a second control, dismiss sick, sends the sick, and the sick count goes down with them.'
    );

    // Scenario 021's story (seed 863): the stores run out, three guarded bearers starve and fall sick, and next morning
    // a buffalo kills an askari: four bearers, three of them sick, two askaris, and nobody to carry the sick.
    await page.goto('/table/?new=1&gameId=ABCDE&seed=863&dice=6,6,6,6,1,1,1,1&dice-hunting=1,1&dice-sickness=4,5,6');
    await commission(page, 'bottom-1');
    await commission(page, 'top-1');
    await page.getByTestId('start-game').click();
    await takeCards(page);
    expect((await state(page)).turn!.current).toBe('bottom-1');
    await page.getByTestId('sail-bottom-1').click();
    await page.getByTestId('choose-port-mombasa').click();
    await page.getByTestId('confirm-sail-bottom-1').click();
    await passTurn(page);
    await passTurn(page);
    await passTurn(page);
    await outfit(page, 'bottom-1', { askaris: 3, bearers: 10, food: 5 });
    await page.getByTestId('move-target-c25r11').click();
    await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c25r11');
    await passTurn(page);
    await passTurn(page);
    await expect(page.getByTestId('sick-halt-bottom-1')).toBeVisible();
    await page.getByTestId('reorganise-bottom-1').click();
    await expect(page.getByTestId('reorganise-panel-bottom-1')).toBeVisible();

    await steps.step('sick-told-at-the-camp', {
      description: 'Halted with three sick bearers of four, the camp is opened: the bearers\' row says 4 and 3 sick, with a control for the well and one for the sick; the line above counts the sick and says nothing can move',
      verifications: [
        { spec: 'The bearers\' row tells the three sick and offers dismiss and dismiss sick; the askaris, none of them sick, have the one control', check: async () => {
          await expect(page.getByTestId('camp-sick-bearers-bottom-1')).toHaveText('3 sick');
          await expect(page.getByTestId('dismiss-bearers-bottom-1')).toHaveAttribute('aria-label', 'Dismiss 1 well bearers');
          await expect(page.getByTestId('dismiss-sick-bearers-bottom-1')).toHaveAttribute('aria-label', 'Dismiss 1 sick bearers');
          await expect(page.getByTestId('camp-sick-askaris-bottom-1')).toHaveCount(0);
          await expect(page.getByTestId('dismiss-sick-askaris-bottom-1')).toHaveCount(0);
        } },
        { spec: 'The movement line counts three sick, nothing carried and no way to move', check: async () => {
          const line = page.getByTestId('camp-capacity-bottom-1');
          await expect(line).toHaveAttribute('data-sick', '3');
          await expect(line).toHaveAttribute('data-halted', 'true');
          await expect(line).toHaveAttribute('data-carry', '0');
          await expect(line).toHaveAttribute('data-overland', 'false');
          await expect(page.getByTestId('camp-capacity-sick-bottom-1')).toHaveAttribute('aria-label', /cannot all be carried/);
          await expect(page.locator('[data-testid^="move-target-"]')).toHaveCount(0);
        } }
      ]
    });

    await page.getByTestId('dismiss-bearers-bottom-1').click();
    await expect(page.getByTestId('all-sick-bearers-bottom-1')).toBeVisible();

    await steps.step('well-bearer-dismissed', {
      description: 'Dismiss sends the well bearer away, not a sick one: three bearers are left, all three sick, and only the sick can be dismissed now',
      verifications: [
        { spec: 'Three bearers, three sick; the row says all sick and keeps dismiss sick', check: async () => {
          const e = (await state(page)).explorers.find((x) => x.seat === 'bottom-1')!;
          expect(e.chart).toMatchObject({ bearers: 3 });
          expect(e.sick).toMatchObject({ bearers: 3 });
          await expect(page.getByTestId('camp-sick-bearers-bottom-1')).toHaveText('3 sick');
          await expect(page.getByTestId('dismiss-bearers-bottom-1')).toHaveCount(0);
          await expect(page.getByTestId('dismiss-sick-bearers-bottom-1')).toBeVisible();
        } }
      ]
    });

    await tap(page, 'dismiss-sick-bearers-bottom-1', 3);
    await expect(page.getByTestId('reorganise-row-bearers-bottom-1')).toHaveCount(0);

    await steps.step('sick-dismissed', {
      description: 'Dismiss sick, three times: the sick bearers are left behind, nobody is sick any more, the halt is lifted and the board offers a step again',
      verifications: [
        { spec: 'No bearers and no sick are left; the camp\'s line in the log tells the well and the sick apart', check: async () => {
          const s = await state(page);
          const e = s.explorers.find((x) => x.seat === 'bottom-1')!;
          expect(e.chart).toMatchObject({ bearers: 0, askaris: 2 });
          expect(e.sick).toMatchObject({ bearers: 0, askaris: 0, explorer: false });
          expect(s.turn!.log.at(-1)!.outcome).toBe('1 bearer, 3 sick bearers dismissed');
          expect(s.diagnostics).toEqual([]);
        } },
        { spec: 'The movement line counts no sick, the rail\'s halt mark is gone and move targets are back', check: async () => {
          await expect(page.getByTestId('camp-capacity-bottom-1')).toHaveAttribute('data-sick', '0');
          await expect(page.getByTestId('camp-capacity-bottom-1')).toHaveAttribute('data-halted', 'false');
          await expect(page.getByTestId('camp-capacity-sick-bottom-1')).toHaveCount(0);
          await expect(page.getByTestId('sick-halt-bottom-1')).toHaveCount(0);
          expect(await page.locator('[data-testid^="move-target-"]').count()).toBeGreaterThan(0);
        } }
      ]
    });

    steps.generateDocs();
  });
});
