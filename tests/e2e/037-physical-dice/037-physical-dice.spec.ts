import { test, expect, type Page } from '@playwright/test';
import { TestStepHelper } from '../helpers/test-step-helper';
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
  await page.getByTestId(`end-turn-${seat}`).click();
  await page.getByTestId(`confirm-end-turn-${seat}`).click();
}
async function tap(page: Page, id: string, times: number) {
  for (let i = 0; i < times; i++) await page.getByTestId(id).click();
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
      'The options screen turns physical dice on: from then on the table rolls nothing itself. Whenever a rule calls for dice the game stands still and the seat whose roll it is reads what to roll and why at its edge ("Roll a D6 to see if you are lost; 2+ means you\'re okay"), with the throws already made for the same action. The dicecam in the corner of the board shows the table\'s camera on a canvas, the tray and the dice as WebCamTool\'s engine reads them drawn over the picture; two agreeing readings enter the roll, and a tap on one of the six faces enters it by hand. Each roll becomes a dice/rolled event, so the log replays the same game. The roll for first player, a lost check, the terrain, a river source and the natives are rolled this way in one game.'
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
        { spec: 'The reading is not taken: the prompt waits for a roll of four dice, the dock holds the reading, and nothing is rolled', check: async () => {
          await expect(page.getByTestId('dicecam-status-bottom-1')).toHaveText('Waiting for a roll of 4 D6');
          await expect(page.getByTestId('dice-prompt-bottom-1')).toHaveAttribute('data-seen', '4');
          await expect(page.getByTestId('dicecam-dock')).toHaveAttribute('data-readings', '1');
          expect((await state(page)).awaiting).toMatchObject({ seat: 'bottom-1', rolled: [] });
          expect((await events(page)).filter((e) => e.type === 'dice/rolled')).toEqual([]);
        } }
      ]
    });

    await dicecamSays(page, settled('throw-1', [6, 6, 6, 6]));
    await expect(page.getByTestId('dice-prompt-bottom-1')).toHaveAttribute('data-stale', 'false');

    await steps.step('tray-read-once', {
      description: 'The dice are thrown and the engine reads the settled tray: four sixes, each die outlined on the picture with its value above it and its confidence along its foot, the way the Yahtzee page draws them; one reading is not enough, the table waits for a second that agrees',
      verifications: [
        { spec: 'The prompt says four dice are seen and their faces are being read; the dock holds two readings and the throw is not yet taken', check: async () => {
          await expect(page.getByTestId('dicecam-status-bottom-1')).toHaveText('4 dice seen, reading the faces…');
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
      description: 'The dicecam reads a one: the expedition is lost and its turn ends there and then; at a port there is no hunt, so the check is the rail\'s latest line with the die, what it needed, and the notice that no hunting was needed at Mombasa',
      verifications: [
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

    // The turn ends in the field: the hunt's die is asked for; top-1 waits in Europe; bottom-1 tries the unknown again.
    await endTurn(page, 'bottom-1');
    await expect(page.getByTestId('dice-ask-bottom-1')).toHaveText('Roll a D6 for the hunt; the die bags a ration a hunter at 2, two at 4, three at 6');
    await dicecamReads(page, 'throw-5', [5]);
    await expect(page.getByTestId('turn-marker-top-1')).toHaveAttribute('data-current', 'true');
    await endTurn(page, 'top-1');
    await expect(page.getByTestId('turn-marker-bottom-1')).toHaveAttribute('data-current', 'true');
    await page.getByTestId('move-target-c24r11').click();
    await expect(page.getByTestId('dice-ask-bottom-1')).toHaveText("Roll a D6 to see if you are lost; 2+ means you're okay");
    await dicecamReads(page, 'throw-6', [1]);
    await expect(page.getByTestId('dice-ask-bottom-1')).toHaveText('Roll a D6 for the hunt; the die bags a ration a hunter at 2, two at 4, three at 6');

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
          await expect(page.getByTestId('dice-ask-bottom-1')).toHaveText('Roll a D6 for the hunt; the die bags a ration a hunter at 2, two at 4, three at 6');
          const rolled = (await events(page)).filter((e) => e.type === 'dice/rolled').map((e) => (e.payload as { values: number[] }).values);
          expect(rolled.at(-1)).toEqual([1]);
          expect((await state(page)).awaiting).toMatchObject({ seat: 'bottom-1', rolled: [{ values: [1] }] });
        } }
      ]
    });

    // The die is tossed in from outside the picture and the engine misses the motion: it still calls the throw by
    // the lost die's name, but a five lies where the one lay, and that is a throw.
    await dicecamReads(page, 'throw-6', [5]);
    await expect(page.getByTestId('turn-marker-top-1')).toHaveAttribute('data-current', 'true');

    await steps.step('hunted-and-passed', {
      description: 'A five, thrown afresh under the lost die\'s own name (the engine missed the toss), is the hunt: the meal closes the turn and it passes to top-1; bottom-1\'s rail reads the hunt with what it needed, and keeps the lost mark',
      verifications: [
        { spec: 'The turn is top-1\'s; bottom-1\'s latest turn holds the lost check and the hunt, the hunt\'s line saying what the die needed', check: async () => {
          const s = await state(page);
          expect(s.turn!.current).toBe('top-1');
          const played = s.history.filter((t) => t.seat === 'bottom-1').at(-1)!;
          expect(played.log.filter((r) => r.kind !== 'action').map((r) => [r.kind, r.rolls.map((x) => x.value)])).toEqual([['disaster', []], ['lost-check', [1]], ['hunting', [5]]]);
          await expect(page.getByTestId('roll-hunting-bottom-1')).toHaveAttribute('data-needed', '2 / 4 / 6 for one, two, three a hunter');
          await expect(page.getByTestId('meal-needed-bottom-1')).toHaveText('needs 2 / 4 / 6 for one, two, three a hunter');
          await expect(page.getByTestId('lost-badge-bottom-1')).toBeVisible();
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    const before = await state(page);
    await page.reload();
    await expect(page.getByTestId('turn-marker-top-1')).toHaveAttribute('data-current', 'true');

    await steps.step('persists-after-reload', {
      description: 'After a reload the log replays the same game from the recorded throws: the same map, the same log, physical dice still on and the dicecam back in its corner, its camera and engine started again',
      verifications: [
        { spec: 'The state is the same as before the reload and the dicecam is active again', check: async () => {
          const after = await state(page);
          expect(after.map).toEqual(before.map);
          expect(after.turn).toEqual(before.turn);
          expect(after.history).toEqual(before.history);
          expect(after.rng).toEqual(before.rng);
          expect(after.awaiting).toBeNull();
          await expect(page.getByTestId('dicecam-dock')).toHaveAttribute('data-status', 'active');
          await expect(page.getByTestId('physical-dice')).toHaveCount(0);
        } }
      ]
    });

    steps.generateDocs();
  });
});
