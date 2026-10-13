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
/** Buy from the price list panel: a map of item → count, using the ×10 step for the tens. */
async function outfit(page: Page, seat: string, purchases: Record<string, number>) {
  await expect(page.getByTestId(`expedition-chart-${seat}`)).toBeVisible();
  for (const [item, n] of Object.entries(purchases)) await tap(page, `buy-${item}-${seat}`, n % 10);
  await page.getByTestId(`chart-step-10-${seat}`).click();
  for (const [item, n] of Object.entries(purchases)) await tap(page, `buy-${item}-${seat}`, Math.floor(n / 10));
  await page.getByTestId(`confirm-outfit-${seat}`).click();
  await page.getByTestId(`confirm-outfit-yes-${seat}`).click();
  await expect(page.getByTestId(`chart-summary-${seat}`)).toBeVisible();
}
async function stepTo(page: Page, seat: string, hex: string) {
  await page.getByTestId(`move-target-${hex}`).click();
  await expect(page.getByTestId(`board-token-${seat}`)).toHaveAttribute('data-hex', hex);
}

// The rules' sample expeditions (rules §5, "Sample Expeditions"): mounted on horses, and canoe-borne.
const MOUNTED = { horses: 11, askaris: 4, guides: 1, bearers: 2, muskets: 1, gifts: 20, food: 50 };
const CANOES = { canoes: 2, bearers: 16, guides: 1, askaris: 6, muskets: 4, gifts: 50, food: 125 };

