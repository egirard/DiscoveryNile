import { beforeEach, describe, expect, it } from 'vitest';
import { reduce } from '$lib/game/reduce';
import { created, event, resetSequence } from '$lib/game/test-fixtures';
import { moveTargets } from '$features/exploration/reducer';

beforeEach(resetSequence);

const LAYOUT = { bottom: 2, top: 2, left: 1, right: 1 };
const seatAndCommission = (seat: string) => [event('seat/taken', { seat, uid: `table:${seat}` }), event('explorer/commissioned', { seat, specialties: [] })];
// Seed 863 as in scenarios 013–014 (shared with scenario 021): bottom-1 pays passage to Mombasa; the first disaster card
// in the field is card 1 (an askari killed). Hunting 1,1: no game. Sickness dice: 4,5,6 (three starving bearers fall
// sick); then 1,2,3 for the three sick (+3 starving: one lingers, two die) and 4 (the starving explorer falls sick).
const SCRIPT = { main: [6, 6, 6, 6, 1, 1, 1, 1], hunting: [1, 1], sickness: [4, 5, 6, 1, 2, 3, 4] };
const LEAN = { askaris: 3, bearers: 10, food: 5 };

function lean() {
  const base = [created('ABCDE', LAYOUT, 863, SCRIPT), ...seatAndCommission('bottom-1'), ...seatAndCommission('top-1'), event('game/started', {})];
  const pass = (seat: string, s: ReturnType<typeof reduce>) => {
    const e = s.explorers.find((x) => x.seat === seat)!;
    return s.turn!.phase === 'discard' ? [event('cards/discarded', { seat, cardIds: [e.hand[0]] }), event('turn/ended', { seat })] : [event('turn/ended', { seat })];
  };
  let events = [...base, event('voyage/booked', { seat: 'bottom-1', port: 'mombasa' }), event('turn/ended', { seat: 'bottom-1' })];
  events = [...events, ...pass('top-1', reduce(events))];
  events = [...events, ...pass('top-1', reduce(events))];
  events = [...events, event('expedition/outfitted', { seat: 'bottom-1', purchases: LEAN }), event('expedition/moved', { seat: 'bottom-1', path: ['c25r11'] }), event('turn/ended', { seat: 'bottom-1' })];
  return { events, pass };
}

describe('starvation, desertion and sickness at the end of the turn (rules §11)', () => {
  it('the unfed bearers desert unless guarded, the guarded fall sick, and sick men halt the expedition', () => {
    const { events, pass } = lean();
    const s3 = reduce(events);
    expect(s3.diagnostics).toEqual([]);
    const e3 = s3.explorers[0];
    expect(e3.lastMeal!.outcome).toBe('nothing per hunter: no game, 14 men ate (5 from the stores), 9 men go hungry; 6 bearers desert; 3 bearers go hungry; 3 starving bearers fall sick');
    expect(e3.chart).toMatchObject({ bearers: 4, askaris: 3, food: 0 });
    expect(e3.sick).toMatchObject({ bearers: 3, explorer: false });
    const s4 = reduce([...events, ...pass('top-1', s3), event('disaster/faced', { seat: 'bottom-1' })]); // the card is read first (prompt 34)
    expect(s4.turn).toMatchObject({ current: 'bottom-1', round: 4 });
    expect(s4.explorers[0].chart!.askaris).toBe(2); // card 1
    expect(moveTargets(s4, s4.explorers[0])).toEqual([]); // three sick, one well bearer: nobody to carry them
    expect(reduce([...events, ...pass('top-1', s3), event('disaster/faced', { seat: 'bottom-1' }), event('expedition/moved', { seat: 'bottom-1', path: ['c25r12'] })]).diagnostics.at(-1)?.reason).toBe('the sick cannot all be carried: the expedition halts');
    const s5 = reduce([...events, ...pass('top-1', s3), event('disaster/faced', { seat: 'bottom-1' }), event('turn/ended', { seat: 'bottom-1' })]);
    const e5 = s5.explorers[0];
    expect(e5.lastMeal!.outcome).toBe('nothing per hunter: no game, 7 men ate (0 from the stores), 7 men go hungry; 1 bearer, 2 askaris desert; 3 bearers go hungry; the explorer goes hungry; 2 bearers die of sickness, the starving explorer falls sick');
    expect(e5.chart).toMatchObject({ bearers: 1, askaris: 0, food: 0 });
    expect(e5.sick).toMatchObject({ bearers: 1, explorer: true });
    expect(e5.lastMeal!.rolls.map((r) => r.value)).toEqual([1, 1, 2, 3, 4]);
  });
});
