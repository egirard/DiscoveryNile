import { test, expect } from '@playwright/test';
import { TestStepHelper } from '../helpers/test-step-helper';

const LAND_HEXES = 625; // 626 as transcribed; Zanzibar's old hex is sea (prompt 52)
const PORTS = ['khartoum', 'mombasa', 'zanzibar', 'kilwa', 'quilimane', 'lourenco-marques', 'durban', 'port-elizabeth', 'capetown', 'benguela', 'luanda', 'calabar', 'brass'];

test.describe('003 - Africa board and six seats', () => {
  test('the table shows the hex map of Africa with its ports and six seats, a player takes the bottom seat, and it survives a reload', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'Africa board and six seats',
      'The table opens with the hex map of Africa in the centre, the thirteen ports of entry marked, and six seat rails around it. A player at the bottom edge takes a seat; the board is unchanged and everything survives a reload.'
    );

    await page.goto('/table/?new=1&gameId=ABCDE&seed=1234');

    await steps.step('empty-board', {
      description: 'The hex map of Africa fills the table between six empty seats',
      verifications: [
        { spec: 'The hex grid is drawn inside the board with every land hex of the manifest', check: async () => {
          await expect(page.getByTestId('hex-grid')).toBeVisible();
          await expect(page.getByTestId('board').locator('[data-testid^="hex-c"]')).toHaveCount(LAND_HEXES);
        } },
        { spec: '448 hexes are blank; the map is turned so north points to the left edge', check: async () => {
          await expect(page.locator('[data-testid^="hex-c"][data-terrain="blank"]')).toHaveCount(448);
          await expect(page.getByTestId('hex-grid')).toHaveAttribute('data-rotated', 'true');
        } },
        { spec: 'The thirteen ports of entry are marked', check: async () => {
          await expect(page.locator('[data-testid^="port-"]')).toHaveCount(13);
          for (const id of PORTS) await expect(page.getByTestId(`port-${id}`)).toBeVisible();
          await expect(page.getByTestId('port-khartoum')).toHaveAttribute('aria-label', 'Port of entry: Khartoum');
        } },
        { spec: 'Six seat rails with six join controls and no seat taken', check: async () => {
          await expect(page.locator('[data-testid^="seat-rail-"]')).toHaveCount(6);
          await expect(page.locator('[data-testid^="seat-join-"]')).toHaveCount(6);
          await expect(page.locator('[data-taken="true"]')).toHaveCount(0);
          for (const id of ['bottom-1', 'bottom-2', 'top-1', 'top-2', 'left-1', 'right-1']) await expect(page.getByTestId(`seat-rail-${id}`)).toBeVisible();
        } },
        { spec: 'The room code is shown', check: async () => {
          await expect(page.getByTestId('room-code')).toHaveText('ABCDE');
        } }
      ]
    });

    await page.getByTestId('seat-join-bottom-1').click();

    await steps.step('bottom-seat-taken', {
      description: 'The first bottom seat is taken; every rail faces its own edge and the board is unchanged',
      verifications: [
        { spec: 'bottom-1 is taken and five join controls remain', check: async () => {
          await expect(page.getByTestId('seat-rail-bottom-1')).toHaveAttribute('data-taken', 'true');
          await expect(page.locator('[data-testid^="seat-join-"]')).toHaveCount(5);
        } },
        { spec: 'Rails are rotated toward their edges: bottom 0°, left 90°, top 180°, right 270°', check: async () => {
          await expect(page.getByTestId('seat-rail-bottom-2').locator('.face')).toHaveCSS('rotate', '0deg');
          await expect(page.getByTestId('seat-rail-left-1').locator('.face')).toHaveCSS('rotate', '90deg');
          await expect(page.getByTestId('seat-rail-top-1').locator('.face')).toHaveCSS('rotate', '180deg');
          await expect(page.getByTestId('seat-rail-right-1').locator('.face')).toHaveCSS('rotate', '270deg');
        } },
        { spec: 'The two bottom rails sit side by side along the bottom edge', check: async () => {
          const a = (await page.getByTestId('seat-rail-bottom-1').boundingBox())!;
          const b = (await page.getByTestId('seat-rail-bottom-2').boundingBox())!;
          expect(a.x + a.width).toBeLessThanOrEqual(b.x + 1);
          expect(Math.abs(a.y - b.y)).toBeLessThan(2);
        } },
        { spec: 'The board still shows every land hex and port', check: async () => {
          await expect(page.getByTestId('board').locator('[data-testid^="hex-c"]')).toHaveCount(LAND_HEXES);
          await expect(page.locator('[data-testid^="port-"]')).toHaveCount(13);
          const state = await page.evaluate(() => window.__TABLETOP__!.getState());
          expect(state.seats.map((s) => s.id)).toEqual(['bottom-1', 'bottom-2', 'right-1', 'top-1', 'top-2', 'left-1']);
          expect(state.diagnostics).toEqual([]);
        } }
      ]
    });

    await page.reload();

    await steps.step('persists-after-reload', {
      description: 'After a reload the same game, board and taken seat are restored',
      verifications: [
        { spec: 'The same room code is shown and the one-shot URL parameters are gone', check: async () => {
          await expect(page.getByTestId('room-code')).toHaveText('ABCDE');
          expect(new URL(page.url()).search).toBe('');
        } },
        { spec: 'bottom-1 is still taken and the grid is present', check: async () => {
          await expect(page.getByTestId('seat-rail-bottom-1')).toHaveAttribute('data-taken', 'true');
          await expect(page.getByTestId('board').locator('[data-testid^="hex-c"]')).toHaveCount(LAND_HEXES);
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
