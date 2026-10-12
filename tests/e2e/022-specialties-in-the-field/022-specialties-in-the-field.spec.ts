import { test, expect, type Page } from '@playwright/test';
import { TestStepHelper } from '../helpers/test-step-helper';

async function commission(page: Page, seat: string, specialties: string[] = []) {
  await page.getByTestId(`seat-join-${seat}`).click();
  for (const sp of specialties) await page.getByTestId(`specialty-${sp}-${seat}`).click();
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

test.describe('022 - Specialties in the field', () => {
  test('a missionary-zoologist preaches to a satisfied chief, then owes the hex a turn of study and finds a specimen', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'Specialties in the field',
      'A missionary must preach to each tribe once the chief permits it (after a satisfying negotiation), and a doctor must treat it: one die moves the tribe\'s attitude, earns points, and may bring the chief\'s poison. A zoologist or geologist must spend a turn in every unpublished hex entered, studying instead of moving: one die by the terrain finds a specimen, carried like a ration and scored in Europe. A turn is spent either moving or on a specialty, never both.'
    );

    // Seed 18 as in scenarios 016–020 (bottom-1 holds a ticket to Mombasa; c24r12 holds 12 warriors), bottom-1 a
    // zoologist and missionary with 20 gifts. Combat dice: reaction 1,1,1 (calm to the friendly approach); offer 3,6
    // (2 gifts satisfy); prices 3,2,4,1; next turn reaction 1,1,1. Specialty dice: preaching 6 (the chief asks to be
    // baptised, attitude +5); zoology 2 (a specimen on the veldt).
    await page.goto('/table/?new=1&gameId=ABCDE&seed=18&dice=6,6,6,6,1,1,1,1,6,2,1&dice-natives=1,2,3,4,5&dice-hunting=1,1&dice-combat=1,1,1,3,6,3,2,4,1,1,1,1&dice-specialty=6,2');
    await commission(page, 'bottom-1', ['zoology', 'evangelism']);
    await commission(page, 'top-1');
    await page.getByTestId('start-game').click();
    expect((await state(page)).turn!.current).toBe('bottom-1');
    await page.getByTestId('sail-bottom-1').click();
    await page.getByTestId('choose-port-mombasa').click();
    await passTurn(page);
    await passTurn(page); // round 2: bottom-1 lands at Mombasa and that turn is skipped
    await passTurn(page);
    await outfit(page, 'bottom-1', { askaris: 5, bearers: 6, food: 100, gifts: 20 });
    await page.getByTestId('move-target-c24r12').click();
    await expect(page.getByTestId('policy-panel-bottom-1')).toBeVisible();
    await page.getByTestId('policy-5-bottom-1').click();
    await expect(page.getByTestId('negotiation-panel-bottom-1')).toBeVisible();
    await tap(page, 'offer-more-bottom-1', 2);
    await page.getByTestId('offer-confirm-bottom-1').click();
    await expect(page.getByTestId('trade-panel-bottom-1')).toBeVisible();

    await steps.step('permission', {
      description: 'The chief is satisfied with two gifts and permits trade. The trade panel also offers the missionary\'s sermon, and trading cannot end until he has preached',
      verifications: [
        { spec: 'The preach control is offered and the done control is held back', check: async () => {
          await expect(page.getByTestId('specialty-evangelism-bottom-1')).toBeEnabled();
          await expect(page.getByTestId('trade-done-bottom-1')).toBeDisabled();
          const s = await state(page);
          expect(s.turn!.phase).toBe('trade');
          expect(s.tribes[1].preachedBy).toEqual([]);
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    await page.getByTestId('specialty-evangelism-bottom-1').click();

    await steps.step('preached', {
      description: 'The sermon: a 6, the chief asks to be baptised. The tribe\'s attitude rises by five, the missionary banks five points, and trading may end',
      verifications: [
        { spec: 'The rail notes the sermon; the tribe\'s attitude is 5; the done control is released', check: async () => {
          await expect(page.getByTestId('specialty-note-bottom-1')).toHaveText('the chief asks to be baptised (attitude +5)');
          await expect(page.getByTestId('specialty-evangelism-bottom-1')).toBeDisabled();
          await expect(page.getByTestId('trade-done-bottom-1')).toBeEnabled();
          const s = await state(page);
          expect(s.tribes[1]).toMatchObject({ attitude: 5, preachedBy: ['bottom-1'] });
          expect(s.explorers.find((e) => e.seat === 'bottom-1')!.goodWorks).toEqual({ evangelism: 5, medicine: 0 });
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    await page.getByTestId('trade-done-bottom-1').click();
    await passTurn(page);
    await passTurn(page);
    await expect(page.getByTestId('policy-panel-bottom-1')).toBeVisible();
    await expect(page.getByTestId('tribe-attitude-bottom-1')).toHaveText('· attitude +5');
    await page.getByTestId('policy-4-bottom-1').click();

    await steps.step('study-owed', {
      description: 'Next turn the tribe is calmer for the sermon. The zoologist owes this unpublished hex a turn of study: no move is offered, only the study control at the rail',
      verifications: [
        { spec: 'No move targets; the zoology study control is at the rail', check: async () => {
          await expect(page.locator('[data-testid^="move-target-"]')).toHaveCount(0);
          await expect(page.getByTestId('research-zoology-bottom-1')).toBeVisible();
          const s = await state(page);
          expect(s.turn).toMatchObject({ round: 4, phase: 'act', moved: false });
          expect(s.explorers.find((e) => e.seat === 'bottom-1')!.research).toEqual({ hex: 'c24r12', done: [] });
        } }
      ]
    });

    await page.getByTestId('research-zoology-bottom-1').click();

    await steps.step('specimen', {
      description: 'The study: a 2 on the veldt finds a zoological specimen. It joins the chart as a load, and the turn is spent',
      verifications: [
        { spec: 'The rail notes the find and shows one specimen; the study control is gone and the turn is spent', check: async () => {
          await expect(page.getByTestId('specialty-note-bottom-1')).toHaveText('a zoological specimen is found');
          await expect(page.getByTestId('specimens-zoology-bottom-1')).toHaveAttribute('data-count', '1');
          await expect(page.getByTestId('research-zoology-bottom-1')).toHaveCount(0);
          const s = await state(page);
          const e = s.explorers.find((x) => x.seat === 'bottom-1')!;
          expect(e.specimens).toEqual({ zoology: 1, geology: 0 });
          expect(e.research).toEqual({ hex: 'c24r12', done: ['zoology'] });
          expect(s.turn!.moved).toBe(true);
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    steps.generateDocs();
  });
});
