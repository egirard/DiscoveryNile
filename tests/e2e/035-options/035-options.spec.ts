import { test, expect, type Page } from '@playwright/test';
import { TestStepHelper } from '../helpers/test-step-helper';

const SEATS = ['bottom-1', 'bottom-2', 'top-1', 'top-2', 'left-1', 'right-1'];
const state = (page: Page) => page.evaluate(() => window.__TABLETOP__!.getState());
async function commission(page: Page, seat: string) {
  await page.getByTestId(`seat-join-${seat}`).click();
  await page.getByTestId(`commission-${seat}`).click();
  await expect(page.getByTestId(`explorer-token-${seat}`)).toBeVisible();
}

test.describe('035 - Options', () => {
  test('a gear in each corner opens the options: screen size, phones, and ending the game by agreement', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'Options',
      'What is not part of play lives on the options screen, opened from a gear at the north-west or the south-east corner of the board so that a player at any edge can reach one; it opens turned toward the corner that opened it. It sets the screen size, with the outline of a bank card to check it against, offers every seat\'s QR code for joining or rejoining from a phone, and ends the game by agreement of the players at the table.'
    );

    await page.goto('/table/?new=1&gameId=ABCDE&seed=1234');
    await expect(page.getByTestId('hex-grid')).toBeVisible();
    await page.getByTestId('options-se').click();

    await steps.step('options-from-the-corner', {
      description: 'The south-east gear opens the options facing the bottom edge: the screen size (55" by default), the outline of a bank card at that size, a QR code for every seat, and no game to end yet',
      verifications: [
        { spec: 'Both gears are at their corners and the panel faces the bottom edge', check: async () => {
          const nw = (await page.getByTestId('options-nw').boundingBox())!;
          const se = (await page.getByTestId('options-se').boundingBox())!;
          expect(nw.x).toBeLessThan(200); expect(nw.y).toBeLessThan(200);
          expect(se.x + se.width).toBeGreaterThan(1720); expect(se.y + se.height).toBeGreaterThan(880);
          await expect(page.getByTestId('options-panel')).toHaveAttribute('data-rotation', '0');
        } },
        { spec: 'The diagonal reads 55 inches and the card outline is 85.6 mm wide at that size', check: async () => {
          await expect(page.getByTestId('options-panel')).toHaveAttribute('data-diagonal', '55');
          const card = (await page.getByTestId('calibration-card').boundingBox())!;
          const mmPerPx = (55 * 25.4) / Math.hypot(1920, 1080);
          expect(Math.abs(card.width * mmPerPx - 85.6)).toBeLessThan(2.5);
        } },
        { spec: 'Six QR codes link to the six seats\' phone pages', check: async () => {
          for (const seat of SEATS) {
            const href = await page.getByTestId(`options-qr-${seat}`).getAttribute('href');
            expect(href).toContain(`seat=${seat}`);
          }
        } },
        { spec: 'There is no game to end yet', check: async () => {
          await expect(page.getByTestId('end-game')).toHaveCount(0);
          await expect(page.getByTestId('options-end')).toContainText('No game is under way');
        } }
      ]
    });

    await page.getByTestId('diagonal-27').click();

    await steps.step('screen-size-set', {
      description: 'The 27" preset is chosen: the table now sizes itself for a 27" screen and the bank-card outline grows to the size a card has on it',
      verifications: [
        { spec: 'The table reads 27 inches and remembers it', check: async () => {
          await expect(page.getByTestId('options-panel')).toHaveAttribute('data-diagonal', '27');
          await expect(page.getByTestId('table')).toHaveAttribute('data-diagonal', '27');
          expect(await page.evaluate(() => localStorage.getItem('tabletop:screen:diagonal-inches:v1'))).toBe('27');
        } },
        { spec: 'The card outline is twice as wide as at 55 inches', check: async () => {
          const card = (await page.getByTestId('calibration-card').boundingBox())!;
          const mmPerPx = (27 * 25.4) / Math.hypot(1920, 1080);
          expect(Math.abs(card.width * mmPerPx - 85.6)).toBeLessThan(2.5);
        } }
      ]
    });

    await page.getByTestId('options-close').click();
    await expect(page.getByTestId('options-panel')).toHaveCount(0);
    await commission(page, 'bottom-1');
    await commission(page, 'top-1');
    await page.getByTestId('start-game').click();
    await expect(page.locator('[data-testid^="turn-marker-"][data-current="true"]')).toHaveCount(1);
    await page.getByTestId('options-nw').click();
    await page.getByTestId('end-game').click();

    await steps.step('options-turned-to-the-top', {
      description: 'With a game under way, the north-west gear opens the options turned toward the top edge; "End this game" asks for confirmation',
      verifications: [
        { spec: 'The panel faces the top edge and offers the confirmation', check: async () => {
          await expect(page.getByTestId('options-panel')).toHaveAttribute('data-rotation', '180');
          await expect(page.getByTestId('end-game-yes')).toBeVisible();
          await expect(page.getByTestId('end-game-no')).toBeVisible();
        } }
      ]
    });

    await page.getByTestId('end-game-yes').click();

    await steps.step('ended-by-agreement', {
      description: 'Confirmed, the game ends as by agreement: everyone retires, those in Europe publishing first, and the standings appear in the middle of the table',
      verifications: [
        { spec: 'The game ended by consensus in round 1 and the options closed', check: async () => {
          await expect(page.getByTestId('game-over')).toHaveAttribute('data-reason', 'consensus');
          expect((await state(page)).ended).toMatchObject({ round: 1, reason: 'consensus' });
          await expect(page.getByTestId('options-panel')).toHaveCount(0);
        } }
      ]
    });

    steps.generateDocs();
  });
});
