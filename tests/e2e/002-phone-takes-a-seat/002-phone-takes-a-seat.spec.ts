import { test, expect } from '@playwright/test';
import { ScenarioJournal, TestStepHelper } from '../helpers/test-step-helper';
import { openPhone } from '../helpers/phone';

test.describe('002 - Phone takes a seat', () => {
  test('a phone scans the top seat QR, takes the seat through the relay, and sees its private view', async ({ page, browser }, testInfo) => {
    const journal = new ScenarioJournal();
    const table = new TestStepHelper(page, testInfo, journal, 'Table');
    table.setMetadata(
      'Phone takes a seat',
      'The table shows a QR code at each empty seat. A phone opens the top seat’s link, takes the seat through the relay, and shows that seat’s private view while the table shows only the public rail.'
    );

    await page.goto('/table/?new=1&gameId=ABCDE&seed=1234');
    await expect(page.getByTestId('seat-qr-top-1')).toBeVisible();

    await table.step('qr-at-every-seat', {
      description: 'Every empty seat shows a QR code linking to its hand page',
      verifications: [
        { spec: 'Four QR links are shown', check: async () => {
          await expect(page.locator('[data-testid^="seat-qr-"]')).toHaveCount(4);
        } },
        { spec: 'The top seat QR links to the hand page for session ABCDE and seat top-1', check: async () => {
          await expect(page.getByTestId('seat-qr-top-1')).toHaveAttribute('href', /\/hand\/\?session=ABCDE&seat=top-1$/);
        } }
      ]
    });

    const href = (await page.getByTestId('seat-qr-top-1').getAttribute('href'))!;
    const { context, page: phonePage } = await openPhone(browser, `${href}&name=Bo&auto=1`);
    const phone = new TestStepHelper(phonePage, testInfo, journal, 'Phone');

    await phone.step('phone-seated', {
      description: 'The phone takes the top seat automatically and shows its private view',
      verifications: [
        { spec: 'The phone shows the private section for seat top-1 with the chosen name', check: async () => {
          await expect(phonePage.getByTestId('hand')).toHaveAttribute('data-seat', 'top-1');
          await expect(phonePage.getByTestId('hand-private')).toBeVisible();
          await expect(phonePage.getByTestId('hand-name')).toHaveText('Bo');
        } }
      ]
    });

    await table.step('table-shows-phone-seat', {
      description: 'The table shows the top seat taken, facing the top edge, with no private content',
      verifications: [
        { spec: 'The top rail is taken and its QR is gone', check: async () => {
          await expect(page.getByTestId('seat-rail-top-1')).toHaveAttribute('data-taken', 'true');
          await expect(page.getByTestId('seat-qr-top-1')).toHaveCount(0);
        } },
        { spec: 'The occupant is the phone, not the table', check: async () => {
          const state = await page.evaluate(() => window.__TABLETOP__!.getState());
          expect(state.seats.find((s) => s.id === 'top-1')?.uid).toMatch(/^phone-/);
          expect(state.seats.find((s) => s.id === 'top-1')?.name).toBe('Bo');
          expect(state.diagnostics).toEqual([]);
        } },
        { spec: 'The other three seats still offer QR codes', check: async () => {
          await expect(page.locator('[data-testid^="seat-qr-"]')).toHaveCount(3);
        } }
      ]
    });

    await phonePage.reload();

    await phone.step('phone-reloaded', {
      description: 'After a reload the phone is still seated without re-entering a name',
      verifications: [
        { spec: 'The private view is shown again for the same name', check: async () => {
          await expect(phonePage.getByTestId('hand-private')).toBeVisible();
          await expect(phonePage.getByTestId('hand-name')).toHaveText('Bo');
        } }
      ]
    });

    await context.close();
    table.generateDocs();
  });
});
