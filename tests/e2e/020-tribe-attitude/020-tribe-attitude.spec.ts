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

test.describe('020 - Tribe attitude', () => {
  test('releasing every prisoner earns the tribe\'s regard for that explorer, shown on the policy panel and counted in the next reaction', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'Tribe attitude',
      'Each tribe keeps an attitude towards all explorers (a defeat of an explorer lowers it, his death lowers it more) and a regard for individual explorers (releasing every prisoner raises it by three for the one who did). Both are shown on the policy panel when the tribe is faced again and are added to the reaction target, so a merciful explorer finds the tribe calmer on his next visit.'
    );

    // Seed 18 as in scenarios 016–019: c24r12 holds 12 warriors. Combat dice: reaction 6,6,6; strength 1; surprise 6,6;
    // morale 2 (victory, 6 warriors left); prisoners 1 (four taken); village 3,4 (found). The prisoners are released.
    // Next turn, a friendly approach: reaction 1,1,1 against 1 + 5 + 3 regard = 9: calm.
    await page.goto('/table/?new=1&gameId=ABCDE&seed=18&dice=6,6,6,6,1,1,1,1,6,2,1&dice-natives=1,2,3,4,5&dice-hunting=1,1&dice-combat=6,6,6,1,6,6,2,1,3,4,1,1,1');
    await commission(page, 'bottom-1');
    await commission(page, 'top-1');
    await page.getByTestId('start-game').click();
    expect((await state(page)).turn!.current).toBe('bottom-1');
    await page.getByTestId('sail-bottom-1').click();
    await page.getByTestId('choose-port-mombasa').click();
    await page.getByTestId('confirm-sail-bottom-1').click();
    await passTurn(page);
    await passTurn(page); // round 2: bottom-1 lands at Mombasa and that turn is skipped
    await passTurn(page);
    await outfit(page, 'bottom-1', { askaris: 5, bearers: 6, food: 100 });
    await page.getByTestId('move-target-c24r12').click();
    await expect(page.getByTestId('policy-panel-bottom-1')).toBeVisible();
    await expect(page.getByTestId('tribe-attitude-bottom-1')).toHaveCount(0); // a new tribe: nothing yet
    await page.getByTestId('policy-3-bottom-1').click();
    await expect(page.getByTestId('spoils-panel-bottom-1')).toBeVisible();
    await page.getByTestId('spoils-release-bottom-1').click();

    await steps.step('prisoners-released', {
      description: 'After the victory the four prisoners are released: the village is left alone, the prisoners rejoin the tribe, and its regard for the bottom seat rises by three',
      verifications: [
        { spec: 'The rail notes the release; the chart is back to 6 bearers; the tribe records regard +3 for bottom-1 only', check: async () => {
          await expect(page.getByTestId('victory-note-bottom-1').last()).toHaveText('4 prisoners released: the tribe is grateful');
          await expect(page.getByTestId('have-bearers-bottom-1')).toHaveAttribute('data-count', '6');
          const s = await state(page);
          expect(s.tribes[1]).toMatchObject({ warriors: 6, attitude: 0, regard: { 'bottom-1': 3 }, pending: null });
          expect(s.turn!.phase).toBe('act');
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    await passTurn(page);
    await passTurn(page);
    await expect(page.getByTestId('policy-panel-bottom-1')).toBeVisible();

    await steps.step('remembered', {
      description: 'Next turn the policy panel shows the tribe\'s attitude with the +3 regard for this explorer',
      verifications: [
        { spec: 'The panel reads attitude 0 with +3 for you', check: async () => {
          await expect(page.getByTestId('tribe-attitude-bottom-1')).toHaveText('· attitude 0 (+3 for you)');
          await expect(page.getByTestId('policy-panel-bottom-1')).toHaveAttribute('data-regard', '3');
        } }
      ]
    });

    await page.getByTestId('policy-5-bottom-1').click();

    await steps.step('calmer-welcome', {
      description: 'A friendly approach: the reaction dice (1, 1, 1) are weighed against distance 1, policy 5 and regard 3; the tribe is calm and the chief receives the explorer',
      verifications: [
        { spec: 'The reaction modifiers at the rail include the regard and the negotiation opens', check: async () => {
          await expect(page.getByTestId('roll-reaction-bottom-1')).toHaveAttribute('aria-label', /regard for you \+3; not hostile \(3 within 9\)/);
          await expect(page.getByTestId('negotiation-panel-bottom-1')).toBeVisible();
          const s = await state(page);
          expect(s.turn).toMatchObject({ round: 4, phase: 'negotiate', policy: 5 });
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    steps.generateDocs();
  });
});
