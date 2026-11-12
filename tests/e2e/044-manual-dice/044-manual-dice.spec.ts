import { test, expect, type Page } from '@playwright/test';
import { TestStepHelper } from '../helpers/test-step-helper';

async function commission(page: Page, seat: string) {
  await page.getByTestId(`seat-join-${seat}`).click();
  await page.getByTestId(`commission-${seat}`).click();
  await expect(page.getByTestId(`explorer-token-${seat}`)).toBeVisible();
}
const state = (page: Page) => page.evaluate(() => window.__TABLETOP__!.getState());
const events = (page: Page) => page.evaluate(() => window.__TABLETOP__!.getEvents());
const rolledEvents = async (page: Page) => (await events(page)).filter((e) => e.type === 'dice/rolled').map((e) => e.payload as { seat: string; values: number[]; lay?: ({ x: number; y: number } | null)[] });
/** The faces lying in the tray, left to right, as the tray says them. */
const trayDice = async (page: Page) => ((await page.getByTestId('manual-dice').getAttribute('data-dice')) ?? '').split(' ').filter(Boolean).map(Number);
/** Tap a control of the tray and wait until the dice have come to rest. */
async function throwBy(page: Page, control: 'manual-dice-roll' | 'manual-dice-one', dice: number) {
  await page.getByTestId(control).click();
  await expect(page.getByTestId('manual-dice')).toHaveAttribute('data-rolling', 'false');
  await expect(page.locator('[data-testid^="manual-die-"]')).toHaveCount(dice);
}

