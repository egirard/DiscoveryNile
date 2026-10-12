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
  await page.getByTestId(`chart-step-${seat}`).click();
  for (const [item, n] of Object.entries(purchases)) await tap(page, `buy-${item}-${seat}`, Math.floor(n / 10));
  await page.getByTestId(`confirm-outfit-${seat}`).click();
  await page.getByTestId(`confirm-outfit-yes-${seat}`).click();
  await expect(page.getByTestId(`chart-summary-${seat}`)).toBeVisible();
}

test.describe('027 - Superlatives', () => {
  test('a mountain with a peak over 15,000 ft is mapped, published from Europe, and scores as the highest known', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'Superlatives',
      'Superlative discoveries score when their hex is published, ranked against what was published before: the highest mountain over 15,000 ft (8/4/2/1), the highest waterfall of 400 ft or more (4/2/1), the largest lake by connected hexes (4/2/1) and the source of the longest river measured from the sea, with the Nile\'s 25 hexes beyond the board, against the rivers known in 1820 (16/8/4/2/1). A new record takes first place and keeps its points when bettered later. A mountain hex itself scores nothing (RQ-14): the peak is the prize.'
    );

    // Seed 210: bottom-1 ($877) sails to Mombasa; the blank hex c24r12 comes up mountain with a river and a peak of
    // 22,000 ft (three dice times 100 ft, plus 10,000). Main dice 6,6,6,6,1,1,1,1 give bottom-1 the first turn;
    // natives dice scripted to sixes find nobody.
    await page.goto('/table/?new=1&gameId=ABCDE&seed=210&dice=6,6,6,6,1,1,1,1&dice-natives=6,6,6,6,6,6');
    await commission(page, 'bottom-1');
    await commission(page, 'top-1');
    await page.getByTestId('start-game').click();
    expect((await state(page)).turn!.current).toBe('bottom-1');
    await page.getByTestId('sail-bottom-1').click();
    await page.getByTestId('choose-port-mombasa').click();
    await passTurn(page);
    await passTurn(page); // round 2: bottom-1 lands at Mombasa and that turn is skipped
    await passTurn(page);
    await outfit(page, 'bottom-1', { bearers: 5, food: 20 });
    await page.getByTestId('move-target-c24r12').click();
    await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c24r12');

    await steps.step('peak-mapped', {
      description: 'The first step from Mombasa maps a mountain hex with a river rising in it and a peak of 22,000 ft, recorded in brown on the hex',
      verifications: [
        { spec: 'The hex is mountain with a peak label of 220 (hundreds of feet) and a river source', check: async () => {
          await expect(page.getByTestId('hex-c24r12')).toHaveAttribute('data-terrain', 'mountain');
          await expect(page.getByTestId('peak-c24r12')).toHaveText('220');
          const s = await state(page);
          expect(s.map['c24r12']).toMatchObject({ terrain: 'mountain', peakFeet: 22000, markers: ['bottom-1'] });
          expect(s.map['c24r12'].river).not.toBeNull();
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    await passTurn(page);
    await passTurn(page);
    await page.getByTestId('move-target-c25r12').click();
    await page.getByTestId('sail-home-bottom-1').click();
    await passTurn(page);
    await passTurn(page);
    await expect(page.getByTestId('explorer-token-bottom-1')).toHaveAttribute('data-location', 'europe');
    await page.getByTestId('publish-bottom-1').click();
    await page.getByTestId('publish-target-c24r12').click();

    await steps.step('published', {
      description: 'Published from Europe the hex scores one for the river, nothing for the mountain, and eight for the highest peak known: nine points tallied at the rail, with the note naming the peak',
      verifications: [
        { spec: 'The note names the peak as the highest known for 8; the tally reads 9; the record is kept for later ranks', check: async () => {
          await expect(page.getByTestId('published-note-bottom-1')).toHaveText('c24r12 published (mountain, river, a peak of 22,000 ft, the highest known (8)): 9 points, a card drawn');
          await expect(page.getByTestId('score-bottom-1')).toHaveAttribute('data-points', '9');
          const s = await state(page);
          expect(s.superlatives).toEqual([{ kind: 'peak', hex: 'c24r12', seat: 'bottom-1', value: 22000, rank: 1, points: 8, round: 5 }]);
          expect(s.scores['bottom-1']).toEqual([{ kind: 'hex', detail: 'c24r12', points: 1, round: 5 }, { kind: 'superlative', detail: 'peak c24r12', points: 8, round: 5 }]);
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    steps.generateDocs();
  });
});
