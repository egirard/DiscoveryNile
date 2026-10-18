import { test, expect, type Page } from '@playwright/test';
import { TestStepHelper } from '../helpers/test-step-helper';
import { takeCards } from '../helpers/cards';
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
async function stepTo(page: Page, seat: string, hex: string) {
  await page.getByTestId(`move-target-${hex}`).click();
  await expect(page.getByTestId(`board-token-${seat}`)).toHaveAttribute('data-hex', hex);
}

// Two canoes paddled by fourteen bearers, seven a canoe: three known hexes a turn, or one unknown (rules §7.1).
const CANOES = { canoes: 2, bearers: 14, askaris: 4, food: 60, gifts: 20 };

test.describe('039 - Mixed movement', () => {
  test('a canoe expedition with seven paddlers a canoe has three points a turn: a known hex costs one, an unknown hex two, in either order', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'Mixed movement',
      'The rules give each mode its hexes a turn when all are known and when all are unknown, but not how the two mix. The table gives the mode its known hexes as movement points, a known hex costs one point and an unknown hex two, whatever the mode (RQ-19, prompt 47), so a canoe expedition with four to seven paddlers a canoe paddles three known hexes, or one unknown hex and one known. Up the Niger from Brass: two known hexes leave one point, too few for the blank hex up the Benue; next turn that hex is entered for two points and the canoes come back down to the known junction for the third.'
    );

    // Seed 60 with the dice script 6,6,6,6 1,1,1,1 (roll-off: bottom-1 first), then, on the round-4 step into the blank
    // Benue hex, 6 (lost check following the river upstream: found the way), 5 (the direction to copy: c2r6, jungle) and
    // 1 (the jungle hides nothing). The natives' dice 6,6 find no natives there. With this seed bottom-1 holds a free
    // ticket to Brass and $1000 for the canoes.
    await page.goto('/table/?new=1&gameId=ABCDE&seed=60&dice=6,6,6,6,1,1,1,1,6,5,1&dice-natives=6,6');
    await commission(page, 'bottom-1');
    await commission(page, 'top-1');
    await page.getByTestId('start-game').click();
    await takeCards(page); // the hands dealt wait in full at the edges (prompt 44)
    expect((await state(page)).turn!.current).toBe('bottom-1');
    await page.getByTestId('sail-bottom-1').click();
    await expect(page.getByTestId('port-brass')).toHaveAttribute('data-fare', 'ticket');
    await page.getByTestId('choose-port-brass').click();
    await page.getByTestId('confirm-sail-bottom-1').click();
    await passTurn(page);
    await passTurn(page); // round 2: bottom-1 lands at Brass and that turn is skipped
    await passTurn(page);
    await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c2r8');
    expect((await state(page)).turn).toMatchObject({ current: 'bottom-1', round: 3 });
    await outfit(page, 'bottom-1', CANOES);
    await expect(page.getByTestId('move-target-c2r7')).toHaveAttribute('data-mode', 'canoe');
    await stepTo(page, 'bottom-1', 'c2r7');
    await expect(page.getByTestId('movement-bottom-1')).toHaveAttribute('data-left', '2');
    await stepTo(page, 'bottom-1', 'c2r6');

    await steps.step('one-point-left', {
      description: 'Two known hexes up the Niger from Brass: the rail shows one of three canoe points left, enough for the known hex upstream at one point, not for the blank hex up the Benue, which costs two and is not offered',
      verifications: [
        { spec: 'The movement pips show canoe with 1 of 3 points left', check: async () => {
          const mv = page.getByTestId('movement-bottom-1');
          await expect(mv).toHaveAttribute('data-mode', 'canoe');
          await expect(mv).toHaveAttribute('data-left', '1');
          await expect(mv).toHaveAttribute('aria-label', 'canoe: 1 of 3 movement points left');
        } },
        { spec: 'The known Niger hex upstream is offered for one point; the blank Benue hex, costing two, is not', check: async () => {
          await expect(page.getByTestId('move-target-c2r5')).toHaveAttribute('data-cost', '1');
          await expect(page.getByTestId('move-target-c3r6')).toHaveCount(0);
          await expect(page.getByTestId('hex-c3r6')).toHaveAttribute('data-terrain', 'blank');
        } },
        { spec: 'The state holds a budget of three points with an unknown hex at two, two spent, and the turn not over', check: async () => {
          const s = await state(page);
          expect(s.turn!.movement).toMatchObject({ mode: 'canoe', points: 3, unknownCost: 2, spent: 2, halted: false });
          expect(s.turn!.moved).toBe(false);
          expect(s.explorers.find((e) => e.seat === 'bottom-1')!.chart).toMatchObject({ canoes: 2, bearers: 14 });
          expect(s.diagnostics).toEqual([]);
        } },
        { spec: 'A step into the blank hex sent all the same is refused for want of points', check: async () => {
          await page.evaluate(() => window.__TABLETOP__!.append('expedition/moved', { seat: 'bottom-1', path: ['c3r6'] }));
          await expect.poll(async () => (await state(page)).diagnostics.map((d) => d.reason)).toEqual(['no movement left for that hex (1 of 3 points, it costs 2)']);
          await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c2r6');
        } }
      ]
    });

    await passTurn(page); // the turn ends with a point unspent
    await passTurn(page);
    await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c2r6');
    expect((await state(page)).turn).toMatchObject({ current: 'bottom-1', round: 4, phase: 'act' });

    await steps.step('unknown-offered-at-two', {
      description: 'Next turn at the junction, before any step: the blank hex up the Benue is offered for two points and the known Niger hexes for one each',
      verifications: [
        { spec: 'The blank Benue hex costs two points by canoe and is marked unknown; the known hexes up and down the Niger cost one', check: async () => {
          const unknown = page.getByTestId('move-target-c3r6');
          await expect(unknown).toHaveAttribute('data-unknown', 'true');
          await expect(unknown).toHaveAttribute('data-cost', '2');
          await expect(unknown).toHaveAttribute('data-mode', 'canoe');
          await expect(page.getByTestId('move-target-c2r5')).toHaveAttribute('data-cost', '1');
          await expect(page.getByTestId('move-target-c2r7')).toHaveAttribute('data-cost', '1');
          await expect(page.getByTestId('movement-bottom-1')).toHaveCount(0); // no budget until the first step fixes the mode
        } }
      ]
    });

    await page.getByTestId('move-target-c3r6').click();
    await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c3r6');

    await steps.step('unknown-then-known', {
      description: 'The canoes enter the blank hex up the Benue: the lost check following the river upstream finds the way, the hex is mapped as jungle like its neighbour, two of the three points are spent, and the known junction hex behind is offered for the one point left',
      verifications: [
        { spec: 'The log shows the lost check found the way and the terrain mapped jungle', check: async () => {
          await withLogOpen(page, 'bottom-1', async () => {
            await expect(page.getByTestId('roll-lost-check-bottom-1').last()).toHaveAttribute('data-lost', 'false');
            await expect(page.getByTestId('roll-terrain-bottom-1').last()).toHaveAttribute('data-outcome', 'mapped jungle: jungle copied from the neighbour in direction 5');
          });
          await expect(page.getByTestId('hex-c3r6')).toHaveAttribute('data-terrain', 'jungle');
        } },
        { spec: 'The rail shows 1 of 3 canoe points left and the known junction hex is offered for one point', check: async () => {
          await expect(page.getByTestId('movement-bottom-1')).toHaveAttribute('data-left', '1');
          await expect(page.getByTestId('move-target-c2r6')).toHaveAttribute('data-cost', '1');
          const s = await state(page);
          expect(s.turn!.movement).toMatchObject({ mode: 'canoe', points: 3, unknownCost: 2, spent: 2, halted: false });
          expect(s.turn!.moved).toBe(false);
          expect(s.map['c3r6']).toMatchObject({ terrain: 'jungle', markers: ['bottom-1'] });
          expect(s.diagnostics.map((d) => d.reason)).toEqual(['no movement left for that hex (1 of 3 points, it costs 2)']); // the refusal of the earlier step, nothing since
        } }
      ]
    });

    await stepTo(page, 'bottom-1', 'c2r6');

    await steps.step('known-after-unknown', {
      description: 'The canoes come back down to the junction for the third point: an unknown hex and a known one in the same turn; the movement is spent and the turn can end with the check mark',
      verifications: [
        { spec: 'The token stands on the junction with every point spent and no further target; the end-turn control is a plain check mark', check: async () => {
          await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c2r6');
          await expect(page.getByTestId('movement-bottom-1')).toHaveAttribute('data-left', '0');
          await expect(page.locator('[data-testid^="move-target-"]')).toHaveCount(0);
          await expect(page.getByTestId('end-turn-bottom-1')).toHaveAttribute('data-icon', 'check');
          const s = await state(page);
          expect(s.turn!.movement).toMatchObject({ mode: 'canoe', points: 3, unknownCost: 2, spent: 3 });
          expect(s.turn!.moved).toBe(true);
          expect(s.explorers.find((e) => e.seat === 'bottom-1')!.known).toEqual(['c2r8', 'c2r7', 'c2r6', 'c3r6']);
          expect(s.diagnostics).toHaveLength(1);
        } }
      ]
    });

    steps.generateDocs();
  });
});
