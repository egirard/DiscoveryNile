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

const events = (page: Page) => page.evaluate(() => window.__TABLETOP__!.getEvents());

test.describe('046 - Out of moves', () => {
  test('an expedition in the field that spends its last movement point has its turn ended by the table, which goes straight on to the hunt', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'Out of moves',
      'An expedition in the field with no move left has nothing more to do in its turn but hunt and eat. The table no longer waits for the end-turn control then (prompt 70): the step that spends the last movement point ends the turn, the hunting die is rolled and the next seat plays. While a move is left the turn stays open as before, and so it does at a port, in Europe, and after an undo. The scenarios before this one run with the rule off (the E2E build\'s default) and end their turns by the control; this one switches it on with ?auto-end=1, as the table has it.'
    );

    // The setting of scenario 014 (seed 863, on foot from Mombasa, the hunting die scripted a 4), with the rule on.
    await page.goto('/table/?new=1&gameId=ABCDE&seed=863&dice=6,6,6,6,1,1,1,1&dice-hunting=4,1&auto-end=1');
    await commission(page, 'bottom-1');
    await commission(page, 'top-1');
    await page.getByTestId('start-game').click();
    await takeCards(page);
    await page.getByTestId('sail-bottom-1').click();
    await page.getByTestId('choose-port-mombasa').click();
    await page.getByTestId('confirm-sail-bottom-1').click();
    await passTurn(page);
    await passTurn(page);
    await passTurn(page);
    await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c25r12');
    await outfit(page, 'bottom-1', { askaris: 5, bearers: 15, food: 100 });
    await page.getByTestId('move-target-c25r11').click();
    await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c25r11');

    await steps.step('a-move-left', {
      description: 'On foot the expedition has two movement points: after one step into the known veldt north of Mombasa a move is left, so the turn stays bottom-1\'s, the board offers the next step and the end-turn control stands at the rail',
      verifications: [
        { spec: 'It is still bottom-1\'s turn with targets on the board and the end-turn control at the rail; no turn has ended since the step', check: async () => {
          await expect(page.getByTestId('turn-marker-bottom-1')).toHaveAttribute('data-current', 'true');
          await expect(page.getByTestId('end-turn-bottom-1')).toBeVisible();
          expect(await page.locator('[data-testid^="move-target-"]').count()).toBeGreaterThan(0);
          const s = await state(page);
          expect(s.turn).toMatchObject({ current: 'bottom-1', phase: 'act', moved: false, movement: { spent: 1, points: 2 } });
          expect((await events(page)).at(-1)!.type).toBe('expedition/moved');
        } },
        { spec: 'The turn\'s record at the seat\'s edge prompts for the step with the point left, or END TURN, and stands clear of the hexes it may step into (prompt 74)', check: async () => {
          await expect(page.getByTestId('move-prompt-bottom-1')).toHaveAttribute('data-left', '1');
          await expect(page.getByTestId('move-prompt-text-bottom-1')).toHaveText('You have 1 MP: pick a hex to move into, or');
          await expect(page.getByTestId('move-prompt-end-bottom-1')).toHaveText('END TURN');
          const panel = (await page.getByTestId('move-prompt-edge-bottom-1').boundingBox())!;
          for (const target of await page.locator('[data-testid^="move-target-"]').all()) {
            const hex = (await target.boundingBox())!;
            expect(hex.x + hex.width <= panel.x || hex.x >= panel.x + panel.width || hex.y + hex.height <= panel.y || hex.y >= panel.y + panel.height).toBe(true);
          }
        } }
      ]
    });

    // The second step, through known country too, spends the last point. Nothing else is tapped.
    const next = page.locator('[data-testid^="move-target-"][data-unknown="false"]:not([data-testid="move-target-c25r12"])').first();
    const hex = (await next.getAttribute('data-testid'))!.replace('move-target-', '');
    await next.click();
    await expect(page.getByTestId('turn-marker-top-1')).toHaveAttribute('data-current', 'true');

    await steps.step('turn-ended-itself', {
      description: 'The second step spends the last point, and without a tap on the end-turn control the turn is over: the hunting die is rolled (a 4), the men eat, and it is top-1\'s turn',
      verifications: [
        { spec: 'The table appended the end of the turn right after the step; the hunt\'s die and meal stand at bottom-1\'s rail and the top seat is to play', check: async () => {
          const types = (await events(page)).map((e) => e.type);
          expect(types.slice(-2)).toEqual(['expedition/moved', 'turn/ended']);
          await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', hex);
          await expect(page.getByTestId('roll-hunting-bottom-1')).toHaveAttribute('data-total', '4');
          await expect(page.getByTestId('meal-note-bottom-1')).toContainText('two per hunter');
          await expect(page.getByTestId('end-turn-bottom-1')).toHaveCount(0);
          const s = await state(page);
          expect(s.turn).toMatchObject({ current: 'top-1', round: 3 });
          expect(s.explorers.find((x) => x.seat === 'bottom-1')!.lastMeal).toMatchObject({ kind: 'hunting', hex });
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    steps.generateDocs();
  });
});
