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
async function expectCounts(page: Page, seat: string, counts: Record<string, number>) {
  for (const [item, n] of Object.entries(counts)) await expect(page.getByTestId(`count-${item}-${seat}`)).toHaveText(String(n));
}

// The rules' sample expeditions, as the outfit buttons scale them to the $1100 budget (outfit.test.ts).
const CANOE_OUTFIT = { canoes: 2, bearers: 16, guides: 1, askaris: 6, muskets: 5, gifts: 63, food: 157, horses: 0, camels: 0 };
const MOUNTED_OUTFIT = { horses: 13, askaris: 4, guides: 1, bearers: 2, muskets: 1, gifts: 24, food: 61, canoes: 0, camels: 0 };

test.describe('009 - Outfit the expedition', () => {
  test('at the port the explorer buys an expedition from the price list within the budget and sets out', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'Outfit the expedition',
      'Landed at a port of entry, the current seat sees the Expedition Organization Chart as a panel at its edge, headed by the port: every item of the price list by name with −/+ controls, a ×1/×5/×10 step, the running budget, and a line that counts the people and says how the expedition could move (overland, by canoe at one to four hexes with a cataract mark when eight bearers can portage, mounted). Horses are sold only at the Cape ports and camels only at Khartoum. Three buttons spend the whole budget on the rules\' sample expeditions. Done turns into a confirmation in place, which a tap anywhere else takes back; confirming forfeits the unspent money and the rail shows what the expedition has.'
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
    await page.getByTestId('confirm-sail-bottom-1').click();
    await expect(page.getByTestId('money-bottom-1')).toHaveText('$1100');
    await endTurn(page, 'bottom-1');
    await endTurn(page, 'top-1'); // bottom-1's turn at sea is skipped; the token lands
    await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c14r36');
    await endTurn(page, 'top-1');

    await steps.step('price-list', {
      description: 'At Port Elizabeth the outfitting panel faces the bottom seat: the port at its head with foot, canoe and horse outfits on offer, the price list by name, horses for sale and no camels, a $1100 budget, and an explorer alone who can only walk',
      verifications: [
        { spec: 'The panel is at the bottom edge, headed by the port, with all nine items named; horses available, camels not', check: async () => {
          await expect(page.getByTestId('outfit-panel-bottom-1')).toBeVisible();
          await expect(page.getByTestId('expedition-chart-bottom-1')).toHaveAttribute('data-port', 'port-elizabeth');
          await expect(page.getByTestId('outfit-port-bottom-1')).toHaveText(/Port Elizabeth/);
          await expect(page.locator('[data-testid^="row-"][data-testid$="-bottom-1"]')).toHaveCount(9);
          for (const [item, name] of Object.entries({ guides: 'Guide', bearers: 'Bearer', askaris: 'Askari', camels: 'Camel', horses: 'Horse', canoes: 'Canoe', muskets: 'Musket', food: 'Ration', gifts: 'Gift' }))
            await expect(page.getByTestId(`name-${item}-bottom-1`)).toHaveText(name);
          await expect(page.getByTestId('row-horses-bottom-1')).toHaveAttribute('data-available', 'true');
          await expect(page.getByTestId('row-camels-bottom-1')).toHaveAttribute('data-available', 'false');
          await expect(page.getByTestId('buy-camels-bottom-1')).toBeDisabled();
        } },
        { spec: 'Foot, canoe and horse outfits are offered (no camel outfit here) and the step is ×1 of ×1, ×5, ×10', check: async () => {
          await expect(page.getByTestId('outfit-like-foot-bottom-1')).toBeVisible();
          await expect(page.getByTestId('outfit-like-canoe-bottom-1')).toBeVisible();
          await expect(page.getByTestId('outfit-like-mounted-bottom-1')).toBeVisible();
          await expect(page.getByTestId('chart-capacity-bottom-1')).toHaveAttribute('data-mount', 'horses');
          await expect(page.getByTestId('chart-step-1-bottom-1')).toHaveAttribute('aria-pressed', 'true');
          await expect(page.getByTestId('chart-step-5-bottom-1')).toHaveAttribute('aria-pressed', 'false');
          await expect(page.getByTestId('chart-step-10-bottom-1')).toHaveAttribute('aria-pressed', 'false');
        } },
        { spec: 'The budget shows $1100 and nothing is bought yet: one person, who can walk but has no canoe and no mount', check: async () => {
          await expect(page.getByTestId('chart-budget-bottom-1')).toHaveText('$1100');
          await expect(page.getByTestId('count-bearers-bottom-1')).toHaveText('0');
          const cap = page.getByTestId('chart-capacity-bottom-1');
          await expect(cap).toHaveAttribute('data-people', '1');
          await expect(cap).toHaveAttribute('data-overland', 'true');
          await expect(page.getByTestId('mode-foot-bottom-1')).toHaveAttribute('data-ok', 'true');
          await expect(page.getByTestId('mode-canoe-bottom-1')).toHaveAttribute('data-ok', 'false');
          await expect(page.getByTestId('mode-mounted-bottom-1')).toHaveAttribute('data-ok', 'false');
          const s = await state(page);
          expect(s.turn).toMatchObject({ current: 'bottom-1', round: 3, phase: 'act' });
        } }
      ]
    });

    // The rules' canoe-borne expedition for $1000, entered by hand with the three steps:
    // 2 canoes, 16 bearers, 1 guide, 6 askaris, 4 muskets, 50 gifts, 125 rations.
    await tap(page, 'buy-canoes-bottom-1', 2);
    await tap(page, 'buy-guides-bottom-1', 1);
    await tap(page, 'buy-muskets-bottom-1', 4);
    await tap(page, 'buy-askaris-bottom-1', 1);
    await page.getByTestId('chart-step-5-bottom-1').click();
    await expect(page.getByTestId('chart-step-5-bottom-1')).toHaveAttribute('aria-pressed', 'true');
    await tap(page, 'buy-askaris-bottom-1', 1);
    await tap(page, 'buy-bearers-bottom-1', 1);
    await tap(page, 'buy-food-bottom-1', 1);
    await page.getByTestId('chart-step-10-bottom-1').click();
    await expect(page.getByTestId('chart-step-10-bottom-1')).toHaveAttribute('aria-pressed', 'true');
    await tap(page, 'buy-bearers-bottom-1', 1);
    await tap(page, 'buy-gifts-bottom-1', 5);
    await tap(page, 'buy-food-bottom-1', 12);
    await page.getByTestId('chart-step-1-bottom-1').click();
    await tap(page, 'buy-bearers-bottom-1', 1);

    await steps.step('sample-canoe-expedition', {
      description: 'The canoe-borne sample expedition is entered with the ×1, ×5 and ×10 steps: $1000 spent, $100 left, 24 people who paddle four hexes a turn and can portage a cataract, but cannot walk (every bearer has a canoe on his shoulders) and cannot ride',
      verifications: [
        { spec: 'Counts match the sample expedition and $100 of the budget is left', check: async () => {
          await expectCounts(page, 'bottom-1', { canoes: 2, bearers: 16, guides: 1, askaris: 6, muskets: 4, gifts: 50, food: 125, horses: 0, camels: 0 });
          await expect(page.getByTestId('chart-budget-bottom-1')).toHaveText('$100');
        } },
        { spec: 'The movement line: 24 people, 179 units to carry and nobody free to carry them overland; by canoe 4 hexes with a seat for everyone and eight bearers to portage; no mount', check: async () => {
          const cap = page.getByTestId('chart-capacity-bottom-1');
          await expect(cap).toHaveAttribute('data-people', '24');
          await expect(cap).toHaveAttribute('data-load', '179');
          await expect(cap).toHaveAttribute('data-carry', '0');
          await expect(cap).toHaveAttribute('data-overland', 'false');
          await expect(cap).toHaveAttribute('data-canoe-hexes', '4');
          await expect(cap).toHaveAttribute('data-canoe-seats', '24');
          await expect(cap).toHaveAttribute('data-portage', 'true');
          await expect(cap).toHaveAttribute('data-mounted', 'false');
          await expect(page.getByTestId('mode-foot-bottom-1')).toHaveAttribute('data-ok', 'false');
          await expect(page.getByTestId('mode-canoe-bottom-1')).toHaveAttribute('data-ok', 'true');
          await expect(page.getByTestId('mode-canoe-bottom-1')).toHaveText(/4/);
          await expect(page.getByTestId('mode-mounted-bottom-1')).toHaveAttribute('data-ok', 'false');
        } },
        { spec: 'An unaffordable purchase is refused by the control: two more askaris take the last $100 and a third cannot be bought', check: async () => {
          await expect(page.getByTestId('buy-askaris-bottom-1')).toBeEnabled();
          await tap(page, 'buy-askaris-bottom-1', 2);
          await expect(page.getByTestId('count-askaris-bottom-1')).toHaveText('8');
          await expect(page.getByTestId('buy-askaris-bottom-1')).toBeDisabled();
          await tap(page, 'sell-askaris-bottom-1', 2);
          await expect(page.getByTestId('chart-budget-bottom-1')).toHaveText('$100');
        } }
      ]
    });

    const doneBox = (await page.getByTestId('confirm-outfit-bottom-1').boundingBox())!;
    await page.getByTestId('confirm-outfit-bottom-1').click();

    await steps.step('done-asks-to-confirm', {
      description: 'Tapping done turns it into a confirmation in its place, a checkmark over the explorer, with a cancel to its left',
      verifications: [
        { spec: 'The confirmation stands where done was and the cancel is to its left', check: async () => {
          await expect(page.getByTestId('confirm-outfit-bottom-1')).toHaveCount(0);
          const yes = (await page.getByTestId('confirm-outfit-yes-bottom-1').boundingBox())!;
          expect(Math.round(yes.x)).toBe(Math.round(doneBox.x));
          expect(Math.round(yes.y)).toBe(Math.round(doneBox.y));
          const no = (await page.getByTestId('confirm-outfit-no-bottom-1').boundingBox())!;
          expect(no.x + no.width).toBeLessThanOrEqual(yes.x);
        } },
        { spec: 'Nothing has been recorded yet', check: async () => {
          expect((await state(page)).explorers.find((x) => x.seat === 'bottom-1')!.chart).toBeNull();
        } }
      ]
    });

    // A tap anywhere else (here, the port's name) takes the question back; then the horse outfit replaces everything.
    await page.getByTestId('outfit-port-bottom-1').click();
    await expect(page.getByTestId('confirm-outfit-yes-bottom-1')).toHaveCount(0);
    await expect(page.getByTestId('confirm-outfit-bottom-1')).toBeVisible();
    await page.getByTestId('outfit-like-mounted-bottom-1').click();

    await steps.step('mounted-outfit', {
      description: 'A tap on the port name took the confirmation back; the horse outfit then spends the whole $1100 like the rules\' mounted sample: 13 horses for 8 people, who ride',
      verifications: [
        { spec: 'The mounted sample scaled to the budget: 13 horses, 4 askaris, a guide, 2 bearers, a musket, 24 gifts, 61 rations; nothing left', check: async () => {
          await expectCounts(page, 'bottom-1', MOUNTED_OUTFIT);
          await expect(page.getByTestId('chart-budget-bottom-1')).toHaveText('$0');
        } },
        { spec: 'Eight people ride: the riders\' horses carry five each and the two bearers lead the five spare horses with twenty each (140 for 86 units); they could also walk; no canoe', check: async () => {
          const cap = page.getByTestId('chart-capacity-bottom-1');
          await expect(cap).toHaveAttribute('data-people', '8');
          await expect(cap).toHaveAttribute('data-load', '86');
          await expect(cap).toHaveAttribute('data-mounted', 'true');
          await expect(cap).toHaveAttribute('data-overland', 'true');
          await expect(page.getByTestId('mode-mounted-bottom-1')).toHaveAttribute('data-ok', 'true');
          await expect(page.getByTestId('mode-canoe-bottom-1')).toHaveAttribute('data-ok', 'false');
          await expect(page.getByTestId('confirm-outfit-bottom-1')).toBeVisible();
        } }
      ]
    });

    await page.getByTestId('outfit-like-canoe-bottom-1').click();

    await steps.step('canoe-outfit', {
      description: 'The canoe outfit spends the whole $1100 like the canoe-borne sample: two canoes seat 24, so the extra $100 goes on a musket, gifts and rations rather than a seventeenth bearer',
      verifications: [
        { spec: 'The canoe sample scaled to the budget: 2 canoes, 16 bearers, a guide, 6 askaris, 5 muskets, 63 gifts, 157 rations; nothing left', check: async () => {
          await expectCounts(page, 'bottom-1', CANOE_OUTFIT);
          await expect(page.getByTestId('chart-budget-bottom-1')).toHaveText('$0');
        } },
        { spec: 'By canoe at four hexes with a cataract portage; not overland, not mounted', check: async () => {
          const cap = page.getByTestId('chart-capacity-bottom-1');
          await expect(cap).toHaveAttribute('data-people', '24');
          await expect(cap).toHaveAttribute('data-canoe-hexes', '4');
          await expect(cap).toHaveAttribute('data-portage', 'true');
          await expect(cap).toHaveAttribute('data-overland', 'false');
          await expect(cap).toHaveAttribute('data-mounted', 'false');
        } }
      ]
    });

    await page.getByTestId('confirm-outfit-bottom-1').click();
    await expect(page.getByTestId('confirm-outfit-yes-bottom-1')).toBeVisible();
    await page.getByTestId('confirm-outfit-yes-bottom-1').click();

    await steps.step('confirmed', {
      description: 'The expedition is set: the panel is gone, the budget is spent to the dollar, and the rail lists what the expedition has',
      verifications: [
        { spec: 'The chart is recorded in the state and the budget is spent', check: async () => {
          const s = await state(page);
          const e = s.explorers.find((x) => x.seat === 'bottom-1')!;
          expect(e.chart).toEqual({ ...CANOE_OUTFIT, water: 0, guideHomes: { c14r36: 1 } });
          expect(e.money).toBe(0);
          expect(s.diagnostics).toEqual([]);
        } },
        { spec: 'The panel closed and the rail summary shows the counts', check: async () => {
          await expect(page.getByTestId('outfit-panel-bottom-1')).toHaveCount(0);
          await expect(page.getByTestId('chart-summary-bottom-1')).toBeVisible();
          await expect(page.getByTestId('have-canoes-bottom-1')).toHaveAttribute('data-count', '2');
          await expect(page.getByTestId('have-bearers-bottom-1')).toHaveAttribute('data-count', '16');
          await expect(page.getByTestId('have-food-bottom-1')).toHaveAttribute('data-count', '157');
          await expect(page.getByTestId('have-horses-bottom-1')).toHaveCount(0);
          await expect(page.getByTestId('end-turn-bottom-1')).toBeVisible();
        } }
      ]
    });

    steps.generateDocs();
  });
});
