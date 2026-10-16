import { test, expect, type Page } from '@playwright/test';
import { TestStepHelper } from '../helpers/test-step-helper';
import { takeCards } from '../helpers/cards';
import { endTurnFromRail } from '../helpers/turn';

const SEATS = ['bottom-1', 'bottom-2', 'top-1', 'top-2', 'left-1', 'right-1'];
const state = (page: Page) => page.evaluate(() => window.__TABLETOP__!.getState());

/** The screen's physical geometry as the table publishes it: mm per CSS px and the touch target in px. */
async function geometry(page: Page) {
  return page.evaluate(() => {
    const root = document.querySelector<HTMLElement>('[data-testid="table"]')!;
    return {
      diagonal: Number(root.dataset.diagonal),
      mmPerPx: Number(root.dataset.mmPerPx),
      target: parseFloat(getComputedStyle(root).getPropertyValue('--target')),
      railDepth: parseFloat(getComputedStyle(root).getPropertyValue('--rail-depth')),
      viewport: { w: innerWidth, h: innerHeight }
    };
  });
}
/** The smallest side of every visible control, in px. */
async function smallestControl(page: Page) {
  return page.evaluate(() => {
    let min = Infinity;
    for (const el of document.querySelectorAll<HTMLElement>('button, a[href], [role="button"]:not([data-e2e-hex-sized])')) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) min = Math.min(min, r.width, r.height);
    }
    return min;
  });
}
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

