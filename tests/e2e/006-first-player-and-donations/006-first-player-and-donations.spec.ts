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

    // `first-player-pause=hold`: the decided roll stays at the stations until the scenario begins play itself (the table's own pause is three seconds).
    await page.goto('/table/?new=1&gameId=ABCDE&seed=1234&first-player-pause=hold');
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
    await expect(page.getByTestId('first-player-scrim')).toBeVisible();

    await steps.step('first-player-decided', {
      description: 'Both explorers rolled four dice and each roll stands in front of its own station: the four dice and the total, the winner\'s glowing as first player; the table stands still for a few seconds before play begins; under each roll the five cards dealt stand in full, the donation large and the disaster it would be in Africa beneath, with a control to take them',
      verifications: [
        { spec: 'Each station shows its own roll, the winner\'s marked and glowing, under a scrim; the turn is decided but the game is held at the roll', check: async () => {
          const s = await page.evaluate(() => window.__TABLETOP__!.getState());
          const total = (seat: string) => s.rollOff![seat].at(-1)!.reduce((a, b) => a + b, 0);
          const winner = total('bottom-1') > total('top-1') ? 'bottom-1' : 'top-1';
          expect(s.starting).toBe(winner);
          expect(s.turn!.current).toBe(winner);
          for (const seat of ['bottom-1', 'top-1']) {
            const roll = page.getByTestId(`first-player-roll-${seat}`);
            await expect(roll).toHaveAttribute('data-total', String(total(seat)));
            await expect(roll).toHaveAttribute('data-winner', String(seat === winner));
            await expect(roll).toHaveAttribute('data-decided', 'true');
            await expect(roll.locator('.die')).toHaveCount(4);
            await expect(page.getByTestId(`first-player-edge-${seat}`)).toHaveAttribute('data-seat', seat);
          }
          await expect(page.getByTestId('first-player-scrim')).toBeVisible();
        } },
        { spec: 'Each station shows the five cards dealt in full, one per card in the hand, waiting to be taken (prompt 44)', check: async () => {
          const s = await page.evaluate(() => window.__TABLETOP__!.getState());
          for (const seat of ['bottom-1', 'top-1']) {
            const e = s.explorers.find((x) => x.seat === seat)!;
            expect(e.unseen).toEqual(e.hand);
            await expect(page.getByTestId(`donations-${seat}`)).toHaveAttribute('data-count', String(e.hand.length));
            for (const id of e.hand) await expect(page.getByTestId(`donation-card-${id}-${seat}`)).toBeVisible();
            await expect(page.getByTestId(`take-cards-${seat}`)).toBeVisible();
            await expect(page.getByTestId(`take-cards-${seat}`)).toHaveAttribute('data-icon', 'check'); // a check mark takes them (prompt 47)
          }
        } }
      ]
    });

    // The table would begin play by itself after its pause; held by the query, the scenario begins it.
    await page.evaluate(() => window.__TABLETOP__!.append('game/begun', {}));
    await expect(page.getByTestId('first-player-scrim')).toHaveCount(0);

    await steps.step('started', {
      description: 'Play begins: the stations clear, and the roll is one line in every seat\'s log, each seat\'s four dice and total and who goes first: the seat that waits has it as its latest line, the high roller has already drawn and keeps it behind that line; each rail shows five face-up cards; the piles are on the board',
      verifications: [
        { spec: 'The cards waiting are three targets wide and their disaster text a quarter larger than first drawn (prompt 62): readable at the table', check: async () => {
          const card = page.locator('[data-testid^="donation-card-"][data-testid$="-bottom-1"]').first();
          const target = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('[style*="--target"]')!).getPropertyValue('--target')));
          expect((await card.boundingBox())!.width).toBeCloseTo(target * 3, 0);
          expect(await card.locator('.text').evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeCloseTo(target * 0.2125, 0);
        } },
        { spec: 'The same roll line is the first of each seat\'s log, both seats\' dice and totals and the winner named, at the rail for the waiting seat and behind the draw for the first player', check: async () => {
          const s = await page.evaluate(() => window.__TABLETOP__!.getState());
          expect(s.starting).toBeNull();
          await expect(page.locator('[data-testid^="first-player-roll-"]')).toHaveCount(0);
          const total = (seat: string) => s.rollOff![seat].at(-1)!.reduce((a, b) => a + b, 0);
          const first = s.turn!.current;
          const line = `${first} first`;
          for (const seat of ['bottom-1', 'top-1']) {
            const roll = page.getByTestId(`roll-first-player-${seat}`);
            if (seat === first) {
              await expect(page.getByTestId(`action-note-${seat}`)).toHaveText(/^drew /);
              await expect(roll).toHaveCount(0);
              await page.getByTestId(`log-expand-${seat}`).click();
              await expect(page.getByTestId(`turn-log-round-0-${seat}`)).toHaveText('First player');
            }
            await expect(roll).toHaveAttribute('data-outcome', line);
            await expect(roll).toHaveAttribute('data-total', String(total(first)));
            for (const c of ['bottom-1', 'top-1']) {
              const part = page.getByTestId(`first-player-${c}-${seat}`);
              await expect(part).toHaveAttribute('data-total', String(total(c)));
              await expect(part.locator('.die')).toHaveCount(4);
            }
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

    // The cards are taken at both edges: the first player's six (the hand dealt and the card drawn) and the other seat's five.
    await expect(page.getByTestId('donations-bottom-1')).toBeVisible();
    await expect(page.getByTestId('donations-top-1')).toBeVisible();
    await page.getByTestId('take-cards-bottom-1').click();
    await page.getByTestId('take-cards-top-1').click();
    await expect(page.locator('[data-testid^="donations-"]')).toHaveCount(0);

    await steps.step('cards-taken', {
      description: 'After the pause the cards still wait at both edges, the first player\'s with the sixth card its turn drew; a tap on Take at each edge puts them away, a cards/seen event a seat, and the hands stay at the rails',
      verifications: [
        { spec: 'Both panels are gone, two cards/seen events were recorded, nothing waits, and the hands are five and six at the rails', check: async () => {
          const s = await page.evaluate(() => window.__TABLETOP__!.getState());
          const events = await page.evaluate(() => window.__TABLETOP__!.getEvents());
          expect(events.filter((e) => e.type === 'cards/seen').map((e) => e.payload)).toEqual([{ seat: 'bottom-1' }, { seat: 'top-1' }]);
          for (const e of s.explorers) expect(e.unseen).toEqual([]);
          const first = s.turn!.current;
          await expect(page.getByTestId(`hand-${first}`)).toHaveAttribute('data-count', '6');
          await expect(page.getByTestId(`hand-${first === 'bottom-1' ? 'top-1' : 'bottom-1'}`)).toHaveAttribute('data-count', '5');
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

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
        { spec: 'The stream replayed: game/created, two seats and commissions, game/started, game/begun, and the cards taken at each seat', check: async () => {
          const events = await page.evaluate(() => window.__TABLETOP__!.getEvents());
          expect(events.map((e) => e.type)).toEqual(['game/created', 'seat/taken', 'explorer/commissioned', 'seat/taken', 'explorer/commissioned', 'game/started', 'game/begun', 'cards/seen', 'cards/seen']);
        } }
      ]
    });

    steps.generateDocs();
  });
});
