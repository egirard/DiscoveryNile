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
/** Sail to Mombasa, land, outfit a small party, walk into c24r12 and end the turn: the same trip for each seat. */
async function sailTo(page: Page, seat: string) {
  await page.getByTestId(`sail-${seat}`).click();
  await page.getByTestId('choose-port-mombasa').click();
  await page.getByTestId(`confirm-sail-${seat}`).click();
  await passTurn(page);
}
async function walkIn(page: Page, seat: string) {
  await outfit(page, seat, { bearers: 5, food: 20 });
  await page.getByTestId('move-target-c24r12').click();
  await expect(page.getByTestId(`board-token-${seat}`)).toHaveAttribute('data-hex', 'c24r12');
  await passTurn(page);
}
async function walkOut(page: Page, seat: string) {
  await page.getByTestId('move-target-c25r12').click();
  await page.getByTestId(`sail-home-${seat}`).click();
  await expect(page.getByTestId(`at-sea-${seat}`)).toBeVisible();
  await passTurn(page);
}

test.describe('025 - Publishing and points', () => {
  test('two explorers claim the same hex; the first home to publish it scores the points, draws a card, and the other\'s marker comes off', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'Publishing and points',
      'Discoveries score only when published in Europe. Any hex under the explorer\'s marker may be claimed, even one another explorer mapped first: whoever publishes first wins it, every marker on it comes off, the hex is known to the whole table, and the publisher draws one extra donation card per hex. Points are terrain and water (veldt 1, river 1, jungle 2 …) plus the hex\'s tribe, and they show at the rail as countable marks. Specimens and good works score on landing in Europe.'
    );

    // Seed 26: bottom-1 ($727) and top-1 ($600) can both pay passage. Main dice 6,6,6,6,1,1,1,1 give bottom-1 the
    // first turn; natives dice scripted to sixes find nobody in c24r12, the blank hex next to Mombasa where a river rises.
    await page.goto('/table/?new=1&gameId=ABCDE&seed=26&dice=6,6,6,6,1,1,1,1&dice-natives=6,6,6,6');
    await commission(page, 'bottom-1');
    await commission(page, 'top-1');
    await page.getByTestId('start-game').click();
    expect((await state(page)).turn!.current).toBe('bottom-1');
    await sailTo(page, 'bottom-1');
    await sailTo(page, 'top-1');
    await walkIn(page, 'bottom-1'); // round 3: both land, outfit, and walk into the same blank hex
    await walkIn(page, 'top-1');
    await walkOut(page, 'bottom-1'); // round 4: both back to Mombasa and home
    await walkOut(page, 'top-1');
    await expect(page.getByTestId('explorer-token-bottom-1')).toHaveAttribute('data-location', 'europe');

    await steps.step('contested', {
      description: 'Round 5, bottom-1 is home: c24r12 carries both markers and the rail offers to publish; a tap opens the claim on the map',
      verifications: [
        { spec: 'Both markers rest on c24r12; the publish control shows at the bottom rail and the hex is offered on the board', check: async () => {
          await expect(page.getByTestId('marker-c24r12-bottom-1')).toBeVisible();
          await expect(page.getByTestId('marker-c24r12-top-1')).toBeVisible();
          await expect(page.getByTestId('score-bottom-1')).toHaveCount(0);
          await page.getByTestId('publish-bottom-1').click();
          await expect(page.getByTestId('publish-target-c24r12')).toBeVisible();
          const s = await state(page);
          expect(s.map['c24r12']).toMatchObject({ terrain: 'veldt', markers: ['bottom-1', 'top-1'], publishedBy: null });
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    await page.getByTestId('publish-target-c24r12').click();

    await steps.step('published', {
      description: 'The hex is published: inked on the map with every marker gone, two points tallied at the rail (veldt and a river), a second card in the hand, and the note says what was counted',
      verifications: [
        { spec: 'The hex shows as published by bottom-1 with no markers; the tally reads 2; the hand grew by one card', check: async () => {
          await expect(page.getByTestId('hex-c24r12')).toHaveAttribute('data-published', 'bottom-1');
          await expect(page.getByTestId('marker-c24r12-bottom-1')).toHaveCount(0);
          await expect(page.getByTestId('marker-c24r12-top-1')).toHaveCount(0);
          await expect(page.getByTestId('score-bottom-1')).toHaveAttribute('data-points', '2');
          await expect(page.getByTestId('hand-bottom-1')).toHaveAttribute('data-count', '2');
          await expect(page.getByTestId('published-note-bottom-1')).toHaveText('c24r12 published (veldt, river): 2 points, a card drawn');
          await expect(page.getByTestId('publish-bottom-1')).toHaveCount(0); // nothing left to publish
          const s = await state(page);
          expect(s.scores['bottom-1']).toEqual([{ kind: 'hex', detail: 'c24r12', points: 2, round: 5 }]);
          expect(s.map['c24r12']).toMatchObject({ markers: [], publishedBy: 'bottom-1' });
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    await passTurn(page);

    await steps.step('stolen', {
      description: 'top-1 lands in Europe with nothing to publish: the hex was stolen, the top rail shows no tally and no publish control',
      verifications: [
        { spec: 'top-1 is in Europe with one card drawn, no publish control and no score', check: async () => {
          await expect(page.getByTestId('explorer-token-top-1')).toHaveAttribute('data-location', 'europe');
          await expect(page.getByTestId('hand-top-1')).toHaveAttribute('data-count', '1');
          await expect(page.getByTestId('publish-top-1')).toHaveCount(0);
          await expect(page.getByTestId('score-top-1')).toHaveCount(0);
          const s = await state(page);
          expect(s.turn).toMatchObject({ current: 'top-1', round: 5 });
          expect(s.scores['top-1']).toBeUndefined();
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    steps.generateDocs();
  });
});
