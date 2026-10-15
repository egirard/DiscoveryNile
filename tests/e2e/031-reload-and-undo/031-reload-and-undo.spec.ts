import { test, expect, type Page } from '@playwright/test';
import { TestStepHelper } from '../helpers/test-step-helper';
import { endTurnFromRail } from '../helpers/turn';
import { withLogOpen } from '../helpers/log';

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

test.describe('031 - Reload and undo', () => {
  test('choices not yet resolved by dice are taken back at the rail, a dice step is not, and a reload at any phase brings back the same screen', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'Reload and undo',
      'Accidental touches happen on a table. Consequential actions confirm at the player\'s edge, and the last action of a turn can be taken back with the undo control at the rail as long as it rolled no dice and drew no card: booking a voyage, outfitting, caching, trading. Once the dice have spoken the control is gone. The game lives in its event log, so a reload at any phase of a turn, in the middle of a discard or after a step into the unknown, reconstructs the same screen.'
    );

    // Seed 26 as in scenario 025: bottom-1 ($727) pays passage to Mombasa and maps c24r12. Natives dice scripted to sixes find nobody.
    await page.goto('/table/?new=1&gameId=ABCDE&seed=26&dice=6,6,6,6,1,1,1,1&dice-natives=6,6,6,6,6,6');
    await commission(page, 'bottom-1');
    await commission(page, 'top-1');
    await page.getByTestId('start-game').click();
    expect((await state(page)).turn!.current).toBe('bottom-1');
    await expect(page.getByTestId('undo-bottom-1')).toHaveCount(0); // the start rolled dice and dealt cards
    await page.getByTestId('sail-bottom-1').click();
    await page.getByTestId('choose-port-mombasa').click();
    await page.getByTestId('confirm-sail-bottom-1').click();
    await expect(page.getByTestId('at-sea-bottom-1')).toBeVisible();
    await page.getByTestId('undo-bottom-1').click();

    await steps.step('undone-voyage', {
      description: 'bottom-1 books passage to Mombasa, then takes it back with the undo control: he is in Europe again with his hand, and the control is gone',
      verifications: [
        { spec: 'The explorer is back in Europe with six cards; nothing more to undo', check: async () => {
          await expect(page.getByTestId('explorer-token-bottom-1')).toHaveAttribute('data-location', 'europe');
          await expect(page.getByTestId('hand-bottom-1')).toHaveAttribute('data-count', '6');
          await expect(page.getByTestId('undo-bottom-1')).toHaveCount(0);
          const s = await state(page);
          expect(s.undo).toBeNull();
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    await page.getByTestId('sail-bottom-1').click();
    await page.getByTestId('choose-port-mombasa').click();
    await page.getByTestId('confirm-sail-bottom-1').click();
    await passTurn(page);
    await passTurn(page); // round 2: bottom-1 lands and is skipped
    await passTurn(page);
    await outfit(page, 'bottom-1', { bearers: 5, food: 20 });
    await page.getByTestId('undo-bottom-1').click();

    await steps.step('undone-outfit', {
      description: 'Round 3: bottom-1 outfits five bearers and twenty rations, then takes it back: the chart is gone and the outfitting panel is back with the whole budget',
      verifications: [
        { spec: 'The chart summary is gone and the expedition chart panel is offered again', check: async () => {
          await expect(page.getByTestId('chart-summary-bottom-1')).toHaveCount(0);
          await expect(page.getByTestId('expedition-chart-bottom-1')).toBeVisible();
          const s = await state(page);
          expect(s.explorers[0]).toMatchObject({ chart: null, money: 227 });
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    await outfit(page, 'bottom-1', { bearers: 5, food: 20 });
    await expect(page.getByTestId('undo-bottom-1')).toBeVisible();
    await page.getByTestId('move-target-c24r12').click();
    await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c24r12');

    await steps.step('resolved-by-dice', {
      description: 'The step into c24r12 rolls the lost check and maps the hex: the dice have spoken, and the undo control is gone',
      verifications: [
        { spec: 'The token is on c24r12 after a lost check; no undo is offered', check: async () => {
          await withLogOpen(page, 'bottom-1', async () => {
            await expect(page.getByTestId('roll-lost-check-bottom-1').last()).toBeVisible();
          });
          await expect(page.getByTestId('undo-bottom-1')).toHaveCount(0);
          const s = await state(page);
          expect(s.undo).toBeNull();
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    await page.reload();

    await steps.step('reloaded-mid-turn', {
      description: 'Reloaded in the middle of the turn: the token stands on c24r12 with the movement spent, the rolls of the turn at the rail, and the turn still bottom-1\'s to end',
      verifications: [
        { spec: 'The same screen: token on c24r12, lost check and terrain rolls shown, movement spent, end-turn offered', check: async () => {
          await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c24r12');
          await withLogOpen(page, 'bottom-1', async () => {
            await expect(page.getByTestId('roll-lost-check-bottom-1').last()).toBeVisible();
            await expect(page.getByTestId('roll-terrain-bottom-1').last()).toBeVisible();
          });
          await expect(page.getByTestId('movement-bottom-1')).toHaveAttribute('data-left', '0');
          await expect(page.getByTestId('end-turn-bottom-1')).toBeVisible();
          const s = await state(page);
          expect(s.turn).toMatchObject({ current: 'bottom-1', round: 3, phase: 'act', moved: true });
          expect(s.map['c24r12'].markers).toEqual(['bottom-1']);
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    await passTurn(page);
    await passTurn(page);
    await passTurn(page); // round 4: bottom-1 idles at c24r12; top-1 opens his turn over the hand limit
    await expect(page.getByTestId('discard-prompt-top-1')).toBeVisible();
    await page.reload();

    await steps.step('reloaded-discarding', {
      description: 'Round 4: top-1 is over the hand limit; the table is reloaded in the middle of the discard and comes back with the same prompt and the same hand',
      verifications: [
        { spec: 'After the reload the discard prompt is still up for top-1 with six cards', check: async () => {
          await expect(page.getByTestId('discard-prompt-top-1')).toBeVisible();
          await expect(page.getByTestId('hand-top-1')).toHaveAttribute('data-count', '6');
          const s = await state(page);
          expect(s.turn).toMatchObject({ current: 'top-1', round: 4, phase: 'discard' });
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    steps.generateDocs();
  });
});
