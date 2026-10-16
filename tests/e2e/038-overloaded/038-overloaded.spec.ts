import { test, expect, type Page } from '@playwright/test';
import { TestStepHelper } from '../helpers/test-step-helper';
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

test.describe('038 - Overloaded', () => {
  test('an expedition with more gear than its bearers can carry cannot move overland until the camp has lightened it, the same turn', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'Overloaded',
      'An expedition carries overland what its bearers and animals can carry: ten rations a bearer, twenty a led animal, five a ridden one, a sick man twenty. With more to carry than that it cannot move overland (rules §4, prompt 43): the board offers no step and the rail marks the load. The camp is the way out on the same turn: rations and muskets cached at the port lighten the load to what three bearers carry, the steps return, and the expedition sets off.'
    );

    // Seed 863 as scenario 023: bottom-1 pays passage to Mombasa and keeps $700.
    await page.goto('/table/?new=1&gameId=ABCDE&seed=863&dice=6,6,6,6,1,1,1,1&dice-hunting=1,1');
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
    // Three bearers under a hundred rations and five muskets: 105 units to carry, 30 carried.
    await outfit(page, 'bottom-1', { askaris: 5, bearers: 3, food: 100, muskets: 5 });
    await expect(page.getByTestId('overloaded-bottom-1')).toBeVisible();

    await steps.step('overloaded', {
      description: 'Outfitted at Mombasa with three bearers under a hundred rations and five muskets, the expedition has 105 units to carry and bearers for 30: the board offers no step, and the rail marks the load beside the chart with a crossed foot',
      verifications: [
        { spec: 'No move target is offered though the turn is free; the rail\'s mark reads 105 units against 30 carried', check: async () => {
          await expect(page.locator('[data-testid^="move-target-"]')).toHaveCount(0);
          await expect(page.getByTestId('overloaded-bottom-1')).toHaveAttribute('data-load', '105');
          await expect(page.getByTestId('overloaded-bottom-1')).toHaveAttribute('data-carry', '30');
          const s = await state(page);
          expect(s.turn).toMatchObject({ current: 'bottom-1', phase: 'act', moved: false });
          expect(s.explorers.find((e) => e.seat === 'bottom-1')!.chart).toMatchObject({ bearers: 3, food: 100, muskets: 5 });
          expect(s.diagnostics).toEqual([]);
        } },
        { spec: 'A move sent all the same is refused with the reason', check: async () => {
          await page.evaluate(() => window.__TABLETOP__!.append('expedition/moved', { seat: 'bottom-1', path: ['c25r11'] }));
          await expect.poll(async () => (await state(page)).diagnostics.map((d) => d.reason)).toEqual(['cannot move overland: 105 units to carry, the bearers and animals carry 30; cache or dismiss at the camp first']);
          await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c25r12');
        } }
      ]
    });

    // At the camp, seventy rations and the muskets are cached at the port: thirty units on three bearers.
    await page.getByTestId('reorganise-bottom-1').click();
    await expect(page.getByTestId('reorganise-panel-bottom-1')).toBeVisible();
    await expect(page.getByTestId('camp-capacity-bottom-1')).toHaveAttribute('data-load', '105');
    await page.getByTestId('reorganise-step-bottom-1').click(); // ×10
    await tap(page, 'cache-food-bottom-1', 7);
    await page.getByTestId('cache-muskets-bottom-1').click();
    await expect(page.getByTestId('camp-capacity-bottom-1')).toHaveAttribute('data-load', '30');

    await steps.step('lightened', {
      description: 'At the camp seventy rations and the five muskets are cached under the seat\'s marker: thirty units for three bearers, the foot pill ticked, the rail\'s mark gone, and the steps back on the board behind the panel',
      verifications: [
        { spec: 'The camp reads 30 units carried on foot; the rail no longer marks the load; four steps are offered', check: async () => {
          await expect(page.getByTestId('mode-foot-bottom-1')).toHaveAttribute('data-ok', 'true');
          await expect(page.getByTestId('overloaded-bottom-1')).toHaveCount(0);
          await expect(page.locator('[data-testid^="move-target-"]')).toHaveCount(4);
          await expect(page.getByTestId('cache-item-food-1-bottom-1')).toHaveAttribute('data-count', '70');
          await expect(page.getByTestId('cache-item-muskets-1-bottom-1')).toHaveAttribute('data-count', '5');
          const s = await state(page);
          expect(s.explorers.find((e) => e.seat === 'bottom-1')!.chart).toMatchObject({ bearers: 3, food: 30, muskets: 0 });
          expect(Object.values(s.caches)).toEqual([{ id: 1, hex: 'c25r12', seat: 'bottom-1', round: 3, contents: { food: 70, muskets: 5 } }]);
        } }
      ]
    });

    await page.getByTestId('reorganise-close-bottom-1').click();
    await page.getByTestId('move-target-c25r11').click();
    await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c25r11');

    await steps.step('moved', {
      description: 'The lightened expedition steps north the same turn, the cache marker left at Mombasa; the one refused move is a diagnostic, nothing more',
      verifications: [
        { spec: 'The token stands on c25r11, the step logged (printed veldt: no lost check); the cache marker stays on the port hex', check: async () => {
          const s = await state(page);
          expect(s.explorers.find((e) => e.seat === 'bottom-1')!.location).toEqual({ kind: 'hex', hex: 'c25r11' });
          expect(s.turn!.log.at(-1)!.outcome).toBe('moved to c25r11');
          expect(s.turn!.moved).toBe(false); // one known hex of the two on foot
          await expect(page.getByTestId('cache-c25r12-bottom-1')).toBeAttached();
          expect(s.diagnostics).toHaveLength(1);
        } }
      ]
    });

    steps.generateDocs();
  });
});
