import { test, expect, type Page } from '@playwright/test';
import { TestStepHelper } from '../helpers/test-step-helper';
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
/** bottom-1 steps into `hex`, then both seats pass so it is bottom-1's turn again. */
async function stepWest(page: Page, hex: string) {
  await page.getByTestId(`move-target-${hex}`).click();
  await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', hex);
}

test.describe('011 - Rivers, oases and cataracts', () => {
  test('newly mapped hexes gain river sources, cataracts with heights, peaks, and rivers that continue', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'Rivers, oases and cataracts',
      'After the basic terrain, a mapped hex is checked for water: with no rivers around, an even roll and a direction into the unexplored make a river source (an oasis in desert); a river known to flow in continues out through a rolled exit; cataracts are rolled whenever a river is mapped, with a four-dice waterfall height recorded from 400 ft; mountains roll a peak height recorded over 15,000 ft.'
    );

    // Seed 593: bottom-1 sails to Mombasa on a ticket; walking west, c23r13 rises a river with a cataract,
    // c22r13 has a 20,000 ft peak and its own source, and the river flows on through c21r13. The natives dice
    // (two per hex entered, since 016) are scripted to sixes so no tribe interrupts the story.
    await page.goto('/table/?new=1&gameId=ABCDE&seed=593&dice-natives=6,6,6,6,6,6,6,6');
    await commission(page, 'bottom-1');
    await commission(page, 'top-1');
    await page.getByTestId('start-game').click();
    expect((await state(page)).turn!.current).toBe('bottom-1');
    await page.getByTestId('sail-bottom-1').click();
    await page.getByTestId('choose-port-mombasa').click();
    await page.getByTestId('confirm-sail-bottom-1').click();
    await passTurn(page);
    await passTurn(page);
    await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c25r12');
    await passTurn(page);
    await expect(page.getByTestId('expedition-chart-bottom-1')).toBeVisible();
    await tap(page, 'buy-askaris-bottom-1', 5);
    await page.getByTestId('chart-step-10-bottom-1').click();
    await tap(page, 'buy-bearers-bottom-1', 1);
    await tap(page, 'buy-food-bottom-1', 10);
    await page.getByTestId('chart-step-1-bottom-1').click();
    await tap(page, 'buy-bearers-bottom-1', 5);
    await page.getByTestId('confirm-outfit-bottom-1').click();
    await page.getByTestId('confirm-outfit-yes-bottom-1').click();
    await stepWest(page, 'c24r12');
    await withLogOpen(page, 'bottom-1', async () => {
      await expect(page.getByTestId('roll-water-bottom-1').last()).toHaveAttribute('data-outcome', /is odd: no river$/);
    });
    await passTurn(page);
    await passTurn(page);
    await stepWest(page, 'c23r13');

    await steps.step('source-and-cataract', {
      description: 'c23r13 is mapped: a river rises there, flows north-west into the unexplored, and has a cataract',
      verifications: [
        { spec: 'The water roll reports a source flowing in direction 6 with a cataract, and the board draws it', check: async () => {
          await withLogOpen(page, 'bottom-1', async () => {
            await expect(page.getByTestId('roll-water-bottom-1').last()).toHaveAttribute('data-outcome', /rises here and flows in direction 6; a cataract/);
          });
          const course = page.getByTestId('course-c23r13');
          await expect(course).toHaveAttribute('data-source', 'true');
          await expect(course).toHaveAttribute('data-out', '6');
          await expect(course).toHaveAttribute('data-cataract', 'true');
          await expect(page.getByTestId('cataract-c23r13')).toBeAttached();
        } },
        { spec: 'The state records the course; the waterfall is under 400 ft so no height is shown', check: async () => {
          const s = await state(page);
          expect(s.map['c23r13'].river).toMatchObject({ in: [], out: 6, source: true, cataract: true, waterfallFeet: null });
          await expect(page.getByTestId('waterfall-c23r13')).toHaveCount(0);
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    await passTurn(page);
    await passTurn(page);
    await stepWest(page, 'c22r13');

    await steps.step('peak-and-second-source', {
      description: 'c22r13 is a mountain hex: three dice give a 20,000 ft peak, recorded in brown; another source rises here',
      verifications: [
        { spec: 'The peak height is recorded on the board and in the state', check: async () => {
          await expect(page.getByTestId('hex-c22r13')).toHaveAttribute('data-terrain', /mountain/);
          await expect(page.getByTestId('peak-c22r13')).toHaveText('200');
          const s = await state(page);
          expect(s.map['c22r13'].peakFeet).toBe(20000);
          expect(s.map['c22r13'].river).toMatchObject({ source: true, out: 5 });
          await withLogOpen(page, 'bottom-1', async () => {
            await expect(page.getByTestId('roll-water-bottom-1').last()).toHaveAttribute('data-outcome', /a peak of 20,000 ft \(.*a record over 15,000\); \d is even: a river rises here and flows in direction 5/);
          });
        } }
      ]
    });

    await passTurn(page);
    await passTurn(page);
    await stepWest(page, 'c21r13');

    await steps.step('river-continues', {
      description: 'c21r13 lies where the river was flowing: it arrives from the east and a rolled exit carries it on south-west',
      verifications: [
        { spec: 'The course enters from direction 2 and leaves by direction 4; the lost check noted the river', check: async () => {
          const course = page.getByTestId('course-c21r13');
          await expect(course).toHaveAttribute('data-in', '2');
          await expect(course).toHaveAttribute('data-out', '4');
          await expect(course).toHaveAttribute('data-source', 'false');
          await withLogOpen(page, 'bottom-1', async () => {
            await expect(page.getByTestId('roll-water-bottom-1').last()).toHaveAttribute('data-outcome', /the river flows on in direction 4/);
            await expect(page.getByTestId('roll-lost-check-bottom-1').last()).toHaveAttribute('aria-label', /following the river downstream/);
          });
        } },
        { spec: 'Three hexes are mapped and marked, all replayable from the seed', check: async () => {
          const s = await state(page);
          expect(Object.keys(s.map).sort()).toEqual(['c21r13', 'c22r13', 'c23r13', 'c24r12']);
          for (const id of Object.keys(s.map)) expect(s.map[id].markers).toEqual(['bottom-1']);
          expect(s.explorers.find((e) => e.seat === 'bottom-1')!.location).toEqual({ kind: 'hex', hex: 'c21r13' });
        } }
      ]
    });

    steps.generateDocs();
  });
});