test.describe('012 - Movement rates', () => {
  test('mounted expeditions ride four known hexes or two unknown, canoes paddle four along the water, and terrain the mode cannot enter turns the expedition back', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'Movement rates',
      'The expedition\'s mode of travel is fixed by its first step each turn and sets a budget of movement points shown as pips at the rail: two on foot, four mounted, up to four by canoe with eight paddlers per canoe. A known hex costs one point; an unknown hex costs the mode\'s unknown rate (two mounted). A hex that turns out to be impassable for the mode is mapped and claimed, but the expedition turns back. Canoes must follow rivers, lakes, swamps or the coast. Walking two known hexes is proven by the unit tests.'
    );

    // Seed 1573 with the dice script 6,6,6,6 1,1,1,1 (roll-off: bottom-1 first) then 6 (lost check: found the way),
    // 1 and 5 (both neighbours blank) and 6 (random terrain table: lake). The shuffle is not scripted: with this
    // seed bottom-1's hand pays passage and the mounted sample; top-1 holds a free ticket to Brass and the canoe sample.
    await page.goto('/table/?new=1&gameId=ABCDE&seed=1573&dice=6,6,6,6,1,1,1,1,6,1,5,6');
    await commission(page, 'bottom-1');
    await commission(page, 'top-1');
    await page.getByTestId('start-game').click();
    expect((await state(page)).turn!.current).toBe('bottom-1');
    await page.getByTestId('sail-bottom-1').click();
    await page.getByTestId('choose-port-durban').click();
    await passTurn(page);
    await page.getByTestId('sail-top-1').click();
    await expect(page.getByTestId('port-brass')).toHaveAttribute('data-fare', 'ticket');
    await page.getByTestId('choose-port-brass').click();
    await passTurn(page);
    // Round 2 is skipped at sea by both; round 3 opens with bottom-1 at Durban.
    await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c17r34');
    await expect(page.getByTestId('board-token-top-1')).toHaveAttribute('data-hex', 'c2r8');
    expect((await state(page)).turn).toMatchObject({ current: 'bottom-1', round: 3 });
    await outfit(page, 'bottom-1', MOUNTED);
    await expect(page.getByTestId('move-target-c16r33')).toHaveAttribute('data-mode', 'mounted');
    await stepTo(page, 'bottom-1', 'c16r33');
    await expect(page.getByTestId('movement-bottom-1')).toHaveAttribute('data-left', '3');
    await stepTo(page, 'bottom-1', 'c16r32');

    await steps.step('mounted-four', {
      description: 'Riding from Durban, the expedition has crossed two known hexes: the rail shows two of four movement points left, and the blank hex ahead costs both',
      verifications: [
        { spec: 'The movement pips at the rail show mounted with 2 of 4 points left', check: async () => {
          const mv = page.getByTestId('movement-bottom-1');
          await expect(mv).toHaveAttribute('data-mode', 'mounted');
          await expect(mv).toHaveAttribute('data-left', '2');
          await expect(mv).toHaveAttribute('aria-label', 'mounted: 2 of 4 movement points left');
        } },
        { spec: 'Known neighbours cost one point, the blank hex to the north-west costs two', check: async () => {
          await expect(page.getByTestId('move-target-c16r33')).toHaveAttribute('data-cost', '1');
          const unknown = page.getByTestId('move-target-c15r32');
          await expect(unknown).toHaveAttribute('data-unknown', 'true');
          await expect(unknown).toHaveAttribute('data-cost', '2');
          await expect(unknown).toHaveAttribute('data-mode', 'mounted');
        } },
        { spec: 'The state records the budget and no roll has been made for the known hexes', check: async () => {
          const s = await state(page);
          expect(s.turn!.movement).toMatchObject({ mode: 'mounted', points: 4, unknownCost: 2, spent: 2, halted: false });
          expect(s.turn!.moved).toBe(false);
          expect(s.turn!.log).toEqual([]);
          expect(s.explorers.find((e) => e.seat === 'bottom-1')!.location).toEqual({ kind: 'hex', hex: 'c16r32' });
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    await page.getByTestId('move-target-c15r32').click();

    await steps.step('terrain-conflict', {
      description: 'The blank hex is entered: the lost check succeeds, the terrain table gives a lake, which horses cannot enter, so the hex is mapped and claimed but the expedition turns back and its movement is over',
      verifications: [
        { spec: 'The rail shows the lost check, the terrain roll and the turning back, in that order', check: async () => {
          await expect(page.getByTestId('roll-lost-check-bottom-1')).toHaveAttribute('data-lost', 'false');
          await expect(page.getByTestId('roll-terrain-bottom-1')).toHaveAttribute('data-outcome', 'mapped lake');
          await expect(page.getByTestId('roll-turned-back-bottom-1')).toHaveAttribute('data-outcome', 'lake is impassable mounted: the expedition turns back');
          await expect(page.getByTestId('movement-bottom-1')).toHaveAttribute('data-left', '0');
        } },
        { spec: 'The lake is drawn with the bottom seat\'s marker; the token stays on c16r32 and no target is offered', check: async () => {
          await expect(page.getByTestId('hex-c15r32')).toHaveAttribute('data-terrain', 'lake');
          await expect(page.getByTestId('marker-c15r32-bottom-1')).toBeAttached();
          await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c16r32');
          await expect(page.locator('[data-testid^="move-target-"]')).toHaveCount(0);
          const s = await state(page);
          expect(s.map['c15r32']).toMatchObject({ terrain: 'lake', markers: ['bottom-1'] });
          expect(s.turn!.movement).toMatchObject({ spent: 4, halted: true });
          expect(s.turn!.moved).toBe(true);
          expect(s.explorers.find((e) => e.seat === 'bottom-1')!.known).toContain('c15r32');
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    await passTurn(page);
    await outfit(page, 'top-1', CANOES);
    // From Brass only the Niger is open: the other land neighbour is jungle-swamp, closed to canoes.
    await expect(page.locator('[data-testid^="move-target-"]')).toHaveCount(1);
    await expect(page.getByTestId('move-target-c2r7')).toHaveAttribute('data-mode', 'canoe');
    await stepTo(page, 'top-1', 'c2r7');
    await expect(page.getByTestId('movement-top-1')).toHaveAttribute('data-mode', 'canoe');
    await expect(page.getByTestId('move-target-c3r7')).toHaveCount(0); // dry jungle beside the river: not for canoes this turn
    await stepTo(page, 'top-1', 'c2r6');
    await stepTo(page, 'top-1', 'c2r5');
    await stepTo(page, 'top-1', 'c2r4');

    await steps.step('canoe-along-river', {
      description: 'The top seat\'s canoes, with eight paddlers each, go four known hexes in one turn: up the Niger and then along the coast, never onto dry land',
      verifications: [
        { spec: 'The top rail shows canoe movement with all four points spent', check: async () => {
          const mv = page.getByTestId('movement-top-1');
          await expect(mv).toHaveAttribute('data-mode', 'canoe');
          await expect(mv).toHaveAttribute('data-left', '0');
          await expect(mv).toHaveAttribute('aria-label', 'canoe: 0 of 4 movement points left');
        } },
        { spec: 'The token stands on c2r4 after four steps, with no roll (all hexes were pre-printed) and no further target', check: async () => {
          await expect(page.getByTestId('board-token-top-1')).toHaveAttribute('data-hex', 'c2r4');
          await expect(page.locator('[data-testid^="move-target-"]')).toHaveCount(0);
          await expect(page.locator('[data-testid^="roll-log-"]')).toHaveCount(0);
          const s = await state(page);
          expect(s.turn!.movement).toMatchObject({ mode: 'canoe', points: 4, unknownCost: 2, spent: 4 });
          expect(s.turn!.moved).toBe(true);
          expect(s.explorers.find((e) => e.seat === 'top-1')!.known).toEqual(['c2r8', 'c2r7', 'c2r6', 'c2r5', 'c2r4']);
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    steps.generateDocs();
  });
});
