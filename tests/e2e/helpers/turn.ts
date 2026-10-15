import { expect, type Page } from '@playwright/test';

/**
 * End the seat's turn from the rail and, when the next turn opens on its disaster card (phase `disaster`,
 * PROMPTS.md prompt 34), read it for that seat so the scenario goes on as it did when the card applied itself.
 * The end-turn event is waited for by the event count, so the next turn's phase is read, not guessed.
 */
export async function endTurnFromRail(page: Page, seat: string) {
  const before = await page.evaluate(() => window.__TABLETOP__!.getEvents().length);
  await page.getByTestId(`end-turn-${seat}`).click();
  await page.getByTestId(`confirm-end-turn-${seat}`).click();
  await faceDisasterIfDrawn(page, before);
}

/** Once more events than `after` are in: if the turn stands at its disaster card, apply it. */
export async function faceDisasterIfDrawn(page: Page, after: number) {
  await expect.poll(() => page.evaluate(() => window.__TABLETOP__!.getEvents().length)).toBeGreaterThan(after);
  const turn = await page.evaluate(() => {
    const t = window.__TABLETOP__!.getState().turn;
    return t ? { phase: t.phase, current: t.current } : null;
  });
  if (turn?.phase !== 'disaster') return;
  await page.getByTestId(`face-disaster-${turn.current}`).click();
  await expect(page.getByTestId(`face-disaster-${turn.current}`)).toHaveCount(0);
}
