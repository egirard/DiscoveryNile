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
/**
 * Answer bottom-1's asks until none is left and no plain result lingers: the face for each ask by its words (the lost
 * check a 6, the direction to copy a 5, what the jungle hides a 1, the natives a 6, the hunt a 1, anything else a 6),
 * Carry on past a result that holds the table. An explored hex's result (prompt 65) is left standing. Returns the asks answered.
 */
async function answerAsks(page: Page, answered: string[] = []) {
  for (let i = 0; i < 12; i++) {
    const ok = page.getByTestId('dice-result-ok-bottom-1');
    if (await ok.count()) { await ok.click(); continue; }
    const ask = page.getByTestId('dice-ask-bottom-1');
    if (!(await ask.count())) return answered;
    const text = (await ask.textContent()) ?? '';
    const face = /lost/.test(text) ? 6 : /direction/.test(text) ? 5 : /jungle/.test(text) ? 1 : /natives|tribe/.test(text) ? 6 : /hunt/.test(text) ? 1 : 6;
    answered.push(`${text.split(';')[0]} -> ${face}`);
    await page.getByTestId(`die-face-${face}-bottom-1`).click();
    await expect(ask).not.toHaveText(text, { timeout: 5000 }).catch(() => {});
  }
  return answered;
}

// Two canoes paddled by fourteen bearers, seven a canoe, as in scenario 039: three points a turn, an unknown hex costing two.
const CANOES = { canoes: 2, bearers: 14, askaris: 4, food: 60, gifts: 20 };

