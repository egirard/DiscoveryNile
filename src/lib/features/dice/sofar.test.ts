// The lines so far with an ask and the lines that linger after it (PROMPTS.md, prompts 34, 54 to 56): a fight
// fought at the table die by die, each ask showing what the dice before it decided, and the result staying in view.
import { beforeEach, describe, expect, it } from 'vitest';
import { reduce } from '$lib/game/reduce';
import { created, event, resetSequence } from '$lib/game/test-fixtures';
import { card } from '$features/cards/deck';
import type { GameEvent } from '$lib/game/events';
import { lingerLines } from './linger';
import { uncovered } from './prompt';

beforeEach(resetSequence);

const LAYOUT = { bottom: 2, top: 2, left: 1, right: 1 };
const seatAndCommission = (seat: string) => [event('seat/taken', { seat, uid: `table:${seat}` }), event('explorer/commissioned', { seat, specialties: [] })];
// Seed 18 as in scenarios 016–018: bottom-1 holds a ticket to Mombasa; the step into c24r12 finds 12 warriors. The
// combat script ends with the reaction (6, 6, 6: hostile); every die of the fight is then asked for at the table.
const SCRIPT = { main: [6, 6, 6, 6, 1, 1, 1, 1, 6, 2, 1], natives: [1, 2, 3, 4, 5], hunting: [1, 1, 1], combat: [6, 6, 6] };

function facingTheTribe(): GameEvent[] {
  const base = [created('ABCDE', LAYOUT, 18, SCRIPT), ...seatAndCommission('bottom-1'), ...seatAndCommission('top-1'), event('game/started', {})];
  const s0 = reduce(base);
  const ticket = s0.explorers[0].hand.find((id) => card(id).donation.kind === 'ticket' && (card(id).donation as { port: string }).port === 'mombasa')!;
  const pass = (seat: string, s: ReturnType<typeof reduce>) => {
    const e = s.explorers.find((x) => x.seat === seat)!;
    return s.turn!.phase === 'discard' ? [event('cards/discarded', { seat, cardIds: [e.hand[0]] }), event('turn/ended', { seat })] : [event('turn/ended', { seat })];
  };
  let events = [...base, event('voyage/booked', { seat: 'bottom-1', port: 'mombasa', ticketCardId: ticket }), event('turn/ended', { seat: 'bottom-1' })];
  events = [...events, ...pass('top-1', reduce(events))];
  events = [...events, ...pass('top-1', reduce(events))];
  return [...events, event('expedition/outfitted', { seat: 'bottom-1', purchases: { askaris: 5, bearers: 6, food: 60 } }), event('expedition/moved', { seat: 'bottom-1', path: ['c24r12'] }), event('dice/physical', { on: true })];
}
const roll = (values: number[]) => event('dice/rolled', { seat: 'bottom-1', values });
const outcomes = (lines: { kind: string; outcome: string }[]) => lines.map((l) => [l.kind, l.outcome]);

