import { test, expect, type Page } from '@playwright/test';
import { TestStepHelper } from '../helpers/test-step-helper';
import { takeCards } from '../helpers/cards';
import { endTurnFromRail } from '../helpers/turn';

async function commission(page: Page, seat: string) {
  await page.getByTestId(`seat-join-${seat}`).click();
  await page.getByTestId(`commission-${seat}`).click();
  await expect(page.getByTestId(`explorer-token-${seat}`)).toBeVisible();
}
const state = (page: Page) => page.evaluate(() => window.__TABLETOP__!.getState());
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
async function outfit(page: Page, seat: string, purchases: Record<string, number>) {
  await expect(page.getByTestId(`expedition-chart-${seat}`)).toBeVisible();
  for (const [item, n] of Object.entries(purchases)) await tap(page, `buy-${item}-${seat}`, n % 10);
  await page.getByTestId(`chart-step-10-${seat}`).click();
  for (const [item, n] of Object.entries(purchases)) await tap(page, `buy-${item}-${seat}`, Math.floor(n / 10));
  await page.getByTestId(`confirm-outfit-${seat}`).click();
  await page.getByTestId(`confirm-outfit-yes-${seat}`).click();
  await expect(page.getByTestId(`chart-summary-${seat}`)).toBeVisible();
}
import { readFileSync } from 'node:fs';

/** The trek played in advance: seed, dice scripts and the events to replay (see docs/e2e-test-guidelines.md). */
const trek = JSON.parse(readFileSync(new URL('./trek.json', import.meta.url), 'utf8')) as { seed: number; dice: Record<string, number[]>; events: { type: string; payload: Record<string, unknown> }[] };

test.describe('028 - Epic transits', () => {
  test('walking from Mombasa to Khartoum completes a crossing; every route hex published from Europe earns a bonus point', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'Epic transits',
      'The first explorer to cross the continent on one of four crossings (Khartoum to Cape Colony, to the east coast, to the west coast; or coast to coast) earns a bonus of one point for every hex of his route he then publishes; the second explorer on a different route earns half a point per hex, the third a third, the fourth a quarter. The pre-printed hexes at the north-east edge may not be used. The crossing is recognised the moment the expedition steps onto the far port, and the bonus is paid hex by hex at publication.'
    );

    // Seed 43: bottom-1 lands at Mombasa and walks to Khartoum in twenty rounds. The trek was played in advance with
    // natives, hunting, sickness and oasis dice scripted (sixes find nobody and feed the hunters' share; ones mean
    // recovery) and is replayed from trek.json through the table's event log, up to the last step onto Khartoum. Since
    // prompt 43 an expedition carries overland only what its bearers can, so the trek sets out with sixteen bearers and
    // nine askaris under forty rations and the water for the desert, and arrives thinned by thirst and hunger.
    const dice = Object.entries(trek.dice).map(([stream, values]) => `${stream === 'main' ? 'dice' : `dice-${stream}`}=${values.join(',')}`).join('&');
    await page.goto(`/table/?new=1&gameId=ABCDE&seed=${trek.seed}&${dice}`);
    await commission(page, 'bottom-1');
    await commission(page, 'top-1');
    await page.getByTestId('start-game').click();
    await takeCards(page); // the hands dealt wait in full at the edges (prompt 44)
    expect((await state(page)).turn!.current).toBe('bottom-1');
    await page.evaluate(async (events) => {
      for (const e of events) {
        // A failed lost check ends the turn there and then (prompt 20): the trek's own turn/ended after one is already done.
        if (e.type === 'turn/ended' && window.__TABLETOP__!.getState().turn?.current !== e.payload.seat) continue;
        await window.__TABLETOP__!.append(e.type as never, e.payload as Record<string, unknown>);
      }
    }, trek.events);
    await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c21r2');
    const before = await state(page);
    expect(before.diagnostics).toEqual([]);
    expect(before.transits).toEqual([]);
    await page.getByTestId('move-target-c20r1').click();

    const toPublish = (s: Awaited<ReturnType<typeof state>>) => s.explorers[0].transit!.route.filter((h) => s.map[h] && !s.map[h].publishedBy && s.map[h].markers.includes('bottom-1'));

    await steps.step('crossing', {
      description: 'The last step onto Khartoum completes the crossing from Mombasa: the rail announces the epic transit and how many hexes of the route wait to be published for a point each',
      verifications: [
        { spec: 'The token stands on Khartoum; the transit note names the crossing as the first; the route is recorded', check: async () => {
          await expect(page.getByTestId('board-token-bottom-1')).toHaveAttribute('data-hex', 'c20r1');
          const s = await state(page);
          const e = s.explorers[0];
          expect(e.transit).toMatchObject({ crossing: 'khartoum-east', order: 1, from: 'mombasa', to: 'khartoum' });
          expect(s.transits).toHaveLength(1);
          const n = toPublish(s).length;
          expect(n).toBeGreaterThan(10);
          await expect(page.getByTestId('transit-note-bottom-1')).toHaveText(`epic transit, Khartoum to the east coast (the first): ${n} hexes to publish at 1 point each`);
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    await page.getByTestId('sail-home-bottom-1').click();
    await passTurn(page);
    await passTurn(page);
    await expect(page.getByTestId('explorer-token-bottom-1')).toHaveAttribute('data-location', 'europe');
    const home = await state(page);
    const hexes = toPublish(home);
    await page.getByTestId('publish-bottom-1').click();
    await takeCards(page); // the card the turn in Europe drew waits at the edge, over the hexes to publish (prompt 44)
    for (const hex of hexes) {
      await page.getByTestId(`publish-target-${hex}`).click();
      await takeCards(page); // each hex published earns a card, which waits in full at the edge (prompt 44)
    }

    await steps.step('route-published', {
      description: 'Home in Europe the whole route is published hex by hex: each note counts the terrain and the epic transit bonus, and the tally at the rail shows the sum',
      verifications: [
        { spec: 'Every route hex is published with a transit bonus of one point; the tally equals the terrain points plus the bonus', check: async () => {
          const s = await state(page);
          const entries = s.scores['bottom-1']!;
          const bonus = entries.filter((e) => e.kind === 'transit');
          expect(bonus).toHaveLength(hexes.length);
          expect(bonus.every((e) => e.points === 1)).toBe(true);
          const total = entries.reduce((sum, e) => sum + e.points, 0);
          await expect(page.getByTestId('score-bottom-1')).toHaveAttribute('data-points', String(total));
          await expect(page.getByTestId('published-note-bottom-1').last()).toContainText('epic transit (1)');
          await expect(page.getByTestId('publish-bottom-1')).toHaveCount(0);
          expect(hexes.every((h) => s.map[h].publishedBy === 'bottom-1')).toBe(true);
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    steps.generateDocs();
  });
});