test.describe('043 - An explored hex', () => {
  test('the lines decided stand at the foot of the ask, the lost check reads not lost, and an explored hex with points to spare offers the next step or the end of the turn', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'An explored hex',
      'With physical dice the table asks for each die of a step into a blank hex: the lost check, the direction of the terrain to copy, the terrain. What the dice have already decided for the step stands at the foot of the ask, below the faces, each line with its verdict, the lost check\'s reading "not lost" (prompt 65). When the last die is in and the expedition still has movement points, the result does not go by itself: it stays at the edge, reading "Explored a jungle hex; pick a new hex to explore, or end turn", the board open for the next step and an End control in the panel.'
    );

    // Seed 60 as in scenario 039, the roll-off scripted (bottom-1 first) and every die after physical dice are switched on
    // asked for and tapped: bottom-1 holds a free ticket to Brass and $1000 for the canoes. Up the Niger two known hexes
    // take two of the three points; next turn the blank hex c3r6 up the Benue costs two: lost check 6 (not lost), the
    // direction to copy 5 (c2r6, jungle), and one point is left.
    await page.goto('/table/?new=1&gameId=ABCDE&seed=60&dice=6,6,6,6,1,1,1,1');
    await commission(page, 'bottom-1');
    await commission(page, 'top-1');
    await page.getByTestId('start-game').click();
    await takeCards(page);
    expect((await state(page)).turn!.current).toBe('bottom-1');
    await page.getByTestId('sail-bottom-1').click();
    await page.getByTestId('choose-port-brass').click();
    await page.getByTestId('confirm-sail-bottom-1').click();
    await passTurn(page);
    await passTurn(page); // round 2: bottom-1 lands at Brass and that turn is skipped
    await passTurn(page);
    await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c2r8');
    expect((await state(page)).turn).toMatchObject({ current: 'bottom-1', round: 3 });
    await outfit(page, 'bottom-1', CANOES);
    await page.getByTestId('move-target-c2r7').click();
    await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c2r7');
    await page.getByTestId('move-target-c2r6').click();
    await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c2r6');
    // Physical dice from here (prompt 55): the table asks for every die and a face is tapped.
    await page.getByTestId('options-se').click();
    await page.getByTestId('physical-dice').click();
    await expect(page.getByTestId('physical-dice')).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('options-close').click();
    await passTurn(page); // the hunt is asked for: a one is tapped, the meal read
    expect(await answerAsks(page)).toEqual(['Roll a D6 for the hunt -> 1']);
    await passTurn(page); // top-1, in Europe; round 4 opens with bottom-1's disaster card, not for the swamp, faced by the helper
    await expect(page.getByTestId('turn-marker-bottom-1')).toHaveAttribute('data-current', 'true');
    expect((await state(page)).turn).toMatchObject({ current: 'bottom-1', round: 4, phase: 'act' });
    await expect(page.getByTestId('move-target-c3r6')).toHaveAttribute('data-cost', '2');
    await page.getByTestId('move-target-c3r6').click();
    await expect(page.getByTestId('dice-ask-bottom-1')).toContainText('to see if you are lost');
    await page.getByTestId('die-face-6-bottom-1').click();
    await expect(page.getByTestId('dice-ask-bottom-1')).toContainText('for the direction of the terrain to copy');

    await steps.step('not-lost-at-the-foot', {
      description: 'The lost check is in and the direction die is asked: the ask and the faces stand first, and the lost check\'s line, its die and "not lost", stands at the foot of the panel',
      verifications: [
        { spec: 'The line so far reads not lost and lies below the faces', check: async () => {
          await expect(page.getByTestId('so-far-lost-check-note-bottom-1')).toHaveText('not lost');
          await expect(page.getByTestId('so-far-roll-lost-check-bottom-1')).toHaveAttribute('data-lost', 'false');
          const faces = (await page.getByTestId('die-face-6-bottom-1').boundingBox())!;
          const sofar = (await page.getByTestId('dice-so-far-bottom-1').boundingBox())!;
          expect(sofar.y).toBeGreaterThan(faces.y + faces.height - 1);
          const s = await state(page);
          expect(s.awaiting).toMatchObject({ seat: 'bottom-1', sofar: [expect.objectContaining({ kind: 'lost-check', outcome: 'not lost' })] });
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    // The step's other dice: the direction to copy (5: c2r6, jungle), the river's source and cataract, the natives (6 and 6: nobody).
    const rest = await answerAsks(page);
    expect(rest[0]).toBe('Roll a D6 for the direction of the terrain to copy -> 5');
    expect(rest.length).toBeGreaterThan(1);
    await expect(page.getByTestId('dice-result-bottom-1')).toBeVisible();

    await steps.step('explored-pick-or-end', {
      description: 'The last die is in and the hex is mapped as jungle with a point to spare: the result stays at the edge without holding the table, headed Explored a jungle hex, offering a new hex to explore or the End of the turn, the lines decided at its foot; the board shows the next targets',
      verifications: [
        { spec: 'The panel reads Explored a jungle hex with the next-step line and an End control, no Carry on, no scrim; the lines stand below; the board offers targets', check: async () => {
          await expect(page.getByTestId('dice-result-title-bottom-1')).toHaveText('Explored a jungle hex');
          await expect(page.getByTestId('dice-result-next-bottom-1')).toContainText('Pick a new hex to explore, or end turn');
          await expect(page.getByTestId('dice-result-end-bottom-1')).toHaveText('End');
          await expect(page.getByTestId('dice-result-ok-bottom-1')).toHaveCount(0);
          await expect(page.getByTestId('dice-result-scrim')).toHaveCount(0);
          await expect(page.getByTestId('dice-result-bottom-1')).toHaveAttribute('data-explored', 'c3r6');
          await expect(page.getByTestId('result-lost-check-note-bottom-1')).toHaveText('not lost');
          const next = (await page.getByTestId('dice-result-next-bottom-1').boundingBox())!;
          const line = (await page.getByTestId('result-roll-lost-check-bottom-1').boundingBox())!;
          // The newest line on top (prompt 72): the terrain's line, decided after the lost check, stands above it.
          const terrainLine = (await page.getByTestId('result-roll-terrain-bottom-1').boundingBox())!;
          expect(terrainLine.y).toBeLessThan(line.y);
          await expect(page.getByTestId('dice-result-bottom-1').locator('[data-order="newest-first"]')).toHaveCount(1);
          expect(line.y).toBeGreaterThan(next.y + next.height - 1);
          await expect(page.getByTestId('hex-c3r6')).toHaveAttribute('data-terrain', 'jungle');
          await expect(page.getByTestId('movement-bottom-1')).toHaveAttribute('data-left', '1');
          await expect(page.getByTestId('move-target-c2r6')).toHaveAttribute('data-cost', '1'); // the known junction hex, for the point left
          const s = await state(page);
          expect(s.turn).toMatchObject({ current: 'bottom-1', phase: 'act' });
          expect(s.awaiting).toBeNull();
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    await page.getByTestId('dice-result-end-bottom-1').click();
    await expect(page.getByTestId('dice-result-bottom-1')).toHaveCount(0);
    // The turn ends from the panel: in the field the hunt's die is asked for; a one is tapped and the meal lingers.
    await expect(page.getByTestId('dice-ask-bottom-1')).toContainText('for the hunt');
    await page.getByTestId('die-face-1-bottom-1').click();
    await expect(page.getByTestId('dice-result-title-bottom-1')).toHaveText('The hunt');
    await page.getByTestId('dice-result-ok-bottom-1').click();

    await steps.step('ended-from-the-panel', {
      description: 'End in the panel ended the turn: the hunt was rolled and read, and the turn is top-1\'s; bottom-1\'s log holds the step\'s lines and the meal',
      verifications: [
        { spec: 'The turn passed to top-1; bottom-1\'s turn holds the card, the lost check (not lost), the terrain, the river, the natives and the hunt', check: async () => {
          const s = await state(page);
          expect(s.turn!.current).toBe('top-1');
          const played = s.history.filter((t) => t.seat === 'bottom-1').at(-1)!;
          expect(played.log.filter((r) => r.kind !== 'action').map((r) => r.kind)).toEqual(['disaster', 'lost-check', 'terrain', 'water', 'natives', 'hunting']);
          expect(played.log.find((r) => r.kind === 'lost-check')!.outcome).toBe('not lost');
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    steps.generateDocs();
  });
});
