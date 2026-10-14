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
/** The open log sits directly above the rail's line, its "−" in line with the "−" that took the "+"'s place. */
async function expectLogAboveTheRail(page: Page, seat: string) {
  const panel = await page.getByTestId(`turn-log-edge-${seat}`).boundingBox();
  const line = await page.getByTestId(`roll-log-${seat}`).boundingBox();
  const close = await page.getByTestId(`turn-log-close-${seat}`).boundingBox();
  const toggle = await page.getByTestId(`log-expand-${seat}`).boundingBox();
  expect(panel!.y + panel!.height).toBeLessThanOrEqual(line!.y + 1);
  expect(Math.abs(close!.x + close!.width / 2 - (toggle!.x + toggle!.width / 2))).toBeLessThanOrEqual(1);
}

test.describe('036 - The log', () => {
  test('the rail shows the log\'s latest line; "+" opens the rest directly above it, every turn so far, and "−" in its place closes it', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'The log',
      'Every seat\'s rail carries the latest line of its log: the roll for first player, the card drawn, passage booked, the landing, the outfitting, a lost check with its dice, the meal that ends a turn in the field. The "+" at the end of that line opens the rest of the log directly above it, round by round from the roll for first player, with the list\'s "−" in line with the "−" that took the "+"\'s place; the latest line stays on the rail as the list\'s last. The list is short and scrolls, kept at its newest lines.'
    );

    // Seed 150 as in scenario 010: bottom-1 sails to Mombasa on a ticket, outfits, and the first step into c24r12 is lost.
    await page.goto('/table/?new=1&gameId=ABCDE&seed=150');
    await commission(page, 'bottom-1');
    await commission(page, 'top-1');
    await page.getByTestId('start-game').click();
    expect((await state(page)).turn!.current).toBe('bottom-1');
    await page.getByTestId('sail-bottom-1').click();
    await page.getByTestId('choose-port-mombasa').click();
    await page.getByTestId('confirm-sail-bottom-1').click();
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
    await expect(page.getByTestId('chart-summary-bottom-1')).toBeVisible();

    await steps.step('latest-line-at-the-rail', {
      description: 'Nothing has rolled this turn, but the rail already reads the log\'s latest line, the outfitting, with the "+" at its end; the other seat\'s rail reads its own latest line',
      verifications: [
        { spec: 'The rail\'s line is the outfitting; the log counts the roll for first player, the Europe turn, the landing and this turn', check: async () => {
          await expect(page.getByTestId('action-note-bottom-1')).toHaveText('outfitted at Mombasa: 15 bearers, 5 askaris, 100 rations');
          const log = page.getByTestId('roll-log-bottom-1');
          await expect(log).toHaveAttribute('data-rolls', '0');
          await expect(log).toHaveAttribute('data-records', '5');
          await expect(log).toHaveAttribute('data-turns', '4');
          await expect(page.getByTestId('log-expand-bottom-1')).toHaveText('+');
          await expect(page.getByTestId('turn-log-bottom-1')).toHaveCount(0);
          await expect(page.getByTestId('action-note-top-1')).toHaveText(/^drew /);
        } },
        { spec: 'The state holds the finished turns: the roll for first player for each seat, then each turn with its lines', check: async () => {
          const s = await state(page);
          expect(s.history.map((t) => [t.round, t.seat])).toEqual([[0, 'bottom-1'], [0, 'top-1'], [1, 'bottom-1'], [1, 'top-1'], [2, 'bottom-1'], [2, 'top-1']]);
          expect(s.history[4].log.map((r) => r.outcome)).toEqual(['landed at Mombasa']);
          expect(s.turn!.log.map((r) => r.kind)).toEqual(['action']);
        } }
      ]
    });

    await page.getByTestId('log-expand-bottom-1').click();

    await steps.step('log-opened-above', {
      description: 'The "+" becomes a "−" and the rest of the log opens directly above the line: the roll for first player, round 1 in Europe, the landing in round 2; the outfitting stays on the rail as the list\'s last line',
      verifications: [
        { spec: 'The list sits directly above the rail\'s line with its "−" in line with the rail\'s', check: async () => {
          await expect(page.getByTestId('log-expand-bottom-1')).toHaveText('−');
          await expect(page.getByTestId('log-expand-bottom-1')).toHaveAttribute('aria-pressed', 'true');
          await expectLogAboveTheRail(page, 'bottom-1');
        } },
        { spec: 'The list holds every earlier line under its round, and not the rail\'s', check: async () => {
          await expect(page.getByTestId('turn-log-bottom-1')).toHaveAttribute('data-count', '4');
          await expect(page.getByTestId('turn-log-round-0-bottom-1')).toHaveText('First player');
          await expect(page.getByTestId('turn-log-round-1-bottom-1')).toHaveText('Round 1');
          await expect(page.getByTestId('turn-log-round-2-bottom-1')).toHaveText('Round 2');
          await expect(page.getByTestId('turn-log-round-3-bottom-1')).toHaveCount(0);
          await expect(page.getByTestId('turn-log-entry-0-bottom-1')).toHaveAttribute('data-kind', 'first-player');
          await expect(page.getByTestId('turn-log-entry-0-bottom-1').locator('.die')).toHaveCount(8);
          await expect(page.getByTestId('turn-log-entry-1-bottom-1')).toHaveText(/^drew /);
          await expect(page.getByTestId('turn-log-entry-2-bottom-1')).toHaveText('booked passage to Mombasa on a free ticket');
          await expect(page.getByTestId('turn-log-entry-3-bottom-1')).toHaveText('landed at Mombasa');
          await expect(page.getByTestId('turn-log-entries-bottom-1')).not.toContainText('outfitted');
        } }
      ]
    });

    await page.getByTestId('log-expand-bottom-1').click();
    await expect(page.getByTestId('turn-log-bottom-1')).toHaveCount(0);
    await page.getByTestId('move-target-c24r12').click();
    await expect(page.getByTestId('lost-badge-bottom-1')).toBeVisible();

    await steps.step('lost-check-is-the-latest-line', {
      description: 'The expedition tried the blank hex and was lost: the rail\'s line is now the lost check with its dice and the lost mark, the "+" at its end',
      verifications: [
        { spec: 'The rail reads the lost check and ends with the "+"', check: async () => {
          await expect(page.getByTestId('roll-lost-check-bottom-1')).toBeVisible();
          await expect(page.getByTestId('roll-lost-check-bottom-1')).toHaveAttribute('data-lost', 'true');
          await expect(page.getByTestId('roll-log-bottom-1')).toHaveAttribute('data-rolls', '1');
          await expect(page.getByTestId('action-note-bottom-1')).toHaveCount(0);
          await expect(page.getByTestId('log-expand-bottom-1')).toHaveText('+');
          await expect(page.getByTestId('turn-log-bottom-1')).toHaveCount(0);
        } }
      ]
    });

    await page.getByTestId('log-expand-bottom-1').click();

    await steps.step('log-expanded', {
      description: 'Opened again, the list has grown by the outfitting under round 3 and is scrolled to its newest lines; the lost check stays on the rail below',
      verifications: [
        { spec: 'The outfitting joined the list under this round; the lost check is the rail\'s line, not the list\'s', check: async () => {
          await expect(page.getByTestId('turn-log-bottom-1')).toHaveAttribute('data-count', '5');
          await expect(page.getByTestId('turn-log-round-3-bottom-1')).toHaveText('Round 3');
          await expect(page.getByTestId('turn-log-entry-4-bottom-1')).toHaveText('outfitted at Mombasa: 15 bearers, 5 askaris, 100 rations');
          await expect(page.getByTestId('turn-log-entries-bottom-1').locator('[data-kind="lost-check"]')).toHaveCount(0);
          await expect(page.getByTestId('roll-lost-check-bottom-1')).toHaveCount(1);
          await expectLogAboveTheRail(page, 'bottom-1');
        } },
        { spec: 'The list is a short, scrollable region kept at its end', check: async () => {
          const entries = page.getByTestId('turn-log-entries-bottom-1');
          expect(await entries.evaluate((el) => getComputedStyle(el).overflowY)).toBe('auto');
          expect(await entries.evaluate((el) => el.scrollTop + el.clientHeight >= el.scrollHeight - 1)).toBe(true);
        } }
      ]
    });

    await page.getByTestId('log-expand-bottom-1').click();

    await steps.step('log-closed', {
      description: 'The "−" closes the list and becomes a "+" again; the rail keeps the latest line',
      verifications: [
        { spec: 'The list is gone, the control reads "+", the lost check is still on the rail', check: async () => {
          await expect(page.getByTestId('turn-log-bottom-1')).toHaveCount(0);
          await expect(page.getByTestId('log-expand-bottom-1')).toHaveText('+');
          await expect(page.getByTestId('roll-lost-check-bottom-1')).toBeVisible();
        } }
      ]
    });

    steps.generateDocs();
  });
});
