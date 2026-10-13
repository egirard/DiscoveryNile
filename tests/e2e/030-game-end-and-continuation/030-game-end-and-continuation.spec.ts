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

test.describe('030 - Game end and continuation', () => {
  test('a five-round game ends with final publication and retirement, names the winner, and continues on the same map', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'Game end and continuation',
      'A game runs to an agreed number of rounds, chosen beside the start control, or ends when every seat with an explorer votes for it on the retire panel. At the end every explorer in Europe publishes all he can, every explorer retires, and the standings appear in the middle of the table with the winner marked. A tap starts a new game on the same map: what was published stays known, with its tribes and the records to beat, while scores, explorers and the deck start afresh.'
    );

    // Seed 26 as in scenario 025: bottom-1 ($727) pays passage to Mombasa, maps c24r12 (veldt where a river rises) and is
    // home in Europe with his marker when the fifth round ends. Natives dice scripted to sixes find nobody.
    await page.goto('/table/?new=1&gameId=ABCDE&seed=26&dice=6,6,6,6,1,1,1,1&dice-natives=6,6,6,6,6,6');
    await commission(page, 'bottom-1');
    await commission(page, 'top-1');
    await page.getByTestId('round-limit-more5').click();

    await steps.step('round-limit', {
      description: 'Before the start the table offers a round limit beside the start control: five rounds are chosen',
      verifications: [
        { spec: 'The limit reads 5 and the start control says so', check: async () => {
          await expect(page.getByTestId('round-limit')).toHaveAttribute('data-rounds', '5');
          await expect(page.getByTestId('start-game')).toHaveAttribute('aria-label', 'Start the game of 5 rounds');
        } }
      ]
    });

    await page.getByTestId('start-game').click();
    expect((await state(page)).turn!.roundLimit).toBe(5);
    await page.getByTestId('sail-bottom-1').click();
    await page.getByTestId('choose-port-mombasa').click();
    await passTurn(page);
    await passTurn(page); // round 2: bottom-1 lands and that turn is skipped
    await passTurn(page);
    await outfit(page, 'bottom-1', { bearers: 5, food: 20 });
    await page.getByTestId('move-target-c24r12').click();
    await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c24r12');
    await passTurn(page);
    await passTurn(page);
    await page.getByTestId('move-target-c25r12').click();
    await page.getByTestId('sail-home-bottom-1').click();
    await passTurn(page);
    await passTurn(page);
    await expect(page.getByTestId('explorer-token-bottom-1')).toHaveAttribute('data-location', 'europe');
    expect((await state(page)).turn).toMatchObject({ current: 'bottom-1', round: 5 });
    await passTurn(page);
    await passTurn(page); // the fifth round ends: the game is over

    await steps.step('game-over', {
      description: 'When the fifth round ends the game is over: bottom-1, home in Europe, publishes c24r12 and scores two; both explorers retire; the standings in the middle of the table mark bottom-1 the winner',
      verifications: [
        { spec: 'The standings show bottom-1 with 2 points as winner and top-1 with 0; the hex is published; both rails show the retirement', check: async () => {
          await expect(page.getByTestId('game-over')).toHaveAttribute('data-winners', 'bottom-1');
          await expect(page.getByTestId('standing-bottom-1')).toHaveAttribute('data-points', '2');
          await expect(page.getByTestId('standing-top-1')).toHaveAttribute('data-points', '0');
          await expect(page.getByTestId('hex-c24r12')).toHaveAttribute('data-published', 'bottom-1');
          await expect(page.getByTestId('score-bottom-1')).toHaveAttribute('data-points', '2');
          await expect(page.getByTestId('fate-bottom-1')).toHaveText('retired in Europe at the end of the game');
          await expect(page.getByTestId('fate-top-1')).toHaveText('retired in Europe at the end of the game');
          await expect(page.getByTestId('explorer-setup-bottom-1')).toHaveCount(0);
          const s = await state(page);
          expect(s.ended).toMatchObject({ round: 5, reason: 'limit', winners: ['bottom-1'] });
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    await page.getByTestId('continue-game').click();
    await expect(page.getByTestId('explorer-setup-bottom-1')).toBeVisible();
    await page.getByTestId('commission-bottom-1').click(); // the seat is still taken: only the explorer is new
    await expect(page.getByTestId('explorer-token-bottom-1')).toBeVisible();

    await steps.step('continued', {
      description: 'A tap continues on the same map: the standings are gone, c24r12 stays published, the scores are cleared, the seats commission new explorers and the start control is back',
      verifications: [
        { spec: 'No standings, no scores; the published hex remains; a new explorer is commissioned and the game can start', check: async () => {
          await expect(page.getByTestId('game-over')).toHaveCount(0);
          await expect(page.getByTestId('score-bottom-1')).toHaveCount(0);
          await expect(page.getByTestId('fate-bottom-1')).toHaveCount(0);
          await expect(page.getByTestId('hex-c24r12')).toHaveAttribute('data-published', 'bottom-1');
          await expect(page.getByTestId('start-game')).toBeVisible();
          await expect(page.getByTestId('explorer-setup-top-1')).toBeVisible();
          const s = await state(page);
          expect(s).toMatchObject({ turn: null, ended: null, scores: {}, games: 1 });
          expect(s.explorers.map((e) => [e.seat, e.location.kind])).toEqual([['bottom-1', 'europe']]);
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    steps.generateDocs();
  });
});
