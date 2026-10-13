import { test, expect, type Page } from '@playwright/test';
import { TestStepHelper } from '../helpers/test-step-helper';

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
  await page.getByTestId(`end-turn-${seat}`).click();
  await page.getByTestId(`confirm-end-turn-${seat}`).click();
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

test.describe('019 - Negotiation and trade', () => {
  test('a friendly approach to a calm tribe: gifts satisfy the chief, trade at rolled prices, and giving everything the next day', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'Negotiation and trade',
      'When the natives are not hostile to a show of force or a friendly approach, the explorer may negotiate: gifts are offered on a panel at the player\'s edge, and the gifts times the larger of two dice must reach the tribe\'s warriors or the chief is insulted (and considers an attack, or poison). Giving everything but the men always satisfies, the chief returning three dice of gifts. A satisfied chief permits trade: a die per item sets this turn\'s price in gifts, rations are bought and sold by the gift, and an askari also costs a musket.'
    );

    // Seed 18 as in scenarios 016–018 (bottom-1 holds a ticket to Mombasa; c24r12 holds 12 warriors), with 20 gifts
    // bought at the port. Combat dice: reaction 1,1,1 (3 within 1 + 5: calm); offer 3,6 (6 × 2 reaches 12: satisfied);
    // prices 3,2,4,1 (3 rations per gift, bearer 2, guide 4, askari 1). Next turn: reaction 1,1,1 (calm, local knowledge
    // +1); everything given: the chief returns 6,6,6 = 18 gifts; prices 1,1,1,1.
    await page.goto('/table/?new=1&gameId=ABCDE&seed=18&dice=6,6,6,6,1,1,1,1,6,2,1&dice-natives=1,2,3,4,5&dice-hunting=1,1&dice-combat=1,1,1,3,6,3,2,4,1,1,1,1,6,6,6,1,1,1,1');
    await commission(page, 'bottom-1');
    await commission(page, 'top-1');
    await page.getByTestId('start-game').click();
    expect((await state(page)).turn!.current).toBe('bottom-1');
    await page.getByTestId('sail-bottom-1').click();
    await page.getByTestId('choose-port-mombasa').click();
    await passTurn(page);
    await passTurn(page); // round 2: bottom-1 lands at Mombasa and that turn is skipped
    await passTurn(page);
    await outfit(page, 'bottom-1', { askaris: 5, bearers: 6, food: 100, gifts: 20 });
    await page.getByTestId('move-target-c24r12').click();
    await expect(page.getByTestId('policy-panel-bottom-1')).toBeVisible();
    await page.getByTestId('policy-5-bottom-1').click();
    await expect(page.getByTestId('negotiation-panel-bottom-1')).toBeVisible();
    await expect(page.getByTestId('negotiate-prompt-bottom-1')).toBeVisible();
    await tap(page, 'offer-more-bottom-1', 2);
    await expect(page.getByTestId('offer-count-bottom-1')).toHaveAttribute('data-count', '2');
    await page.getByTestId('offer-confirm-bottom-1').click();

    await steps.step('chief-satisfied', {
      description: 'The reaction is calm, so the chief receives the explorer. Two gifts are offered; the dice show 3 and 6, and 6 × 2 reaches the twelve warriors: the chief is satisfied and permits trade. The trade panel shows this turn\'s prices',
      verifications: [
        { spec: 'The rail tells the offer and the permission with the prices', check: async () => {
          await expect(page.getByTestId('negotiation-note-bottom-1')).toHaveText('2 gifts offered: the chief is satisfied (6 × 2 against 12 warriors)');
          await expect(page.getByTestId('trade-note-bottom-1')).toHaveText('the chief permits trade: 3 rations per gift, bearer 2, guide 4, askari 1');
          await expect(page.getByTestId('trade-prompt-bottom-1')).toBeVisible();
        } },
        { spec: 'The trade panel lists rations, bearers, guides and askaris at the rolled prices; 18 gifts remain', check: async () => {
          await expect(page.getByTestId('trade-price-food-bottom-1')).toHaveAttribute('data-price', '3');
          await expect(page.getByTestId('trade-price-bearers-bottom-1')).toHaveAttribute('data-price', '2');
          await expect(page.getByTestId('trade-price-guides-bottom-1')).toHaveAttribute('data-price', '4');
          await expect(page.getByTestId('trade-price-askaris-bottom-1')).toHaveAttribute('data-price', '1');
          await expect(page.getByTestId('trade-row-camels-bottom-1')).toHaveCount(0);
          await expect(page.getByTestId('trade-buy-askaris-bottom-1')).toBeDisabled(); // no musket to arm one
          await expect(page.getByTestId('have-gifts-bottom-1')).toHaveAttribute('data-count', '18');
          const s = await state(page);
          expect(s.turn).toMatchObject({ phase: 'trade', trade: { tribe: 1, prices: { food: 3, bearers: 2, guides: 4, askaris: 1 } } });
          expect(s.tribes[1].negotiatedBy).toEqual(['bottom-1']);
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    await page.getByTestId('trade-buy-bearers-bottom-1').click();
    await page.getByTestId('trade-sell-food-bottom-1').click();
    await page.getByTestId('trade-sell-food-bottom-1').click();

    await steps.step('traded', {
      description: 'A bearer is hired for two gifts and six rations are sold for two gifts: the chart shows 7 bearers, 94 rations and 18 gifts, each trade noted at the rail',
      verifications: [
        { spec: 'The chart and the panel agree on 7 bearers, 94 food and 18 gifts', check: async () => {
          await expect(page.getByTestId('have-bearers-bottom-1')).toHaveAttribute('data-count', '7');
          await expect(page.getByTestId('have-food-bottom-1')).toHaveAttribute('data-count', '94');
          await expect(page.getByTestId('have-gifts-bottom-1')).toHaveAttribute('data-count', '18');
          await expect(page.getByTestId('trade-have-bearers-bottom-1')).toHaveAttribute('data-count', '7');
          await expect(page.getByTestId('trade-note-bottom-1').last()).toHaveText('sold 3 rations for 1 gift');
          const s = await state(page);
          expect(s.turn!.log.filter((l) => l.kind === 'trade').map((l) => l.outcome)).toEqual(['the chief permits trade: 3 rations per gift, bearer 2, guide 4, askari 1', 'bought 1 bearer for 2 gifts', 'sold 3 rations for 1 gift', 'sold 3 rations for 1 gift']);
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    await page.getByTestId('trade-done-bottom-1').click();
    await expect(page.getByTestId('end-turn-bottom-1')).toBeVisible();
    await passTurn(page);
    await passTurn(page);
    await expect(page.getByTestId('policy-panel-bottom-1')).toBeVisible();
    await page.getByTestId('policy-5-bottom-1').click();
    await expect(page.getByTestId('negotiation-panel-bottom-1')).toBeVisible();
    await page.getByTestId('offer-everything-bottom-1').click();

    await steps.step('given-everything', {
      description: 'Next turn the tribe remembers the explorer (+1 for the prior negotiation) and stays calm. The explorer gives everything but the men: the stores go, the chief returns 18 gifts, and trade opens again at fresh prices',
      verifications: [
        { spec: 'The reaction counts the local knowledge; the chart keeps the men, 18 gifts and nothing else', check: async () => {
          await expect(page.getByTestId('roll-reaction-bottom-1')).toHaveAttribute('aria-label', /local knowledge \+1/);
          await expect(page.getByTestId('negotiation-note-bottom-1')).toHaveText('everything given: the chief is satisfied and returns 18 gifts');
          await expect(page.getByTestId('have-gifts-bottom-1')).toHaveAttribute('data-count', '18');
          await expect(page.getByTestId('have-food-bottom-1')).toHaveCount(0);
          await expect(page.getByTestId('trade-price-food-bottom-1')).toHaveAttribute('data-price', '1');
          const s = await state(page);
          expect(s.explorers.find((e) => e.seat === 'bottom-1')!.chart).toMatchObject({ bearers: 7, askaris: 5, gifts: 18, food: 0 });
          expect(s.turn).toMatchObject({ round: 4, phase: 'trade' });
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    steps.generateDocs();
  });
});
