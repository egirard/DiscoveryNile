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
  await page.getByTestId(`chart-step-${seat}`).click();
  for (const [item, n] of Object.entries(purchases)) await tap(page, `buy-${item}-${seat}`, Math.floor(n / 10));
  await page.getByTestId(`confirm-outfit-${seat}`).click();
  await page.getByTestId(`confirm-outfit-yes-${seat}`).click();
  await expect(page.getByTestId(`chart-summary-${seat}`)).toBeVisible();
}

test.describe('016 - Natives discovered and the explorer\'s policy', () => {
  test('entering a new hex may find natives: a numbered tribe goes on the board and the explorer must choose a policy; retreat and ignore are played', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'Natives discovered and the explorer\'s policy',
      'The first time an explorer enters an unpublished hex two dice are rolled for natives by the terrain (lake 2–3; veldt, swamp, jungle 2–4; mountain 5–6; 7 with a river or oasis). Found, the tribe\'s warriors are the product of three dice with the greatest capped at the distance to the nearest port, a numbered marker goes on the hex, and the turn pauses until the player chooses a policy on a panel at their edge: defensive stand, retreat, show of force, ignore, or friendly approach. Retreat returns to the previous hex and removes the marker. Re-entering a hex with a known tribe asks again without a roll.'
    );

    // Seed 18 (found by search under this script): bottom-1 holds a free ticket to Mombasa and $905. Main dice: roll-off 6,6,6,6 / 1,1,1,1, then the
    // step into c24r12: lost check 6 (found), terrain direction 2 (copies Mombasa's veldt), water 1 (no source). Natives
    // dice: 1,2 (3: natives on the veldt) then warriors 3,4,5, the 5 capped at distance 1 from Mombasa → 12 warriors.
    // Combat dice 1,1,1: the natives are not hostile when ignored (since 017).
    await page.goto('/table/?new=1&gameId=ABCDE&seed=18&dice=6,6,6,6,1,1,1,1,6,2,1&dice-natives=1,2,3,4,5&dice-hunting=1,1&dice-combat=1,1,1');
    await commission(page, 'bottom-1');
    await commission(page, 'top-1');
    await page.getByTestId('start-game').click();
    expect((await state(page)).turn!.current).toBe('bottom-1');
    await page.getByTestId('sail-bottom-1').click();
    await expect(page.getByTestId('port-mombasa')).toHaveAttribute('data-fare', 'ticket');
    await page.getByTestId('choose-port-mombasa').click();
    await passTurn(page);
    await passTurn(page); // round 2: bottom-1 lands at Mombasa and that turn is skipped
    await passTurn(page);
    await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c25r12');
    await outfit(page, 'bottom-1', { askaris: 5, bearers: 6, food: 100 });
    await page.getByTestId('move-target-c24r12').click();
    await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c24r12');

    await steps.step('natives-found', {
      description: 'The expedition maps c24r12 as veldt and rolls 1 and 2 for natives: found. Three dice (3, 4, 5, the five capped at the one hex to Mombasa) make 12 warriors; tribe marker 1 goes on the hex and the policy panel opens at the bottom edge',
      verifications: [
        { spec: 'Tribe marker 1 is on c24r12 and the rail shows the five dice with the note', check: async () => {
          await expect(page.getByTestId('tribe-c24r12')).toHaveAttribute('data-tribe', '1');
          await expect(page.getByTestId('natives-note-bottom-1')).toHaveText('natives: 12 warriors (tribe 1)');
          await expect(page.getByTestId('policy-prompt-bottom-1')).toBeVisible();
        } },
        { spec: 'The policy panel lists the five policies and the turn cannot end until one is chosen', check: async () => {
          const panel = page.getByTestId('policy-panel-bottom-1');
          await expect(panel).toBeVisible();
          await expect(panel).toHaveAttribute('data-tribe', '1');
          for (const n of [1, 2, 3, 4, 5]) await expect(page.getByTestId(`policy-${n}-bottom-1`)).toBeVisible();
          await expect(page.getByTestId('end-turn-bottom-1')).toHaveCount(0);
          await expect(page.locator('[data-testid^="move-target-"]')).toHaveCount(0);
          const s = await state(page);
          expect(s.turn).toMatchObject({ phase: 'natives', policy: null });
          expect(s.tribes).toEqual({ 1: { id: 1, hex: 'c24r12', warriors: 12, attitude: 0, pending: null, negotiatedBy: [], regard: {}, preachedBy: [], treatedBy: [], defeatedBy: [] } });
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    await page.getByTestId('policy-2-bottom-1').click();

    await steps.step('retreat', {
      description: 'Policy 2, immediate retreat: the token is back at Mombasa, the bottom seat\'s marker is gone from the hex, the tribe marker stays, and the turn goes on',
      verifications: [
        { spec: 'The token stands at Mombasa and c24r12 keeps its terrain and tribe but no marker', check: async () => {
          await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c25r12');
          await expect(page.getByTestId('marker-c24r12-bottom-1')).toHaveCount(0);
          await expect(page.getByTestId('tribe-c24r12')).toBeAttached();
          await expect(page.getByTestId('hex-c24r12')).toHaveAttribute('data-terrain', 'veldt');
          await expect(page.getByTestId('policy-panel-bottom-1')).toHaveCount(0);
          await expect(page.getByTestId('end-turn-bottom-1')).toBeVisible();
          const s = await state(page);
          expect(s.turn).toMatchObject({ phase: 'act', policy: 2 });
          expect(s.map['c24r12'].markers).toEqual([]);
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    await passTurn(page);
    await passTurn(page);
    await expect(page.getByTestId('turn-marker-bottom-1')).toHaveAttribute('data-current', 'true');
    await page.getByTestId('move-target-c24r12').click();
    await expect(page.getByTestId('policy-panel-bottom-1')).toBeVisible();
    await page.getByTestId('policy-4-bottom-1').click();

    await steps.step('ignored', {
      description: 'Next turn the expedition walks back in: the tribe is known so no dice are rolled, the panel asks again, and policy 4 (ignore them) lets the turn continue with the marker restored',
      verifications: [
        { spec: 'No natives dice this turn; the marker is back; the end-turn control is offered', check: async () => {
          await expect(page.getByTestId('natives-note-bottom-1')).toHaveCount(0);
          await expect(page.getByTestId('marker-c24r12-bottom-1')).toBeAttached();
          await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c24r12');
          await expect(page.getByTestId('end-turn-bottom-1')).toBeVisible();
          const s = await state(page);
          expect(s.turn).toMatchObject({ round: 4, phase: 'act', policy: 4, moved: false });
          await expect(page.getByTestId('reaction-note-bottom-1')).toHaveText('not hostile (3 within 5)');
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    steps.generateDocs();
  });
});
