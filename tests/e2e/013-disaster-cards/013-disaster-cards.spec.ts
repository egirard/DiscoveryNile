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
/** bottom-1 ends its turn and top-1 passes, so it is bottom-1's turn again a round later. */
async function nextRound(page: Page) {
  await passTurn(page);
  await passTurn(page);
  await expect(page.getByTestId('turn-marker-bottom-1')).toHaveAttribute('data-current', 'true');
}

test.describe('013 - Disaster cards', () => {
  test('each turn in the field draws a card: a matching card takes its toll, another terrain\'s card does nothing, and an animal attack is shot at with dice', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'Disaster cards',
      'At the start of every turn in Africa outside a port of entry or Cape Colony the explorer draws a card and reads its disaster face. The card applies only when its terrain or context matches where the expedition is camped: then the losses are taken from the chart, shown as a note at the rail, and any rolls (askaris firing at animals, a doctor\'s treatment) are shown as dice. A card for another terrain has no effect. The card is discarded either way.'
    );

    // Seed 863 with the dice script 6,6,6,6 1,1,1,1 (roll-off: bottom-1 first), then the rhino's two charges with
    // five hunters each: 1,2,3,4,5 (every shot misses) and 1,1,6,1,1 (an askari kills it). Shuffles are not scripted:
    // with this seed bottom-1 pays passage to Mombasa and keeps $700, and the deck's next cards after the Europe draws
    // are card 1 (veldt), card 29 (jungle) and card 23 (veldt).
    await page.goto('/table/?new=1&gameId=ABCDE&seed=863&dice=6,6,6,6,1,1,1,1,1,2,3,4,5,1,1,6,1,1');
    await commission(page, 'bottom-1');
    await commission(page, 'top-1');
    await page.getByTestId('start-game').click();
    expect((await state(page)).turn!.current).toBe('bottom-1');
    await page.getByTestId('sail-bottom-1').click();
    await page.getByTestId('choose-port-mombasa').click();
    await passTurn(page);
    await passTurn(page); // round 2: bottom-1 lands at Mombasa and that turn is skipped
    await passTurn(page);
    await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c25r12');
    await outfit(page, 'bottom-1', { askaris: 5, bearers: 15, food: 100 });
    // At the port no card is drawn; the expedition walks one known veldt hex north.
    await expect(page.locator('[data-testid^="roll-log-"]')).toHaveCount(0);
    await page.getByTestId('move-target-c25r11').click();
    await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c25r11');
    await nextRound(page);

    await steps.step('disaster-strikes', {
      description: 'Camped on the veldt, the expedition draws card 1: an askari is killed by a buffalo. The card and the loss show at the rail and the chart drops to four askaris',
      verifications: [
        { spec: 'The rail shows card 1 as applying with the note "1 askari killed"', check: async () => {
          const chip = page.getByTestId('disaster-card-bottom-1');
          await expect(chip).toHaveAttribute('data-card', 'card-1');
          await expect(chip).toHaveAttribute('data-applies', 'true');
          await expect(page.getByTestId('disaster-note-bottom-1')).toHaveText('1 askari killed');
          await expect(page.getByTestId('roll-disaster-bottom-1')).toHaveAttribute('data-outcome', '1 askari killed');
        } },
        { spec: 'The chart shows 4 askaris; the card went to the discard pile and the expedition may still move', check: async () => {
          await expect(page.getByTestId('have-askaris-bottom-1')).toHaveAttribute('data-count', '4');
          const s = await state(page);
          expect(s.turn).toMatchObject({ current: 'bottom-1', round: 4, moved: false });
          expect(s.deck!.discard).toContain('card-1');
          expect(s.explorers.find((e) => e.seat === 'bottom-1')!.chart).toMatchObject({ askaris: 4, bearers: 15 });
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    await nextRound(page);

    await steps.step('no-effect', {
      description: 'Next turn card 29 is drawn: cannibals in the jungle, which does not apply on the veldt. The card shows faded with "no effect" and nothing changes',
      verifications: [
        { spec: 'The rail shows card 29 as not applying and no note', check: async () => {
          const chip = page.getByTestId('disaster-card-bottom-1');
          await expect(chip).toHaveAttribute('data-card', 'card-29');
          await expect(chip).toHaveAttribute('data-applies', 'false');
          await expect(page.getByTestId('disaster-note-bottom-1')).toHaveCount(0);
          await expect(page.getByTestId('roll-disaster-bottom-1')).toHaveAttribute('data-outcome', 'not here: jungle');
        } },
        { spec: 'The chart is unchanged and nobody is sick', check: async () => {
          await expect(page.getByTestId('have-askaris-bottom-1')).toHaveAttribute('data-count', '4');
          await expect(page.getByTestId('sick-bottom-1')).toHaveCount(0);
          const s = await state(page);
          expect(s.explorers.find((e) => e.seat === 'bottom-1')!.sick).toEqual({ explorer: false, guides: 0, bearers: 0, askaris: 0, animals: 0 });
          expect(s.deck!.discard).toContain('card-29');
        } }
      ]
    });

    await nextRound(page);

    await steps.step('rhino-charges', {
      description: 'Card 23: a rhino charges. The explorer and four askaris fire at each charge; the first volley misses and a bearer dies, the second has a six and the rhino falls',
      verifications: [
        { spec: 'Ten dice are shown: 1,2,3,4,5 then 1,1,6,1,1, and the note tells the story', check: async () => {
          await expect(page.getByTestId('disaster-card-bottom-1')).toHaveAttribute('data-card', 'card-23');
          await expect(page.getByTestId('disaster-note-bottom-1')).toHaveText('1 bearer killed by the rhino, the rhino is shot on charge 2');
          const s = await state(page);
          expect(s.turn!.log[0].rolls.map((r) => r.value)).toEqual([1, 2, 3, 4, 5, 1, 1, 6, 1, 1]);
        } },
        { spec: 'The chart shows 14 bearers and 4 askaris, and all three cards are in the discard pile', check: async () => {
          await expect(page.getByTestId('have-bearers-bottom-1')).toHaveAttribute('data-count', '14');
          await expect(page.getByTestId('have-askaris-bottom-1')).toHaveAttribute('data-count', '4');
          const s = await state(page);
          expect(s.explorers.find((e) => e.seat === 'bottom-1')!.chart).toMatchObject({ askaris: 4, bearers: 14 });
          expect(s.deck!.discard).toEqual(expect.arrayContaining(['card-1', 'card-29', 'card-23']));
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    steps.generateDocs();
  });
});
