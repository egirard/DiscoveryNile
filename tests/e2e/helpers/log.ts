import { expect, type Page } from '@playwright/test';

/**
 * Opens the rest of a seat's log above its rail, runs the checks, and closes it again. The lines listed
 * there carry the same ids as the rail's latest line (`roll-{kind}-{seat}`, `{kind}-note-{seat}`), so a
 * record older than the latest is read with `.last()` on the same locator while the log is open.
 */
export async function withLogOpen(page: Page, seat: string, check: () => Promise<void>) {
  await page.getByTestId(`log-expand-${seat}`).click();
  await expect(page.getByTestId(`turn-log-${seat}`)).toBeVisible();
  await check();
  await page.getByTestId(`log-expand-${seat}`).click();
  await expect(page.getByTestId(`turn-log-${seat}`)).toHaveCount(0);
}
