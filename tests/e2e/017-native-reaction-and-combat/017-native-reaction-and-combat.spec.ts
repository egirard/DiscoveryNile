import { test, expect, type Page } from '@playwright/test';
import { TestStepHelper } from '../helpers/test-step-helper';
import { endTurnFromRail } from '../helpers/turn';
import { withLogOpen } from '../helpers/log';

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

test.describe('017 - Native reaction and combat', () => {
  test('a show of force meets hostile natives: volley, melee and victory with every die at the rail; next turn the weakened tribe hides', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'Native reaction and combat',
      'Once a policy is chosen the natives react: three dice against the distance to the nearest port plus the policy number (and the adjustments for an expedition without askaris, for local knowledge and for the tribe\'s attitude). A higher roll means hostility; then a die times the askaris, divided by the policy, decides whether they hide or attack. An attack rolls two dice for surprise; unsurprised, every askari and the explorer fire once, and a morale die may drive the natives off; otherwise the two sides strike in turn, casualties by division, until one side is finished. Every die and the story of the fight show at the rail.'
    );

    // Seed 18 as in scenario 016: bottom-1 holds a free ticket to Mombasa. Main dice: roll-off 6,6,6,6 / 1,1,1,1, then
    // the step into c24r12: lost check 6, terrain direction 2 (veldt), water 1. Natives dice 1,2 then 3,4,5: 12 warriors.
    // Combat dice: reaction 6,6,6 (18 over the target 4: hostile); strength 1 (1 × 5 askaris ÷ policy 3 = 1: attack);
    // surprise 6,6 (not surprised; the volley kills 6); morale 1 (1 × 6 is not over 6: they close in); natives strike
    // 6 (6 ÷ 6: one askari falls); break check 1 (holds); askaris strike 1 (4 ÷ 1 + 1 = 5 warriors fall); natives'
    // morale 2 (10 over 1: driven off). Victory (since 018): prisoners die 6 (no quarter: none), village 6,6 (not found).
    // Next turn, with physical dice on (prompt 55): reaction 6,6,6 (hostile) and nerve 6 (6 × 4 ÷ 4 = 6 over 1: they hide), each tapped in.
    await page.goto('/table/?new=1&gameId=ABCDE&seed=18&dice=6,6,6,6,1,1,1,1,6,2,1&dice-natives=1,2,3,4,5&dice-hunting=1,1&dice-combat=6,6,6,1,6,6,1,6,1,1,2,6,6,6');
    await commission(page, 'bottom-1');
    await commission(page, 'top-1');
    await page.getByTestId('start-game').click();
    expect((await state(page)).turn!.current).toBe('bottom-1');
    await page.getByTestId('sail-bottom-1').click();
    await page.getByTestId('choose-port-mombasa').click();
    await page.getByTestId('confirm-sail-bottom-1').click();
    await passTurn(page);
    await passTurn(page); // round 2: bottom-1 lands at Mombasa and that turn is skipped
    await passTurn(page);
    await outfit(page, 'bottom-1', { askaris: 5, bearers: 6, food: 60 });
    await page.getByTestId('move-target-c24r12').click();
    await expect(page.getByTestId('policy-panel-bottom-1')).toBeVisible();
    await page.getByTestId('policy-3-bottom-1').click();

    await steps.step('the-fight', {
      description: 'A show of force. The reaction dice come up 6, 6, 6 against a target of 4: hostile, and strong enough to attack. Not surprised, the five askaris and the explorer fire and six warriors fall; the rest close in, kill an askari, and lose five more before they are driven off',
      verifications: [
        { spec: 'The rail shows the reaction as hostile with its dice and modifiers', check: async () => {
          await withLogOpen(page, 'bottom-1', async () => {
            await expect(page.getByTestId('roll-reaction-bottom-1').last()).toHaveAttribute('data-outcome', 'hostile (18 over 4)');
            await expect(page.getByTestId('roll-reaction-bottom-1').last()).toHaveAttribute('aria-label', /distance to port \+1, policy 3 \+3/);
          });
        } },
        { spec: 'The combat note tells the fight and its eight dice are shown; the chart shows 4 askaris and the tribe one warrior', check: async () => {
          await withLogOpen(page, 'bottom-1', async () => {
            await expect(page.getByTestId('combat-note-bottom-1').last()).toHaveText('hostile; nerve 1 × 5 askaris ÷ policy 3 = 1, not more than 12 warriors: the natives attack; the volley kills 6; they close in; 1 askari falls; 5 warriors fall; the natives are driven off');
            await expect(page.getByTestId('victory-note-bottom-1').last()).toHaveText('no quarter: no prisoners, the village cannot be found');
          });
          await expect(page.getByTestId('have-askaris-bottom-1')).toHaveAttribute('data-count', '4');
          const s = await state(page);
          const combat = s.turn!.log.find((l) => l.kind === 'combat')!;
          expect(combat.rolls.map((r) => r.value)).toEqual([1, 6, 6, 1, 6, 1, 1, 2]);
          expect(s.tribes[1]).toMatchObject({ warriors: 1, attitude: 0 });
          expect(s.turn).toMatchObject({ phase: 'act', policy: 3, moved: true }); // the unknown hex cost both foot points
          expect(s.explorers.find((e) => e.seat === 'bottom-1')!.location).toEqual({ kind: 'hex', hex: 'c24r12' });
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    await passTurn(page);
    await passTurn(page);

    // Physical dice for the second turn (prompt 55): each throw is answered by tapped faces, and the natives' nerve, the
    // last die of the policy, stays in view with its explanation before the table goes on.
    await page.getByTestId('options-se').click();
    await page.getByTestId('physical-dice').click();
    await expect(page.getByTestId('physical-dice')).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('options-close').click();
    await expect(page.getByTestId('policy-panel-bottom-1')).toBeVisible();
    await page.getByTestId('policy-4-bottom-1').click();
    const tapFaces = async (values: number[]) => { for (const v of values) await page.getByTestId(`die-face-${v}-bottom-1`).click(); };
    await expect(page.getByTestId('dice-ask-bottom-1')).toHaveText("Roll 3 D6 for the natives' reaction; 5 or less keeps them calm");
    await tapFaces([6, 6, 6]);
    await expect(page.getByTestId('dice-ask-bottom-1')).toHaveText("Roll a D6 for the natives' nerve; the die × 4 askaris ÷ policy 4: more than the 1 warrior and they hide");
    await tapFaces([6]);

    await steps.step('they-hide-explained', {
      description: 'The nerve die is in: the ask stays at bottom-1\'s edge with what the dice decided (prompt 55), the reaction hostile on 6, 6, 6 and the nerve check stated in full, 6 × 4 askaris ÷ policy 4 = 6, more than the one warrior, so the natives hide; the table waits for a tap or two seconds before going on',
      verifications: [
        { spec: 'The result panel is titled The natives\' nerve; its reaction line says hostile and its fight line states the check in full; the dice prompt is gone and the turn is in the act phase', check: async () => {
          await expect(page.getByTestId('dice-result-bottom-1')).toBeVisible();
          await expect(page.getByTestId('dice-result-title-bottom-1')).toHaveText("The natives' nerve");
          await expect(page.getByTestId('result-reaction-note-bottom-1')).toHaveText('hostile (18 over 5)');
          await expect(page.getByTestId('result-combat-note-bottom-1')).toHaveText('hostile; nerve 6 × 4 askaris ÷ policy 4 = 6, more than 1 warrior: the natives hide');
          await expect(page.getByTestId('dice-prompt-bottom-1')).toHaveCount(0);
          expect((await state(page)).turn).toMatchObject({ phase: 'act', policy: 4 });
        } }
      ]
    });
    await page.getByTestId('dice-result-ok-bottom-1').click();
    await expect(page.getByTestId('dice-result-bottom-1')).toHaveCount(0);

    await steps.step('they-hide', {
      description: 'Remaining in the hex next turn, the explorer ignores the tribe. Hostile again on 6, 6, 6, but the lone surviving warrior hides from four askaris',
      verifications: [
        { spec: 'The reaction is hostile and the natives hide; nothing changes on the chart', check: async () => {
          await withLogOpen(page, 'bottom-1', async () => {
            await expect(page.getByTestId('reaction-note-bottom-1').last()).toHaveText('hostile (18 over 5)');
            await expect(page.getByTestId('combat-note-bottom-1').last()).toHaveText('hostile; nerve 6 × 4 askaris ÷ policy 4 = 6, more than 1 warrior: the natives hide');
          });
          await expect(page.getByTestId('have-askaris-bottom-1')).toHaveAttribute('data-count', '4');
          const s = await state(page);
          expect(s.turn).toMatchObject({ round: 4, phase: 'act', policy: 4 });
          expect(s.tribes[1].warriors).toBe(1);
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    steps.generateDocs();
  });
});
