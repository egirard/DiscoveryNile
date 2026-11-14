import { test, expect, type Page } from '@playwright/test';
import { TestStepHelper } from '../helpers/test-step-helper';
import { takeCards } from '../helpers/cards';
import { endTurnFromRail, pressEndTurn } from '../helpers/turn';

async function commission(page: Page, seat: string) {
  await page.getByTestId(`seat-join-${seat}`).click();
  await page.getByTestId(`commission-${seat}`).click();
  await expect(page.getByTestId(`explorer-token-${seat}`)).toBeVisible();
}
const state = (page: Page) => page.evaluate(() => window.__TABLETOP__!.getState());
const events = (page: Page) => page.evaluate(() => window.__TABLETOP__!.getEvents());
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

test.describe('042 - One player at the table', () => {
  test('with a single explorer the hunt\'s result stands alone at the edge and the next turn\'s disaster card waits until it has been read', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'One player at the table',
      'A game may be played by one explorer alone. Every turn is then the same seat\'s, so when a turn in the field ends and the hunt\'s die is in, the next turn opens at once at the same edge, on its disaster card. The card waits (prompt 64): the hunt\'s result stands alone for two seconds, or until Carry on is tapped, and the card is shown when it goes. The E2E build holds the result until the tap.'
    );

    // Seed 863 as in scenario 014, but one explorer, so the hand dealt differs: bottom-1 holds a free ticket to Kilwa,
    // sails there, outfits and camps on the veldt south of the port. Physical dice are switched on first, so the hunting die is asked for; a four is tapped: fair
    // hunting. The card drawn for the next turn is read after the meal.
    await page.goto('/table/?new=1&gameId=ABCDE&seed=863&dice=6,6,6,6');
    await commission(page, 'bottom-1');
    await page.getByTestId('start-game').click();
    await takeCards(page); // the hand dealt waits in full at the edge (prompt 44)
    expect((await state(page)).turn!.current).toBe('bottom-1');
    await page.getByTestId('sail-bottom-1').click();
    await page.getByTestId('choose-port-kilwa').click();
    await page.getByTestId('confirm-sail-bottom-1').click();
    await passTurn(page);
    await passTurn(page); // round 2: bottom-1 lands at Kilwa and that turn is skipped
    await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c23r18');
    await outfit(page, 'bottom-1', { askaris: 1, bearers: 5, food: 40 }); // $180 of the $305 budget; five bearers carry the forty rations
    await page.getByTestId('move-target-c23r19').click();
    await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c23r19');
    // Physical dice, as at the user's table (prompt 55): from here the table asks for every die, and a face is tapped.
    await page.getByTestId('options-se').click();
    await page.getByTestId('physical-dice').click();
    await expect(page.getByTestId('physical-dice')).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('options-close').click();
    const before = (await events(page)).length;
    await pressEndTurn(page, 'bottom-1');
    await expect(page.getByTestId('dice-ask-bottom-1')).toContainText('for the hunt');
    await page.getByTestId('die-face-4-bottom-1').click();
    await expect(page.getByTestId('dice-result-bottom-1')).toBeVisible();

    await steps.step('hunt-result-alone', {
      description: 'The turn ends on the veldt south of Kilwa and the hunting die is in: the next turn is already bottom-1\'s again, standing at its disaster card, but the table shows only the hunt\'s result at the edge, the card waiting behind it',
      verifications: [
        { spec: 'The result panel is titled The hunt; no disaster card is shown though the turn stands at one, for the same seat', check: async () => {
          await expect(page.getByTestId('dice-result-title-bottom-1')).toHaveText('The hunt');
          await expect(page.getByTestId('result-meal-note-bottom-1')).toContainText('per hunter');
          await expect(page.getByTestId('dice-result-scrim')).toBeVisible();
          await expect(page.getByTestId('disaster-panel-bottom-1')).toHaveCount(0);
          await expect(page.getByTestId('disaster-scrim')).toHaveCount(0);
          const s = await state(page);
          expect(s.turn).toMatchObject({ current: 'bottom-1', phase: 'disaster' });
          expect(s.turn!.disaster).not.toBeNull();
          expect(s.explorers[0].lastMeal).toMatchObject({ kind: 'hunting', hex: 'c23r19', rolls: [{ label: 'hunting', value: 4 }] });
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    const afterHunt = (await events(page)).length;
    expect(afterHunt).toBeGreaterThan(before);
    await page.getByTestId('dice-result-ok-bottom-1').click();
    await expect(page.getByTestId('dice-result-bottom-1')).toHaveCount(0);

    await steps.step('card-after-the-result', {
      description: 'OK (or five seconds at the table, prompt 79) takes the result away, and the disaster card the next turn stands at is shown at the same edge; nothing in the game changed meanwhile',
      verifications: [
        { spec: 'The disaster card is shown for bottom-1 with its control, the result is gone, and no event passed between', check: async () => {
          await expect(page.getByTestId('disaster-panel-bottom-1')).toBeVisible();
          await expect(page.getByTestId('face-disaster-bottom-1')).toBeVisible();
          await expect(page.getByTestId('disaster-scrim')).toBeVisible();
          await expect(page.getByTestId('dice-result-scrim')).toHaveCount(0);
          expect((await events(page)).length).toBe(afterHunt);
          const s = await state(page);
          expect(s.turn).toMatchObject({ current: 'bottom-1', phase: 'disaster' });
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    await page.getByTestId('face-disaster-bottom-1').click();
    await expect(page.getByTestId('face-disaster-bottom-1')).toHaveCount(0);

    steps.generateDocs();
  });
});
