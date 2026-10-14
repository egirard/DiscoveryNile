import { test, expect } from '@playwright/test';
import { TestStepHelper } from '../helpers/test-step-helper';

test.describe('001 - App shell and seats', () => {
  test('the table loads with six empty seats, a player takes the bottom seat, and it survives a reload', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'App shell and seats',
      'The table opens with six seats: two on each long edge, one on each short edge. A player at the bottom edge takes a seat; the rail shows them, faces them, and is still there after the table reloads.'
    );

    await page.goto('/table/?new=1&gameId=ABCDE&seed=1234');

    await steps.step('empty-table', {
      description: 'The table shows six empty seats around the board',
      verifications: [
        { spec: 'Six seat rails are visible: two on each long edge, one on each short edge', check: async () => {
          await expect(page.locator('[data-testid^="seat-rail-"]')).toHaveCount(6);
        } },
        { spec: 'Every seat offers a join control and none is taken', check: async () => {
          await expect(page.locator('[data-testid^="seat-join-"]')).toHaveCount(6);
          await expect(page.locator('[data-taken="true"]')).toHaveCount(0);
        } },
        { spec: 'The pinned room code is shown, and the status line beside the north-west gear reads the build\'s short git id and date, no capture server, and no update waiting', check: async () => {
          await expect(page.getByTestId('room-code')).toHaveText('ABCDE');
          await expect(page.getByTestId('status-version')).toHaveText('e2e-tes');
          await expect(page.getByTestId('status-build')).toHaveText('2026-10-14');
          await expect(page.getByTestId('status-diag')).toHaveAttribute('data-state', 'off');
          await expect(page.getByTestId('status-update')).toHaveCount(0);
        } },
        { spec: 'The game was created with the seed from the URL', check: async () => {
          const seed = await page.evaluate(() => window.__TABLETOP__!.getSeed());
          expect(seed).toBe(1234);
        } }
      ]
    });

    await page.getByTestId('seat-join-bottom-1').click();

    await steps.step('bottom-seat-taken', {
      description: 'The bottom seat is taken and its rail faces the player',
      verifications: [
        { spec: 'The bottom rail is marked taken and shows the player icon', check: async () => {
          await expect(page.getByTestId('seat-rail-bottom-1')).toHaveAttribute('data-taken', 'true');
          await expect(page.getByTestId('seat-name-bottom-1')).toBeVisible();
        } },
        { spec: 'The other five seats are still free', check: async () => {
          await expect(page.locator('[data-testid^="seat-join-"]')).toHaveCount(5);
        } },
        { spec: 'The bottom rail is upright (0°) and the top rail is turned around (180°)', check: async () => {
          await expect(page.getByTestId('seat-rail-bottom-1').locator('.face')).toHaveCSS('rotate', '0deg');
          await expect(page.getByTestId('seat-rail-top-1').locator('.face')).toHaveCSS('rotate', '180deg');
        } },
        { spec: 'The state records the occupant of bottom-1 and no diagnostics', check: async () => {
          const state = await page.evaluate(() => window.__TABLETOP__!.getState());
          expect(state.seats.find((s) => s.id === 'bottom-1')?.uid).toBe('table:bottom-1');
          expect(state.diagnostics).toEqual([]);
        } }
      ]
    });

    await page.reload();

    await steps.step('persists-after-reload', {
      description: 'After a reload the same game and the taken seat are restored',
      verifications: [
        { spec: 'The same room code is shown and the one-shot URL parameters are gone', check: async () => {
          await expect(page.getByTestId('room-code')).toHaveText('ABCDE');
          expect(new URL(page.url()).search).toBe('');
        } },
        { spec: 'The bottom seat is still taken', check: async () => {
          await expect(page.getByTestId('seat-rail-bottom-1')).toHaveAttribute('data-taken', 'true');
        } },
        { spec: 'The event stream was replayed, not recreated', check: async () => {
          const events = await page.evaluate(() => window.__TABLETOP__!.getEvents());
          expect(events.map((e) => e.type)).toEqual(['game/created', 'seat/taken']);
        } }
      ]
    });

    steps.generateDocs();
  });
});
