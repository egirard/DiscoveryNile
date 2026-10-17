import { test, expect, type Page } from '@playwright/test';
import { TestStepHelper } from '../helpers/test-step-helper';
import { takeCards } from '../helpers/cards';
import { endTurnFromRail, pressEndTurn } from '../helpers/turn';

const TICKETS: Record<number, string> = { 2: 'mombasa', 15: 'capetown', 22: 'lourenco-marques', 30: 'quilimane', 31: 'calabar', 32: 'kilwa', 33: 'luanda', 34: 'benguela', 35: 'port-elizabeth', 36: 'zanzibar', 39: 'durban', 43: 'brass' };
const PORT_HEX: Record<string, string> = { khartoum: 'c20r1', mombasa: 'c25r12', zanzibar: 'c23r15', kilwa: 'c23r18', quilimane: 'c21r25', 'lourenco-marques': 'c18r31', durban: 'c17r34', 'port-elizabeth': 'c14r36', capetown: 'c10r36', benguela: 'c7r21', luanda: 'c7r19', calabar: 'c4r8', brass: 'c2r8' };

async function commission(page: Page, seat: string) {
  await page.getByTestId(`seat-join-${seat}`).click();
  await page.getByTestId(`commission-${seat}`).click();
  await expect(page.getByTestId(`explorer-token-${seat}`)).toBeVisible();
}
const state = (page: Page) => page.evaluate(() => window.__TABLETOP__!.getState());
async function endTurn(page: Page, seat: string) {
  await endTurnFromRail(page, seat);
  await expect(page.getByTestId(`turn-marker-${seat}`)).toHaveAttribute('data-current', 'false');
}

