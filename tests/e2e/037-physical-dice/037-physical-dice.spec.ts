import { test, expect, type Page } from '@playwright/test';
import { TestStepHelper } from '../helpers/test-step-helper';
import { takeCards } from '../helpers/cards';
import { endTurnFromRail } from '../helpers/turn';
import { withLogOpen } from '../helpers/log';
import { dicecamReads, dicecamSays, settled, TRAY } from '../helpers/dicecam';

async function commission(page: Page, seat: string) {
  await page.getByTestId(`seat-join-${seat}`).click();
  await page.getByTestId(`commission-${seat}`).click();
  await expect(page.getByTestId(`explorer-token-${seat}`)).toBeVisible();
}
const state = (page: Page) => page.evaluate(() => window.__TABLETOP__!.getState());
const events = (page: Page) => page.evaluate(() => window.__TABLETOP__!.getEvents());
async function endTurn(page: Page, seat: string) {
  await endTurnFromRail(page, seat);
}
async function tap(page: Page, id: string, times: number) {
  for (let i = 0; i < times; i++) await page.getByTestId(id).click();
}
/** Tap the dicecam's picture at a point given in the camera frame's own pixels (the frame is letterboxed; the dock is parked, unturned). */
async function tapTray(page: Page, x: number, y: number) {
  const canvas = page.getByTestId('dicecam-canvas');
  const box = (await canvas.boundingBox())!;
  const scale = Math.min(box.width / TRAY.width, box.height / TRAY.height);
  await canvas.click({ position: { x: (box.width - TRAY.width * scale) / 2 + x * scale, y: (box.height - TRAY.height * scale) / 2 + y * scale } });
}
/** The colours of the dicecam's canvas at points given in the camera frame's own pixels (the frame is letterboxed). */
async function sample(page: Page, points: Record<string, [number, number]>): Promise<Record<string, number[]>> {
  return page.getByTestId('dicecam-canvas').evaluate((c: HTMLCanvasElement, { points, frame }) => {
    const ctx = c.getContext('2d')!;
    const scale = Math.min(c.width / frame.width, c.height / frame.height);
    const ox = (c.width - frame.width * scale) / 2;
    const oy = (c.height - frame.height * scale) / 2;
    const out: Record<string, number[]> = {};
    for (const [name, [x, y]] of Object.entries(points)) {
      out[name] = Array.from(ctx.getImageData(Math.round(ox + x * scale), Math.round(oy + y * scale), 1, 1).data.slice(0, 3));
    }
    return out;
  }, { points, frame: { width: TRAY.width, height: TRAY.height } });
}
function expectColour(got: number[], want: number[], within = 6) {
  for (let i = 0; i < 3; i++) expect(Math.abs(got[i] - want[i]), `channel ${i} of ${got} vs ${want}`).toBeLessThanOrEqual(within);
}
test.describe('037 - Physical dice', () => {
  test('with physical dice on, the table asks for every roll in the rules\' words, the dicecam or a tapped face answers, and the game goes on', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'Physical dice',
      'The options screen turns physical dice on: from then on the table rolls nothing itself. Whenever a rule calls for dice the game stands still and the seat whose roll it is reads what to roll and why at its edge ("Roll a D6 to see if you are lost; 2+ means you\'re okay"), with the throws already made for the same action. The dicecam in the corner of the board shows the table\'s camera on a canvas, the tray and the dice as WebCamTool\'s engine reads them drawn over the picture; two agreeing readings enter the roll, each die judged on its own so a die tossed in beside those already lying there is the throw, and a tap on one of the six faces enters it by hand. Each roll becomes a dice/rolled event, so the log replays the same game. The roll for first player, a lost check, the terrain, a river source and the natives are rolled this way in one game. Every ask after the first shows what the dice before it decided, and once the last die of an action is in, what the dice decided stays at the seat\'s edge for two seconds before the table goes on (prompts 54 to 56).'
    );

    // Seed 34: with the roll for first player made at the table (reading no generator dice), bottom-1's opening hand
    // holds a free ticket to Mombasa and $1000, and the first card drawn in the field does not apply there, so the
    // expedition is free to try the unknown again. Every die of the scenario is rolled below.
    await page.goto('/table/?new=1&gameId=ABCDE&seed=34&first-player-pause=hold');
    await page.getByTestId('options-se').click();
    await expect(page.getByTestId('physical-dice')).toHaveAttribute('aria-pressed', 'false');
    await page.getByTestId('physical-dice').click();

    await expect(page.getByTestId('dicecam-dock')).toHaveAttribute('data-status', 'active');
    await dicecamSays(page, { type: 'roi', roi: { detected: true, polygon: TRAY.floor, confidence: 0.93 } });
    await expect.poll(async () => Number(await page.getByTestId('dicecam-dock').getAttribute('data-frames'))).toBeGreaterThan(2);

    await steps.step('physical-dice-on', {
      description: 'The options screen has a dice section: "Physical dice" is switched on, and the dicecam appears in the south-west corner of the board: the table\'s camera on a canvas, its picture of the tray with the tray\'s floor outlined as the engine finds it',
      verifications: [
        { spec: 'The toggle is on and the state says so; the game records it as a dice/physical event', check: async () => {
          await expect(page.getByTestId('physical-dice')).toHaveAttribute('aria-pressed', 'true');
          await expect(page.getByTestId('physical-dice-state')).toHaveText('on');
          expect((await state(page)).rng).toMatchObject({ physical: true });
          expect((await events(page)).filter((e) => e.type === 'dice/physical').map((e) => e.payload)).toEqual([{ on: true }]);
        } },
        { spec: 'The dicecam is active: the camera streams, the engine is up and takes the frames, the tray is settled, and the canvas shows the camera\'s picture', check: async () => {
          const dock = page.getByTestId('dicecam-dock');
          await expect(dock).toHaveAttribute('data-status', 'active');
          await expect(dock).toHaveAttribute('data-motion', 'settled');
          await expect(page.getByTestId('dicecam-note')).toHaveCount(0);
          await expect(page.getByTestId('dicecam-motion')).toHaveText('settled');
          // The canvas carries the camera's frame, letterboxed: the felt at its corner, the brown rim, and the dark
          // floor in its middle under the engine's orange wash of the tray it found (the camera's colours within a
          // few steps, the picture having been through the camera's YUV).
          const pixels = await sample(page, { felt: [20, 20], rim: [48, 180], floor: [320, 180] });
          expectColour(pixels.felt, [46, 72, 52]);
          expectColour(pixels.rim, [120, 86, 52]);
          expectColour(pixels.floor, [55, 41, 36]);
        } }
      ]
    });

    await page.getByTestId('options-close').click();
    await commission(page, 'bottom-1');
    await commission(page, 'top-1');
    await page.getByTestId('start-game').click();
    await expect(page.getByTestId('dice-edge-bottom-1')).toBeVisible();

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
        { spec: 'The dicecam is active and watching for four dice, brought to the middle of the board; the faces wait for four taps; the rest of the table is held', check: async () => {
          await expect(page.getByTestId('dicecam-status-bottom-1')).toHaveText('Watching the dicecam for 4 dice');
          await expect(page.getByTestId('dicecam-dock')).toHaveAttribute('data-status', 'active');
          await expect(page.getByTestId('dicecam-place')).toHaveAttribute('data-centred', 'true');
          await expect(page.getByTestId('dice-taps-bottom-1')).toHaveAttribute('data-count', '0');
          await expect(page.locator('[data-testid^="die-face-"][data-testid$="-bottom-1"]')).toHaveCount(6);
          await expect(page.getByTestId('dice-scrim')).toBeVisible();
        } }
      ]
    });

    // The engine's first reading of the run is of the dice lying in the tray from before the game.
    await dicecamSays(page, settled('lying', [2, 2, 2, 2]));
    await expect(page.getByTestId('dice-prompt-bottom-1')).toHaveAttribute('data-stale', 'true');

    await steps.step('tray-as-found', {
      description: 'The engine\'s first reading is of four twos lying in the tray from before the game: the table takes them for the tray as found, not for the throw, draws them on the picture and waits for a roll',
      verifications: [
        { spec: 'The reading is not taken: the prompt waits for a roll of four dice, none of the four counted as thrown, the dock holds the reading, and nothing is rolled', check: async () => {
          await expect(page.getByTestId('dicecam-status-bottom-1')).toHaveText('Waiting for a roll of 4 D6');
          await expect(page.getByTestId('dice-prompt-bottom-1')).toHaveAttribute('data-seen', '0');
          await expect(page.getByTestId('dicecam-dock')).toHaveAttribute('data-readings', '1');
          expect((await state(page)).awaiting).toMatchObject({ seat: 'bottom-1', rolled: [] });
          expect((await events(page)).filter((e) => e.type === 'dice/rolled')).toEqual([]);
        } }
      ]
    });

    // The dice are thrown: the engine sees them move, then reads the settled tray.
    await dicecamSays(page, { type: 'rolling' });
    await dicecamSays(page, settled('throw-1', [6, 6, 6, 6]));
    await expect(page.getByTestId('dice-prompt-bottom-1')).toHaveAttribute('data-stale', 'false');

    await steps.step('tray-read-once', {
      description: 'The dice are thrown and the engine reads the settled tray: four sixes, each die outlined on the picture with its value above it and its confidence along its foot, the way the Yahtzee page draws them; one reading is not enough, the table waits for a second that agrees',
      verifications: [
        { spec: 'The prompt says four dice are seen and their faces are being read; the dock holds two readings and the throw is not yet taken', check: async () => {
          await expect(page.getByTestId('dicecam-status-bottom-1')).toHaveText('4 dice thrown, reading the faces…');
          await expect(page.getByTestId('dicecam-dock')).toHaveAttribute('data-readings', '2');
          expect((await state(page)).awaiting).toMatchObject({ seat: 'bottom-1', rolled: [] });
          expect((await events(page)).filter((e) => e.type === 'dice/rolled')).toEqual([]);
        } },
        { spec: 'The overlay is drawn on the canvas: the green of a die\'s face where the first die lies, the label\'s dark box above it', check: async () => {
          // The label's box sits 8 pixels above the die, as tall as its type (0.4 of the die) plus padding: a row
          // through its middle crosses the dark box and the white glyph.
          const labelMid = TRAY.y - TRAY.size / 2 - 8 - (TRAY.size * 0.4 + 4) / 2;
          const row: Record<string, [number, number]> = {};
          for (let i = -4; i <= 4; i++) row[`label${i}`] = [TRAY.dice[0] + i * 4, labelMid];
          const pixels = await sample(page, { face: [TRAY.dice[0], TRAY.y - 10], ...row });
          // The white die under a green wash reads greenish; the label row holds near-black and near-white.
          expect(pixels.face[1]).toBeGreaterThan(pixels.face[0]);
          expect(pixels.face[1]).toBeGreaterThan(pixels.face[2]);
          const brightness = Object.keys(row).map((k) => Math.max(...pixels[k]));
          expect(Math.min(...brightness)).toBeLessThan(60);
          expect(Math.max(...brightness)).toBeGreaterThan(200);
        } }
      ]
    });

    await dicecamSays(page, settled('throw-1', [6, 6, 6, 6]));
    await expect(page.getByTestId('dice-edge-top-1')).toBeVisible();

    await steps.step('first-throw-read', {
      description: 'The dicecam reads four sixes twice over and the throw is in: bottom-1\'s four sixes and their total stand in front of bottom-1\'s own station, and the ask moves to top-1',
      verifications: [
        { spec: 'bottom-1\'s four sixes are a dice/rolled event, shown at bottom-1\'s station and not in top-1\'s prompt; the ask is now top-1\'s', check: async () => {
          await expect(page.getByTestId('dice-ask-top-1')).toHaveText('Roll 4 D6 for first player; the highest total goes first');
          await expect(page.getByTestId('first-player-roll-bottom-1')).toHaveAttribute('data-total', '24');
          await expect(page.getByTestId('first-player-roll-bottom-1')).toHaveAttribute('data-decided', 'false');
          await expect(page.getByTestId('first-player-edge-bottom-1')).toHaveAttribute('data-seat', 'bottom-1');
          await expect(page.getByTestId('first-player-roll-top-1')).toHaveCount(0);
          await expect(page.getByTestId('dice-so-far-top-1')).toHaveCount(0);
          const s = await state(page);
          expect(s.awaiting).toMatchObject({ seat: 'top-1', count: 4, rolled: [{ values: [6, 6, 6, 6] }] });
          // The throw carries where each die lay when the dicecam read it (prompt 37), so a tap on the picture finds its die.
          expect((await events(page)).filter((e) => e.type === 'dice/rolled').map((e) => e.payload)).toEqual([{ seat: 'bottom-1', values: [6, 6, 6, 6], lay: [0, 1, 2, 3].map((i) => ({ x: TRAY.dice[i] / TRAY.width, y: TRAY.y / TRAY.height })) }]);
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
    await expect(page.getByTestId('first-player-scrim')).toBeVisible();

    await steps.step('first-player-decided', {
      description: 'The fourth tap sends four ones and the first player is decided: each station holds its own roll, bottom-1\'s twenty-four glowing as first player over top-1\'s four, and the table stands still for a few seconds before play begins',
      verifications: [
        { spec: 'Both rolls stand at their stations, bottom-1\'s as the winner; the game is held at the roll', check: async () => {
          const s = await state(page);
          expect(s.awaiting).toBeNull();
          expect(s.starting).toBe('bottom-1');
          expect(s.rollOff).toEqual({ 'bottom-1': [[6, 6, 6, 6]], 'top-1': [[1, 1, 1, 1]] });
          await expect(page.getByTestId('first-player-roll-bottom-1')).toHaveAttribute('data-winner', 'true');
          await expect(page.getByTestId('first-player-roll-bottom-1')).toHaveAttribute('data-total', '24');
          await expect(page.getByTestId('first-player-roll-top-1')).toHaveAttribute('data-winner', 'false');
          await expect(page.getByTestId('first-player-roll-top-1')).toHaveAttribute('data-total', '4');
          await expect(page.getByTestId('dice-scrim')).toHaveCount(0);
        } }
      ]
    });

    await page.evaluate(() => window.__TABLETOP__!.append('game/begun', {}));
    await expect(page.getByTestId('turn-marker-bottom-1')).toHaveAttribute('data-current', 'true');
    await takeCards(page); // the hands dealt wait in full at the edges (prompt 44)

    await steps.step('game-started', {
      description: 'Play begins: bottom-1 plays first, the roll for first player is one line in each log with both throws and who went first, and the table is free again',
      verifications: [
        { spec: 'Nothing is awaited, the game is in round 1 with bottom-1 first, and the roll is one line in both logs', check: async () => {
          const s = await state(page);
          expect(s.awaiting).toBeNull();
          expect(s.starting).toBeNull();
          expect(s.turn).toMatchObject({ current: 'bottom-1', round: 1 });
          expect(s.rollOff).toEqual({ 'bottom-1': [[6, 6, 6, 6]], 'top-1': [[1, 1, 1, 1]] });
          await expect(page.getByTestId('dice-scrim')).toHaveCount(0);
          await expect(page.getByTestId('first-player-scrim')).toHaveCount(0);
          await expect(page.getByTestId('roll-first-player-top-1')).toHaveAttribute('data-outcome', 'bottom-1 first');
          await expect(page.getByTestId('first-player-bottom-1-top-1')).toHaveAttribute('data-total', '24');
          await withLogOpen(page, 'bottom-1', async () => {
            await expect(page.getByTestId('roll-first-player-bottom-1')).toHaveAttribute('data-outcome', 'bottom-1 first');
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
      description: 'The dicecam reads a one: the expedition is lost and its turn ends there and then; at a port there is no hunt. The ask stays at the edge for a moment as the result (prompt 56): the check with the die, what it needed, and the notice that no hunting was needed at Mombasa; the same line is the rail\'s latest',
      verifications: [
        { spec: 'The result panel is titled by the ask and holds the one line, lost, while the turn has already passed', check: async () => {
          await expect(page.getByTestId('dice-result-bottom-1')).toBeVisible();
          await expect(page.getByTestId('dice-result-title-bottom-1')).toHaveText('To see if you are lost');
          await expect(page.getByTestId('dice-result-bottom-1')).toHaveAttribute('data-lines', '1');
          await expect(page.getByTestId('result-lost-check-note-bottom-1')).toHaveText('lost; no hunting needed at Mombasa');
        } },
        { spec: 'The lost check is logged with the physical die and the notice, the expedition stayed put, and the turn passed to top-1', check: async () => {
          const s = await state(page);
          expect(s.awaiting).toBeNull();
          expect(s.turn!.current).toBe('top-1');
          expect(s.history.filter((t) => t.seat === 'bottom-1').at(-1)!.log.at(-1)).toMatchObject({ kind: 'lost-check', lost: true, needed: '2+', rolls: [{ label: 'lost check', value: 1 }], outcome: 'lost; no hunting needed at Mombasa' });
          await expect(page.getByTestId('roll-lost-check-bottom-1')).toHaveAttribute('data-lost', 'true');
          await expect(page.getByTestId('lost-check-needed-bottom-1')).toHaveText('needs 2+');
          await expect(page.getByTestId('lost-check-note-bottom-1')).toHaveText('lost; no hunting needed at Mombasa');
          await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c25r12');
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    await page.getByTestId('dice-result-ok-bottom-1').click();
    await expect(page.getByTestId('dice-result-bottom-1')).toHaveCount(0);
    await endTurn(page, 'top-1');
    await expect(page.getByTestId('turn-marker-bottom-1')).toHaveAttribute('data-current', 'true');
    await page.getByTestId('move-target-c24r12').click();
    await expect(page.getByTestId('dice-ask-bottom-1')).toHaveText("Roll a D6 to see if you are lost; 2+ means you're okay");
    await dicecamReads(page, 'throw-3', [4]);
    await expect(page.getByTestId('dice-ask-bottom-1')).toHaveText('Roll a D6 for the direction of the terrain to copy; a mapped neighbour in that direction is copied');

    await steps.step('terrain-asked', {
      description: 'Next turn the way is found on a four, and the same step goes straight on to the next roll: the direction of the terrain to copy, with the lost check listed as already rolled, its verdict on the same line, and the compass on the board to read the direction from',
      verifications: [
        { spec: 'The step is still held, now at the terrain roll, and its lost check is listed above the dicecam line as a log line: the die and "found the way"', check: async () => {
          const s = await state(page);
          expect(s.awaiting).toMatchObject({ seat: 'bottom-1', count: 1, rolled: [{ prompt: "Roll a D6 to see if you are lost; 2+ means you're okay", values: [4] }] });
          expect(s.awaiting!.sofar).toEqual([expect.objectContaining({ kind: 'lost-check', lost: false, outcome: 'found the way' })]);
          await expect(page.getByTestId('dice-so-far-bottom-1').locator('li')).toHaveCount(1);
          await expect(page.getByTestId('so-far-roll-lost-check-bottom-1')).toHaveAttribute('data-outcome', 'found the way');
          await expect(page.getByTestId('so-far-lost-check-note-bottom-1')).toHaveText('found the way');
          await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c25r12');
        } },
        { spec: 'The compass on the board gives the six directions as the die names them, 1 at the north-east round to 6 at the north-west', check: async () => {
          await expect(page.getByTestId('compass')).toBeVisible();
          for (const d of [1, 2, 3, 4, 5, 6]) await expect(page.getByTestId(`compass-${d}`)).toHaveText(String(d));
        } }
      ]
    });

    // Direction 2 points at Mombasa's veldt; an odd roll finds no river source; 3 + 3 is not a natives number for veldt.
    await page.getByTestId('die-face-2-bottom-1').click();
    await expect(page.getByTestId('dice-ask-bottom-1')).toHaveText('Roll a D6 for a river source; an even roll means a river rises here');
    // Each ask lists the lines so far (prompt 56): the terrain's says which direction was rolled and what was copied.
    await expect(page.getByTestId('dice-so-far-bottom-1').locator('li')).toHaveCount(2);
    await expect(page.getByTestId('so-far-terrain-note-bottom-1')).toHaveText('mapped veldt: veldt copied from the neighbour in direction 2');
    await page.getByTestId('die-face-1-bottom-1').click();
    await expect(page.getByTestId('dice-ask-bottom-1')).toHaveText('Roll 2 D6 for natives; natives on 2, 3, 4');
    await expect(page.getByTestId('so-far-water-note-bottom-1')).toHaveText('1 is odd: no river');
    await dicecamReads(page, 'throw-4', [3, 3]);
    await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c24r12');

    await steps.step('step-explained', {
      description: 'The last dice of the step are in and the hex is mapped, but the ask stays at bottom-1\'s edge for a moment with what every die of the step decided (prompt 56): the way found on a four, the veldt copied from direction 2, the one that is odd so no river, and the three and three that find no natives; a tap, or two seconds, and the table goes on',
      verifications: [
        { spec: 'The result panel is titled by the last ask and holds the four lines of the step, each explained; the dice prompt is gone', check: async () => {
          await expect(page.getByTestId('dice-result-bottom-1')).toBeVisible();
          await expect(page.getByTestId('dice-result-title-bottom-1')).toHaveText('Natives');
          await expect(page.getByTestId('dice-result-bottom-1')).toHaveAttribute('data-lines', '4');
          await expect(page.getByTestId('result-lost-check-note-bottom-1')).toHaveText('found the way');
          await expect(page.getByTestId('result-terrain-note-bottom-1')).toHaveText('mapped veldt: veldt copied from the neighbour in direction 2');
          await expect(page.getByTestId('result-water-note-bottom-1')).toHaveText('1 is odd: no river');
          await expect(page.getByTestId('result-natives-note-bottom-1')).toHaveText('no natives (3 + 3 = 6)');
          await expect(page.getByTestId('result-natives-needed-bottom-1')).toHaveText('needs 2, 3, 4');
          await expect(page.getByTestId('dice-prompt-bottom-1')).toHaveCount(0);
        } }
      ]
    });
    await page.getByTestId('dice-result-ok-bottom-1').click();
    await expect(page.getByTestId('dice-result-bottom-1')).toHaveCount(0);

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
          await expect(page.getByTestId('roll-natives-bottom-1')).toHaveAttribute('data-outcome', 'no natives (3 + 3 = 6)');
          await withLogOpen(page, 'bottom-1', async () => {
            await expect(page.getByTestId('roll-terrain-bottom-1').last()).toHaveAttribute('data-outcome', 'mapped veldt: veldt copied from the neighbour in direction 2');
          });
        } },
        { spec: 'Every throw of the game is a dice/rolled event, seven so far, and nothing was refused', check: async () => {
          const rolled = (await events(page)).filter((e) => e.type === 'dice/rolled').map((e) => (e.payload as { values: number[] }).values);
          expect(rolled).toEqual([[6, 6, 6, 6], [1, 1, 1, 1], [1], [4], [2], [1], [3, 3]]);
          expect((await state(page)).diagnostics).toEqual([]);
        } }
      ]
    });

    // The turn ends in the field: the hunt's die is asked for; top-1 waits in Europe; bottom-1 tries the unknown again.
    await endTurn(page, 'bottom-1');
    await expect(page.getByTestId('dice-ask-bottom-1')).toHaveText('Roll a D6 for the hunt; the die bags one ration per hunter at 2, two at 4, three at 6');
    await dicecamReads(page, 'throw-5', [5]);
    await expect(page.getByTestId('turn-marker-top-1')).toHaveAttribute('data-current', 'true');
    // The hunt's result stays in view (prompt 54) until tapped away; the second hunt below shows it as a step.
    await expect(page.getByTestId('result-meal-note-bottom-1')).toContainText('two per hunter: 12 rations bagged');
    await page.getByTestId('dice-result-ok-bottom-1').click();
    await expect(page.getByTestId('dice-result-bottom-1')).toHaveCount(0);
    await endTurn(page, 'top-1');
    await expect(page.getByTestId('turn-marker-bottom-1')).toHaveAttribute('data-current', 'true');
    await page.getByTestId('move-target-c24r11').click();
    await expect(page.getByTestId('dice-ask-bottom-1')).toHaveText("Roll a D6 to see if you are lost; 2+ means you're okay");
    await dicecamReads(page, 'throw-6', [1]);
    await expect(page.getByTestId('dice-ask-bottom-1')).toHaveText('Roll a D6 for the hunt; the die bags one ration per hunter at 2, two at 4, three at 6');

    await steps.step('straight-to-the-hunt', {
      description: 'Lost in the field, the expedition can do nothing more this turn: the table goes straight on to the hunt, the lost check listed above the dicecam line as already rolled and lost',
      verifications: [
        { spec: 'The same step is held at the hunt roll, with the lost check already rolled and its line saying lost; the token stayed where it was', check: async () => {
          const s = await state(page);
          expect(s.awaiting).toMatchObject({ seat: 'bottom-1', count: 1, rolled: [{ prompt: "Roll a D6 to see if you are lost; 2+ means you're okay", values: [1] }] });
          expect(s.awaiting!.event.type).toBe('expedition/moved');
          await expect(page.getByTestId('dice-so-far-bottom-1').locator('li')).toHaveCount(1);
          await expect(page.getByTestId('so-far-roll-lost-check-bottom-1')).toHaveAttribute('data-lost', 'true');
          await expect(page.getByTestId('so-far-lost-check-note-bottom-1')).toHaveText('lost');
          await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c24r12');
        } }
      ]
    });

    // A hand reaching in moved nothing: the engine names the same lie a new throw, and the table knows better.
    await dicecamSays(page, settled('throw-7', [1]));
    await expect(page.getByTestId('dice-prompt-bottom-1')).toHaveAttribute('data-stale', 'true');

    await steps.step('last-throw-still-lying', {
      description: 'The die of the lost check still lies in the tray and the engine reports it under a new name: the table remembers where the last throw lay and what it showed, and waits for a roll instead of reading it again',
      verifications: [
        { spec: 'The reading is ignored: the status line waits for a D6 roll, no throw is taken and the hunt is still asked', check: async () => {
          await expect(page.getByTestId('dicecam-status-bottom-1')).toHaveText('Waiting for a D6 roll');
          await expect(page.getByTestId('dice-ask-bottom-1')).toHaveText('Roll a D6 for the hunt; the die bags one ration per hunter at 2, two at 4, three at 6');
          const rolled = (await events(page)).filter((e) => e.type === 'dice/rolled').map((e) => (e.payload as { values: number[] }).values);
          expect(rolled.at(-1)).toEqual([1]);
          expect((await state(page)).awaiting).toMatchObject({ seat: 'bottom-1', rolled: [{ values: [1] }] });
        } }
      ]
    });

    // A second die is tossed in from outside the picture beside the lost die, which stays where it lay, and the
    // engine misses the motion: it still calls the tray by the lost die's name. The table judges each die on its
    // own (prompt 36): the one resting where it lay is not the throw, the five beside it is.
    await dicecamReads(page, 'throw-6', [1, 5], 1, { moved: false });
    await expect(page.getByTestId('turn-marker-top-1')).toHaveAttribute('data-current', 'true');

    await steps.step('hunt-explained', {
      description: 'The hunt\'s die is in and the turn has passed, but the ask stays at bottom-1\'s edge for a moment with what the dice decided (prompt 54): the lost check that led to the hunt and the meal, every number explained, the five giving two rations per hunter, so the five askaris and the explorer bag twelve and the stores make up the rest; the table waits for a tap or two seconds before going on',
      verifications: [
        { spec: 'The result panel is titled The hunt and holds two lines, the lost check and the hunt; the hunt\'s line opens with the rate per hunter, then the rations bagged, the men fed and the stores drawn on; the dice prompt is gone and the turn is already top-1\'s', check: async () => {
          await expect(page.getByTestId('dice-result-bottom-1')).toBeVisible();
          await expect(page.getByTestId('dice-result-title-bottom-1')).toHaveText('The hunt');
          await expect(page.getByTestId('dice-result-bottom-1')).toHaveAttribute('data-lines', '2');
          await expect(page.getByTestId('result-roll-lost-check-bottom-1')).toBeVisible();
          await expect(page.getByTestId('result-meal-note-bottom-1')).toContainText('two per hunter: 12 rations bagged, ');
          await expect(page.getByTestId('result-meal-note-bottom-1')).toContainText('from the stores)');
          await expect(page.getByTestId('result-meal-total-bottom-1')).toHaveCount(0); // no modifier at this camp: the die stands alone
          await expect(page.getByTestId('dice-prompt-bottom-1')).toHaveCount(0);
          expect((await state(page)).turn!.current).toBe('top-1');
        } }
      ]
    });
    await page.getByTestId('dice-result-ok-bottom-1').click();
    await expect(page.getByTestId('dice-result-bottom-1')).toHaveCount(0);

    await steps.step('hunted-and-passed', {
      description: 'A second die tossed in beside the lost die, under the lost die\'s own name (the engine missed the toss), is the hunt: the one resting where it lay is left out and the five beside it is taken; the meal closes the turn and it passes to top-1; bottom-1\'s rail reads the hunt with what it needed, and keeps the lost mark',
      verifications: [
        { spec: 'The turn is top-1\'s; bottom-1\'s latest turn holds the lost check and the hunt on a five, the hunt\'s line saying what the die needed', check: async () => {
          const s = await state(page);
          expect(s.turn!.current).toBe('top-1');
          expect((await events(page)).filter((e) => e.type === 'dice/rolled').map((e) => (e.payload as { values: number[] }).values).at(-1)).toEqual([5]);
          const played = s.history.filter((t) => t.seat === 'bottom-1').at(-1)!;
          expect(played.log.filter((r) => r.kind !== 'action').map((r) => [r.kind, r.rolls.map((x) => x.value)])).toEqual([['disaster', []], ['lost-check', [1]], ['hunting', [5]]]);
          await expect(page.getByTestId('roll-hunting-bottom-1')).toHaveAttribute('data-needed', '2 / 4 / 6 for one, two, three per hunter');
          await expect(page.getByTestId('meal-needed-bottom-1')).toHaveText('needs 2 / 4 / 6'); // the words stay in the open log (prompt 34)
          await expect(page.getByTestId('lost-badge-bottom-1')).toBeVisible();
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    // The hunt's five is doubted (prompt 37): a tap on the die at the rail opens the six faces round it.
    const fed = await state(page);
    await page.getByTestId('dice-hunting-bottom-1').click();
    await expect(page.getByTestId('die-menu-bottom-1')).toBeVisible();

    await steps.step('die-tapped-at-the-rail', {
      description: 'The hunt\'s die at bottom-1\'s rail is tapped: a radial menu of the six faces opens round it, turned to the seat, the five the die shows marked, an X in the centre to leave it as it is; nothing has changed yet',
      verifications: [
        { spec: 'The menu stands over the rail with six faces and the centre, the five marked as the die\'s face; no correction has been sent', check: async () => {
          await expect(page.getByTestId('die-menu-bottom-1')).toHaveAttribute('data-current', '5');
          await expect(page.locator('[data-testid^="die-set-"][data-testid$="-bottom-1"]')).toHaveCount(6);
          await expect(page.getByTestId('die-set-5-bottom-1')).toHaveClass(/current/);
          await expect(page.getByTestId('die-menu-cancel-bottom-1')).toBeVisible();
          expect((await events(page)).filter((e) => e.type === 'dice/corrected')).toEqual([]);
        } }
      ]
    });

    await page.getByTestId('die-set-2-bottom-1').click();
    await expect(page.getByTestId('die-menu-bottom-1')).toHaveCount(0);
    await expect(page.getByTestId('dice-hunting-bottom-1').locator('.die')).toHaveAttribute('data-value', '2');

    await steps.step('hunt-die-set-by-hand', {
      description: 'The two is chosen: the game is folded again from the recorded throws with the hunt\'s die a two, so the meal bags a ration a hunter instead of two and the stores hold less; the line reads the two with the mark of a die set by hand',
      verifications: [
        { spec: 'A dice/corrected event names the hunt\'s throw, its die and the two; the line\'s die is a two, marked; the bag and the food are smaller; nothing was refused', check: async () => {
          const s = await state(page);
          const evs = await events(page);
          const hunt = evs.filter((e) => e.type === 'dice/rolled').at(-1)!;
          expect(hunt.payload).toMatchObject({ seat: 'bottom-1', values: [5] }); // the throw as rolled is kept
          expect(evs.filter((e) => e.type === 'dice/corrected').map((e) => e.payload)).toEqual([{ seat: 'bottom-1', eventId: hunt.id, index: 0, value: 2 }]);
          const meal = s.history.filter((t) => t.seat === 'bottom-1').at(-1)!.log.at(-1)!;
          expect(meal).toMatchObject({ kind: 'hunting', rolls: [{ label: 'hunting', value: 2, from: { eventId: hunt.id, index: 0, corrected: true } }] });
          const was = fed.history.filter((t) => t.seat === 'bottom-1').at(-1)!.log.at(-1)!;
          expect(was.outcome).toContain('12 rations bagged');
          expect(meal.outcome).toContain('6 rations bagged');
          expect(s.explorers.find((e) => e.seat === 'bottom-1')!.chart!.food).toBe(fed.explorers.find((e) => e.seat === 'bottom-1')!.chart!.food - 6);
          await expect(page.getByTestId('dice-hunting-bottom-1').locator('.die')).toHaveAttribute('data-corrected', 'true');
          await expect(page.getByTestId('meal-note-bottom-1')).toContainText('6 rations bagged');
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    // The lost check's one is doubted too: in the open log its die is tapped and a four chosen. But the hunt's die
    // was rolled after it, and with the way found that die would have been read for the terrain, so the one stays.
    await page.getByTestId('log-expand-bottom-1').click();
    await expect(page.getByTestId('turn-log-bottom-1')).toBeVisible();
    await page.getByTestId('dice-lost-check-bottom-1').last().click();
    await expect(page.getByTestId('die-menu-bottom-1')).toHaveAttribute('data-current', '1');
    await page.getByTestId('die-set-4-bottom-1').click();
    await expect(page.getByTestId('die-notice-bottom-1')).toBeVisible();

    await steps.step('correction-refused', {
      description: 'In the open log the lost check\'s die is tapped and a four chosen; the game cannot have gone that way, the hunt\'s die rolled after it would have answered the terrain\'s ask instead, so a notice at bottom-1\'s edge says the die stays a one and why, over the held table',
      verifications: [
        { spec: 'The notice gives the reason; the correction is a refused event, and the game is as it was: the lost check a one, the turn top-1\'s', check: async () => {
          await expect(page.getByTestId('die-notice-why-bottom-1')).toHaveText('The die stays a 1: the throw for the hunt that followed would answer another ask (for the direction of the terrain to copy).');
          const s = await state(page);
          const evs = await events(page);
          expect(evs.filter((e) => e.type === 'dice/corrected')).toHaveLength(2);
          expect(s.diagnostics).toEqual([{ eventId: evs.at(-1)!.id, reason: 'the die stays a 1: the throw for the hunt that followed would answer another ask (for the direction of the terrain to copy)' }]);
          const played = s.history.filter((t) => t.seat === 'bottom-1').at(-1)!;
          expect(played.log.filter((r) => r.kind !== 'action').map((r) => [r.kind, r.rolls.map((x) => x.value)])).toEqual([['disaster', []], ['lost-check', [1]], ['hunting', [2]]]);
          expect(s.turn!.current).toBe('top-1');
          await expect(page.getByTestId('die-menu-bottom-1')).toHaveCount(0);
        } }
      ]
    });

    await page.getByTestId('die-notice-ok-bottom-1').click();
    await expect(page.getByTestId('die-notice-bottom-1')).toHaveCount(0);
    await page.getByTestId('log-expand-bottom-1').click();
    await expect(page.getByTestId('turn-log-bottom-1')).toHaveCount(0);

    // The hunt's die is doubted once more, this time in the picture (prompt 37): a tap on it has the dicecam read it again.
    await tapTray(page, TRAY.dice[1], TRAY.y);
    await expect(page.getByTestId('dicecam-hint')).toHaveText('Reading the die again…');

    await steps.step('die-tapped-in-the-picture', {
      description: 'A tap on the hunt\'s die in the dicecam\'s picture: the table finds the throw it came from by where the die lies, says over the picture that it is reading the die again, and waits for the engine\'s next readings of it',
      verifications: [
        { spec: 'The dock says the die is being read again; nothing has changed in the game yet', check: async () => {
          await expect(page.getByTestId('dicecam-hint')).toHaveText('Reading the die again…');
          expect((await events(page)).filter((e) => e.type === 'dice/corrected')).toHaveLength(2);
          expect((await state(page)).diagnostics).toHaveLength(1);
          await expect(page.getByTestId('dice-hunting-bottom-1').locator('.die')).toHaveAttribute('data-value', '2');
        } }
      ]
    });

    // The engine reads the tray twice more: the lost die a one as before, the hunt's die a six this time.
    await dicecamSays(page, settled('throw-6', [1, 6]));
    await dicecamSays(page, settled('throw-6', [1, 6]));
    await expect(page.getByTestId('dicecam-hint')).toHaveText('Read again: a 6, not a 2');

    await steps.step('die-read-again', {
      description: 'Two readings agree the die is a six: the table corrects it as the menu would, the game is folded again with the hunt a six, three rations a hunter, and the dock says what it read',
      verifications: [
        { spec: 'A third dice/corrected names the hunt\'s throw and the six; the line reads the six, marked; the bag is eighteen rations and the stores hold six more than the five left them', check: async () => {
          const evs = await events(page);
          const s = await state(page);
          const hunt = evs.filter((e) => e.type === 'dice/rolled').at(-1)!;
          expect(evs.filter((e) => e.type === 'dice/corrected').map((e) => e.payload)).toEqual([{ seat: 'bottom-1', eventId: hunt.id, index: 0, value: 2 }, expect.objectContaining({ value: 4 }), { seat: 'bottom-1', eventId: hunt.id, index: 0, value: 6 }]);
          expect(s.history.filter((t) => t.seat === 'bottom-1').at(-1)!.log.at(-1)).toMatchObject({ kind: 'hunting', rolls: [{ label: 'hunting', value: 6, from: { eventId: hunt.id, index: 0, corrected: true } }] });
          await expect(page.getByTestId('meal-note-bottom-1')).toContainText('18 rations bagged');
          await expect(page.getByTestId('dice-hunting-bottom-1').locator('.die')).toHaveAttribute('data-value', '6');
          expect(s.explorers.find((e) => e.seat === 'bottom-1')!.chart!.food).toBe(fed.explorers.find((e) => e.seat === 'bottom-1')!.chart!.food + 6);
          expect(s.diagnostics).toHaveLength(1);
        } }
      ]
    });

    await tapTray(page, TRAY.dice[1], TRAY.y);
    await expect(page.getByTestId('die-menu-bottom-1')).toBeVisible();

    await steps.step('die-menu-in-the-picture', {
      description: 'The same die tapped again opens the six faces over the picture, the six it now shows marked, for the player to set it by hand',
      verifications: [
        { spec: 'The menu stands over the dock with the six marked, and the dock\'s note is gone', check: async () => {
          await expect(page.getByTestId('die-menu-bottom-1')).toHaveAttribute('data-current', '6');
          await expect(page.getByTestId('die-set-6-bottom-1')).toHaveClass(/current/);
          await expect(page.getByTestId('dicecam-hint')).toHaveCount(0);
        } }
      ]
    });

    await page.getByTestId('die-set-4-bottom-1').click();
    await expect(page.getByTestId('dice-hunting-bottom-1').locator('.die')).toHaveAttribute('data-value', '4');

    await steps.step('die-set-from-the-picture', {
      description: 'A four is chosen: the hunt is two rations a hunter again, the stores as the five had left them, the die on the rail a four with its mark',
      verifications: [
        { spec: 'A fourth dice/corrected sets the die to four; the line and the stores read as after the five; nothing else was refused', check: async () => {
          const evs = await events(page);
          const s = await state(page);
          expect(evs.filter((e) => e.type === 'dice/corrected').map((e) => (e.payload as { value: number }).value)).toEqual([2, 4, 6, 4]);
          await expect(page.getByTestId('meal-note-bottom-1')).toContainText('12 rations bagged');
          await expect(page.getByTestId('dice-hunting-bottom-1').locator('.die')).toHaveAttribute('data-corrected', 'true');
          expect(s.explorers.find((e) => e.seat === 'bottom-1')!.chart!.food).toBe(fed.explorers.find((e) => e.seat === 'bottom-1')!.chart!.food);
          expect(s.diagnostics).toHaveLength(1);
        } }
      ]
    });

    const before = await state(page);
    await page.reload();
    await expect(page.getByTestId('turn-marker-top-1')).toHaveAttribute('data-current', 'true');

    await steps.step('persists-after-reload', {
      description: 'After a reload the log replays the same game from the recorded throws and the corrections among them: the same map, the same log with the hunt\'s die a four, physical dice still on and the dicecam back in its corner, its camera and engine started again',
      verifications: [
        { spec: 'The state is the same as before the reload, the correction applied again and the refusal noted again, and the dicecam is active again', check: async () => {
          const after = await state(page);
          expect(after.map).toEqual(before.map);
          expect(after.turn).toEqual(before.turn);
          expect(after.history).toEqual(before.history);
          expect(after.rng).toEqual(before.rng);
          expect(after.diagnostics).toEqual(before.diagnostics);
          expect(after.history.filter((t) => t.seat === 'bottom-1').at(-1)!.log.at(-1)!.rolls[0]).toMatchObject({ value: 4, from: { corrected: true } });
          await expect(page.getByTestId('die-notice-bottom-1')).toHaveCount(0);
          expect(after.awaiting).toBeNull();
          await expect(page.getByTestId('dicecam-dock')).toHaveAttribute('data-status', 'active');
          await expect(page.getByTestId('physical-dice')).toHaveCount(0);
        } }
      ]
    });

    steps.generateDocs();
  });
});
