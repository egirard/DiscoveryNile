import { beforeEach, describe, expect, it } from 'vitest';
import { reduce } from '$lib/game/reduce';
import { created, event, resetSequence } from '$lib/game/test-fixtures';
import { card } from '$features/cards/deck';

beforeEach(resetSequence);

const LAYOUT = { bottom: 2, top: 2, left: 1, right: 1 };
const seatAndCommission = (seat: string) => [event('seat/taken', { seat, uid: `table:${seat}` }), event('explorer/commissioned', { seat, specialties: [] })];
// Seed 18 as in scenarios 016–019: bottom-1 holds a ticket to Mombasa; c24r12 holds a tribe. Combat dice: reaction
// 1,1,1 (calm with policy 5); offer 3,6; prices 3,2,4,1 (rations per gift, bearer, guide, askari).
const SCRIPT = { main: [6, 6, 6, 6, 1, 1, 1, 1, 6, 2, 1], natives: [1, 2, 3, 4, 5], hunting: [1, 1], combat: [1, 1, 1, 3, 6, 3, 2, 4, 1, 1, 1, 1, 6, 6, 6, 1, 1, 1, 1] };
const PURCHASES = { askaris: 5, bearers: 6, food: 40, gifts: 20 };

function meetTheChief(script: typeof SCRIPT = SCRIPT) {
  const base = [created('ABCDE', LAYOUT, 18, script), ...seatAndCommission('bottom-1'), ...seatAndCommission('top-1'), event('game/started', {})];
  const s0 = reduce(base);
  const ticket = s0.explorers[0].hand.find((id) => card(id).donation.kind === 'ticket' && (card(id).donation as { port: string }).port === 'mombasa')!;
  const pass = (seat: string, s: ReturnType<typeof reduce>) => {
    const e = s.explorers.find((x) => x.seat === seat)!;
    return s.turn!.phase === 'discard' ? [event('cards/discarded', { seat, cardIds: [e.hand[0]] }), event('turn/ended', { seat })] : [event('turn/ended', { seat })];
  };
  let events = [...base, event('voyage/booked', { seat: 'bottom-1', port: 'mombasa', ticketCardId: ticket }), event('turn/ended', { seat: 'bottom-1' })];
  events = [...events, ...pass('top-1', reduce(events))];
  events = [...events, ...pass('top-1', reduce(events))];
  events = [...events, event('expedition/outfitted', { seat: 'bottom-1', purchases: PURCHASES }), event('expedition/moved', { seat: 'bottom-1', path: ['c24r12'] }), event('natives/policy', { seat: 'bottom-1', policy: 5 })];
  return { events, pass };
}

