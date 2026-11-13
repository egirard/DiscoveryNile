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

test.describe('047 - Sickness dice', () => {
  test('with physical dice the sick are rolled for by the bunch: one ask for the three sick bearers, thrown one by one or together', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'Sickness dice',
      'Every sick man rolls a die each evening. With physical dice the table does not ask for them a man at a time: it asks once for a type of man, "Roll 3 D6 for the 3 sick bearers, a die a man", then for the sick askaris, and the dice of an ask may come as the player likes, a bunch at a throw or one by one, the panel counting them in (prompt 75). A single sick man is still one die.'
    );

    // Scenario 021's story (seed 863): the stores run out, three guarded bearers starve and fall sick (sickness 4,5,6),
    // next morning a buffalo kills an askari and the march is halted. Physical dice are switched on there, the hunt's
    // die still scripted (1): the evening asks for the three sick bearers' dice together, then the starving explorer's.
    await page.goto('/table/?new=1&gameId=ABCDE&seed=863&dice=6,6,6,6,1,1,1,1&dice-hunting=1,1&dice-sickness=4,5,6');
    await commission(page, 'bottom-1');
    await commission(page, 'top-1');
    await page.getByTestId('start-game').click();
    await takeCards(page);
    expect((await state(page)).turn!.current).toBe('bottom-1');
    await page.getByTestId('sail-bottom-1').click();
    await page.getByTestId('choose-port-mombasa').click();
    await page.getByTestId('confirm-sail-bottom-1').click();
    await passTurn(page);
    await passTurn(page);
    await passTurn(page);
    await outfit(page, 'bottom-1', { askaris: 3, bearers: 10, food: 5 });
    await page.getByTestId('move-target-c25r11').click();
    await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c25r11');
    await passTurn(page);
    await expect(page.getByTestId('sick-bottom-1')).toHaveAttribute('data-count', '3');
    await passTurn(page);
    await expect(page.getByTestId('turn-marker-bottom-1')).toHaveAttribute('data-current', 'true');
    await expect(page.getByTestId('sick-halt-bottom-1')).toBeVisible();
    await page.getByTestId('options-se').click();
    await page.getByTestId('physical-dice').click();
    await expect(page.getByTestId('physical-dice')).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('options-close').click();
    await pressEndTurn(page, 'bottom-1');
    await expect(page.getByTestId('dice-ask-bottom-1')).toBeVisible();

    await steps.step('bearers-asked-together', {
      description: 'The turn ends with three sick bearers and nothing to eat. The hunt is in, and the table asks once for the three sick bearers: three dice, a die a man, to come as the player likes',
      verifications: [
        { spec: 'One ask for three dice names the three sick bearers and what a die means; none is in yet', check: async () => {
          await expect(page.getByTestId('dice-ask-bottom-1')).toHaveText('Roll 3 D6 for the 3 sick bearers, a die a man; no recovery, 2 or more dies');
          await expect(page.getByTestId('dice-prompt-bottom-1')).toHaveAttribute('data-count', '3');
          await expect(page.getByTestId('dice-gathered-bottom-1')).toHaveAttribute('data-have', '0');
          await expect(page.getByTestId('dice-auto-bottom-1')).toBeVisible();
          expect((await state(page)).awaiting).toMatchObject({ seat: 'bottom-1', stream: 'sickness', count: 3, parts: true, have: [] });
        } }
      ]
    });

    await page.getByTestId('die-face-1-bottom-1').click();
    await expect(page.getByTestId('dice-gathered-bottom-1')).toHaveAttribute('data-have', '1');

    await steps.step('one-die-in', {
      description: 'One die is thrown by itself, a 1: the table takes it as the first bearer\'s and waits for the other two',
      verifications: [
        { spec: 'The panel counts one of three in, and the same ask stands', check: async () => {
          await expect(page.getByTestId('dice-gathered-bottom-1')).toContainText('1 of 3 in');
          await expect(page.getByTestId('dicecam-status-bottom-1')).toContainText('2 more dice wanted');
          expect((await state(page)).awaiting).toMatchObject({ count: 3, have: [1] });
        } }
      ]
    });

    await page.getByTestId('die-face-2-bottom-1').click();
    await page.getByTestId('die-face-3-bottom-1').click();
    await expect(page.getByTestId('dice-ask-bottom-1')).toContainText('starving explorer');

    await steps.step('explorer-asked', {
      description: 'The other two dice, a 2 and a 3, complete the bearers\' throw. The starving explorer is one man and one die, asked for as before',
      verifications: [
        { spec: 'The ask is a single die for the starving explorer, the bearers\' three dice read back in order', check: async () => {
          await expect(page.getByTestId('dice-ask-bottom-1')).toHaveText('Roll a D6 for the starving explorer; 4+ and he falls sick');
          await expect(page.getByTestId('dice-gathered-bottom-1')).toHaveCount(0);
          const a = (await state(page)).awaiting!;
          expect(a).toMatchObject({ count: 1, have: [] });
          expect(a.parts).toBeUndefined();
          expect(a.rolled.at(-1)).toMatchObject({ values: [1, 2, 3] });
        } }
      ]
    });

    await page.getByTestId('die-face-4-bottom-1').click();
    await expect(page.getByTestId('dice-result-bottom-1')).toBeVisible();

    await steps.step('evening-decided', {
      description: 'A 4 for the explorer, who falls sick. With +3 for starving the bearers\' 2 and 3 are deaths and the 1 lingers: the evening ends as it does when the table rolls',
      verifications: [
        { spec: 'Two bearers are dead, one bearer and the explorer are sick, and the meal\'s line holds every die in order', check: async () => {
          const s = await state(page);
          const e = s.explorers.find((x) => x.seat === 'bottom-1')!;
          expect(e.chart).toMatchObject({ bearers: 1, askaris: 0, food: 0 });
          expect(e.sick).toMatchObject({ bearers: 1, explorer: true });
          expect(e.lastMeal!.rolls.map((r) => r.value)).toEqual([1, 1, 2, 3, 4]);
          expect(e.lastMeal!.outcome).toContain('2 bearers die of sickness, the starving explorer falls sick');
          expect(s.awaiting).toBeNull();
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    steps.generateDocs();
  });
});