test.describe('008 - Sail to Africa', () => {
  test('the current explorer chooses a port of entry on the map, pays or uses a ticket, skips a turn at sea and lands', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'Sail to Africa',
      'In Europe the current seat offers a sail control. It turns the thirteen ports on the map into a chooser: a port the explorer holds a free ticket for shows the ticket, the others show the $500 fare, and ports the explorer cannot afford are greyed out. A tap on the ship puts the check mark on it with the "✕" to its right, in the hourglass\'s place; a tap on a port chooses it, and the check mark books: the whole hand becomes the expedition budget (less the fare), the explorer is at sea, and after one skipped turn the token lands on the port hex.'
    );

    await page.goto('/table/?new=1&gameId=ABCDE&seed=1234');
    await commission(page, 'bottom-1');
    await commission(page, 'top-1');
    await page.getByTestId('start-game').click();
    await takeCards(page); // the hands dealt wait in full at the edges (prompt 44)
    const s0 = await state(page);
    const first = s0.turn!.current;
    const second = first === 'bottom-1' ? 'top-1' : 'bottom-1';
    const hand = s0.explorers.find((e) => e.seat === first)!.hand;
    const ticketCard = hand.find((id) => TICKETS[Number(id.replace('card-', ''))]);
    const ticketPort = ticketCard ? TICKETS[Number(ticketCard.replace('card-', ''))] : null;
    const cash = (await page.locator(`[data-testid^="card-"][data-testid$="-${first}"][data-kind="money"] .amount`).allTextContents()).reduce((a, t) => a + Number(t.replace('$', '')), 0);

    await page.getByTestId(`sail-${first}`).click();

    await steps.step('choose-port', {
      description: 'The ship opens the port chooser on the map: tickets, fares and unaffordable ports are marked; the ship carries the check mark, not yet live, and the "✕" to its right would stay in Europe',
      verifications: [
        { spec: 'All thirteen ports became choosable', check: async () => {
          await expect(page.locator('[data-testid^="choose-port-"]')).toHaveCount(13);
        } },
        { spec: 'The check mark is on the ship but waits for a port; the "✕" is to its right, where the hourglass was', check: async () => {
          const confirm = page.getByTestId(`confirm-sail-${first}`);
          const cancel = page.getByTestId(`cancel-sail-${first}`);
          await expect(confirm).toHaveAttribute('aria-disabled', 'true');
          await expect(page.getByTestId(`end-turn-${first}`)).toHaveCount(0);
          const [c, x] = await Promise.all([confirm.boundingBox(), cancel.boundingBox()]);
          expect(x!.x).toBeGreaterThanOrEqual(c!.x + c!.width - 1);
          expect(Math.abs(x!.y - c!.y)).toBeLessThan(2);
        } },
        { spec: 'A port the explorer holds a ticket for shows the ticket; Mombasa shows the $500 fare if affordable', check: async () => {
          expect(ticketPort, 'seed 1234 deals the first player a free ticket').not.toBeNull();
          await expect(page.getByTestId(`port-${ticketPort}`)).toHaveAttribute('data-fare', 'ticket');
          const mombasa = ticketPort === 'mombasa' ? 'kilwa' : 'mombasa';
          await expect(page.getByTestId(`port-${mombasa}`)).toHaveAttribute('data-fare', cash >= 500 ? 'cash' : 'none');
          await expect(page.getByTestId(`choose-port-${mombasa}`)).toHaveAttribute('aria-label', cash >= 500 ? /for \$500$/ : /cannot afford/);
        } }
      ]
    });

    await page.getByTestId(`choose-port-${ticketPort}`).click();

    await steps.step('port-chosen', {
      description: 'The ticket\'s port is tapped: it is marked on the map and the check mark on the ship is live; nothing is booked yet',
      verifications: [
        { spec: 'The chosen port is marked and the others are not; the confirmation is live; the explorer is still in Europe', check: async () => {
          await expect(page.getByTestId(`port-${ticketPort}`)).toHaveAttribute('data-selected', 'true');
          await expect(page.locator('[data-testid^="port-"][data-selected="true"]')).toHaveCount(1);
          await expect(page.getByTestId(`confirm-sail-${first}`)).toHaveAttribute('aria-disabled', 'false');
          await expect(page.getByTestId(`explorer-token-${first}`)).toHaveAttribute('data-location', 'europe');
        } }
      ]
    });

    await page.getByTestId(`confirm-sail-${first}`).click();

    await steps.step('booked', {
      description: 'The check mark books passage with the ticket: the explorer is at sea, the hand became the budget, the chooser closed',
      verifications: [
        { spec: 'The rail token shows the explorer at sea and the budget equals the money raised (no fare with a ticket)', check: async () => {
          await expect(page.getByTestId(`explorer-token-${first}`)).toHaveAttribute('data-location', 'voyage');
          await expect(page.getByTestId(`at-sea-${first}`)).toBeVisible();
          await expect(page.getByTestId(`money-${first}`)).toHaveText(`$${cash}`);
          await expect(page.getByTestId(`hand-${first}`)).toHaveAttribute('data-count', '0');
        } },
        { spec: 'The chooser is closed, the sail control is gone, and the hand went to the discard pile', check: async () => {
          await expect(page.locator('[data-testid^="choose-port-"]')).toHaveCount(0);
          await expect(page.getByTestId(`sail-${first}`)).toHaveCount(0);
          await expect(page.getByTestId(`confirm-sail-${first}`)).toHaveCount(0);
          const s = await state(page);
          expect(s.explorers.find((e) => e.seat === first)!.location).toEqual({ kind: 'voyage', port: ticketPort });
          expect(s.deck!.discard).toEqual(expect.arrayContaining(hand));
          expect(s.diagnostics).toEqual([]);
        } }
      ]
    });

    await endTurn(page, first);
    // The second seat ends its turn; the first explorer's turn is skipped at sea, so the marker
    // comes straight back to the second seat. Wait for the landing instead.
    await pressEndTurn(page, second);
    await expect(page.getByTestId(`board-token-${first}`)).toBeAttached();

    await steps.step('arrived', {
      description: 'After the skipped turn at sea the explorer stands on the port hex and the turn has passed on',
      verifications: [
        { spec: 'The board shows the explorer token on the chosen port hex and the rail token says in port', check: async () => {
          await expect(page.getByTestId(`board-token-${first}`)).toHaveAttribute('data-hex', PORT_HEX[ticketPort!]);
          await expect(page.getByTestId(`explorer-token-${first}`)).toHaveAttribute('data-location', 'port');
          await expect(page.getByTestId(`in-port-${first}`)).toBeVisible();
        } },
        { spec: 'The voyage turn was skipped: it is the second seat\'s turn again in round 2', check: async () => {
          const s = await state(page);
          expect(s.turn).toMatchObject({ current: second, round: 2, phase: 'act' });
          expect(s.explorers.find((e) => e.seat === first)!.location).toEqual({ kind: 'port', port: ticketPort });
          await expect(page.getByTestId(`turn-marker-${second}`)).toHaveAttribute('data-current', 'true');
        } }
      ]
    });

    steps.generateDocs();
  });
});
