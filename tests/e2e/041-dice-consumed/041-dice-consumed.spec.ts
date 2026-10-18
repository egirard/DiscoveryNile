import { test, expect, type Page } from '@playwright/test';
import { TestStepHelper } from '../helpers/test-step-helper';
import { dicecamReads, dicecamSays, settled, TRAY } from '../helpers/dicecam';
import { consumptions, diceHealth, suspects, type CapturedLine, type DiceConsumed } from '../../../src/lib/diagnostics/dice';

const SERVER = 'http://127.0.0.1:3002';

async function commission(page: Page, seat: string) {
  await page.getByTestId(`seat-join-${seat}`).click();
  await page.getByTestId(`commission-${seat}`).click();
  await expect(page.getByTestId(`explorer-token-${seat}`)).toBeVisible();
}
const state = (page: Page) => page.evaluate(() => window.__TABLETOP__!.getState());
const events = (page: Page) => page.evaluate(() => window.__TABLETOP__!.getEvents());
/** Where the tray's i-th die lies, as the engine reports it (a fraction of the frame). */
const placeOf = (i: number) => ({ x: TRAY.dice[i] / TRAY.width, y: TRAY.y / TRAY.height });

test.describe('041 - Dice consumed', () => {
  test('every throw the game consumes is written to the capture with its faces, places and purpose, and the offline check tells a die taken twice', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'Dice consumed',
      'The table writes every throw that enters the game to the diagnostics capture as a dice/consumed line (prompt 57): the seat, how the values came (the dicecam, a tapped face, the table rolling the rest), the engine\'s name for the throw, each die\'s face and place in the picture with how surely it was read, the dice left lying in the tray, what the table ignored as the tray as it lay, whether the engine saw anything move since the last throw was taken, and what the throw is for (the held event, the ask\'s words, how many dice). The offline check, bun run diag:dice, reads the lines back and tells a die consumed twice: a die taken at the place of a die taken before while nothing moved in the tray is the same die, whatever face the engine read this time. The scenario stands in for the capture server, plays the roll for first player with the dicecam, and then lets the engine misread one of the four dice still lying from that throw while the next seat\'s ask is open: the table takes the four dice again, as it did at the user\'s table on the 17th, and the check names each of them.'
    );

    // No capture server runs in E2E: it is answered here, and every log line the table posts is kept, stamped as the server stamps it.
    const lines: CapturedLine[] = [];
    await page.route(`${SERVER}/**`, async (route) => {
      const req = route.request();
      const url = req.url();
      if (url.endsWith('/health')) return route.fulfill({ status: 200, body: 'ok' });
      if (req.method() === 'POST' && url.endsWith('/log')) {
        const body = req.postDataJSON() as { kind: string; data: unknown };
        lines.push({ at: new Date().toISOString(), kind: body.kind, data: body.data });
        return route.fulfill({ status: 200, body: 'ok' });
      }
      if (url.endsWith('/events')) return route.fulfill({ status: 200, contentType: 'text/event-stream', body: ': listening\n\n' });
      return route.fulfill({ status: 200, body: 'ok' });
    });
    const consumed = () => lines.filter((l) => l.kind === 'dice/consumed').map((l) => l.data as DiceConsumed);

    await page.goto(`/table/?new=1&gameId=DIAGD&seed=34&first-player-pause=hold&diag-server=${SERVER}`);
    await page.getByTestId('options-se').click();
    await page.getByTestId('physical-dice').click();
    await expect(page.getByTestId('dicecam-dock')).toHaveAttribute('data-status', 'active');
    await dicecamSays(page, { type: 'roi', roi: { detected: true, polygon: TRAY.floor, confidence: 0.93 } });
    await expect.poll(async () => Number(await page.getByTestId('dicecam-dock').getAttribute('data-frames'))).toBeGreaterThan(2);
    await page.getByTestId('options-close').click();
    await expect.poll(() => lines.some((l) => l.kind === 'dicecam/status' && l.data === 'active')).toBe(true);

    await steps.step('capture-connected', {
      description: 'The table is opened against the capture server (answered by the scenario) with physical dice switched on: the status line\'s capture dot is up, and the capture already holds the dice/physical event and the dicecam coming up',
      verifications: [
        { spec: 'The status line shows the capture up; the capture has the event appended and the dicecam\'s status, and nothing consumed yet', check: async () => {
          await expect(page.getByTestId('status-diag')).toHaveAttribute('data-state', 'up');
          expect(lines.filter((l) => l.kind === 'event/appended').map((l) => (l.data as { type: string }).type)).toContain('dice/physical');
          expect(lines.some((l) => l.kind === 'dicecam/status' && l.data === 'active')).toBe(true);
          expect(consumed()).toEqual([]);
          expect(diceHealth('DIAGD', lines)).toEqual(['DIAGD: no dice consumed']);
        } }
      ]
    });

    await commission(page, 'bottom-1');
    await commission(page, 'top-1');
    await page.getByTestId('start-game').click();
    await expect(page.getByTestId('dice-ask-bottom-1')).toHaveText('Roll 4 D6 for first player; the highest total goes first');
    // The tray as found: four twos lying from before the game. Then the dice are thrown (the engine sees them move) and read twice.
    await dicecamSays(page, settled('lying', [2, 2, 2, 2]));
    await expect(page.getByTestId('dice-prompt-bottom-1')).toHaveAttribute('data-stale', 'true');
    await dicecamSays(page, { type: 'rolling' });
    await dicecamReads(page, 'throw-1', [6, 6, 6, 6]);
    await expect(page.getByTestId('dice-ask-top-1')).toBeVisible();
    await expect.poll(() => consumed().length).toBe(1);

    await steps.step('first-throw-captured', {
      description: 'bottom-1 throws four sixes for first player and the dicecam reads them twice over: the throw is in, shown at bottom-1\'s station, and the capture has one dice/consumed line for it: four sixes with their places and surety, the four twos the table ignored as the tray as it lay, the dice seen moving, for the roll for first player',
      verifications: [
        { spec: 'The capture line names the seat, the source, the throw, each die\'s face, place and surety, what was ignored, that the dice moved, and what the throw is for', check: async () => {
          const [c] = consumed();
          expect(c).toEqual({
            seat: 'bottom-1',
            source: 'dicecam',
            rollId: 'throw-1',
            dice: [0, 1, 2, 3].map((i) => ({ value: 6, ...placeOf(i), confidence: 0.92 })),
            lying: [],
            ignored: [0, 1, 2, 3].map((i) => ({ value: 2, ...placeOf(i) })),
            moved: true,
            for: { event: 'game/started', eventId: expect.any(String), prompt: 'Roll 4 D6 for first player; the highest total goes first', stream: 'main', count: 4, have: 0, rolled: 0 }
          });
          expect(c.for.eventId).toBe((await events(page)).find((e) => e.type === 'game/started')!.id);
        } },
        { spec: 'The line comes after the reading that took the throw and before the throw appended and the next ask; the health check finds one throw and nothing re-used', check: async () => {
          const table = lines.filter((l) => l.kind !== 'relay/status');
          const kinds = table.map((l) => l.kind);
          const at = kinds.indexOf('dice/consumed');
          expect(kinds[at - 1]).toBe('dicecam/reading');
          expect((table[at - 1].data as { verdict: string }).verdict).toBe('taken 6 6 6 6');
          expect(kinds.slice(at + 1, at + 3)).toEqual(['event/appended', 'dice/asked']);
          expect((table[at + 2].data as { seat: string }).seat).toBe('top-1');
          expect(consumptions(lines)).toHaveLength(1);
          expect(suspects(consumptions(lines))).toEqual([]);
          expect(diceHealth('DIAGD', lines)).toEqual(['DIAGD: 1 throw consumed (1 by the dicecam, 0 tapped, 0 rolled by the table), 4 dice; none re-used']);
          await expect(page.getByTestId('first-player-roll-bottom-1')).toHaveAttribute('data-total', '24');
        } }
      ]
    });

    // top-1's ask is open and the four sixes lie where they fell. Nothing moves, but the engine reads the first of them
    // as a one, twice: the table counts that die as thrown, and with four dice in the tray takes all four as top-1's throw.
    await dicecamReads(page, 'throw-1', [1, 6, 6, 6], 1);
    await expect.poll(() => consumed().length).toBe(2);
    await expect(page.getByTestId('first-player-roll-top-1')).toHaveAttribute('data-total', '19');

    await steps.step('lying-dice-taken-again', {
      description: 'Nothing moves in the tray, but the engine misreads the first of bottom-1\'s dice as a one while top-1\'s ask is open: the table takes the four dice lying there as top-1\'s throw, 1 6 6 6, the roll for first player is decided, and the capture shows what happened: a second dice/consumed line with the same four places, nothing moved since the last throw, and the health check names every one of the four dice as re-used',
      verifications: [
        { spec: 'The second line is top-1\'s, the same roll id and the same four places, no motion since the throw before', check: async () => {
          const [, c] = consumed();
          expect(c).toMatchObject({ seat: 'top-1', source: 'dicecam', rollId: 'throw-1', moved: false, lying: [], for: { event: 'game/started', count: 4, have: 0, rolled: 1 } });
          expect(c.dice).toEqual([1, 6, 6, 6].map((value, i) => ({ value, ...placeOf(i), confidence: 0.92 })));
          // What the table ignored: the throw last taken and the tray as the engine last read it, the same four sixes twice over.
          const sixes = [0, 1, 2, 3].map((i) => ({ value: 6, ...placeOf(i) }));
          expect(c.ignored).toEqual([...sixes, ...sixes]);
        } },
        { spec: 'The offline check reads the lines back: two throws, four dice RE-USED where the dice taken before lay, nothing moved; the first of them read as a 1 where a 6 lay', check: async () => {
          const found = suspects(consumptions(lines));
          expect(found.map((s) => [s.kind, s.seat, s.die.value, s.earlier.seat, s.earlier.die.value])).toEqual([
            ['unmoved', 'top-1', 1, 'bottom-1', 6],
            ['unmoved', 'top-1', 6, 'bottom-1', 6],
            ['unmoved', 'top-1', 6, 'bottom-1', 6],
            ['unmoved', 'top-1', 6, 'bottom-1', 6]
          ]);
          const report = diceHealth('DIAGD', lines);
          expect(report[0]).toBe('DIAGD: 2 throws consumed (2 by the dicecam, 0 tapped, 0 rolled by the table), 8 dice; 4 RE-USED');
          expect(report[1]).toMatch(/^  \d\d:\d\d:\d\d  top-1  1@0\.25,0\.50 for first player  RE-USED: nothing moved since the 6 taken at \d\d:\d\d:\d\d for first player lay there; read as a 1 where the 6 lay$/);
          expect(report[4]).toMatch(/the same 6$/);
        } },
        { spec: 'At the table the roll for first player is decided on the dice as read: bottom-1 24, top-1 19, bottom-1 first', check: async () => {
          await expect(page.getByTestId('first-player-roll-top-1')).toHaveAttribute('data-total', '19');
          await expect(page.getByTestId('first-player-roll-bottom-1')).toHaveAttribute('data-decided', 'true');
          const s = await state(page);
          expect(s.awaiting).toBeNull();
          expect(s.starting).toBe('bottom-1');
          expect((await events(page)).filter((e) => e.type === 'dice/rolled').map((e) => e.payload.values)).toEqual([[6, 6, 6, 6], [1, 6, 6, 6]]);
        } }
      ]
    });

    steps.generateDocs();
  });
});
