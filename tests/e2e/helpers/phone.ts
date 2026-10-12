import type { Browser, BrowserContext, Page } from '@playwright/test';

export const PHONE_VIEWPORT = { width: 393, height: 852 };

/** Opens a phone-sized, fully isolated browser context on the given hand URL. */
export async function openPhone(browser: Browser, url: string): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ viewport: PHONE_VIEWPORT, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.goto(url);
  return { context, page };
}
