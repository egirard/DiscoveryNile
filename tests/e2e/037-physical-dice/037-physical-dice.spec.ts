import { test, expect, type Page } from '@playwright/test';
import { TestStepHelper } from '../helpers/test-step-helper';
import { withLogOpen } from '../helpers/log';

async function commission(page: Page, seat: string) {
  await page.getByTestId(`seat-join-${seat}`).click();
  await page.getByTestId(`commission-${seat}`).click();
  await expect(page.getByTestId(`explorer-token-${seat}`)).toBeVisible();
}
const state = (page: Page) => page.evaluate(() => window.__TABLETOP__!.getState());
const events = (page: Page) => page.evaluate(() => window.__TABLETOP__!.getEvents());
async function endTurn(page: Page, seat: string) {
  await page.getByTestId(`end-turn-${seat}`).click();
  await page.getByTestId(`confirm-end-turn-${seat}`).click();
}
async function tap(page: Page, id: string, times: number) {
  for (let i = 0; i < times; i++) await page.getByTestId(id).click();
}
/**
 * The dicecam on the table is a stand-in page in E2E builds (static/dicecam-stub.html, docs/dicecam.md): the
 * scenario speaks for it, posting the messages the real WebCamTool embed posts, from inside its frame.
 */
async function dicecamSays(page: Page, message: Record<string, unknown>) {
  const frame = page.frames().find((f) => f.url().includes('dicecam-stub'));
  expect(frame, 'the dicecam frame is on the table').toBeTruthy();
  await frame!.evaluate((m) => parent.postMessage(m, '*'), message);
}
/** A throw as the dicecam reads it: every die sure, read twice over so the two readings agree. */
async function dicecamReads(page: Page, rollId: string, values: number[]) {
  const reading = { dicecam: 'settled', rollId, dice: values.map((value) => ({ value, confidence: 0.92, askew: false })) };
  await dicecamSays(page, reading);
  await expect(page.locator('[data-testid^="dice-prompt-"]')).toHaveAttribute('data-seen', String(values.length));
  await dicecamSays(page, reading);
}

