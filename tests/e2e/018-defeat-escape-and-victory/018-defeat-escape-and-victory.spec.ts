import { test, expect, type Page } from '@playwright/test';
import { TestStepHelper } from '../helpers/test-step-helper';
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

test.describe('018 - Defeat, escape and victory', () => {
  test('victory brings prisoners and a village to loot; a later defeat means captivity, and an escape roll sets the explorer free alone', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'Defeat, escape and victory',
      'After a victory the askaris take prisoners (their number less a die, at most the warriors left); two dice against prisoners plus policy find the village, and the player chooses at the edge: release the prisoners, or keep them as bearers and loot a die per warrior met. After a defeat one die decides the explorer\'s fate: killed, held prisoner, or an escape alone with what the Escape Survival table allows. A captive rolls again every turn at minus three until killed or free.'
    );

    // Seed 18 as in scenarios 016–017: bottom-1 holds a ticket to Mombasa; c24r12 holds 12 warriors. Combat dice:
    // reaction 6,6,6; strength 1; surprise 6,6; morale 2 (victory, 6 warriors left); prisoners 1 (5 − 1 = 4 taken);
    // village 3,4 (7 is within 4 + 3: found); loot 1,2,3,4,5,6,1,2,3,4,5,6 (20 rations, 2 gifts). Next turn, ignoring
    // the two warriors left: reaction 6,6,6; strength 2 (attack); surprise 1,1 (surprised); natives strike 1 (two askaris
    // fall); break check 3 (6 over 4: the askaris run); defeat die 2 (held prisoner). The turn after: escape die 6 (3: alone).
    await page.goto('/table/?new=1&gameId=ABCDE&seed=18&dice=6,6,6,6,1,1,1,1,6,2,1&dice-natives=1,2,3,4,5&dice-hunting=1,1,1&dice-combat=6,6,6,1,6,6,2,1,3,4,1,2,3,4,5,6,1,2,3,4,5,6,6,6,6,2,1,1,1,3,2,6');
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
    await page.getByTestId('policy-3-bottom-1').click();

    await steps.step('village-found', {
      description: 'The show of force wins: six warriors fall to the volley and the rest are driven off. Four prisoners are taken and the village is found, so the panel at the edge asks whether to release them or keep them and loot',
      verifications: [
        { spec: 'The victory note reads four prisoners and the village found; the chart already counts the prisoners as bearers', check: async () => {
          await withLogOpen(page, 'bottom-1', async () => {
            await expect(page.getByTestId('victory-note-bottom-1').last()).toHaveText('4 prisoners taken, the village is found');
          });
          await expect(page.getByTestId('have-bearers-bottom-1')).toHaveAttribute('data-count', '10');
          await expect(page.getByTestId('spoils-prompt-bottom-1')).toBeVisible();
        } },
        { spec: 'The spoils panel offers release or keep and the turn cannot end yet', check: async () => {
          await expect(page.getByTestId('spoils-panel-bottom-1')).toHaveAttribute('data-prisoners', '4');
          await expect(page.getByTestId('spoils-release-bottom-1')).toBeVisible();
          await expect(page.getByTestId('spoils-keep-bottom-1')).toBeVisible();
          await expect(page.getByTestId('end-turn-bottom-1')).toHaveCount(0);
          const s = await state(page);
          expect(s.turn!.phase).toBe('spoils');
          expect(s.tribes[1]).toMatchObject({ warriors: 2, pending: { prisoners: 4, policy: 3, original: 12 } });
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    await page.getByTestId('spoils-keep-bottom-1').click();

    await steps.step('looted', {
      description: 'The prisoners are kept as bearers and the village looted: twelve dice, one per warrior met, yield twenty rations and two gifts',
      verifications: [
        { spec: 'The loot note and its twelve dice show; the chart has 120 food, 2 gifts and 10 bearers', check: async () => {
          await withLogOpen(page, 'bottom-1', async () => {
            await expect(page.getByTestId('loot-note-bottom-1').last()).toHaveText('looted 20 rations, 2 gifts');
          });
          await expect(page.getByTestId('have-food-bottom-1')).toHaveAttribute('data-count', '120');
          await expect(page.getByTestId('have-gifts-bottom-1')).toHaveAttribute('data-count', '2');
          await expect(page.getByTestId('spoils-panel-bottom-1')).toHaveCount(0);
          await expect(page.getByTestId('end-turn-bottom-1')).toBeVisible();
          const s = await state(page);
          expect(s.turn!.log.find((l) => l.kind === 'loot')!.rolls).toHaveLength(12);
          expect(s.tribes[1].pending).toBeNull();
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    await passTurn(page);
    await passTurn(page);
    await expect(page.getByTestId('policy-panel-bottom-1')).toBeVisible();
    await page.getByTestId('policy-4-bottom-1').click();

    await steps.step('captured', {
      description: 'Next turn the explorer ignores the two warriors left; they attack by surprise, two askaris fall and the rest break. The defeat die is a 2: the explorer is held prisoner and the expedition is lost',
      verifications: [
        { spec: 'The combat and defeat notes tell the rout and the capture; the token shows the captive mark', check: async () => {
          await withLogOpen(page, 'bottom-1', async () => {
            await expect(page.getByTestId('combat-note-bottom-1').last()).toHaveText('hostile: the natives attack; the expedition is surprised; 2 askaris fall; the askaris break and run: defeat');
            await expect(page.getByTestId('defeat-note-bottom-1').last()).toHaveText('the explorer is held prisoner');
          });
          await expect(page.getByTestId('captive-bottom-1')).toBeVisible();
          await expect(page.getByTestId('chart-summary-bottom-1')).toHaveCount(0);
          await expect(page.locator('[data-testid^="move-target-"]')).toHaveCount(0);
          const s = await state(page);
          const e = s.explorers.find((x) => x.seat === 'bottom-1')!;
          expect(e.location).toMatchObject({ kind: 'captive', hex: 'c24r12', tribe: 1 });
          expect(e.chart).toBeNull();
          expect(s.tribes[1].attitude).toBe(-1);
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    await passTurn(page);
    await passTurn(page);

    await steps.step('escaped', {
      description: 'The captive\'s turn opens with the escape die: a 6 less three is a 3, so the explorer escapes alone, with nothing, and stands free in the hex again, where the tribe waits for a policy',
      verifications: [
        { spec: 'The captivity note reads the escape; the explorer is back on the hex with an empty chart', check: async () => {
          await expect(page.getByTestId('captivity-note-bottom-1')).toHaveText('the explorer escapes alone');
          await expect(page.getByTestId('captive-bottom-1')).toHaveCount(0);
          await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c24r12');
          const s = await state(page);
          const e = s.explorers.find((x) => x.seat === 'bottom-1')!;
          expect(e.location).toEqual({ kind: 'hex', hex: 'c24r12' });
          expect(e.chart).toMatchObject({ askaris: 0, bearers: 0, food: 0, muskets: 0 });
          expect(s.turn).toMatchObject({ current: 'bottom-1', round: 5, phase: 'natives' });
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    steps.generateDocs();
  });
});