describe('negotiation and trade (rules §8.5)', () => {
  it('a calm chief with policy 3 or 5 opens the negotiation; a satisfying offer permits trade at rolled prices', () => {
    const { events, pass } = meetTheChief();
    const calm = reduce(events);
    expect(calm.diagnostics).toEqual([]);
    expect(calm.turn!.phase).toBe('negotiate');
    expect(reduce([...events, event('turn/ended', { seat: 'bottom-1' })]).diagnostics.at(-1)?.reason).toBe('finish with the chief first');
    const offered = [...events, event('natives/offered', { seat: 'bottom-1', gifts: 2 })];
    const s = reduce(offered);
    expect(s.diagnostics).toEqual([]);
    expect(s.turn!.phase).toBe('trade');
    expect(s.turn!.trade).toEqual({ tribe: 1, prices: { food: 3, bearers: 2, guides: 4, askaris: 1 } });
    expect(s.turn!.log.slice(-2).map((l) => l.outcome)).toEqual(['2 gifts offered: the larger die 6 × 2 = 12, reaching 12 warriors: the chief is satisfied', 'the chief permits trade: 3 rations per gift, bearer 2, guide 4, askari 1']);
    expect(s.explorers[0].chart!.gifts).toBe(18);
    expect(s.tribes[1].negotiatedBy).toEqual(['bottom-1']);
    const traded = [...offered, event('natives/traded', { seat: 'bottom-1', item: 'bearers', count: 1, direction: 'buy' }), event('natives/traded', { seat: 'bottom-1', item: 'food', count: 2, direction: 'sell' })];
    const t = reduce(traded);
    expect(t.diagnostics).toEqual([]);
    expect(t.explorers[0].chart).toMatchObject({ bearers: 7, gifts: 18, food: 34 });
    // One line for the trading (prompt 41), not one a tap.
    expect(t.turn!.log.at(-1)!.outcome).toBe('bought 1 bearer for 2 gifts; sold 6 rations for 2 gifts');
    const reason = (payload: Record<string, unknown>) => reduce([...traded, event('natives/traded', { seat: 'bottom-1', ...payload })]).diagnostics.at(-1)?.reason;
    expect(reason({ item: 'askaris', count: 1, direction: 'buy' })).toBe('an askari needs a musket; only 0');
    expect(reason({ item: 'camels', count: 1, direction: 'buy' })).toBe('that is not for sale here');
    expect(reason({ item: 'bearers', count: 1, direction: 'sell' })).toBe('bearers cannot be sold');
    const done = reduce([...traded, event('natives/done', { seat: 'bottom-1' })]);
    expect(done.turn).toMatchObject({ phase: 'act', policy: 5 });
    // Next turn the prior negotiation counts as local knowledge (+1) for policies 3 and 5.
    const ev = [...traded, event('natives/done', { seat: 'bottom-1' }), event('turn/ended', { seat: 'bottom-1' })];
    const again = reduce([...ev, ...pass('top-1', reduce(ev)), event('natives/policy', { seat: 'bottom-1', policy: 5 })]);
    expect(again.turn!.log.find((l) => l.kind === 'reaction')!.modifiers!.map((m) => m.label)).toEqual(['distance to port', 'policy 5', 'local knowledge']);
    expect(again.turn!.phase).toBe('negotiate');
    const everything = reduce([...ev, ...pass('top-1', reduce(ev)), event('natives/policy', { seat: 'bottom-1', policy: 5 }), event('natives/offered', { seat: 'bottom-1', everything: true })]);
    expect(everything.explorers[0].chart).toMatchObject({ gifts: 18, food: 0, muskets: 0, bearers: 7, askaris: 5 });
    expect(everything.turn!.phase).toBe('trade');
    expect(everything.turn!.log.at(-2)!.outcome).toBe('everything given: the chief is satisfied and returns 18 gifts');
  });
  it('an insulted chief too weak to attack tries poison; declining ends the audience', () => {
    // A tribe of one warrior (natives 1,2 then 1,1,1); offer 0 with dice 1,1: insulted; strength 6 × 5 ÷ 5 = 6 over 1: they hide; poison 2: the explorer dies.
    const script = { ...SCRIPT, natives: [1, 2, 1, 1, 1], combat: [1, 1, 1, 1, 1, 6, 2] };
    const { events } = meetTheChief(script);
    expect(reduce([...events, event('natives/offered', { seat: 'bottom-1', decline: true })]).turn!.phase).toBe('act');
    const insulted = reduce([...events, event('natives/offered', { seat: 'bottom-1', gifts: 0 })]);
    expect(insulted.diagnostics).toEqual([]);
    expect(insulted.turn!.log.slice(-3).map((l) => l.outcome)).toEqual([
      '0 gifts offered: the larger die 1 × 0 = 0, short of 1 warriors: the chief is insulted',
      'hostile; nerve 6 × 5 askaris ÷ policy 5 = 6, more than 1 warrior: the natives hide',
      'the chief’s poison kills the explorer (2, 2 or less)'
    ]);
    expect(insulted.explorers[0].location).toEqual({ kind: 'dead' });
    const survives = reduce([...meetTheChief({ ...script, combat: [1, 1, 1, 1, 1, 6, 3] }).events, event('natives/offered', { seat: 'bottom-1', gifts: 0 })]);
    expect(survives.explorers[0]).toMatchObject({ poisonBonus: 1, location: { kind: 'hex', hex: 'c24r12' } });
    expect(survives.turn).toMatchObject({ phase: 'act', moved: true });
  });
});