test.describe('044 - Manual dice', () => {
  test('with manual dice on, a tray stands in the dicecam\'s place and a tap on it rolls the dice asked for, or one die at a time', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'Manual dice',
      'The options screen has a second dice control, Manual (prompt 66), for a table without a camera and for trying the game out quickly. It switches physical dice on, so the table asks for every roll, and puts a dice tray the table draws in the south-west corner of the board, where the dicecam\'s picture is parked: no camera is asked for, and the tray stays in that corner whoever rolls (prompt 67). A tap on the tray throws the dice the table is asking for, made up by the table; the die button in its corner tosses in one die at a time. The tray speaks for the dicecam\'s engine in the engine\'s own messages, so each throw is judged, recorded with where its dice lay and shown exactly as a throw the camera read.'
    );

    await page.goto('/table/?new=1&gameId=ABCDE&seed=34&first-player-pause=hold');
    await commission(page, 'bottom-1');
    await commission(page, 'top-1');
    await page.getByTestId('options-se').click();
    await expect(page.getByTestId('manual-dice-toggle')).toHaveAttribute('aria-pressed', 'false');
    await page.getByTestId('manual-dice-toggle').click();
    await expect(page.getByTestId('manual-dice')).toBeVisible();

    await steps.step('manual-dice-on', {
      description: 'The options screen\'s dice section has a Manual control beside Physical dice: switched on, physical dice go on with it, and a dice tray appears in the south-west corner of the board where the dicecam would be',
      verifications: [
        { spec: 'Both controls are on, the note says a tap on the tray rolls, and the game records physical dice', check: async () => {
          await expect(page.getByTestId('manual-dice-toggle')).toHaveAttribute('aria-pressed', 'true');
          await expect(page.getByTestId('physical-dice')).toHaveAttribute('aria-pressed', 'true');
          await expect(page.getByTestId('physical-dice-state')).toHaveText('on');
          await expect(page.getByTestId('dice-note')).toContainText('tap the dice tray');
          expect((await state(page)).rng).toMatchObject({ physical: true });
          expect((await events(page)).filter((e) => e.type === 'dice/physical').map((e) => e.payload)).toEqual([{ on: true }]);
        } },
        { spec: 'The tray is empty and offers a roll of one die; no camera picture is shown', check: async () => {
          await expect(page.getByTestId('manual-dice')).toHaveAttribute('data-dice', '');
          await expect(page.getByTestId('manual-dice-hint')).toHaveText('Tap to roll one die');
          await expect(page.getByTestId('manual-dice-one')).toBeVisible();
          await expect(page.getByTestId('dicecam-dock')).toHaveCount(0);
          await expect(page.getByTestId('dicecam-place')).toHaveAttribute('data-centred', 'false');
        } }
      ]
    });

    await page.getByTestId('options-close').click();
    await page.getByTestId('start-game').click();
    await expect(page.getByTestId('dice-ask-bottom-1')).toBeVisible();

    await steps.step('tray-asked-for-four', {
      description: 'The game is started and the table asks bottom-1 for four dice for first player: the tray stays in its corner, lit above the held table, and offers a roll of the four dice wanted',
      verifications: [
        { spec: 'The ask names four dice, the status line says to tap the tray, and the tray offers four', check: async () => {
          await expect(page.getByTestId('dice-ask-bottom-1')).toContainText('Roll 4 D6 for first player');
          await expect(page.getByTestId('dicecam-status-bottom-1')).toHaveText('Tap the dice tray to roll 4 dice');
          await expect(page.getByTestId('manual-dice-hint')).toHaveText('Tap to roll 4 dice');
          await expect(page.getByTestId('manual-dice')).toHaveAttribute('data-wanted', '4');
          // The tray does not jump to the middle as the dicecam's picture does (prompt 67): it stays where the hand found it, above the scrim.
          await expect(page.getByTestId('dicecam-place')).toHaveAttribute('data-centred', 'false');
          await expect(page.getByTestId('dicecam-place')).toHaveAttribute('data-raised', 'true');
          await expect(page.getByTestId('dice-scrim')).toBeVisible();
          expect(await rolledEvents(page)).toEqual([]);
        } }
      ]
    });

    await throwBy(page, 'manual-dice-roll', 4);
    await expect(page.getByTestId('dice-ask-top-1')).toBeVisible();
    const first = await trayDice(page);

    await steps.step('four-dice-at-a-tap', {
      description: 'One tap on the tray throws four dice, which land in it; the table takes them as bottom-1\'s roll, shown at its station, and asks top-1 for its four, the tray where it was',
      verifications: [
        { spec: 'The throw entered the game as a dice/rolled event with the tray\'s four faces, left to right, and where each die lay', check: async () => {
          expect(first).toHaveLength(4);
          for (const v of first) expect(v >= 1 && v <= 6).toBe(true);
          const rolled = await rolledEvents(page);
          expect(rolled).toHaveLength(1);
          expect(rolled[0]).toMatchObject({ seat: 'bottom-1', values: first });
          expect(rolled[0].lay).toHaveLength(4);
          for (const p of rolled[0].lay!) expect(p!.x > 0 && p!.x < 1 && p!.y > 0 && p!.y < 1).toBe(true);
          expect((await state(page)).awaiting).toMatchObject({ seat: 'top-1', count: 4, rolled: [{ seat: 'bottom-1', values: first }] });
        } },
        { spec: 'bottom-1\'s station shows its roll; top-1 is asked, and the dice lying in the tray are not taken for its throw', check: async () => {
          await expect(page.getByTestId('first-player-edge-bottom-1')).toBeVisible();
          await expect(page.getByTestId('dicecam-status-top-1')).toHaveText('Tap the dice tray to roll 4 dice');
          await expect(page.getByTestId('dice-prompt-top-1')).toHaveAttribute('data-have', '0');
          await expect(page.getByTestId('dicecam-place')).toHaveAttribute('data-centred', 'false');
        } }
      ]
    });

    await throwBy(page, 'manual-dice-one', 1);
    await expect(page.getByTestId('dicecam-status-top-1')).toHaveText('One die thrown, 4 dice wanted');

    await steps.step('one-die-at-a-time', {
      description: 'The die button in the tray\'s corner picks up the dice lying from the last roll and tosses in a single die: the table sees one die thrown of the four it wants and waits',
      verifications: [
        { spec: 'One die lies in the tray, the status line counts it, and nothing more has entered the game', check: async () => {
          expect(await trayDice(page)).toHaveLength(1);
          await expect(page.getByTestId('dice-prompt-top-1')).toHaveAttribute('data-seen', '1');
          expect(await rolledEvents(page)).toHaveLength(1);
          expect((await state(page)).awaiting).toMatchObject({ seat: 'top-1', count: 4 });
        } }
      ]
    });

    await throwBy(page, 'manual-dice-one', 2);
    await throwBy(page, 'manual-dice-one', 3);
    await throwBy(page, 'manual-dice-one', 4);
    await expect(page.getByTestId('dice-ask-top-1')).toHaveCount(0);
    const second = await trayDice(page);

    await steps.step('roll-off-decided', {
      description: 'Three more dice tossed in one at a time make top-1\'s four: the table takes them, the roll for first player is decided and each station shows its roll',
      verifications: [
        { spec: 'top-1\'s throw is the four dice in the tray, and the game holds both rolls and who goes first', check: async () => {
          const rolled = await rolledEvents(page);
          expect(rolled).toHaveLength(2);
          expect(rolled[1]).toMatchObject({ seat: 'top-1', values: second });
          const s = await state(page);
          expect(s.awaiting).toBeNull();
          expect(s.rollOff).toMatchObject({ 'bottom-1': [first], 'top-1': [second] });
          const sum = (v: number[]) => v.reduce((a, b) => a + b, 0);
          expect(sum(first)).not.toBe(sum(second));
          expect(s.starting).toBe(sum(first) > sum(second) ? 'bottom-1' : 'top-1');
          expect(s.diagnostics).toEqual([]);
        } },
        { spec: 'Both stations show their roll, and the tray is still in its corner offering the next roll', check: async () => {
          await expect(page.getByTestId('first-player-edge-bottom-1')).toBeVisible();
          await expect(page.getByTestId('first-player-edge-top-1')).toBeVisible();
          await expect(page.getByTestId('dicecam-place')).toHaveAttribute('data-centred', 'false');
          await expect(page.getByTestId('manual-dice-hint')).toHaveText('Tap to roll 4 dice');
        } }
      ]
    });

    steps.generateDocs();
  });
});
