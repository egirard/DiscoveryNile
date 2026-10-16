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

test.describe('021 - Sickness, starvation and desertion', () => {
  test('an expedition without rations: the unfed desert or fall sick, the sick cannot be carried and halt the march, and the sick die or recover by the die', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'Sickness, starvation and desertion',
      'When the stores run out after the hunt, bearers go hungry first, then guides, askaris and the explorer. Hungry guides and askaris desert (the askaris with their muskets); hungry bearers desert unless an askari guards each. Every starving man rolls a die and falls sick on 4 to 6. Sick men cannot walk: they must be carried by an animal, two unladen bearers or a canoe, or the expedition halts. Each sick man rolls every evening, minus one with a healthy doctor and plus three if starving: 1 or less recovers, 5 or more dies.'
    );

    // Seed 863 as in scenarios 013–014: bottom-1 pays passage to Mombasa and keeps $700; the first disaster card in the
    // field is card 1 (an askari killed by a buffalo). Hunting 1,1: no game. Sickness dice: 4,5,6 (the three guarded
    // starving bearers fall sick); then 1,2,3 for the three sick, +3 for starving (one lingers, two die), and 4 (the
    // starving explorer falls sick).
    await page.goto('/table/?new=1&gameId=ABCDE&seed=863&dice=6,6,6,6,1,1,1,1&dice-hunting=1,1&dice-sickness=4,5,6,1,2,3,4');
    await commission(page, 'bottom-1');
    await commission(page, 'top-1');
    await page.getByTestId('start-game').click();
    await takeCards(page); // the hands dealt wait in full at the edges (prompt 44)
    expect((await state(page)).turn!.current).toBe('bottom-1');
    await page.getByTestId('sail-bottom-1').click();
    await page.getByTestId('choose-port-mombasa').click();
    await page.getByTestId('confirm-sail-bottom-1').click();
    await passTurn(page);
    await passTurn(page); // round 2: bottom-1 lands at Mombasa and that turn is skipped
    await passTurn(page);
    await outfit(page, 'bottom-1', { askaris: 3, bearers: 10, food: 5 });
    await page.getByTestId('move-target-c25r11').click();
    await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c25r11');
    await passTurn(page);

    await steps.step('starving', {
      description: 'Fourteen men and five rations: nine go hungry. The three askaris can guard three bearers; the other six desert. The three guarded bearers roll 4, 5 and 6 and all fall sick',
      verifications: [
        { spec: 'The meal note tells the hunger, the desertion and the sickness; the chart shows 4 bearers with 3 sick', check: async () => {
          await expect(page.getByTestId('meal-note-bottom-1')).toHaveText('no game, 14 men ate (5 from the stores), 9 men go hungry; 6 bearers desert; 3 bearers go hungry; 3 starving bearers fall sick');
          await expect(page.getByTestId('have-bearers-bottom-1')).toHaveAttribute('data-count', '4');
          await expect(page.getByTestId('sick-bottom-1')).toHaveAttribute('data-count', '3');
          const s = await state(page);
          const e = s.explorers.find((x) => x.seat === 'bottom-1')!;
          expect(e.chart).toMatchObject({ bearers: 4, askaris: 3, food: 0 });
          expect(e.sick).toMatchObject({ bearers: 3, explorer: false });
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    await passTurn(page);
    await expect(page.getByTestId('turn-marker-bottom-1')).toHaveAttribute('data-current', 'true');

    await steps.step('halted', {
      description: 'Next morning a buffalo kills an askari. Three sick bearers and one well one: nobody can carry the sick, so no move is offered and the rail shows the halt',
      verifications: [
        { spec: 'No move target is offered and the halt mark shows beside the sick count', check: async () => {
          await expect(page.getByTestId('sick-halt-bottom-1')).toBeVisible();
          await expect(page.locator('[data-testid^="move-target-"]')).toHaveCount(0);
          await expect(page.getByTestId('have-askaris-bottom-1')).toHaveAttribute('data-count', '2');
          const s = await state(page);
          expect(s.turn).toMatchObject({ current: 'bottom-1', round: 4, moved: false });
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    await passTurn(page);

    await steps.step('wasting', {
      description: 'With nothing to eat everyone goes hungry: the two askaris and the well bearer desert, the sick cannot. The three sick roll with +3 for starving: one lingers, two die; the starving explorer rolls a 4 and falls sick',
      verifications: [
        { spec: 'The note reads the desertions and deaths; one sick bearer and the sick explorer remain', check: async () => {
          await expect(page.getByTestId('meal-note-bottom-1')).toHaveText('no game, 7 men ate (0 from the stores), 7 men go hungry; 1 bearer, 2 askaris desert; 3 bearers go hungry; the explorer goes hungry; 2 bearers die of sickness, the starving explorer falls sick');
          await expect(page.getByTestId('have-bearers-bottom-1')).toHaveAttribute('data-count', '1');
          await expect(page.getByTestId('have-askaris-bottom-1')).toHaveCount(0);
          await expect(page.getByTestId('sick-bottom-1')).toHaveAttribute('data-explorer', 'true');
          const s = await state(page);
          const e = s.explorers.find((x) => x.seat === 'bottom-1')!;
          expect(e.chart).toMatchObject({ bearers: 1, askaris: 0, food: 0 });
          expect(e.sick).toMatchObject({ bearers: 1, explorer: true });
          expect(e.lastMeal!.rolls.map((r) => r.value)).toEqual([1, 1, 2, 3, 4]);
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    steps.generateDocs();
  });
});
