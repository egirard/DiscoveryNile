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
async function endTurn(page: Page, seat: string) {
  await endTurnFromRail(page, seat);
}
async function tap(page: Page, id: string, times: number) {
  for (let i = 0; i < times; i++) await page.getByTestId(id).click();
}
/** The rail's two sections (prompt 35), read at the bottom edge: the log box stands inward of the status row, both inside the rail. */
async function expectTwoSections(page: Page, seat: string) {
  const rail = await page.getByTestId(`seat-rail-${seat}`).boundingBox();
  const status = await page.getByTestId(`rail-status-${seat}`).boundingBox();
  const box = await page.getByTestId(`log-box-${seat}`).boundingBox();
  expect(box!.y + box!.height).toBeLessThanOrEqual(status!.y + 1);
  expect(status!.y + status!.height).toBeLessThanOrEqual(rail!.y + rail!.height + 1);
  expect(box!.x).toBeGreaterThanOrEqual(rail!.x - 1);
  expect(box!.x + box!.width).toBeLessThanOrEqual(rail!.x + rail!.width + 1);
}
/** The open list sits inside the box directly above the latest line, which stays the box's last line with the "−" at its end. */
async function expectLogOpenInTheBox(page: Page, seat: string) {
  const box = await page.getByTestId(`log-box-${seat}`).boundingBox();
  const list = await page.getByTestId(`turn-log-${seat}`).boundingBox();
  const line = await page.getByTestId(`roll-log-${seat}`).boundingBox();
  const toggle = await page.getByTestId(`log-expand-${seat}`).boundingBox();
  expect(list!.y).toBeGreaterThanOrEqual(box!.y);
  expect(list!.y + list!.height).toBeLessThanOrEqual(line!.y + 1);
  expect(line!.y + line!.height).toBeLessThanOrEqual(box!.y + box!.height + 1);
  expect(toggle!.x).toBeGreaterThanOrEqual(line!.x + line!.width - 1);
  expect(toggle!.x + toggle!.width).toBeLessThanOrEqual(box!.x + box!.width + 1);
  await expectTwoSections(page, seat);
}

