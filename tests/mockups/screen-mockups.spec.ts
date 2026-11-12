import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { endTurnFromRail } from '../e2e/helpers/turn';

// The pictures of docs/screen-mockups.md: the table as it opens, with every seat ready to start, and a game under way,
// on each screen size in SCREENS. Regenerate with `bun run docs:mockups` whenever the layout changes (that document
// says when), look at the pictures, and commit them with the change. To add a size, add a line to SCREENS; to add a
// screen, add a shot below; the document's table is written from both.
const OUT = fileURLToPath(new URL('../../docs/screen-mockups/', import.meta.url));
const SCREENS = [
  { diag: 17, width: 1920, height: 1080, what: 'a 17" laptop or portable monitor, 1920 × 1080' },
  { diag: 27, width: 1920, height: 1080, what: 'a 27" monitor laid flat, 1920 × 1080' },
  { diag: 55, width: 3840, height: 2160, what: 'a 55" table, 3840 × 2160' }
];
const SHOTS = [
  { id: 'start', title: 'The start screen', what: 'The table as it opens: the board, a rail at each of the six seats with its player icon and the QR code that seats a phone, the gears for the options at two corners.' },
  { id: 'ready', title: 'Ready to start', what: 'Every seat taken and its explorer commissioned: the start control in the middle of the board with the length of the game beneath it.' },
  { id: 'game', title: 'The game screen', what: 'A game under way in round 3: bottom-1 has landed at Mombasa and outfitted, its chart at its rail and the hexes it may step into marked on the board; the other five explorers wait in Europe with their hands and funds at their rails.' }
];
const SEATS = ['bottom-1', 'bottom-2', 'top-1', 'top-2', 'left-1', 'right-1'];
const state = (page: Page) => page.evaluate(() => window.__TABLETOP__!.getState());
const file = (shot: string, diag: number) => `${shot}-${diag}in.png`;

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

test.describe('screen mockups', () => {
  for (const screen of SCREENS) {
    test(`the start screen and the game screen at ${screen.diag}"`, async ({ browser }) => {
      mkdirSync(OUT, { recursive: true });
      const context = await browser.newContext({ viewport: { width: screen.width, height: screen.height }, deviceScaleFactor: 1 });
      const page = await context.newPage();
      const shoot = (shot: string) => page.screenshot({ path: `${OUT}${file(shot, screen.diag)}`, animations: 'disabled', caret: 'hide', scale: 'css' });

      // The game of scenario 032: seed 5 deals bottom-1 a ticket to Mombasa, and the scripted roll-off puts it first.
      await page.goto(`/table/?new=1&gameId=ABCDE&seed=5&diag=${screen.diag}&dice=6,6,6,6,${Array(20).fill(1).join(',')}`);
      await expect(page.getByTestId('hex-grid')).toBeVisible();
      await expect(page.locator('[data-testid^="seat-join-"]')).toHaveCount(SEATS.length);
      await shoot('start');

      for (const seat of SEATS) await page.getByTestId(`seat-join-${seat}`).click();
      for (const seat of SEATS) {
        await page.getByTestId(`commission-${seat}`).click();
        await expect(page.getByTestId(`explorer-token-${seat}`)).toBeVisible();
      }
      await expect(page.getByTestId('start-game')).toBeVisible();
      await shoot('ready');

      await page.getByTestId('start-game').click();
      // The hands dealt wait at every edge. On the smallest screen the six panels lie over one another, so each is
      // taken by its own control directly rather than by a tap at its place.
      await expect(page.locator('[data-testid^="take-cards-"]').first()).toBeVisible();
      await expect.poll(() => page.evaluate(() => {
        const takes = [...document.querySelectorAll<HTMLElement>('[data-testid^="take-cards-"]')];
        takes[0]?.click();
        return takes.length;
      })).toBe(0);
      await page.getByTestId('sail-bottom-1').click();
      await page.getByTestId('choose-port-mombasa').click();
      await page.getByTestId('confirm-sail-bottom-1').click();
      for (let i = 0; i < 12 && !(await page.getByTestId('expedition-chart-bottom-1').isVisible()); i++) await passTurn(page);
      await tap(page, 'buy-bearers-bottom-1', 5);
      await page.getByTestId('chart-step-10-bottom-1').click();
      await tap(page, 'buy-food-bottom-1', 2);
      await page.getByTestId('confirm-outfit-bottom-1').click();
      await page.getByTestId('confirm-outfit-yes-bottom-1').click();
      await expect(page.getByTestId('chart-summary-bottom-1')).toBeVisible();
      await expect(page.locator('[data-testid^="move-target-"]').first()).toBeVisible();
      await shoot('game');
      await context.close();
    });
  }

  test('the document', () => {
    // docs/screen-mockups.md is written from the lists above, so it never names a picture that was not taken.
    const lines = [
      '# Screen mockups',
      '',
      'Pictures of the table\'s layout as the code draws it today, on three screen sizes, for talking about the layout without starting the game. They are taken from the E2E build by `tests/mockups/screen-mockups.spec.ts`; this file is written by the same run. **Do not edit either by hand.**',
      '',
      'The table cannot know its physical size, so each picture is taken with the screen\'s diagonal configured (`?diag=`, [tabletop-ux.md](tabletop-ux.md)): a touch target is 12 mm and never under 44 px, and the rails, cards and panels follow from it. The same 1920 × 1080 pixels are therefore laid out differently at 17" and 27".',
      '',
      '| Screen | Stands for |',
      '|---|---|',
      ...SCREENS.map((s) => `| ${s.diag}" | ${s.what} |`),
      '',
      '## Regenerating',
      '',
      'Regenerate the pictures **whenever the screen layout changes**: the board\'s place or size, the rails and what stands on them, the seats, the start control, the options gears, the status line, the compass, the dice tray\'s corner, the sizes that follow from the diagonal. A change that only moves a panel that opens during play (a prompt, a chart being filled in) does not show here and needs no new pictures.',
      '',
      '```sh',
      'nix develop --command bun run docs:mockups',
      '```',
      '',
      'That builds the E2E client, plays the opening of scenario 032 on each screen size and writes `docs/screen-mockups/*.png` and this file. The local relay must not be running on port 3001 (the run starts its own, as the scenarios do). Then look at every picture that changed (`git status docs/screen-mockups`), and commit them with the change that moved the layout. The run is not part of `bun run verify:change`: the scenarios\' own baselines guard the layout, these pictures only show it.',
      '',
      'To add a screen size or another screen, add a line to `SCREENS` or `SHOTS` in the spec and run it again.',
      ''
    ];
    for (const shot of SHOTS) {
      lines.push(`## ${shot.title}`, '', shot.what, '');
      for (const s of SCREENS) lines.push(`### ${shot.title} at ${s.diag}"`, '', `![${shot.title} at ${s.diag} inches: ${s.what}](screen-mockups/${file(shot.id, s.diag)})`, '');
    }
    writeFileSync(fileURLToPath(new URL('../../docs/screen-mockups.md', import.meta.url)), lines.join('\n'));
  });
});
