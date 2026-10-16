import { expect, type Page } from '@playwright/test';

/**
 * Take the cards waiting in full at every seat's edge (PROMPTS.md, prompt 44): the hand dealt as the game begins, or
 * a card drawn since. A scenario that is not about the cards takes them as a player would before going on, so the
 * panels do not stand over the board.
 */
export async function takeCards(page: Page) {
  const takes = page.locator('[data-testid^="take-cards-"]');
  await expect(takes.first()).toBeVisible();
  for (;;) {
    if ((await takes.count()) === 0) break;
    const id = (await takes.first().getAttribute('data-testid'))!;
    await page.getByTestId(id).click();
    await expect(page.getByTestId(id)).toHaveCount(0);
  }
}
