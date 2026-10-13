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
}
async function tap(page: Page, id: string, times: number) {
  for (let i = 0; i < times; i++) await page.getByTestId(id).click();
}

test.describe('036 - The turn\'s log', () => {
  test('the rail\'s roll log opens with "+" into the full list of the turn at the player\'s edge, and closes with "−" in its place', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'The turn\'s log',
      'The rail shows this turn\'s rolls as dice on one line, with a note for the latest. A "+" at the end of that line opens the full list at the player\'s edge: every record of the turn in order, with its dice, the modifiers that applied and what came of it, in a short list that scrolls when the turn was eventful. The "−" that takes the place of the "+" closes it.'
    );

    // Seed 150 as in scenario 010: bottom-1 sails to Mombasa on a ticket, outfits, and the first step into c24r12 is lost.
    await page.goto('/table/?new=1&gameId=ABCDE&seed=150');
    await commission(page, 'bottom-1');
    await commission(page, 'top-1');
    await page.getByTestId('start-game').click();
    expect((await state(page)).turn!.current).toBe('bottom-1');
    await page.getByTestId('sail-bottom-1').click();
    await page.getByTestId('choose-port-mombasa').click();
    await endTurn(page, 'bottom-1');
    await endTurn(page, 'top-1');
    await endTurn(page, 'top-1');
    await expect(page.getByTestId('expedition-chart-bottom-1')).toBeVisible();
    await tap(page, 'buy-askaris-bottom-1', 5);
    await page.getByTestId('chart-step-10-bottom-1').click();
    await tap(page, 'buy-bearers-bottom-1', 1);
    await tap(page, 'buy-food-bottom-1', 10);
    await page.getByTestId('chart-step-1-bottom-1').click();
    await tap(page, 'buy-bearers-bottom-1', 5);
    await page.getByTestId('confirm-outfit-bottom-1').click();
    await page.getByTestId('confirm-outfit-yes-bottom-1').click();
    await page.getByTestId('move-target-c24r12').click();
    await expect(page.getByTestId('lost-badge-bottom-1')).toBeVisible();

    await steps.step('log-on-one-line', {
      description: 'The expedition tried the blank hex and was lost: the rail shows the turn\'s dice on one line, with a "+" at its end',
      verifications: [
        { spec: 'The roll log shows the lost check and ends with the "+" control', check: async () => {
          await expect(page.getByTestId('roll-lost-check-bottom-1')).toBeVisible();
          await expect(page.getByTestId('log-expand-bottom-1')).toHaveText('+');
          await expect(page.getByTestId('log-expand-bottom-1')).toHaveAttribute('aria-pressed', 'false');
          await expect(page.getByTestId('turn-log-bottom-1')).toHaveCount(0);
        } }
      ]
    });

    await page.getByTestId('log-expand-bottom-1').click();

    await steps.step('log-expanded', {
      description: 'The "+" becomes a "−" and the full list of the turn opens at the player\'s edge: each record in order with its dice, its modifiers and its outcome',
      verifications: [
        { spec: 'The list at the edge holds every record of the turn, as many as the rail\'s log', check: async () => {
          const records = (await state(page)).turn!.log.filter((r) => r.seat === 'bottom-1').length;
          await expect(page.getByTestId('turn-log-bottom-1')).toHaveAttribute('data-count', String(records));
          await expect(page.getByTestId('turn-log-entries-bottom-1').locator('li')).toHaveCount(records);
          await expect(page.getByTestId('turn-log-entry-0-bottom-1')).toHaveAttribute('data-kind', 'lost-check');
          await expect(page.getByTestId('turn-log-entry-0-bottom-1')).toContainText('Lost check');
        } },
        { spec: 'The control now reads "−" and is pressed', check: async () => {
          await expect(page.getByTestId('log-expand-bottom-1')).toHaveText('−');
          await expect(page.getByTestId('log-expand-bottom-1')).toHaveAttribute('aria-pressed', 'true');
        } },
        { spec: 'The list is a short, scrollable region', check: async () => {
          const overflow = await page.getByTestId('turn-log-entries-bottom-1').evaluate((el) => getComputedStyle(el).overflowY);
          expect(overflow).toBe('auto');
        } }
      ]
    });

    await page.getByTestId('log-expand-bottom-1').click();

    await steps.step('log-closed', {
      description: 'The "−" closes the list and becomes a "+" again',
      verifications: [
        { spec: 'The list is gone and the control reads "+"', check: async () => {
          await expect(page.getByTestId('turn-log-bottom-1')).toHaveCount(0);
          await expect(page.getByTestId('log-expand-bottom-1')).toHaveText('+');
        } }
      ]
    });

    steps.generateDocs();
  });
});
