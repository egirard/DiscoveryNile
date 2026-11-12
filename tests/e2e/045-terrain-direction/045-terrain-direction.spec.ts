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

/** Step the held reveal on to its next phase (`?terrain-reveal=hold`). */
const next = (page: Page) => page.evaluate(() => window.dispatchEvent(new Event('terrain-reveal:next')));

test.describe('045 - The terrain\'s direction on the board', () => {
  test('each direction die is played out on the board: the digit glows on the compass, then the neighbour that way, then its terrain is copied, or an empty neighbour glows red and the panel says to roll again', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'The terrain\'s direction on the board',
      'A blank hex takes its terrain from the neighbour in a direction rolled (rules §7.3). After the die the board plays it out (prompt 68): the digit rolled glows on the compass in the sea off Capetown, then the neighbour that way glows, then its terrain is copied into the hex explored. A neighbour with nothing mapped glows red and fades, and as it fades the dice panel says "Hex in direction 2 is empty; roll again". Each phase stands for 700 ms at the table; this scenario holds each and steps it on. The table is held but not dimmed while the board shows it, and the dice panel and the dicecam\'s picture stand down, faint, so nothing lies over the hexes.'
    );

    // The setting of scenario 043 (seed 60, canoes up the Niger from Brass, physical dice): the blank hex c3r6 up the Benue
    // has blank hexes in directions 1 and 2 and printed jungle in directions 3 to 6. The lost check a 6; the direction a 2
    // (c4r6, empty), then, once more, a 5 (c2r6, jungle).
    await page.goto('/table/?new=1&gameId=ABCDE&seed=60&dice=6,6,6,6,1,1,1,1&terrain-reveal=hold');
    await commission(page, 'bottom-1');
    await commission(page, 'top-1');
    await page.getByTestId('start-game').click();
    await takeCards(page);
    await page.getByTestId('sail-bottom-1').click();
    await page.getByTestId('choose-port-brass').click();
    await page.getByTestId('confirm-sail-bottom-1').click();
    await passTurn(page);
    await passTurn(page);
    await passTurn(page);
    await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c2r8');
    await outfit(page, 'bottom-1', CANOES);
    await page.getByTestId('move-target-c2r7').click();
    await page.getByTestId('move-target-c2r6').click();
    await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c2r6');
    await page.getByTestId('options-se').click();
    await page.getByTestId('physical-dice').click();
    await page.getByTestId('options-close').click();
    await passTurn(page);
    expect(await answerAsks(page)).toEqual(['Roll a D6 for the hunt -> 1']);
    await passTurn(page);
    expect((await state(page)).turn).toMatchObject({ current: 'bottom-1', round: 4, phase: 'act' });
    await page.getByTestId('move-target-c3r6').click();
    await expect(page.getByTestId('dice-ask-bottom-1')).toContainText('to see if you are lost');
    await page.getByTestId('die-face-6-bottom-1').click();
    await expect(page.getByTestId('dice-ask-bottom-1')).toContainText('for the direction of the terrain to copy');
    await expect(page.getByTestId('compass-rolled')).toHaveCount(0); // the lost check plays nothing
    await page.getByTestId('die-face-2-bottom-1').click();
    await expect(page.getByTestId('compass-rolled')).toHaveAttribute('data-direction', '2');

    await steps.step('digit-glows', {
      description: 'The direction die is a 2: the 2 on the compass in the sea off Capetown glows, and the table, still held for the next die, is not dimmed while the board shows what the die meant',
      verifications: [
        { spec: 'Only the compass shows the roll yet: the 2 glows, no hex glows, and the panel does not yet say the hex is empty', check: async () => {
          await expect(page.getByTestId('compass-2')).toHaveAttribute('data-rolled', 'true');
          await expect(page.getByTestId('compass-5')).toHaveAttribute('data-rolled', 'false');
          await expect(page.getByTestId('terrain-reveal')).toHaveCount(0);
          await expect(page.getByTestId('dice-note-bottom-1')).toHaveCount(0);
          await expect(page.getByTestId('dice-ask-bottom-1')).toContainText('once more');
          await expect(page.getByTestId('dice-scrim')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
          // The dice panel and the dicecam's picture stand down so the board can be watched.
          await expect(page.getByTestId('dice-edge-bottom-1')).toHaveAttribute('data-faded', 'true');
          await expect(page.getByTestId('dicecam-place')).toHaveAttribute('data-faded', 'true');
        } }
      ]
    });

    await next(page);
    await expect(page.getByTestId('terrain-reveal')).toHaveAttribute('data-phase', 'hex');

    await steps.step('neighbour-glows', {
      description: 'Then the hex in direction 2 from the hex being explored glows: c4r6, east of c3r6',
      verifications: [
        { spec: 'The glow lies on c4r6, the neighbour of c3r6 in direction 2, and the digit still glows', check: async () => {
          const reveal = page.getByTestId('terrain-reveal');
          await expect(reveal).toHaveAttribute('data-hex', 'c3r6');
          await expect(reveal).toHaveAttribute('data-neighbour', 'c4r6');
          await expect(reveal).toHaveAttribute('data-direction', '2');
          await expect(page.getByTestId('reveal-neighbour')).toBeVisible();
          await expect(page.getByTestId('compass-2')).toHaveAttribute('data-rolled', 'true');
          const glow = (await page.getByTestId('reveal-neighbour').boundingBox())!;
          const hex = (await page.getByTestId('hex-c4r6').boundingBox())!;
          expect(Math.abs(glow.x + glow.width / 2 - (hex.x + hex.width / 2))).toBeLessThan(2);
          expect(Math.abs(glow.y + glow.height / 2 - (hex.y + hex.height / 2))).toBeLessThan(2);
        } }
      ]
    });

    await next(page);
    await expect(page.getByTestId('terrain-reveal')).toHaveAttribute('data-phase', 'empty');

    await steps.step('empty-glows-red', {
      description: 'Nothing is mapped in c4r6, so the glow turns red (at the table it then fades); the hex explored is still blank',
      verifications: [
        { spec: 'The reveal says empty, the glow is red, and c3r6 has no terrain yet', check: async () => {
          await expect(page.getByTestId('terrain-reveal')).toHaveAttribute('data-terrain', 'empty');
          await expect(page.getByTestId('reveal-neighbour')).toHaveCSS('stroke', 'rgb(214, 48, 49)');
          await expect(page.getByTestId('hex-c3r6')).toHaveAttribute('data-terrain', 'blank');
          await expect(page.getByTestId('dice-note-bottom-1')).toHaveCount(0);
        } }
      ]
    });

    await next(page);
    await expect(page.getByTestId('terrain-reveal')).toHaveCount(0);

    await steps.step('roll-again', {
      description: 'As the red glow goes, the dice panel says "Hex in direction 2 is empty; roll again" above the ask for the direction once more, and the table is dimmed again',
      verifications: [
        { spec: 'The note stands in the panel above the ask; the compass is quiet; the first direction die is among the throws so far', check: async () => {
          await expect(page.getByTestId('dice-note-bottom-1')).toHaveText('Hex in direction 2 is empty; roll again');
          const note = (await page.getByTestId('dice-note-bottom-1').boundingBox())!;
          const ask = (await page.getByTestId('dice-ask-bottom-1').boundingBox())!;
          expect(note.y).toBeLessThan(ask.y);
          await expect(page.getByTestId('compass-rolled')).toHaveCount(0);
          await expect(page.getByTestId('dice-edge-bottom-1')).toHaveAttribute('data-faded', 'false');
          await expect(page.getByTestId('dice-scrim')).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
          const s = await state(page);
          expect(s.awaiting!.rolled.map((r) => r.values)).toEqual([[6], [2]]);
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    await page.getByTestId('die-face-5-bottom-1').click();
    await expect(page.getByTestId('compass-rolled')).toHaveAttribute('data-direction', '5');
    await expect(page.getByTestId('dice-note-bottom-1')).toHaveCount(0);
    await next(page);
    await expect(page.getByTestId('terrain-reveal')).toHaveAttribute('data-neighbour', 'c2r6');
    await next(page);
    await expect(page.getByTestId('terrain-reveal')).toHaveAttribute('data-phase', 'copy');

    await steps.step('terrain-copied', {
      description: 'The second direction die is a 5: the 5 glowed, then c2r6, the jungle on the Niger the expedition came from, and its jungle is copied into c3r6, which glows as it takes it',
      verifications: [
        { spec: 'The reveal copies jungle from c2r6; c3r6 is drawn as jungle though the step still waits for its other dice', check: async () => {
          const reveal = page.getByTestId('terrain-reveal');
          await expect(reveal).toHaveAttribute('data-terrain', 'jungle');
          await expect(reveal).toHaveAttribute('data-neighbour', 'c2r6');
          await expect(page.getByTestId('reveal-copied')).toBeVisible();
          await expect(page.getByTestId('compass-5')).toHaveAttribute('data-rolled', 'true');
          await expect(page.getByTestId('hex-c3r6')).toHaveAttribute('data-terrain', 'jungle');
          await expect(page.getByTestId('terrain-c3r6')).toHaveAttribute('data-terrain', 'jungle');
          const s = await state(page);
          expect(s.awaiting).not.toBeNull();
          expect(s.map['c3r6']).toBeUndefined();
        } }
      ]
    });

    await next(page);
    await expect(page.getByTestId('terrain-reveal')).toHaveCount(0);
    await expect(page.getByTestId('hex-c3r6')).toHaveAttribute('data-terrain', 'jungle'); // kept while the step waits for the river's dice
    const rest = await answerAsks(page);
    expect(rest.length).toBeGreaterThan(0);
    await expect(page.getByTestId('dice-result-bottom-1')).toBeVisible();
    await expect(page.getByTestId('compass-rolled')).toHaveCount(0);
    const s = await state(page);
    expect(s.map['c3r6']).toMatchObject({ terrain: 'jungle' });
    expect(s.turn!.log.find((l) => l.kind === 'terrain')!.outcome).toBe('mapped jungle: nothing mapped in direction 2, rolled again; jungle copied from the neighbour in direction 5');

    steps.generateDocs();
  });
});