test.describe('032 - Responsive pass at 27" and 55"', () => {
  test('six seats play on a 27" 1080p table and a 55" 4K table from one layout sized by the configured diagonal', async ({ page }, testInfo) => {
    // The `table` project (1920×1080) stands in for the 27" table and `table-4k` (3840×2160) for the 55" one;
    // the diagonal is local configuration, so each project tells the table its size with ?diag=.
    const fourK = testInfo.project.name === 'table-4k';
    const diag = fourK ? 55 : 27;
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'Responsive pass at 27" and 55"',
      `The table cannot know its physical size, so the screen diagonal is configured with ?diag= and everything a finger touches is sized from it: a touch target is 12 mm and never under 44 px, cards and rails follow the target, and text scales with it on a denser screen. This walkthrough fills all six seats and checks at every step that nothing is clipped and no control is under the target. It runs twice: at 1920×1080 as a 27" table (this gallery) and at 3840×2160 as a 55" table, where the same layout gives hexes twice the size. This run: ${diag}" at ${fourK ? '3840×2160' : '1920×1080'}.`
    );

    // Seed 5: bottom-1 holds a Mombasa ticket. The main dice script gives bottom-1 four sixes in the roll for first
    // player and the other five seats ones, so the turn order starts at the bottom seat.
    await page.goto(`/table/?new=1&gameId=ABCDE&seed=5&diag=${diag}&dice=6,6,6,6,${Array(20).fill(1).join(',')}`);
    for (const seat of SEATS) await page.getByTestId(`seat-join-${seat}`).click();

    await steps.step('six-seats-taken', {
      description: `All six seats are taken on the ${diag}" table: two on each long edge, one on each short edge, each rail turned to its player`,
      verifications: [
        { spec: 'Six rails are taken and each shows the explorer setup facing its seat', check: async () => {
          await expect(page.locator('[data-testid^="seat-rail-"][data-taken="true"]')).toHaveCount(6);
          for (const seat of SEATS) await expect(page.getByTestId(`commission-${seat}`)).toBeVisible();
        } },
        { spec: `The table reads the configured diagonal (${diag}") and sizes the touch target from it: 12 mm, never under 44 px`, check: async () => {
          const g = await geometry(page);
          expect(g.diagonal).toBe(diag);
          expect(g.mmPerPx).toBeCloseTo((diag * 25.4) / Math.hypot(g.viewport.w, g.viewport.h), 4);
          expect(g.target).toBe(Math.max(44, Math.ceil(12 / g.mmPerPx)));
          expect(g.target * g.mmPerPx).toBeGreaterThanOrEqual(12);
        } },
        { spec: 'No control on the screen is smaller than the touch target', check: async () => {
          const g = await geometry(page);
          expect(await smallestControl(page)).toBeGreaterThanOrEqual(g.target - 1);
        } }
      ]
    });

    for (const seat of SEATS) {
      await page.getByTestId(`commission-${seat}`).click();
      await expect(page.getByTestId(`explorer-token-${seat}`)).toBeVisible();
    }

    await steps.step('six-explorers', {
      description: 'Six explorers are commissioned; the start control and the round chooser in the middle of the table are touch-sized',
      verifications: [
        { spec: 'Every seat shows its explorer', check: async () => {
          await expect(page.locator('[data-testid^="explorer-token-"]')).toHaveCount(6);
        } },
        { spec: 'The start control and the round-limit buttons are at least the touch target', check: async () => {
          const g = await geometry(page);
          for (const id of ['start-game', 'round-limit-less', 'round-limit-more', 'round-limit-more5']) {
            const box = (await page.getByTestId(id).boundingBox())!;
            expect(Math.min(box.width, box.height), id).toBeGreaterThanOrEqual(g.target - 1);
          }
        } }
      ]
    });

    await page.getByTestId('start-game').click();
    await takeCards(page); // the hands dealt wait in full at the edges (prompt 44)
    await expect(page.getByTestId('turn-marker-bottom-1')).toHaveAttribute('data-current', 'true');

    await steps.step('six-hands-dealt', {
      description: 'The game starts: six hands of cards face their players on six rails, the roll for first player as the latest line of every seat that waits, and the bottom seat holds the turn',
      verifications: [
        { spec: 'bottom-1 rolled four sixes and holds the turn; every rail shows a hand', check: async () => {
          const s = await page.evaluate(() => window.__TABLETOP__!.getState());
          expect(s.history.find((t) => t.round === 0 && t.seat === 'bottom-1')!.log.at(-1)).toMatchObject({ kind: 'first-player', total: 24 });
          await expect(page.getByTestId('action-note-bottom-1')).toHaveText(/^drew /);
          await expect(page.locator('[data-testid^="roll-first-player-"]')).toHaveCount(5);
          for (const seat of SEATS) expect(Number(await page.getByTestId(`hand-${seat}`).getAttribute('data-count'))).toBeGreaterThanOrEqual(5);
        } },
        { spec: 'A card is at least 20 mm tall at the configured diagonal', check: async () => {
          const g = await geometry(page);
          const box = (await page.locator('[data-testid^="card-"][data-testid$="-bottom-1"]').first().boundingBox())!;
          expect(box.height * g.mmPerPx).toBeGreaterThanOrEqual(20);
        } },
        { spec: 'No control on the screen is smaller than the touch target', check: async () => {
          const g = await geometry(page);
          expect(await smallestControl(page)).toBeGreaterThanOrEqual(g.target - 1);
        } }
      ]
    });

    await page.getByTestId('sail-bottom-1').click();

    await steps.step('port-chooser', {
      description: 'The bottom seat opens the port chooser: thirteen ports on the map offer passage, each with a tap area no smaller than the touch target whatever the hex size',
      verifications: [
        { spec: 'Thirteen ports are offered and Mombasa takes the ticket', check: async () => {
          await expect(page.locator('[data-testid^="choose-port-"]')).toHaveCount(13);
          await expect(page.getByTestId('choose-port-mombasa')).toHaveAttribute('aria-label', 'Sail to Mombasa with a free ticket');
        } },
        { spec: 'Every port\'s tap area is at least the touch target across', check: async () => {
          const g = await geometry(page);
          for (const box of await page.locator('[data-testid^="choose-port-"]').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().width)))
            expect(box).toBeGreaterThanOrEqual(g.target - 1);
        } }
      ]
    });

    await page.getByTestId('choose-port-mombasa').click();
    await page.getByTestId('confirm-sail-bottom-1').click();
    await expect(page.getByTestId('explorer-token-bottom-1')).toHaveAttribute('data-location', 'voyage');
    // The other five seats take their turns; bottom-1 lands in round 2 (a turn that passes by itself) and outfits in round 3.
    for (let i = 0; i < 12 && !(await page.getByTestId('expedition-chart-bottom-1').isVisible()); i++) await passTurn(page);

    await steps.step('outfitting-at-the-edge', {
      description: 'Landed at Mombasa two rounds later, the bottom seat outfits on a panel at its edge that fits between its rail and the board with all six rails in place',
      verifications: [
        { spec: 'The outfit panel is at the bottom edge and it is bottom-1\'s turn in round 3', check: async () => {
          await expect(page.getByTestId('outfit-panel-bottom-1')).toBeVisible();
          expect((await state(page)).turn).toMatchObject({ current: 'bottom-1', round: 3 });
        } },
        { spec: 'Every button on the panel is at least the touch target', check: async () => {
          const g = await geometry(page);
          for (const side of await page.getByTestId('outfit-panel-bottom-1').locator('button').evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return Math.min(r.width, r.height); })))
            expect(side).toBeGreaterThanOrEqual(g.target - 1);
        } }
      ]
    });

    await tap(page, 'buy-bearers-bottom-1', 5);
    await page.getByTestId('chart-step-10-bottom-1').click();
    await tap(page, 'buy-food-bottom-1', 2);
    await page.getByTestId('confirm-outfit-bottom-1').click();
    await page.getByTestId('confirm-outfit-yes-bottom-1').click();
    await expect(page.getByTestId('chart-summary-bottom-1')).toBeVisible();

    await steps.step('move-targets', {
      description: 'Outfitted, the expedition sees its move targets: hexes the size the board allows between six rails, 24 mm across on the 55" table and under the 12 mm minimum on the 27" one, where the board already fills the space (G-107)',
      verifications: [
        { spec: 'Move targets surround Mombasa', check: async () => {
          expect(await page.locator('[data-testid^="move-target-"]').count()).toBeGreaterThan(0);
        } },
        { spec: 'A hex is at least 12 mm across, or the board already fills the height between the rails', check: async () => {
          const g = await geometry(page);
          const hex = (await page.locator('[data-testid^="move-target-"]').first().boundingBox())!;
          const grid = (await page.getByTestId('hex-grid').boundingBox())!;
          const room = g.viewport.h - 2 * g.railDepth - 2 * g.target;
          const mm = hex.width * g.mmPerPx;
          expect(mm >= 12 || grid.height >= room - 1, `hex ${mm.toFixed(1)} mm, grid ${grid.height}px in ${room}px`).toBe(true);
          if (fourK) expect(mm).toBeGreaterThanOrEqual(12);
        } }
      ]
    });

    // A denser screen of the same pixel size: a 13.5" laptop at 1080p, or a 27" monitor at 4K (163 ppi either way).
    // The same game, reconfigured: the touch target grows to 78 px and text and cards grow with it.
    await page.goto(`/table/?diag=${fourK ? 27 : 13.5}`);
    await expect(page.getByTestId('chart-summary-bottom-1')).toBeVisible();

    await steps.step('denser-screen', {
      description: `Reconfigured for a screen of the same pixels but half the diagonal (${fourK ? '27" at 4K' : '13.5" at 1080p'}), the touch target grows to 78 px and cards, rails and text grow with it, still fitting with six seats`,
      verifications: [
        { spec: 'The touch target is 78 px (12 mm at 163 ppi) and the same game is on the table', check: async () => {
          const g = await geometry(page);
          expect(g.target).toBe(78);
          expect(g.target * g.mmPerPx).toBeGreaterThanOrEqual(12);
          await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c25r12');
        } },
        { spec: 'No control on the screen is smaller than the new touch target', check: async () => {
          expect(await smallestControl(page)).toBeGreaterThanOrEqual(77);
        } }
      ]
    });

    steps.generateDocs();
  });
});
