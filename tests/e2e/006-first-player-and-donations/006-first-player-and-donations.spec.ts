import { test, expect, type Page } from '@playwright/test';
import { TestStepHelper } from '../helpers/test-step-helper';

async function commission(page: Page, seat: string, specialties: string[] = []) {
  await page.getByTestId(`seat-join-${seat}`).click();
  for (const s of specialties) await page.getByTestId(`specialty-${s}-${seat}`).click();
  await page.getByTestId(`commission-${seat}`).click();
  await expect(page.getByTestId(`explorer-token-${seat}`)).toBeVisible();
}

test.describe('006 - First player and donations', () => {
  test('starting the game rolls for first player, deals five donation cards to each explorer, and survives a reload', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'First player and donations',
      'With explorers commissioned, a start control appears on the board. Starting rolls four dice for each explorer in plain view, marks the high roller as first player, shuffles the deck from the game seed and deals five donation cards face up to each rail. The draw and discard piles sit on the board.'
    );

    await page.goto('/table/?new=1&gameId=ABCDE&seed=1234');
    await commission(page, 'bottom-1', ['zoology']);
    await commission(page, 'top-1');

    await steps.step('ready-to-start', {
      description: 'Two explorers are commissioned and the start control is offered on the board',
      verifications: [
        { spec: 'The start control is visible and no cards or piles exist yet', check: async () => {
          await expect(page.getByTestId('start-game')).toBeVisible();
          await expect(page.locator('[data-testid^="card-"]')).toHaveCount(0);
          await expect(page.getByTestId('deck')).toHaveCount(0);
          await expect(page.locator('[data-testid^="roll-log-"]')).toHaveCount(0);
        } }
      ]
    });

    await page.getByTestId('start-game').click();

    await steps.step('started', {
      description: 'Both explorers rolled four dice, read in the log rather than at the rail: the seat that waits has the roll as its latest line, the high roller has already drawn and keeps the roll behind that line; each rail shows five face-up cards; the piles are on the board',
      verifications: [
        { spec: 'The roll is the first line of each seat\'s log, four dice and the total, at the rail for the waiting seat and behind the draw for the first player', check: async () => {
          const s = await page.evaluate(() => window.__TABLETOP__!.getState());
          const total = (seat: string) => s.rollOff![seat].at(-1)!.reduce((a, b) => a + b, 0);
          const first = s.turn!.current;
          for (const seat of ['bottom-1', 'top-1']) {
            const roll = page.getByTestId(`roll-first-player-${seat}`);
            if (seat === first) {
              await expect(page.getByTestId(`action-note-${seat}`)).toHaveText(/^drew /);
              await expect(roll).toHaveCount(0);
              await page.getByTestId(`log-expand-${seat}`).click();
              await expect(page.getByTestId(`turn-log-round-0-${seat}`)).toHaveText('First player');
              await expect(roll).toHaveAttribute('data-outcome', `total ${total(seat)}: first player`);
            } else {
              await expect(roll).toHaveAttribute('data-outcome', `total ${total(seat)}`);
            }
            await expect(roll.locator('.die')).toHaveCount(4);
            const values = await roll.locator('.die').evaluateAll((els) => els.map((e) => Number(e.getAttribute('data-value'))));
            expect(values.reduce((a, b) => a + b, 0)).toBe(total(seat));
            await expect(roll).toHaveAttribute('data-total', String(total(seat)));
            if (seat === first) await page.getByTestId(`log-expand-${seat}`).click();
          }
          await expect(page.locator('[data-testid^="roll-off-"]')).toHaveCount(0);
        } },
        { spec: 'The turn marker sits at the seat whose final roll was higher', check: async () => {
          const state = await page.evaluate(() => window.__TABLETOP__!.getState());
          const total = (seat: string) => state.rollOff![seat].at(-1)!.reduce((a, b) => a + b, 0);
          const winner = total('bottom-1') > total('top-1') ? 'bottom-1' : 'top-1';
          const loser = winner === 'bottom-1' ? 'top-1' : 'bottom-1';
          expect(state.turn!.current).toBe(winner);
          expect(state.turn!.order[0]).toBe(winner);
          await expect(page.getByTestId(`turn-marker-${winner}`)).toHaveAttribute('data-current', 'true');
          await expect(page.getByTestId(`turn-marker-${loser}`)).toHaveAttribute('data-current', 'false');
          await expect(page.getByTestId(`seat-rail-${winner}`)).toHaveAttribute('data-current', 'true');
        } },
        { spec: 'Each explorer was dealt five face-up donation cards; the first player has already drawn a sixth; the draw pile holds the other 37', check: async () => {
          const state = await page.evaluate(() => window.__TABLETOP__!.getState());
          const first = state.turn!.current, second = first === 'bottom-1' ? 'top-1' : 'bottom-1';
          await expect(page.getByTestId(`hand-${first}`)).toHaveAttribute('data-count', '6');
          await expect(page.getByTestId(`hand-${second}`)).toHaveAttribute('data-count', '5');
          await expect(page.locator('[data-testid^="card-"]')).toHaveCount(11);
          await expect(page.getByTestId('deck-draw')).toHaveAttribute('data-count', '37');
          await expect(page.getByTestId('deck-discard')).toHaveAttribute('data-count', '0');
          await expect(page.getByTestId('start-game')).toHaveCount(0);
        } },
        { spec: 'Every card is one of the 48 and no card is in two places', check: async () => {
          const state = await page.evaluate(() => window.__TABLETOP__!.getState());
          const all = [...state.deck!.draw, ...state.explorers.flatMap((e) => e.hand)];
          expect(all).toHaveLength(48);
          expect(new Set(all).size).toBe(48);
          expect(state.turn).toMatchObject({ round: 1, phase: 'act' });
          expect(state.diagnostics).toEqual([]);
        } }
      ]
    });

    const before = await page.evaluate(() => window.__TABLETOP__!.getState());
    await page.reload();

    await steps.step('persists-after-reload', {
      description: 'After a reload the same roll-off, the same hands and the same first player are restored from the seed',
      verifications: [
        { spec: 'Hands, deck order, roll-off and turn are identical to before the reload', check: async () => {
          await expect(page.getByTestId(`hand-${before.turn!.current}`)).toHaveAttribute('data-count', '6');
          const after = await page.evaluate(() => window.__TABLETOP__!.getState());
          expect(after.explorers.map((e) => e.hand)).toEqual(before.explorers.map((e) => e.hand));
          expect(after.deck).toEqual(before.deck);
          expect(after.rollOff).toEqual(before.rollOff);
          expect(after.history).toEqual(before.history);
          expect(after.turn).toEqual(before.turn);
          await expect(page.getByTestId(`turn-marker-${before.turn!.current}`)).toHaveAttribute('data-current', 'true');
        } },
        { spec: 'The stream replayed: game/created, two seats and commissions, game/started', check: async () => {
          const events = await page.evaluate(() => window.__TABLETOP__!.getEvents());
          expect(events.map((e) => e.type)).toEqual(['game/created', 'seat/taken', 'explorer/commissioned', 'seat/taken', 'explorer/commissioned', 'game/started']);
        } }
      ]
    });

    steps.generateDocs();
  });
});
