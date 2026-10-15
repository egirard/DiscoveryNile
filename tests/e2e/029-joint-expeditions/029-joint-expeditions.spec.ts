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

test.describe('029 - Joint expeditions', () => {
  test('two explorers pool their donations, sail and land together, move as one on the last member\'s turn, and part with an agreed share', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'Joint expeditions',
      'Explorers may travel as one. In Europe a player sailing can pool the donations of companions, who sail and land with him; the party has one chart, held by its leader, and moves once a round on the turn of the member who comes last in the order, with one lost check and markers for everyone. Explorers meeting in a hex may join forces the same way, and any member may leave with an agreed share of the chart, the rest staying with the party.'
    );

    // Seed 26 as in scenario 025: bottom-1 ($727) sails to Mombasa pooling top-1's $600; natives dice scripted to sixes find nobody in c24r12.
    await page.goto('/table/?new=1&gameId=ABCDE&seed=26&dice=6,6,6,6,1,1,1,1&dice-natives=6,6,6,6,6,6');
    await commission(page, 'bottom-1');
    await commission(page, 'top-1');
    await page.getByTestId('start-game').click();
    expect((await state(page)).turn!.current).toBe('bottom-1');
    await page.getByTestId('sail-bottom-1').click();
    await page.getByTestId('pool-top-1-bottom-1').click();
    await expect(page.getByTestId('pool-top-1-bottom-1')).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('choose-port-mombasa').click();
    await page.getByTestId('confirm-sail-bottom-1').click();

    await steps.step('pooled', {
      description: 'bottom-1 opens the sail chooser, taps top-1\'s token to pool his donations, and books Mombasa: both are at sea, the budget is the two hands less the fare, and the rail notes the joint expedition',
      verifications: [
        { spec: 'Both explorers are at sea for Mombasa; bottom-1 leads a party of two with the pooled budget; top-1 has nothing left', check: async () => {
          await expect(page.getByTestId('at-sea-bottom-1')).toBeVisible();
          await expect(page.getByTestId('at-sea-top-1')).toBeVisible();
          await expect(page.getByTestId('party-note-bottom-1')).toHaveText('a joint expedition with top-1: $600 pooled, $827 to spend at Mombasa');
          const s = await state(page);
          expect(s.parties).toEqual({ 1: { id: 1, leader: 'bottom-1', members: ['bottom-1', 'top-1'] } });
          expect(s.explorers.map((e) => [e.seat, e.money, e.party])).toEqual([['bottom-1', 827, 1], ['top-1', 0, 1]]);
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    await passTurn(page); // top-1's turn at sea is skipped; round 2 bottom-1 lands both and his landing turn is skipped
    await expect(page.getByTestId('in-port-top-1')).toBeVisible();
    await passTurn(page); // top-1 idles in port
    await outfit(page, 'bottom-1', { bearers: 10, food: 60 });

    await steps.step('landed-together', {
      description: 'Round 3: both landed at Mombasa on the leader\'s turn; bottom-1 outfits the party\'s one chart and his rail marks a party of two, top-1\'s rail marks his leader; the party does not move on the leader\'s turn',
      verifications: [
        { spec: 'The chart sits on bottom-1 with a party mark of 2; top-1 shows the leader; no move target is offered to bottom-1', check: async () => {
          await expect(page.getByTestId('party-bottom-1')).toHaveAttribute('data-mover', 'top-1');
          await expect(page.getByTestId('party-top-1')).toHaveAttribute('data-leader', 'bottom-1');
          await expect(page.getByTestId('have-bearers-bottom-1')).toHaveAttribute('data-count', '10');
          await expect(page.getByTestId('chart-summary-top-1')).toHaveCount(0);
          await expect(page.locator('[data-testid^="move-target-"]')).toHaveCount(0);
          const s = await state(page);
          expect(s.turn).toMatchObject({ current: 'bottom-1', round: 3 });
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    await passTurn(page);
    await page.getByTestId('move-target-c24r12').click();

    await steps.step('moved-as-one', {
      description: 'On top-1\'s turn the party steps into c24r12 as one: both tokens stand side by side, one lost check was rolled, and the hex carries both markers',
      verifications: [
        { spec: 'Both tokens are on c24r12 and shared; one lost check; markers for both', check: async () => {
          await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c24r12');
          await expect(page.getByTestId('board-token-top-1')).toHaveAttribute('data-hex', 'c24r12');
          await expect(page.getByTestId('board-token-top-1')).toHaveAttribute('data-shared', 'true');
          await expect(page.getByTestId('marker-c24r12-bottom-1')).toBeVisible();
          await expect(page.getByTestId('marker-c24r12-top-1')).toBeVisible();
          const s = await state(page);
          expect(s.turn!.log.filter((r) => r.kind === 'lost-check')).toHaveLength(1);
          expect(s.explorers[1].chart).toBeNull();
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    await page.getByTestId('split-top-1').click();
    await expect(page.getByTestId('split-panel-top-1')).toBeVisible();
    await tap(page, 'split-more-bearers-top-1', 3);
    await tap(page, 'split-more5-food-top-1', 2);
    await page.getByTestId('split-confirm-top-1').click();

    await steps.step('split', {
      description: 'top-1 leaves the party with three bearers and ten rations chosen at the edge: each explorer now has his own chart and the party is dissolved',
      verifications: [
        { spec: 'top-1 has 3 bearers and 10 food, bottom-1 keeps 7 and 50; no party remains; the rail notes the parting', check: async () => {
          await expect(page.getByTestId('have-bearers-top-1')).toHaveAttribute('data-count', '3');
          await expect(page.getByTestId('have-food-top-1')).toHaveAttribute('data-count', '10');
          await expect(page.getByTestId('have-bearers-bottom-1')).toHaveAttribute('data-count', '7');
          await expect(page.getByTestId('party-note-top-1')).toHaveText('top-1 leaves the joint expedition with 3 bearers, 10 food');
          await expect(page.getByTestId('party-top-1')).toHaveCount(0);
          const s = await state(page);
          expect(s.parties).toEqual({});
          expect(s.explorers.map((e) => e.party)).toEqual([null, null]);
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    steps.generateDocs();
  });
});