test.describe('036 - The log', () => {
  test('the rail is a status row and an outlined log box; "+" grows the box with every turn so far, and "−" in its place collapses it', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'The log',
      'Every seat\'s rail is two sections: the status row at the player\'s edge (the name, the explorer\'s hat, the hand, the expedition and its controls, the camp\'s cairn among them) and, inward of it, the log in an outlined box. Collapsed, the box is the latest line of the log: the roll for first player, the card drawn, passage booked, the landing, the outfitting, a lost check with its dice, the meal that ends a turn in the field. The "+" at the end of that line grows the box to hold the rest of the log above it, round by round from the roll for first player, a few lines that scroll, kept at the newest; the latest line stays the box\'s last, and the "−" in the "+"\'s place collapses the box again.'
    );

    // Seed 150 as in scenario 010: bottom-1 sails to Mombasa on a ticket, outfits, and the first step into c24r12 is lost.
    await page.goto('/table/?new=1&gameId=ABCDE&seed=150');
    await commission(page, 'bottom-1');
    await commission(page, 'top-1');
    await page.getByTestId('start-game').click();
    await takeCards(page); // the hands dealt wait in full at the edges (prompt 44)
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
      description: 'Nothing has rolled this turn, but the rail\'s log box already reads the log\'s latest line, the outfitting, with the "+" at its end, inward of the status row with the name, the hat, the expedition and the camp\'s cairn; the other seat\'s box reads its own latest line',
      verifications: [
        { spec: 'The rail is two sections: the status row at the edge holds the name, the explorer, the expedition and the camp control; the log box stands inward of it, collapsed', check: async () => {
          await expectTwoSections(page, 'bottom-1');
          const status = page.getByTestId('rail-status-bottom-1');
          await expect(status.getByTestId('seat-name-bottom-1')).toBeVisible();
          await expect(status.getByTestId('explorer-token-bottom-1')).toBeVisible();
          await expect(status.getByTestId('chart-summary-bottom-1')).toBeVisible();
          await expect(status.getByTestId('reorganise-bottom-1')).toBeVisible();
          await expect(status.getByTestId('end-turn-bottom-1')).toBeVisible();
          await expect(status.getByTestId('roll-log-bottom-1')).toHaveCount(0);
          await expect(page.getByTestId('log-box-bottom-1')).toHaveAttribute('data-expanded', 'false');
        } },
        { spec: 'The box\'s line is the outfitting; the log counts the roll for first player, the Europe turn, the landing and this turn', check: async () => {
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

    await steps.step('log-box-grown', {
      description: 'The "+" becomes a "−" and the box grows inward to hold the rest of the log above the line: the roll for first player, round 1 in Europe, the landing in round 2; the outfitting stays as the box\'s last line, the status row where it was',
      verifications: [
        { spec: 'The list sits inside the box directly above the latest line, the "−" at the line\'s end; the status row keeps its place at the edge', check: async () => {
          await expect(page.getByTestId('log-expand-bottom-1')).toHaveText('−');
          await expect(page.getByTestId('log-expand-bottom-1')).toHaveAttribute('aria-pressed', 'true');
          await expect(page.getByTestId('log-box-bottom-1')).toHaveAttribute('data-expanded', 'true');
          await expectLogOpenInTheBox(page, 'bottom-1');
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
      description: 'The expedition tried the blank hex and was lost: the box\'s line is now the lost check with its dice and the lost mark, the "+" at its end',
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
      description: 'Opened again, the list has grown by the outfitting under round 3 and is scrolled to its newest lines; the lost check stays the box\'s last line below',
      verifications: [
        { spec: 'The outfitting joined the list under this round; the lost check is the box\'s line, not the list\'s', check: async () => {
          await expect(page.getByTestId('turn-log-bottom-1')).toHaveAttribute('data-count', '5');
          await expect(page.getByTestId('turn-log-round-3-bottom-1')).toHaveText('Round 3');
          await expect(page.getByTestId('turn-log-entry-4-bottom-1')).toHaveText('outfitted at Mombasa: 15 bearers, 5 askaris, 100 rations');
          await expect(page.getByTestId('turn-log-entries-bottom-1').locator('[data-kind="lost-check"]')).toHaveCount(0);
          await expect(page.getByTestId('roll-lost-check-bottom-1')).toHaveCount(1);
          await expectLogOpenInTheBox(page, 'bottom-1');
        } },
        { spec: 'The open box is shaded with the rail\'s ink behind the lines, which reach over the board (prompt 62)', check: async () => {
          expect(await page.getByTestId('log-box-bottom-1').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgba(28, 42, 46, 0.9)');
        } },
        { spec: 'The list is a few lines, a scrollable region kept at its end', check: async () => {
          const entries = page.getByTestId('turn-log-entries-bottom-1');
          expect(await entries.evaluate((el) => getComputedStyle(el).overflowY)).toBe('auto');
          expect(await entries.evaluate((el) => el.scrollTop + el.clientHeight >= el.scrollHeight - 1)).toBe(true);
        } }
      ]
    });

    await page.getByTestId('log-expand-bottom-1').click();

    await steps.step('log-box-collapsed', {
      description: 'The "−" collapses the box to its one line and becomes a "+" again; the box keeps the latest line',
      verifications: [
        { spec: 'The list is gone, the control reads "+", the lost check is still the box\'s line, the box collapsed inward of the status row', check: async () => {
          await expect(page.getByTestId('turn-log-bottom-1')).toHaveCount(0);
          await expect(page.getByTestId('log-expand-bottom-1')).toHaveText('+');
          await expect(page.getByTestId('log-box-bottom-1')).toHaveAttribute('data-expanded', 'false');
          expect(await page.getByTestId('log-box-bottom-1').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)'); // the pill is outlined only
          await expect(page.getByTestId('roll-lost-check-bottom-1')).toBeVisible();
          await expectTwoSections(page, 'bottom-1');
        } }
      ]
    });

    steps.generateDocs();
  });
});