test.describe('037 - Physical dice', () => {
  test('with physical dice on, the table asks for every roll in the rules\' words, the dicecam or a tapped face answers, and the game goes on', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'Physical dice',
      'The options screen turns physical dice on: from then on the table rolls nothing itself. Whenever a rule calls for dice the game stands still and the seat whose roll it is reads what to roll and why at its edge ("Roll a D6 to see if you are lost; 2+ means you\'re okay"), with the throws already made for the same action. The dicecam, the WebCamTool page in a frame in the corner of the board, reads the tray and two agreeing readings enter the roll; a tap on one of the six faces enters it by hand. Each roll becomes a dice/rolled event, so the log replays the same game. The roll for first player, a lost check, the terrain, a river source and the natives are rolled this way in one game.'
    );

    // Seed 24: with the roll for first player made at the table (reading no generator dice), bottom-1's opening hand
    // holds a free ticket to Mombasa and $1000. Every other die of the scenario is rolled below.
    await page.goto('/table/?new=1&gameId=ABCDE&seed=24');
    await page.getByTestId('options-se').click();
    await expect(page.getByTestId('physical-dice')).toHaveAttribute('aria-pressed', 'false');
    await page.getByTestId('physical-dice').click();

    await steps.step('physical-dice-on', {
      description: 'The options screen has a dice section: "Physical dice" is switched on, and the dicecam appears in the south-west corner of the board',
      verifications: [
        { spec: 'The toggle is on and the state says so; the game records it as a dice/physical event', check: async () => {
          await expect(page.getByTestId('physical-dice')).toHaveAttribute('aria-pressed', 'true');
          await expect(page.getByTestId('physical-dice-state')).toHaveText('on');
          expect((await state(page)).rng).toMatchObject({ physical: true });
          expect((await events(page)).filter((e) => e.type === 'dice/physical').map((e) => e.payload)).toEqual([{ on: true }]);
        } },
        { spec: 'The dicecam frame is on the table, still connecting', check: async () => {
          await expect(page.getByTestId('dicecam-dock')).toHaveAttribute('data-status', 'connecting');
          await expect(page.frameLocator('[data-testid="dicecam-frame"]').getByText('dicecam')).toBeVisible();
        } }
      ]
    });

    await page.getByTestId('options-close').click();
    await commission(page, 'bottom-1');
    await commission(page, 'top-1');
    await page.getByTestId('start-game').click();
    await expect(page.getByTestId('dice-edge-bottom-1')).toBeVisible();
    await dicecamSays(page, { dicecam: 'ready' });
    await dicecamSays(page, { dicecam: 'camera', status: 'active' });

    await steps.step('first-player-asked', {
      description: 'The game starts with the roll for first player: the table stands still and asks bottom-1, at its edge, for four dice; the dicecam is watching for them, and the six faces are there to tap instead',
      verifications: [
        { spec: 'The ask names the throw and what it decides; the game has not started', check: async () => {
          await expect(page.getByTestId('dice-ask-bottom-1')).toHaveText('Roll 4 D6 for first player; the highest total goes first');
          const s = await state(page);
          expect(s.turn).toBeNull();
          expect(s.awaiting).toMatchObject({ seat: 'bottom-1', stream: 'main', count: 4, rolled: [] });
          expect(s.awaiting!.event.type).toBe('game/started');
        } },
        { spec: 'The dicecam is active and watching for four dice; the faces wait for four taps; the rest of the table is held', check: async () => {
          await expect(page.getByTestId('dicecam-status-bottom-1')).toHaveText('Watching the dicecam for 4 dice');
          await expect(page.getByTestId('dicecam-dock')).toHaveAttribute('data-status', 'active');
          await expect(page.getByTestId('dice-taps-bottom-1')).toHaveAttribute('data-count', '0');
          await expect(page.locator('[data-testid^="die-face-"][data-testid$="-bottom-1"]')).toHaveCount(6);
          await expect(page.getByTestId('dice-scrim')).toBeVisible();
        } }
      ]
    });

    await dicecamReads(page, 'throw-1', [6, 6, 6, 6]);
    await expect(page.getByTestId('dice-edge-top-1')).toBeVisible();

    await steps.step('first-throw-read', {
      description: 'The dicecam reads four sixes twice over and the throw is in: the ask moves to top-1, who sees bottom-1\'s throw listed above the dicecam line',
      verifications: [
        { spec: 'bottom-1\'s four sixes are a dice/rolled event and listed for top-1; the ask is now top-1\'s', check: async () => {
          await expect(page.getByTestId('dice-ask-top-1')).toHaveText('Roll 4 D6 for first player; the highest total goes first');
          await expect(page.getByTestId('dice-so-far-top-1').locator('li')).toHaveCount(1);
          await expect(page.getByTestId('dice-so-far-top-1').locator('.dice')).toHaveAttribute('data-total', '24');
          const s = await state(page);
          expect(s.awaiting).toMatchObject({ seat: 'top-1', count: 4, rolled: [{ values: [6, 6, 6, 6] }] });
          expect((await events(page)).filter((e) => e.type === 'dice/rolled').map((e) => e.payload)).toEqual([{ seat: 'bottom-1', values: [6, 6, 6, 6] }]);
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    await tap(page, 'die-face-1-top-1', 3);

    await steps.step('three-faces-tapped', {
      description: 'top-1 has no dice in front of the camera and taps the faces instead: three ones so far, shown beside the faces, a fourth will send the throw',
      verifications: [
        { spec: 'Three taps are counted and shown; the throw is not yet in', check: async () => {
          await expect(page.getByTestId('dice-taps-top-1')).toHaveAttribute('data-count', '3');
          await expect(page.getByTestId('dice-taps-top-1').locator('.dice')).toHaveAttribute('data-total', '3');
          await expect(page.getByTestId('dice-clear-top-1')).toBeEnabled();
          expect((await state(page)).awaiting).toMatchObject({ seat: 'top-1' });
        } }
      ]
    });

    await page.getByTestId('die-face-1-top-1').click();
    await expect(page.getByTestId('turn-marker-bottom-1')).toHaveAttribute('data-current', 'true');

    await steps.step('game-started', {
      description: 'The fourth tap sends four ones: bottom-1 plays first, the roll for first player is in each log, and the table is free again',
      verifications: [
        { spec: 'Nothing is awaited, the game is in round 1 with bottom-1 first, and both throws are in the log', check: async () => {
          const s = await state(page);
          expect(s.awaiting).toBeNull();
          expect(s.turn).toMatchObject({ current: 'bottom-1', round: 1 });
          expect(s.rollOff).toEqual({ 'bottom-1': [[6, 6, 6, 6]], 'top-1': [[1, 1, 1, 1]] });
          await expect(page.getByTestId('dice-scrim')).toHaveCount(0);
          await expect(page.getByTestId('roll-first-player-top-1')).toHaveAttribute('data-total', '4');
          await withLogOpen(page, 'bottom-1', async () => {
            await expect(page.getByTestId('roll-first-player-bottom-1')).toHaveAttribute('data-total', '24');
          });
        } }
      ]
    });

    // To Africa: a free ticket to Mombasa, the turn at sea, the landing and a foot expedition; none of it rolls dice.
    await page.getByTestId('sail-bottom-1').click();
    await expect(page.getByTestId('port-mombasa')).toHaveAttribute('data-fare', 'ticket');
    await page.getByTestId('choose-port-mombasa').click();
    await page.getByTestId('confirm-sail-bottom-1').click();
    await endTurn(page, 'bottom-1');
    await expect(page.getByTestId('turn-marker-top-1')).toHaveAttribute('data-current', 'true');
    // The turn at sea is skipped, so the marker comes straight back to top-1 once the explorer has landed.
    await endTurn(page, 'top-1');
    await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c25r12');
    await endTurn(page, 'top-1');
    await expect(page.getByTestId('expedition-chart-bottom-1')).toBeVisible();
    await tap(page, 'buy-askaris-bottom-1', 5);
    await page.getByTestId('chart-step-10-bottom-1').click();
    await tap(page, 'buy-bearers-bottom-1', 1);
    await tap(page, 'buy-food-bottom-1', 10);
    await page.getByTestId('chart-step-1-bottom-1').click();
    await tap(page, 'buy-bearers-bottom-1', 5);
    await page.getByTestId('confirm-outfit-bottom-1').click();
    await page.getByTestId('confirm-outfit-yes-bottom-1').click();
    await expect(page.getByTestId('chart-summary-bottom-1')).toBeVisible();
    await page.getByTestId('move-target-c24r12').click();
    await expect(page.getByTestId('dice-edge-bottom-1')).toBeVisible();

    await steps.step('lost-check-asked', {
      description: 'The first step into a blank hex: the table asks for the lost check in the rules\' words, with the die it takes to find the way out of veldt',
      verifications: [
        { spec: 'The ask is the lost check with its threshold; the step is held until the die is rolled', check: async () => {
          await expect(page.getByTestId('dice-ask-bottom-1')).toHaveText("Roll a D6 to see if you are lost; 2+ means you're okay");
          await expect(page.getByTestId('dicecam-status-bottom-1')).toHaveText('Watching the dicecam for one die');
          await expect(page.getByTestId('dice-taps-bottom-1')).toHaveCount(0);
          const s = await state(page);
          expect(s.awaiting).toMatchObject({ seat: 'bottom-1', count: 1, rolled: [] });
          expect(s.awaiting!.event).toMatchObject({ type: 'expedition/moved', payload: { seat: 'bottom-1', path: ['c24r12'] } });
          await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c25r12');
        } }
      ]
    });

    await dicecamReads(page, 'throw-2', [1]);
    await expect(page.getByTestId('dice-edge-bottom-1')).toHaveCount(0);

    await steps.step('lost', {
      description: 'The dicecam reads a one: the expedition is lost for the turn, the check is the rail\'s latest line with the die that was rolled',
      verifications: [
        { spec: 'The lost check is logged with the physical die and the expedition stayed put', check: async () => {
          const s = await state(page);
          expect(s.awaiting).toBeNull();
          expect(s.turn!.log.at(-1)).toMatchObject({ kind: 'lost-check', lost: true, rolls: [{ label: 'lost check', value: 1 }] });
          await expect(page.getByTestId('roll-lost-check-bottom-1')).toHaveAttribute('data-lost', 'true');
          await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c25r12');
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    await endTurn(page, 'bottom-1');
    await expect(page.getByTestId('turn-marker-top-1')).toHaveAttribute('data-current', 'true');
    await endTurn(page, 'top-1');
    await expect(page.getByTestId('turn-marker-bottom-1')).toHaveAttribute('data-current', 'true');
    await page.getByTestId('move-target-c24r12').click();
    await expect(page.getByTestId('dice-ask-bottom-1')).toHaveText("Roll a D6 to see if you are lost; 2+ means you're okay");
    await dicecamReads(page, 'throw-3', [4]);
    await expect(page.getByTestId('dice-ask-bottom-1')).toHaveText('Roll a D6 for the direction of the terrain to copy; a mapped neighbour in that direction is copied');

    await steps.step('terrain-asked', {
      description: 'Next turn the way is found on a four, and the same step goes straight on to the next roll: the direction of the terrain to copy, with the lost check listed as already rolled',
      verifications: [
        { spec: 'The step is still held, now at the terrain roll, and its lost check is listed above the dicecam line', check: async () => {
          const s = await state(page);
          expect(s.awaiting).toMatchObject({ seat: 'bottom-1', count: 1, rolled: [{ prompt: "Roll a D6 to see if you are lost; 2+ means you're okay", values: [4] }] });
          await expect(page.getByTestId('dice-so-far-bottom-1').locator('li')).toHaveCount(1);
          await expect(page.getByTestId('dice-so-far-bottom-1')).toContainText('to see if you are lost');
          await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c25r12');
        } }
      ]
    });

    // Direction 2 points at Mombasa's veldt; an odd roll finds no river source; 3 + 3 is not a natives number for veldt.
    await page.getByTestId('die-face-2-bottom-1').click();
    await expect(page.getByTestId('dice-ask-bottom-1')).toHaveText('Roll a D6 for a river source; an even roll means a river rises here');
    await page.getByTestId('die-face-1-bottom-1').click();
    await expect(page.getByTestId('dice-ask-bottom-1')).toHaveText('Roll 2 D6 for natives; natives on 2, 3, 4');
    await dicecamReads(page, 'throw-4', [3, 3]);
    await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c24r12');

    await steps.step('mapped', {
      description: 'A tapped two copies the veldt of Mombasa, a tapped one finds no river, and the dicecam\'s three and three find no natives: the hex is mapped and the expedition stands on it, every roll of the step in the log',
      verifications: [
        { spec: 'The hex is veldt with the expedition on it; the log holds the lost check, the terrain, the water and the natives with the dice rolled', check: async () => {
          const s = await state(page);
          expect(s.awaiting).toBeNull();
          expect(s.map['c24r12']).toMatchObject({ terrain: 'veldt', river: null, tribe: null });
          const log = s.turn!.log.filter((r) => r.kind !== 'action');
          expect(log.map((r) => [r.kind, r.rolls.map((x) => x.value)])).toEqual([
            ['lost-check', [4]],
            ['terrain', [2]],
            ['water', [1]],
            ['natives', [3, 3]]
          ]);
          await expect(page.getByTestId('roll-natives-bottom-1')).toHaveAttribute('data-outcome', 'no natives');
          await withLogOpen(page, 'bottom-1', async () => {
            await expect(page.getByTestId('roll-terrain-bottom-1').last()).toHaveAttribute('data-outcome', 'mapped veldt (as the neighbour)');
          });
        } },
        { spec: 'Every throw of the game is a dice/rolled event, seven so far, and nothing was refused', check: async () => {
          const rolled = (await events(page)).filter((e) => e.type === 'dice/rolled').map((e) => (e.payload as { values: number[] }).values);
          expect(rolled).toEqual([[6, 6, 6, 6], [1, 1, 1, 1], [1], [4], [2], [1], [3, 3]]);
          expect((await state(page)).diagnostics).toEqual([]);
        } }
      ]
    });

    const before = await state(page);
    await page.reload();
    await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c24r12');

    await steps.step('persists-after-reload', {
      description: 'After a reload the log replays the same game from the recorded throws: the same map, the same log, physical dice still on and the dicecam back in its corner',
      verifications: [
        { spec: 'The state is the same as before the reload and the dicecam frame is up again', check: async () => {
          const after = await state(page);
          expect(after.map).toEqual(before.map);
          expect(after.turn).toEqual(before.turn);
          expect(after.history).toEqual(before.history);
          expect(after.rng).toEqual(before.rng);
          expect(after.awaiting).toBeNull();
          await expect(page.getByTestId('dicecam-dock')).toBeVisible();
          await expect(page.getByTestId('physical-dice')).toHaveCount(0);
        } }
      ]
    });

    steps.generateDocs();
  });
});
