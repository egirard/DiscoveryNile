import { test, expect, type Page } from '@playwright/test';
import { TestStepHelper } from '../helpers/test-step-helper';
import { withLogOpen } from '../helpers/log';

const state = (page: Page) => page.evaluate(() => window.__TABLETOP__!.getState());
async function commission(page: Page, seat: string) {
  await page.getByTestId(`seat-join-${seat}`).click();
  await page.getByTestId(`commission-${seat}`).click();
  await expect(page.getByTestId(`explorer-token-${seat}`)).toBeVisible();
}
const grid = async (page: Page) => (await page.getByTestId('hex-grid').boundingBox())!;

test.describe('034 - The table fills the screen', () => {
  test('seats nobody took disappear when the game starts, the board takes the free edges, and the table follows its window', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'The table fills the screen',
      'Before the start every seat is offered. Once the game begins, a seat nobody took shows nothing: the players\' rails stay where they are and the shared board grows into the edges that have no player. The layout is derived from the window, so resizing it resizes the board, the rails and the panels with it.'
    );

    // Seed 1234 as in scenario 006. Two players share the bottom edge, so the top, left and right edges are free once the game starts.
    await page.goto('/table/?new=1&gameId=ABCDE&seed=1234');
    await commission(page, 'bottom-1');
    await commission(page, 'bottom-2');
    const before = await grid(page);

    await steps.step('six-seats-offered', {
      description: 'Two players on the bottom edge have commissioned explorers; the four other seats are still offered, with their QR codes, and the board sits between all six rails',
      verifications: [
        { spec: 'Six rails show: two taken, four offering a seat', check: async () => {
          await expect(page.locator('[data-testid^="seat-rail-"]')).toHaveCount(6);
          await expect(page.locator('[data-testid^="seat-join-"]')).toHaveCount(4);
        } }
      ]
    });

    await page.getByTestId('start-game').click();
    await expect(page.getByTestId('turn-marker-bottom-1').or(page.getByTestId('turn-marker-bottom-2')).first()).toBeVisible();

    await steps.step('free-edges-to-the-board', {
      description: 'The game has started: only the two players\' rails remain and the board has grown upward into the edges nobody sits at, the piles keeping its top-right corner',
      verifications: [
        { spec: 'Only the two bottom rails are shown', check: async () => {
          await expect(page.locator('[data-testid^="seat-rail-"]')).toHaveCount(2);
          await expect(page.getByTestId('seat-rail-bottom-1')).toBeVisible();
          await expect(page.getByTestId('seat-rail-bottom-2')).toBeVisible();
          await expect(page.locator('[data-testid^="seat-join-"]')).toHaveCount(0);
        } },
        { spec: 'The board is taller than before the start and reaches toward the top edge', check: async () => {
          const after = await grid(page);
          expect(after.height).toBeGreaterThan(before.height * 1.1);
          expect(after.y).toBeLessThan(before.y);
          expect((await state(page)).turn).not.toBeNull();
        } }
      ]
    });

    await page.setViewportSize({ width: 1600, height: 900 });
    await expect.poll(async () => (await grid(page)).height).toBeLessThan(900);

    await steps.step('window-resized', {
      description: 'The window is resized to 1600×900: the board, rails and piles are laid out again for the new size and everything still fits',
      verifications: [
        { spec: 'The board fits the smaller window and the rails sit on its bottom edge', check: async () => {
          const g = await grid(page);
          expect(g.x + g.width).toBeLessThanOrEqual(1600);
          expect(g.y + g.height).toBeLessThanOrEqual(900);
          const rail = (await page.getByTestId('seat-rail-bottom-1').boundingBox())!;
          expect(rail.y + rail.height).toBeGreaterThan(880);
        } }
      ]
    });

    await page.getByTestId('end-turn-bottom-1').or(page.getByTestId('end-turn-bottom-2')).first().hover();

    await steps.step('hover-explains', {
      description: 'The mouse rests on the end-turn control: every control and marker on the table carries its label as a tooltip, so hovering explains what an icon is and what a tap does',
      verifications: [
        { spec: 'Every element with an aria-label has the same text as its title', check: async () => {
          const mismatched = await page.evaluate(() =>
            [...document.querySelectorAll('[aria-label]')].filter((el) => (el.getAttribute('title') ?? '') !== (el.getAttribute('aria-label') ?? '')).map((el) => el.getAttribute('data-testid') ?? el.tagName)
          );
          expect(mismatched).toEqual([]);
          expect(await page.locator('[aria-label]').count()).toBeGreaterThan(20);
        } },
        { spec: 'The end-turn control\'s tooltip says what it does', check: async () => {
          await expect(page.getByTestId('end-turn-bottom-1').or(page.getByTestId('end-turn-bottom-2')).first()).toHaveAttribute('title', 'Wait: end the turn in Europe');
        } }
      ]
    });

    steps.generateDocs();
  });
});