describe('a fight fought at the table, each ask explaining the dice before it (prompt 56)', () => {
  it("asks for the natives' nerve with the reaction's line, then for surprise with the fight so far, every check explained", () => {
    const events = [...facingTheTribe(), event('natives/policy', { seat: 'bottom-1', policy: 3 })];
    const nerve = reduce(events);
    expect(nerve.diagnostics).toEqual([]);
    expect(nerve.awaiting).toMatchObject({ seat: 'bottom-1', count: 1, prompt: "Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 3: more than the 12 warriors and they hide" });
    expect(outcomes(nerve.awaiting!.sofar)).toEqual([['reaction', 'hostile: 18 on the dice, over the target of 4']]);
    expect(nerve.awaiting!.sofar[0]).toMatchObject({ seat: 'bottom-1', total: 18, rolls: [{ value: 6 }, { value: 6 }, { value: 6 }] });
    // 6 × 5 ÷ 3 = 10, not more than 12: they attack, and the surprise dice are asked with the fight so far.
    const surprise = reduce([...events, roll([6])]);
    expect(surprise.awaiting).toMatchObject({ count: 2, prompt: 'Roll 2 D6 for surprise; 3+ and the expedition is ready' });
    expect(outcomes(surprise.awaiting!.sofar)).toEqual([
      ['reaction', 'hostile: 18 on the dice, over the target of 4'],
      ['combat', 'hostile; nerve 6 × 5 askaris ÷ policy 3 = 10, not more than 12 warriors: the natives attack']
    ]);
    // The lines so far account for every die rolled, so no throw is listed on its own.
    expect(uncovered(surprise.awaiting!.rolled, surprise.awaiting!.sofar)).toEqual([]);
    // Ready: the volley kills six, and the morale die is asked with the volley told.
    const morale = reduce([...events, roll([6]), roll([6, 6])]);
    expect(morale.awaiting).toMatchObject({ count: 1, prompt: 'Roll a D6 to drive them off; the die × 6 killed over 6 warriors drives them off' });
    expect(morale.awaiting!.sofar.at(-1)!.outcome).toBe('hostile; nerve 6 × 5 askaris ÷ policy 3 = 10, not more than 12 warriors: the natives attack; surprise 6 + 6 = 12, not under policy 3: the expedition is ready; the volley: 5 askaris and the explorer fire, 6 warriors fall');
  });
  it('after the victory asks for the prisoners and the village with the reaction and the fight complete, and the result lingers with every line', () => {
    const events = [...facingTheTribe(), event('natives/policy', { seat: 'bottom-1', policy: 3 }), roll([6]), roll([6, 6])];
    // Morale 2 × 6 = 12, more than the 6 left: driven off. The prisoners' die is asked with the fight's line written.
    const prisoners = reduce([...events, roll([2])]);
    expect(prisoners.awaiting).toMatchObject({ count: 1, prompt: 'Roll a D6 for prisoners; 5 askaris less the die; 6 takes none' });
    expect(outcomes(prisoners.awaiting!.sofar)).toEqual([
      ['reaction', 'hostile: 18 on the dice, over the target of 4'],
      ['combat', 'hostile; nerve 6 × 5 askaris ÷ policy 3 = 10, not more than 12 warriors: the natives attack; surprise 6 + 6 = 12, not under policy 3: the expedition is ready; the volley: 5 askaris and the explorer fire, 6 warriors fall; morale 2 × 6 killed = 12, more than the 6 warriors left: the natives are driven off']
    ]);
    // The lines carry the dice they were made with, each knowing its throw (prompt 37).
    expect(prisoners.awaiting!.sofar[1].rolls.map((r) => r.value)).toEqual([6, 6, 6, 2]);
    expect(prisoners.awaiting!.sofar[1].rolls.every((r) => r.from)).toBe(true);
    const village = reduce([...events, roll([2]), roll([1])]);
    expect(village.awaiting).toMatchObject({ count: 2, prompt: 'Roll 2 D6 to find the village; 7 or less finds it' });
    expect(village.awaiting!.sofar).toHaveLength(2); // the prisoners' die, not yet on a line, is listed on its own at the table (017 reads it with every throw physical)
    // The last throw in: the event is applied in full, and what the dice decided stays in view, the action noted left out.
    const found = reduce([...events, roll([2]), roll([1]), roll([3, 4])]);
    expect(found.awaiting).toBeNull();
    expect(found.turn!.phase).toBe('spoils');
    expect(outcomes(lingerLines(village, found)!)).toEqual([
      ['reaction', 'hostile: 18 on the dice, over the target of 4'],
      ['combat', expect.stringContaining('the natives are driven off')],
      ['victory', 'prisoners: 5 askaris − 1 = 4 taken; village 3 + 4 = 7, within 4 prisoners + policy 3 = 7: the village is found']
    ]);
    expect(lingerLines(prisoners, village)).toBeNull(); // more dice asked for: the ask shows the lines so far instead
  });
});
