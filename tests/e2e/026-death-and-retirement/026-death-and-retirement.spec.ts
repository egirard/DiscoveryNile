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

test.describe('026 - Death and retirement', () => {
  test('a killed explorer takes his unpublished hex with him; the seat commissions a successor, and another explorer retires from Europe', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'Death and retirement',
      'An explorer who dies, from a fight, a card, poison, sickness or thirst, leaves play: his markers come off, and every unpublished hex nobody else has visited is erased with its tribe and caches, so later explorers will find his discoveries were only rumours. The rail shows the obituary and the seat\'s turn ends as usual; from then on the seat may commission a new explorer, who starts in Europe with an empty hand. A player may also retire his explorer on his own turn by tapping him at the rail and confirming at the edge: the same erasure, but the points already scored stay with the seat.'
    );

    // Seed 18 as in scenarios 016–018: bottom-1 holds a ticket to Mombasa; c24r12 holds 12 warriors. The combat dice
    // are 018's (victory, village, loot; next turn a surprise attack and a rout) up to the defeat die, which is a 1 here:
    // the explorer is killed.
    await page.goto('/table/?new=1&gameId=ABCDE&seed=18&dice=6,6,6,6,1,1,1,1,6,2,1&dice-natives=1,2,3,4,5&dice-hunting=1,1,1&dice-combat=6,6,6,1,6,6,2,1,3,4,1,2,3,4,5,6,1,2,3,4,5,6,6,6,6,2,1,1,1,3,1');
    await commission(page, 'bottom-1');
    await commission(page, 'top-1');
    await page.getByTestId('start-game').click();
    expect((await state(page)).turn!.current).toBe('bottom-1');
    await page.getByTestId('sail-bottom-1').click();
    await page.getByTestId('choose-port-mombasa').click();
    await passTurn(page);
    await passTurn(page); // round 2: bottom-1 lands at Mombasa and that turn is skipped
    await passTurn(page);
    await outfit(page, 'bottom-1', { askaris: 5, bearers: 6, food: 100 });
    await page.getByTestId('move-target-c24r12').click();
    await page.getByTestId('policy-3-bottom-1').click();
    await page.getByTestId('spoils-keep-bottom-1').click();
    await expect(page.getByTestId('loot-note-bottom-1')).toBeVisible();
    await passTurn(page);
    await passTurn(page);
    await expect(page.getByTestId('tribe-c24r12')).toBeVisible();
    await page.getByTestId('policy-4-bottom-1').click();

    await steps.step('killed', {
      description: 'The defeat die is a 1: the explorer is killed. His token is gone, c24r12 is blank again with its tribe marker erased, and the rail shows the fight, the obituary and the end-turn control',
      verifications: [
        { spec: 'The defeat note reads killed; the obituary names the tribe and the hex; the turn can still be ended', check: async () => {
          await expect(page.getByTestId('defeat-note-bottom-1')).toHaveText('the explorer is killed');
          await expect(page.getByTestId('fate-bottom-1')).toHaveText('killed by tribe 1 at c24r12');
          await expect(page.getByTestId('fate-bottom-1')).toHaveAttribute('data-fate', 'died');
          await expect(page.getByTestId('end-turn-bottom-1')).toBeVisible();
          await expect(page.getByTestId('explorer-setup-bottom-1')).toHaveCount(0);
        } },
        { spec: 'The token, the hex, its tribe marker and his marker are gone from the board', check: async () => {
          await expect(page.getByTestId('board-token-bottom-1')).toHaveCount(0);
          await expect(page.getByTestId('hex-c24r12')).toHaveAttribute('data-mapped', 'false');
          await expect(page.getByTestId('tribe-c24r12')).toHaveCount(0);
          await expect(page.getByTestId('marker-c24r12-bottom-1')).toHaveCount(0);
          const s = await state(page);
          expect(s.explorers[0]).toMatchObject({ location: { kind: 'dead' }, chart: null, fate: { kind: 'died', round: 4, cause: 'killed by tribe 1 at c24r12' } });
          expect(s.map['c24r12']).toBeUndefined();
          expect(s.tribes).toEqual({});
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    await passTurn(page);
    await expect(page.getByTestId('explorer-setup-bottom-1')).toBeVisible();
    await page.getByTestId('specialty-zoology-bottom-1').click();
    await page.getByTestId('commission-bottom-1').click();
    await expect(page.getByTestId('explorer-token-bottom-1')).toHaveAttribute('data-location', 'europe');
    await passTurn(page);

    await steps.step('successor', {
      description: 'On top-1\'s turn the bottom seat commissions a zoologist; round 5 opens his first Europe turn with one card drawn and the obituary gone',
      verifications: [
        { spec: 'The new explorer is in Europe on his turn with one card; the dead one stays on record', check: async () => {
          await expect(page.getByTestId('turn-marker-bottom-1')).toHaveAttribute('data-current', 'true');
          await expect(page.getByTestId('badge-zoology-bottom-1')).toBeVisible();
          await expect(page.getByTestId('hand-bottom-1')).toHaveAttribute('data-count', '1');
          await expect(page.getByTestId('fate-bottom-1')).toHaveCount(0);
          const s = await state(page);
          expect(s.turn).toMatchObject({ current: 'bottom-1', round: 5 });
          expect(s.explorers.map((e) => [e.seat, e.location.kind])).toEqual([['bottom-1', 'dead'], ['top-1', 'europe'], ['bottom-1', 'europe']]);
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    await passTurn(page);
    const s5 = await state(page);
    if (s5.turn!.phase === 'discard') await page.getByTestId(`card-${s5.explorers[1].hand[0]}-top-1`).click();
    await page.getByTestId('turn-marker-top-1').click();
    await expect(page.getByTestId('retire-panel-top-1')).toBeVisible();
    await page.getByTestId('retire-confirm-top-1').click();

    await steps.step('retired', {
      description: 'top-1 taps his explorer at the rail and confirms at the edge: he retires in Europe, his hand goes to the discard pile, and the rail shows the obituary with the end-turn control',
      verifications: [
        { spec: 'top-1 is retired: no token, the obituary reads retired in Europe, the hand is gone, the turn can be ended', check: async () => {
          await expect(page.getByTestId('fate-top-1')).toHaveText('retired in Europe');
          await expect(page.getByTestId('fate-top-1')).toHaveAttribute('data-fate', 'retired');
          await expect(page.getByTestId('explorer-token-top-1')).toHaveCount(0);
          await expect(page.getByTestId('hand-top-1')).toHaveCount(0);
          await expect(page.getByTestId('end-turn-top-1')).toBeVisible();
          const s = await state(page);
          expect(s.explorers[1]).toMatchObject({ location: { kind: 'dead' }, hand: [], fate: { kind: 'retired', round: 5, cause: 'retired in Europe' } });
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    steps.generateDocs();
  });
});
