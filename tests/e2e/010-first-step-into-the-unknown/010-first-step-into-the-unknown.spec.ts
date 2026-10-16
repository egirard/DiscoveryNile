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
async function endTurn(page: Page, seat: string) {
  await endTurnFromRail(page, seat);
}
async function tap(page: Page, id: string, times: number) {
  for (let i = 0; i < times; i++) await page.getByTestId(id).click();
}

test.describe('010 - First step into the unknown', () => {
  test('from Mombasa the expedition tries a blank hex, is lost, tries again next turn and maps it', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'First step into the unknown',
      'Standing at a port, the expedition may step into one adjacent hex. Known hexes are plain targets; blank ones are dashed, because entering one risks becoming lost. The lost check is rolled as dice at the rail with the modifier for the terrain being left. A lost expedition stays put for the turn. On success the hex\'s terrain is generated from the neighbours or the random table, drawn on the board, and the seat\'s marker is placed on it.'
    );

    // Seed 150: bottom-1 is first, holds a free ticket to Mombasa and enough for a foot expedition;
    // the first step into c24r12 is lost, the second finds the way and copies veldt from the coast.
    await page.goto('/table/?new=1&gameId=ABCDE&seed=150');
    await commission(page, 'bottom-1');
    await commission(page, 'top-1');
    await page.getByTestId('start-game').click();
    await takeCards(page); // the hands dealt wait in full at the edges (prompt 44)
    expect((await state(page)).turn!.current).toBe('bottom-1');
    await page.getByTestId('sail-bottom-1').click();
    await expect(page.getByTestId('port-mombasa')).toHaveAttribute('data-fare', 'ticket');
    await page.getByTestId('choose-port-mombasa').click();
    await page.getByTestId('confirm-sail-bottom-1').click();
    await endTurn(page, 'bottom-1');
    await endTurn(page, 'top-1');
    await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c25r12');
    await endTurn(page, 'top-1');
    await expect(page.getByTestId('expedition-chart-bottom-1')).toBeVisible();
    await tap(page, 'buy-askaris-bottom-1', 5);
    await page.getByTestId('chart-step-10-bottom-1').click();
    await tap(page, 'buy-bearers-bottom-1', 1);
    await tap(page, 'buy-food-bottom-1', 10);
    await page.getByTestId('chart-step-1-bottom-1').click();
    await tap(page, 'buy-bearers-bottom-1', 5);
    await expect(page.getByTestId('chart-budget-bottom-1')).toHaveText(/^\$\d+$/);
    await page.getByTestId('confirm-outfit-bottom-1').click();
    await page.getByTestId('confirm-outfit-yes-bottom-1').click();
    await expect(page.getByTestId('chart-summary-bottom-1')).toBeVisible();

    await steps.step('targets-shown', {
      description: 'Outfitted at Mombasa, the expedition sees its four adjacent hexes as targets: two known veldt, two blank and dashed',
      verifications: [
        { spec: 'Four move targets: the two blank hexes to the west are marked unknown, the two veldt hexes are not', check: async () => {
          await expect(page.locator('[data-testid^="move-target-"]')).toHaveCount(4);
          await expect(page.getByTestId('move-target-c24r12')).toHaveAttribute('data-unknown', 'true');
          await expect(page.getByTestId('move-target-c24r11')).toHaveAttribute('data-unknown', 'true');
          await expect(page.getByTestId('move-target-c25r11')).toHaveAttribute('data-unknown', 'false');
          await expect(page.getByTestId('move-target-c24r13')).toHaveAttribute('data-unknown', 'false');
        } },
        { spec: 'With steps still to take, the turn is ended early with an arrow in Africa (not the hourglass of a wait in Europe), which asks for confirmation', check: async () => {
          await expect(page.getByTestId('end-turn-bottom-1')).toHaveAttribute('data-icon', 'next');
        } },
        { spec: 'No roll has been made and no hex is mapped yet', check: async () => {
          await expect(page.getByTestId('roll-log-bottom-1')).toHaveAttribute('data-rolls', '0'); // the log holds the outfitting only
          const s = await state(page);
          expect(s.map).toEqual({});
          expect(s.turn).toMatchObject({ current: 'bottom-1', moved: false });
        } }
      ]
    });

    await page.getByTestId('move-target-c24r12').click();

    await steps.step('lost', {
      description: 'The lost check is rolled at the rail with the veldt modifier and what it needed: the expedition is lost, stays at Mombasa, and the turn ends there and then; at a port there is no hunt, and the line says so',
      verifications: [
        { spec: 'The lost-check line reads what was needed, the dice, the modifier and the total of zero or less; the lost badge appears', check: async () => {
          const roll = page.getByTestId('roll-lost-check-bottom-1');
          await expect(roll).toHaveAttribute('data-lost', 'true');
          await expect(roll).toHaveAttribute('aria-label', /needs 2\+; .*veldt -1.*= -?\d+; lost; no hunting needed at Mombasa/);
          await expect(page.getByTestId('lost-check-needed-bottom-1')).toHaveText('needs 2+');
          expect(Number(await roll.getAttribute('data-total'))).toBeLessThanOrEqual(0);
          await expect(page.getByTestId('lost-check-total-bottom-1')).toHaveText(`= ${await roll.getAttribute('data-total')}`);
          await expect(page.getByTestId('lost-badge-bottom-1')).toBeVisible();
        } },
        { spec: 'The token is still at Mombasa, nothing was mapped, and the turn has passed to the next seat', check: async () => {
          await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c25r12');
          await expect(page.locator('[data-testid^="move-target-"]')).toHaveCount(0);
          await expect(page.getByTestId('turn-marker-top-1')).toHaveAttribute('data-current', 'true');
          const s = await state(page);
          expect(s.map).toEqual({});
          expect(s.turn!.current).toBe('top-1');
          expect(s.history.filter((t) => t.seat === 'bottom-1').at(-1)!.log.at(-1)).toMatchObject({ kind: 'lost-check', lost: true, needed: '2+', outcome: 'lost; no hunting needed at Mombasa' });
          expect(s.explorers.find((e) => e.seat === 'bottom-1')!.location).toEqual({ kind: 'port', port: 'mombasa' });
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    await endTurn(page, 'top-1');
    await expect(page.getByTestId('move-target-c24r12')).toBeVisible();
    await page.getByTestId('move-target-c24r12').click();

    await steps.step('mapped', {
      description: 'Next turn the expedition finds the way: the hex is generated as veldt like its neighbour, drawn, marked, and entered',
      verifications: [
        { spec: 'The step taken, nothing reasonable is left this turn: the end-turn control is a plain check mark that asks no confirmation (prompt 46)', check: async () => {
          await expect(page.getByTestId('end-turn-bottom-1')).toHaveAttribute('data-icon', 'check');
          await expect(page.locator('[data-testid^="move-target-"]')).toHaveCount(0);
        } },
        { spec: 'The lost check succeeded and a terrain roll followed', check: async () => {
          await withLogOpen(page, 'bottom-1', async () => {
            await expect(page.getByTestId('roll-lost-check-bottom-1').last()).toHaveAttribute('data-lost', 'false');
            await expect(page.getByTestId('roll-terrain-bottom-1').last()).toHaveAttribute('data-outcome', /mapped veldt/);
          });
          await expect(page.getByTestId('lost-badge-bottom-1')).toHaveCount(0);
        } },
        { spec: 'The hex shows veldt with the bottom seat\'s marker and the token stands on it', check: async () => {
          await expect(page.getByTestId('hex-c24r12')).toHaveAttribute('data-terrain', 'veldt');
          await expect(page.getByTestId('hex-c24r12')).toHaveAttribute('data-mapped', 'true');
          await expect(page.getByTestId('terrain-c24r12')).toBeAttached();
          await expect(page.getByTestId('marker-c24r12-bottom-1')).toBeAttached();
          await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c24r12');
          const s = await state(page);
          expect(s.map['c24r12']).toMatchObject({ terrain: 'veldt', markers: ['bottom-1'] });
          expect(s.explorers.find((e) => e.seat === 'bottom-1')!.known).toEqual(['c25r12', 'c24r12']);
        } }
      ]
    });

    const before = await state(page);
    await page.reload();

    await steps.step('persists-after-reload', {
      description: 'After a reload the generated hex, the marker, the token and the rolls are all restored from the stream',
      verifications: [
        { spec: 'Map, explorer and this turn\'s roll log are identical', check: async () => {
          await expect(page.getByTestId('hex-c24r12')).toHaveAttribute('data-terrain', 'veldt');
          const after = await state(page);
          expect(after.map).toEqual(before.map);
          expect(after.explorers).toEqual(before.explorers);
          expect(after.turn).toEqual(before.turn);
          expect(after.rng).toEqual(before.rng);
        } }
      ]
    });

    steps.generateDocs();
  });
});
