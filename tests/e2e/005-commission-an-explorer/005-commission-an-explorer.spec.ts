import { test, expect } from '@playwright/test';
import { TestStepHelper } from '../helpers/test-step-helper';

test.describe('005 - Commission an explorer', () => {
  test('a seated player chooses specialties and commissions an explorer; a second seat commissions an ordinary explorer', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'Commission an explorer',
      'After taking a seat, the rail offers the four specialties of the rules (evangelism, medicine, zoology, geology) and a confirm control. Confirming puts an explorer token in the seat colour on the rail, in Europe, with a badge per specialty. A second seat commissions an ordinary explorer with no specialties; its rail faces its own edge.'
    );

    await page.goto('/table/?new=1&gameId=ABCDE&seed=1234');
    await page.getByTestId('seat-join-bottom-1').click();

    await steps.step('setup-offered', {
      description: 'The taken bottom seat offers the specialty toggles and a confirm; no other rail does',
      verifications: [
        { spec: 'Four specialty toggles and a commission control are shown at bottom-1 only', check: async () => {
          await expect(page.getByTestId('explorer-setup-bottom-1')).toBeVisible();
          for (const s of ['evangelism', 'medicine', 'zoology', 'geology']) {
            await expect(page.getByTestId(`specialty-${s}-bottom-1`)).toHaveAttribute('aria-pressed', 'false');
          }
          await expect(page.getByTestId('commission-bottom-1')).toBeVisible();
          await expect(page.locator('[data-testid^="explorer-setup-"]')).toHaveCount(1);
        } },
        { spec: 'The setup faces the bottom seat (0°) and no explorer exists yet', check: async () => {
          await expect(page.getByTestId('seat-rail-bottom-1').locator('.face')).toHaveCSS('rotate', '0deg');
          const state = await page.evaluate(() => window.__TABLETOP__!.getState());
          expect(state.explorers).toEqual([]);
        } }
      ]
    });

    await page.getByTestId('specialty-medicine-bottom-1').click();
    await page.getByTestId('specialty-zoology-bottom-1').click();
    await expect(page.getByTestId('specialty-zoology-bottom-1')).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('commission-bottom-1').click();

    await steps.step('zoologist-doctor-commissioned', {
      description: 'A doctor-zoologist explorer is commissioned: a token in the seat colour with two badges replaces the setup',
      verifications: [
        { spec: 'The explorer token is on the bottom rail with medicine and zoology badges, in Europe', check: async () => {
          await expect(page.getByTestId('explorer-token-bottom-1')).toBeVisible();
          await expect(page.getByTestId('explorer-token-bottom-1')).toHaveAttribute('data-location', 'europe');
          await expect(page.getByTestId('badge-medicine-bottom-1')).toBeVisible();
          await expect(page.getByTestId('badge-zoology-bottom-1')).toBeVisible();
          await expect(page.getByTestId('explorer-token-bottom-1').locator('[data-testid^="badge-"]')).toHaveCount(2);
          await expect(page.getByTestId('explorer-setup-bottom-1')).toHaveCount(0);
        } },
        { spec: 'The state holds one explorer with the specialties in canonical order and no diagnostics', check: async () => {
          const state = await page.evaluate(() => window.__TABLETOP__!.getState());
          expect(state.explorers).toEqual([{ seat: 'bottom-1', specialties: ['medicine', 'zoology'], location: { kind: 'europe' }, sick: { explorer: false, guides: 0, bearers: 0, askaris: 0, animals: 0 }, hand: [], drawnRound: {}, unseen: [], money: 0, chart: null, lastMeal: null, known: [], cameFrom: null, poisonBonus: 0, specimens: { zoology: 0, geology: 0 }, goodWorks: { evangelism: 0, medicine: 0 }, research: null, fate: null, transit: null, party: null }]);
          expect(state.diagnostics).toEqual([]);
        } }
      ]
    });

    await page.getByTestId('seat-join-top-1').click();
    await expect(page.getByTestId('commission-top-1')).toBeVisible();
    await page.getByTestId('commission-top-1').click();

    await steps.step('second-seat-ordinary', {
      description: 'The top seat commissions an ordinary explorer with no badges; its token faces the top edge',
      verifications: [
        { spec: 'An ordinary explorer token with no badges sits on the top rail, rotated 180°', check: async () => {
          await expect(page.getByTestId('explorer-token-top-1')).toBeVisible();
          await expect(page.getByTestId('explorer-token-top-1').locator('[data-testid^="badge-"]')).toHaveCount(0);
          await expect(page.getByTestId('seat-rail-top-1').locator('.face')).toHaveCSS('rotate', '180deg');
        } },
        { spec: 'Two explorers exist and the stream is game/created, two seats, two commissions', check: async () => {
          const state = await page.evaluate(() => window.__TABLETOP__!.getState());
          expect(state.explorers.map((e) => [e.seat, e.specialties])).toEqual([['bottom-1', ['medicine', 'zoology']], ['top-1', []]]);
          const events = await page.evaluate(() => window.__TABLETOP__!.getEvents());
          expect(events.map((e) => e.type)).toEqual(['game/created', 'seat/taken', 'explorer/commissioned', 'seat/taken', 'explorer/commissioned']);
        } }
      ]
    });

    steps.generateDocs();
  });
});
