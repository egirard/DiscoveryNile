import { beforeEach, describe, expect, it } from 'vitest';
import { reduce } from '$lib/game/reduce';
import { created, event, resetSequence } from '$lib/game/test-fixtures';
import { card } from '$features/cards/deck';

beforeEach(resetSequence);

const LAYOUT = { bottom: 2, top: 2, left: 1, right: 1 };
const seatAndCommission = (seat: string) => [event('seat/taken', { seat, uid: `table:${seat}` }), event('explorer/commissioned', { seat, specialties: [] })];
// Seed 18 (shared with scenario 016; found by search under this script): bottom-1 holds a free ticket to Mombasa and $905. Main dice: roll-off 6,6,6,6 / 1,1,1,1,
// then the step into c24r12: lost check 6 (found), terrain direction 2 (copies Mombasa's veldt), water 1 (no source).
// Natives dice: 1,2 (3: natives on the veldt), warriors 3,4,5 capped at distance 1 → 12. Hunting: no game.
// Combat dice 1,1,1 twice: the natives are not hostile to either policy that faces them.
const SCRIPT = { main: [6, 6, 6, 6, 1, 1, 1, 1, 6, 2, 1], natives: [1, 2, 3, 4, 5], hunting: [6, 6], combat: [1, 1, 1, 1, 1, 1] };
const FOOT = { askaris: 5, bearers: 6, food: 60 };

function intoTheVeldt() {
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
  events = [...events, event('expedition/outfitted', { seat: 'bottom-1', purchases: FOOT }), event('expedition/moved', { seat: 'bottom-1', path: ['c24r12'] })];
  return { events, pass };
}

describe('natives discovered and the explorer\'s policy (rules §7.7, §8.1)', () => {
  it('rolls for natives on entering a newly mapped hex, places a numbered tribe and asks for a policy', () => {
    const { events } = intoTheVeldt();
    const s = reduce(events);
    expect(s.diagnostics).toEqual([]);
    expect(s.turn).toMatchObject({ current: 'bottom-1', round: 3, phase: 'natives', policy: null });
    expect(s.map['c24r12']).toMatchObject({ terrain: 'veldt', tribe: 1, markers: ['bottom-1'] });
    expect(s.tribes).toEqual({ 1: { id: 1, hex: 'c24r12', warriors: 12, attitude: 0, pending: null, negotiatedBy: [], regard: {}, preachedBy: [], treatedBy: [], defeatedBy: [] } });
    expect(s.turn!.log.at(-1)).toMatchObject({ kind: 'natives', outcome: 'natives on 3: tribe 1 of 12 warriors, 3 × 4 × 5, the 5 cut to 1 for the distance to Mombasa' });
    expect(s.turn!.log.at(-1)!.rolls.map((r) => r.value)).toEqual([1, 2, 3, 4, 5]);
    expect(s.explorers[0].cameFrom).toBe('c25r12');
    const reason = (p: Record<string, unknown>, type = 'natives/policy') => reduce([...events, event(type as 'natives/policy', p)]).diagnostics.at(-1)?.reason;
    expect(reason({ seat: 'bottom-1' }, 'turn/ended')).toBe('choose a policy towards the natives first');
    expect(reason({ seat: 'bottom-1', path: ['c23r12'] }, 'expedition/moved')).toBe('choose a policy towards the natives first');
    expect(reason({ seat: 'bottom-1', policy: 7 })).toBe('natives/policy needs a policy from 1 to 5');
    expect(reason({ seat: 'top-1', policy: 4 })).toBe("it is not top-1's turn");
  });
  it('policy 2 retreats to the previous hex and removes the marker; the tribe stays known and asks again on re-entry without a roll', () => {
    const { events, pass } = intoTheVeldt();
    const r = reduce([...events, event('natives/policy', { seat: 'bottom-1', policy: 2 })]);
    expect(r.diagnostics).toEqual([]);
    expect(r.explorers[0].location).toEqual({ kind: 'port', port: 'mombasa' });
    expect(r.map['c24r12']).toMatchObject({ tribe: 1, markers: [] });
    expect(r.turn).toMatchObject({ phase: 'act', policy: 2, moved: true });
    const ev = [...events, event('natives/policy', { seat: 'bottom-1', policy: 2 }), event('turn/ended', { seat: 'bottom-1' })];
    const again = [...ev, ...pass('top-1', reduce(ev)), event('expedition/moved', { seat: 'bottom-1', path: ['c24r12'] })];
    const s = reduce(again);
    expect(s.diagnostics).toEqual([]);
    expect(s.turn).toMatchObject({ round: 4, phase: 'natives' });
    expect(s.turn!.log.filter((l) => l.kind === 'natives')).toEqual([]); // known tribe: no roll
    expect(s.map['c24r12'].markers).toEqual(['bottom-1']);
    const ignore = reduce([...again, event('natives/policy', { seat: 'bottom-1', policy: 4 })]);
    expect(ignore.turn).toMatchObject({ phase: 'act', policy: 4, moved: false });
    expect(ignore.turn!.log.at(-1)).toMatchObject({ kind: 'reaction', outcome: 'not hostile: 3 on the dice, within the target of 5' });
  });
  it('policy 1 holds the expedition in place and forbids hunting; staying in the hex asks again next turn', () => {
    const { events, pass } = intoTheVeldt();
    const stand = reduce([...events, event('natives/policy', { seat: 'bottom-1', policy: 1 })]);
    expect(stand.turn).toMatchObject({ phase: 'act', policy: 1, moved: true });
    const ev = [...events, event('natives/policy', { seat: 'bottom-1', policy: 1 }), event('turn/ended', { seat: 'bottom-1' })];
    const ended = reduce(ev);
    expect(ended.explorers[0].lastMeal!.rolls[0].value).toBe(6);
    expect(ended.explorers[0].lastMeal!.outcome).toBe('no hunting on a defensive stand: no game, 12 men ate (12 from the stores)');
    const dealt = reduce([...ev, ...pass('top-1', ended)]);
    expect(dealt.turn).toMatchObject({ current: 'bottom-1', round: 4, phase: 'disaster', disaster: { then: 'natives' } }); // the card is read first (prompt 34)
    const next = reduce([...ev, ...pass('top-1', ended), event('disaster/faced', { seat: 'bottom-1' })]);
    expect(next.turn).toMatchObject({ current: 'bottom-1', round: 4, phase: 'natives' });
  });
});
