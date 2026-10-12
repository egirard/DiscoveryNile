import { test, expect, type Page } from '@playwright/test';
import { TestStepHelper } from '../helpers/test-step-helper';

async function commission(page: Page, seat: string) {
  await page.getByTestId(`seat-join-${seat}`).click();
  await page.getByTestId(`commission-${seat}`).click();
  await expect(page.getByTestId(`explorer-token-${seat}`)).toBeVisible();
}
const state = (page: Page) => page.evaluate(() => window.__TABLETOP__!.getState());
async function endTurn(page: Page, seat: string) {
  await page.getByTestId(`end-turn-${seat}`).click();
  await page.getByTestId(`confirm-end-turn-${seat}`).click();
}
async function tap(page: Page, id: string, times: number) {
  for (let i = 0; i < times; i++) await page.getByTestId(id).click();
}

test.describe('009 - Outfit the expedition', () => {
  test('at the port the explorer buys an expedition from the price list within the budget and sets out', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'Outfit the expedition',
      'Landed at a port of entry, the current seat sees the Expedition Organization Chart as a panel at its edge: every item of the price list with −/+ controls, a ×1/×10 step, the running budget and a carrying summary. Horses are sold only at the Cape ports and camels only at Khartoum. Confirming forfeits the unspent money and the rail shows what the expedition has.'
    );

    // Seed 5: the first player (bottom-1) holds $1100 and a free ticket to Port Elizabeth.
    await page.goto('/table/?new=1&gameId=ABCDE&seed=5');
    await commission(page, 'bottom-1');
    await commission(page, 'top-1');
    await page.getByTestId('start-game').click();
    expect((await state(page)).turn!.current).toBe('bottom-1');
    await page.getByTestId('sail-bottom-1').click();
    await expect(page.getByTestId('port-port-elizabeth')).toHaveAttribute('data-fare', 'ticket');
    await page.getByTestId('choose-port-port-elizabeth').click();
    await expect(page.getByTestId('money-bottom-1')).toHaveText('$1100');
    await endTurn(page, 'bottom-1');
    await endTurn(page, 'top-1'); // bottom-1's turn at sea is skipped; the token lands
    await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c14r36');
    await endTurn(page, 'top-1');

    await steps.step('price-list', {
      description: 'At Port Elizabeth the outfitting panel faces the bottom seat: the price list, horses for sale, no camels, a $1100 budget',
      verifications: [
        { spec: 'The panel is at the bottom edge with all nine items; horses available, camels not', check: async () => {
          await expect(page.getByTestId('outfit-panel-bottom-1')).toBeVisible();
          await expect(page.getByTestId('expedition-chart-bottom-1')).toHaveAttribute('data-port', 'port-elizabeth');
          await expect(page.locator('[data-testid^="row-"][data-testid$="-bottom-1"]')).toHaveCount(9);
          await expect(page.getByTestId('row-horses-bottom-1')).toHaveAttribute('data-available', 'true');
          await expect(page.getByTestId('row-camels-bottom-1')).toHaveAttribute('data-available', 'false');
          await expect(page.getByTestId('buy-camels-bottom-1')).toBeDisabled();
        } },
        { spec: 'The budget shows $1100 and nothing is bought yet', check: async () => {
          await expect(page.getByTestId('chart-budget-bottom-1')).toHaveText('$1100');
          await expect(page.getByTestId('count-bearers-bottom-1')).toHaveText('0');
          await expect(page.getByTestId('chart-capacity-bottom-1')).toHaveAttribute('data-men', '1');
          const s = await state(page);
          expect(s.turn).toMatchObject({ current: 'bottom-1', round: 3, phase: 'act' });
        } }
      ]
    });

    // The rules' canoe-borne expedition for $1000: 2 canoes, 16 bearers, 1 guide, 6 askaris, 4 muskets, 50 gifts, 125 rations.
    await tap(page, 'buy-canoes-bottom-1', 2);
    await tap(page, 'buy-guides-bottom-1', 1);
    await tap(page, 'buy-askaris-bottom-1', 6);
    await tap(page, 'buy-muskets-bottom-1', 4);
    await page.getByTestId('chart-step-bottom-1').click();
    await expect(page.getByTestId('chart-step-bottom-1')).toHaveAttribute('aria-pressed', 'true');
    await tap(page, 'buy-bearers-bottom-1', 1);
    await tap(page, 'buy-gifts-bottom-1', 5);
    await tap(page, 'buy-food-bottom-1', 12);
    await page.getByTestId('chart-step-bottom-1').click();
    await tap(page, 'buy-bearers-bottom-1', 6);
    await tap(page, 'buy-food-bottom-1', 5);

    await steps.step('sample-canoe-expedition', {
      description: 'The canoe-borne sample expedition is entered: $1000 spent, $100 left, 24 men with seats for 24 in two canoes',
      verifications: [
        { spec: 'Counts match the sample expedition and $100 of the budget is left', check: async () => {
          for (const [item, n] of Object.entries({ canoes: 2, bearers: 16, guides: 1, askaris: 6, muskets: 4, gifts: 50, food: 125, horses: 0, camels: 0 })) {
            await expect(page.getByTestId(`count-${item}-bottom-1`)).toHaveText(String(n));
          }
          await expect(page.getByTestId('chart-budget-bottom-1')).toHaveText('$100');
        } },
        { spec: 'The carrying summary: 24 men, 179 load units, canoe seats for 24, not reduced to foot pace', check: async () => {
          const cap = page.getByTestId('chart-capacity-bottom-1');
          await expect(cap).toHaveAttribute('data-men', '24');
          await expect(cap).toHaveAttribute('data-load', '179');
          await expect(cap).toHaveAttribute('data-canoe-seats', '24');
          await expect(cap).toHaveAttribute('data-on-foot', 'false');
        } },
        { spec: 'An unaffordable purchase is refused by the control: a 21st askari would cost $50 more than is left', check: async () => {
          await expect(page.getByTestId('buy-askaris-bottom-1')).toBeEnabled();
          await tap(page, 'buy-askaris-bottom-1', 2);
          await expect(page.getByTestId('count-askaris-bottom-1')).toHaveText('8');
          await expect(page.getByTestId('buy-askaris-bottom-1')).toBeDisabled();
          await tap(page, 'sell-askaris-bottom-1', 2);
          await expect(page.getByTestId('chart-budget-bottom-1')).toHaveText('$100');
        } }
      ]
    });

    await page.getByTestId('confirm-outfit-bottom-1').click();
    await expect(page.getByTestId('confirm-outfit-yes-bottom-1')).toBeVisible();
    await page.getByTestId('confirm-outfit-yes-bottom-1').click();

    await steps.step('confirmed', {
      description: 'The expedition is set: the panel is gone, the unspent $100 is forfeited, and the rail lists what the expedition has',
      verifications: [
        { spec: 'The chart is recorded in the state and the budget is spent', check: async () => {
          const s = await state(page);
          const e = s.explorers.find((x) => x.seat === 'bottom-1')!;
          expect(e.chart).toEqual({ canoes: 2, bearers: 16, guides: 1, askaris: 6, muskets: 4, gifts: 50, food: 125, horses: 0, camels: 0, water: 0 });
          expect(e.money).toBe(0);
          expect(s.diagnostics).toEqual([]);
        } },
        { spec: 'The panel closed and the rail summary shows the counts', check: async () => {
          await expect(page.getByTestId('outfit-panel-bottom-1')).toHaveCount(0);
          await expect(page.getByTestId('chart-summary-bottom-1')).toBeVisible();
          await expect(page.getByTestId('have-canoes-bottom-1')).toHaveAttribute('data-count', '2');
          await expect(page.getByTestId('have-bearers-bottom-1')).toHaveAttribute('data-count', '16');
          await expect(page.getByTestId('have-food-bottom-1')).toHaveAttribute('data-count', '125');
          await expect(page.getByTestId('have-horses-bottom-1')).toHaveCount(0);
          await expect(page.getByTestId('end-turn-bottom-1')).toBeVisible();
        } }
      ]
    });

    steps.generateDocs();
  });
});
