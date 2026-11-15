// The generator of docs/sample-turn-text.md (PROMPTS.md, prompts 83 and 85): the game's own rules played with dice
// rolled at the table, every text the table then shows written down step by step. It is no test of the game: it runs
// only when asked (`bun run docs:turn-text`), and writes the document over, so the samples always say what the game
// says. The words around the samples (how to read them, what is open, what is not sampled) live in HEAD and TAIL here.
import { it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { modifierText, num } from '$features/map/generate';
import { reduce } from '$lib/game/reduce';
import { created, event, resetSequence } from '$lib/game/test-fixtures';
import { card } from '$features/cards/deck';
import type { GameEvent } from '$lib/game/events';
import type { GameState, RollRecord } from '$lib/game/state';
import { allRecords, lingerLines, resultTitle, segmentsOf } from '$features/dice/linger';
import { movePromptFor, movePromptText } from '$features/turn/move-prompt';
import { emptyDirection, emptyText } from '$features/map/reveal';
import { moveTargets } from '$features/exploration/reducer';
import { manualStatusText } from '$features/dice/manual';
import { statusText, inParts } from '$features/dice/dicecam';

const KIND: Record<string, string> = {
  'first-player': 'First player', 'lost-check': 'Lost check', terrain: 'Terrain', natives: 'Natives', disaster: 'Disaster card', hunting: 'Hunting', water: 'Water',
  reaction: 'Native reaction', combat: 'Fight', defeat: 'Defeat', captivity: 'Captivity', victory: 'Victory', loot: 'Loot', negotiation: 'Negotiation',
  poison: 'Poison', trade: 'Trade', sickness: 'Sickness', specialty: 'Specialty', cache: 'Cache', published: 'Published', transit: 'Transit', party: 'Joint expedition', river: 'River', oasis: 'Oasis'
};
const name = (kind: string) => KIND[kind] ?? kind.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
const diceText = (vs: number[]) => (vs.length ? `[${vs.join(' ')}]` : '');
/** As LogLine has it: the asks under a line account for every die of it, so in a panel the line is its summary alone. */
function accounted(r: RollRecord): boolean {
  if (!r.asks?.length || r.contenders) return false;
  let at = 0;
  for (const a of r.asks) {
    if (a.values.some((v, i) => r.rolls[at + i]?.value !== v)) return false;
    at += a.values.length;
  }
  return at === r.rolls.length;
}
function line(r: RollRecord, rail = false, panel = false): string {
  if (r.kind === 'action') return r.outcome;
  if (panel && accounted(r)) return `**${name(r.kind)}** ${r.outcome}`;
  const parts: string[] = [`**${name(r.kind)}**`];
  if (r.kind === 'disaster' && r.card) parts.push(`(card ${card(r.card).number}: ${r.applies ? card(r.card).disaster.type.replace(/\s*\(.*$/, '') : 'no effect'})`);
  if (r.needed) parts.push(`needs ${rail ? r.needed.replace(/ for .*$/, '') : r.needed}`);
  if (r.contenders) parts.push(r.contenders.map((c) => `${c.seat} ${diceText(c.values)} ${c.total}`).join(', '));
  else if (r.rolls.length) parts.push(diceText(r.rolls.slice(0, 6).map((x) => x.value)) + (r.rolls.length > 6 ? ` (+${r.rolls.length - 6} more dice not drawn)` : ''));
  if (r.modifiers?.length) {
    parts.push(rail ? r.modifiers.map((m) => (m.value > 0 ? `+${m.value}` : m.value === 0 ? '' : num(m.value))).filter(Boolean).join(' ') : r.modifiers.map(modifierText).join(', '));
    if (r.total !== undefined && r.rolls.length) parts.push(`= ${num(r.total)}`);
  }
  parts.push(r.outcome);
  return parts.filter(Boolean).join(' ');
}
const asksOf = (r: RollRecord): string[] => [...(r.asks ?? [])].reverse().map((a) => `    - *${a.prompt}* / Result: ${diceText(a.values)}${a.result ? ` ${a.result}` : ''}`);

export type Step = ['do', string, GameEvent] | ['roll', number[]] | ['say', string] | ['pass'];
const SEAT = 'bottom-1';
let out: string[] = [];
export function run(title: string, intro: string, base: GameEvent[], steps: Step[]) {
  out.push(`\n### ${title}\n`, intro, '');
  let events = [...base];
  let before = reduce(events);
  let n = 0;
  if (steps[0]?.[0] !== 'pass') { out.push('**Before anything is tapped**', ''); panels(before); }
  for (const st of steps) {
    if (st[0] === 'say') { out.push(st[1], ''); continue; }
    n++;
    if (st[0] === 'pass') {
      const e = before.explorers.find((x) => x.seat === 'top-1')!;
      events = [...events, ...(before.turn!.phase === 'discard' ? [event('cards/discarded', { seat: 'top-1', cardIds: [e.hand[0]] })] : []), event('turn/ended', { seat: 'top-1' })];
      out.push(`**${n}. The other player (top-1) plays a turn in Europe and ends it; it is bottom-1's turn again**`, '');
      const s = reduce(events);
      if (s.diagnostics.length) out.push('> DIAGNOSTICS: ' + JSON.stringify(s.diagnostics), '');
      describe(before, s, true);
      before = s;
      continue;
    }
    if (st[0] === 'do') { events = [...events, st[2]]; out.push(`**${n}. ${st[1]}**`, ''); }
    else { events = [...events, event('dice/rolled', { seat: before.awaiting?.seat ?? SEAT, values: st[1] })]; out.push(`**${n}. The dice come up ${st[1].join(', ')}**`, ''); }
    const s = reduce(events);
    if (s.diagnostics.length) out.push('> DIAGNOSTICS: ' + JSON.stringify(s.diagnostics), '');
    describe(before, s);
    before = s;
  }
}
function panels(s: GameState) {
  const t = s.turn;
  if (!t || s.awaiting) return;
  const mp = movePromptFor(s);
  if (mp) out.push(`Move prompt at ${mp.seat}'s edge: "${movePromptText(mp.left, Boolean(mp.natives))}" [${mp.natives ? 'REMAIN' : 'END TURN'}]`, '');
  const ex = s.explorers.find((e) => e.seat === t.current)!;
  const tribe = ex.location.kind === 'hex' ? Object.values(s.tribes).find((x) => x.hex === (ex.location as { hex: string }).hex) : undefined;
  const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);
  if (t.phase === 'disaster' && t.disaster) {
    const c = card(t.disaster.card);
    const applies = (t.disaster as { applies?: boolean }).applies;
    out.push(`Disaster card panel at ${t.current}'s edge:`, '', '- Heading: "Disaster card"', `- Card: "${c.number}" · "${c.disaster.type}" · "${c.disaster.context}"`, `- Text: "${c.disaster.text}"`, `- Button: [Apply it] when the card applies to where the expedition is, else [No effect here: discard it]${applies === undefined ? '' : ` (here: ${applies ? 'applies' : 'no effect'})`}`, '');
  }
  if (t.phase === 'natives' && tribe) {
    const regard = tribe.regard?.[t.current] ?? 0;
    out.push(`Policy panel at ${t.current}'s edge:`, '', `- Heading: "(${tribe.id}) ${tribe.warriors} warriors${tribe.attitude || regard ? ` · attitude ${signed(tribe.attitude)}${regard ? ` (${signed(regard)} for you)` : ''}` : ''}"`,
      '- [1] "Defensive stand" / "Stay put on guard: no hunting, research or trade, no leaving until next turn"', '- [2] "Retreat" / "Back to the hex you came from; your marker here is removed"', '- [3] "Show of force" / "Approach warily, muskets ready"', '- [4] "Ignore them" / "Carry on as if they were not there"', '- [5] "Friendly approach" / "Open hands and gifts"', '');
  }
  if (t.phase === 'spoils' && tribe) {
    const n = tribe.pending?.prisoners ?? (t as unknown as { spoils?: { prisoners: number } }).spoils?.prisoners ?? '?';
    out.push(`Spoils panel at ${t.current}'s edge:`, '', `- Heading: "The village is found · ${n} prisoner${n === 1 ? '' : 's'}"`, '- "Release the prisoners" / "Leave the village alone; the tribe remembers your mercy"', '- "Keep them as bearers and loot" / "A die per warrior met: rations, gifts, a camel or canoe"', '');
  }
  if (t.phase === 'negotiate' && tribe) {
    out.push(`Negotiation panel at ${t.current}'s edge:`, '', `- Heading: "(${tribe.id}) ${tribe.warriors} warriors · (gifts icon) ${ex.chart!.gifts}"`, '- Offer row: [−] "0" [+] [×1] and the button "Offer 0 gifts" / "Gifts × the larger of two dice must reach the warriors" (the count follows the offer: "Offer 4 gifts", "Offer 1 gift")', '- "Give everything" / "All goods and animals but the men; the chief returns three dice of gifts"', '- "Do not negotiate" / "Carry on with the turn"', '');
  }
  if (t.phase === 'trade' && t.trade) {
    const prices = (t.trade as unknown as { prices: Record<string, number> }).prices;
    out.push(`Trade panel at ${t.current}'s edge:`, '', `- Heading: "(gifts icon) ${ex.chart!.gifts} gifts"`, ...Object.entries(prices).map(([item, price]) => `- Row (${item} icon): "${item === 'food' ? `${price} rations / gift` : `${price} gift${price === 1 ? '' : 's'}${item === 'askaris' ? ' + musket' : ''}`}", the count held, [−] to sell, [+] to buy`), '- [Done trading]', '');
  }
}
function describe(before: GameState, s: GameState, quietPass = false) {
  const a = s.awaiting;
  if (a) {
    out.push(`Dice panel at ${a.seat}'s edge:`, '');
    const empty = emptyDirection(s);
    if (empty) out.push(`- Note: "${emptyText(empty)}"`);
    out.push(`- Ask: "${a.prompt}"`);
    const gathered = inParts(a.count, Boolean(a.parts));
    if (gathered) out.push(`- Tally: "${a.have.length} of ${a.count} in"`);
    out.push(`- Status: "${statusText('active', a.count - a.have.length, null, true, true, gathered)}"`);
    const loose = [...(a.asked ?? [])].reverse();
    if (loose.length || a.sofar.length) {
      out.push('- So far (newest first):');
      for (const l of loose) out.push(`  - *${l.prompt}* / Result: ${diceText(l.values)}${l.result ? ` ${l.result}` : ''}`);
      for (const r of [...a.sofar].reverse()) { out.push(`  - ${line(r, false, true)}`); out.push(...asksOf(r)); }
    }
    out.push('');
  } else {
    const lines = lingerLines(before, s);
    if (lines) {
      const seat = before.awaiting!.seat;
      const lost = lines.some((r) => r.lost);
      const ex = s.explorers.find((e) => e.seat === seat);
      const explored = before.awaiting!.event.type === 'expedition/moved' && !lost && s.turn?.current === seat && s.turn.phase === 'act' && ex && moveTargets(s, ex).length > 0;
      const hex = (lines.find((r) => r.kind === 'terrain') ?? lines.at(-1))?.hex;
      const terrain = explored && hex ? (s.map[hex]?.terrain ?? null) : null;
      const segs = [...segmentsOf(lines)].reverse();
      const heading = explored ? `Explored a ${terrain ? terrain.replace(/-/g, ' ') : 'new'} hex` : segs[0]?.title || resultTitle(before.awaiting!.prompt);
      out.push(`Result panel at ${seat}'s edge${explored ? ' (stays until the next step or END TURN)' : ' (five seconds, or OK)'}:`, '');
      out.push(`- Title: "${heading}"`);
      if (explored) out.push(`- Next: "${movePromptText(movePromptFor(s)?.left ?? null)}" [END TURN]`);
      for (const seg of segs) {
        if (segs.length > 1 && seg.title && seg.title !== heading) out.push(`- Segment heading: "${seg.title}"`);
        for (const r of [...seg.lines].reverse()) { out.push(`  - ${line(r, false, true)}`); out.push(...asksOf(r)); }
      }
      if (!explored) out.push('- [OK]');
      out.push('');
    }
  }
  const fresh = allRecords(s).slice(allRecords(before).length);
  if (fresh.length) {
    out.push('Lines added to the log (open log wording):', '', ...fresh.map((r) => `- ${r.seat}: ${line(r)}`), '');
    const last = fresh.at(-1)!;
    out.push(`Rail's one line at ${last.seat}: ${line(last, true)}`, '');
  }
  panels(s);
  void quietPass;
}

const LAYOUT = { bottom: 2, top: 2, left: 1, right: 1 };
const seatAndCommission = (seat: string, specialties: string[] = []) => [event('seat/taken', { seat, uid: `table:${seat}` }), event('explorer/commissioned', { seat, specialties })];
export function inAfrica(purchases: Record<string, number> = { askaris: 5, bearers: 6, food: 40, gifts: 20 }, specialties: string[] = []): GameEvent[] {
  const base = [created('ABCDE', LAYOUT, 18, { main: [6, 6, 6, 6, 1, 1, 1, 1] }), ...seatAndCommission('bottom-1', specialties), ...seatAndCommission('top-1'), event('game/started', {})];
  const s0 = reduce(base);
  const ticket = s0.explorers[0].hand.find((id) => card(id).donation.kind === 'ticket' && (card(id).donation as { port: string }).port === 'mombasa')!;
  const pass = (seat: string, s: ReturnType<typeof reduce>) => {
    const e = s.explorers.find((x) => x.seat === seat)!;
    return s.turn!.phase === 'discard' ? [event('cards/discarded', { seat, cardIds: [e.hand[0]] }), event('turn/ended', { seat })] : [event('turn/ended', { seat })];
  };
  let events = [...base, event('voyage/booked', { seat: 'bottom-1', port: 'mombasa', ticketCardId: ticket }), event('turn/ended', { seat: 'bottom-1' })];
  events = [...events, ...pass('top-1', reduce(events))];
  events = [...events, ...pass('top-1', reduce(events))];
  return [...events, event('expedition/outfitted', { seat: 'bottom-1', purchases }), event('dice/physical', { on: true })];
}
const move = (hex: string) => event('expedition/moved', { seat: SEAT, path: [hex] });

it.skipIf(!process.env.TURN_TEXT)('writes docs/sample-turn-text.md', () => {
  out = [];
  resetSequence();
  const R = (...v: number[]): Step => ['roll', v];
  const end = (seat: string) => event('turn/ended', { seat });
  const pol = (n: number) => event('natives/policy', { seat: SEAT, policy: n });
  const sp = (choice: string) => event('natives/spoils', { seat: SEAT, choice });
  const faced = () => event('disaster/faced', { seat: SEAT });
  const roll = (v: number[]) => event('dice/rolled', { seat: SEAT, values: v });
  const T = 'c23r12';
  const tap = (hex: string): Step => ['do', `The player taps hex ${hex} on the board`, move(hex)];
  const endTurn = (): Step => ['do', 'The player taps END TURN', end(SEAT)];
  const policy = (n: number, name: string): Step => ['do', `The player chooses policy ${n}, "${name}"`, pol(n)];
  // Bases
  const africa = inAfrica();
  const turn1 = [...africa, move('c24r12'), roll([4]), roll([3]), roll([3]), roll([3, 3]), end(SEAT), roll([3])];
  const s1 = reduce(turn1);
  const e1 = s1.explorers.find((x) => x.seat === 'top-1')!;
  const turn2 = [...turn1, ...(s1.turn!.phase === 'discard' ? [event('cards/discarded', { seat: 'top-1', cardIds: [e1.hand[0]] })] : []), end('top-1')];
  const field = [...turn2, faced()];
  const met = [...field, move(T), roll([4]), roll([2]), roll([3]), roll([1, 2]), roll([2, 2, 3])];

  run('A1. Not lost, terrain copied from a neighbour, no river, no natives; then the end of the turn and the hunt', 'The expedition has just been outfitted at Mombasa. The step costs both movement points, so the result is shown for five seconds rather than kept with a prompt for the next step.', africa,
    [tap('c24r12'), R(4), R(3), R(3), R(3, 3), endTurn(), R(3)]);
  run('A2. Nothing to copy: the terrain table, a composite (jungle with mountain), the peak, a river with a cataract, natives found', 'The same step from Mombasa with other dice.', africa,
    [tap('c24r12'), R(4), R(6), R(6), R(4), R(2), R(5, 6, 4), R(2), R(6), R(3), R(2, 3, 4, 5), R(1, 2), R(3, 3, 3)]);
  run('A3. The terrain cannot be entered on foot: the expedition turns back', 'The second turn in the field, from c24r12.', field, [tap(T), R(4), R(3), R(3), R(3), R(3)]);
  run('A4. A step into a hex already on the map', 'From c24r12 back toward the coast: one movement point, so a point is left afterwards.', field, [tap('c24r13')]);
  run('B1. The disaster card at the start of the turn, then lost on the first step', 'The second turn in the field: the turn opens with the disaster card.', turn2, [['do', 'The player taps the card\'s button', faced()], tap(T), R(1), R(1)]);
  run('C1. Natives found by a step: the policy panel', 'From c24r12 into c23r12.', field, [tap(T), R(4), R(2), R(3), R(1, 2), R(2, 2, 3)]);
  run('C2. Show of force, hostile: the fight won, prisoners taken, the village found and looted', 'Continues C1.', met,
    [policy(3, 'Show of force'), R(6, 6, 6), R(1), R(6, 6), R(6), R(2), R(1, 2), ['do', 'The player chooses "Keep them as bearers and loot"', sp('keep')], R(3, 3, 3, 3), R(1, 6, 2, 5), endTurn(), R(4)]);
  run('C3. Show of force, hostile: the natives lose their nerve and hide', 'Continues C1.', met, [policy(3, 'Show of force'), R(6, 6, 6), R(6)]);
  run('C4. Show of force, hostile: surprised and defeated, the explorer taken prisoner; the escape roll on the next turn', 'Continues C1.', met,
    [policy(3, 'Show of force'), R(6, 6, 6), R(1), R(1, 1), R(1), R(2), endTurn(), ['pass'], R(6)]);
  run('C5. Friendly approach, not hostile: gifts offered, the chief satisfied, trade', 'Continues C1.', met,
    [policy(5, 'Friendly approach'), R(1, 1, 1), ['do', 'The player offers 4 gifts', event('natives/offered', { seat: SEAT, gifts: 4 })], R(3, 5), R(3), R(3), R(3), R(3),
      ['do', 'The player buys with [+] on the food row', event('natives/traded', { seat: SEAT, item: 'food', count: 1, direction: 'buy' })], ['do', 'The player taps Done trading', event('natives/done', { seat: SEAT })]]);
  run('C6. Friendly approach: the offer falls short', 'Continues C1.', met, [policy(5, 'Friendly approach'), R(1, 1, 1), ['do', 'The player offers 4 gifts', event('natives/offered', { seat: SEAT, gifts: 4 })], R(1, 1), R(3), R(3, 3), R(1), R(6), R(6, 6)]);
  run('C7. Friendly approach: no gifts given', 'Continues C1.', met, [policy(5, 'Friendly approach'), R(1, 1, 1), ['do', 'The player chooses "Do not negotiate"', event('natives/offered', { seat: SEAT, decline: true })]]);
  run('C8. Retreat', 'Continues C1.', met, [policy(2, 'Retreat')]);
  run('C9. Defensive stand', 'Continues C1.', met, [policy(1, 'Defensive stand'), R(1, 1, 1)]);
  run('C10. Ignore them, not hostile; the next turn begins among the natives, and REMAIN meets them again', 'Continues C1.', met,
    [policy(4, 'Ignore them'), R(1, 1, 1), endTurn(), R(3), ['pass'], ['do', 'The player taps the card\'s button', faced()], ['do', 'The player taps REMAIN', end(SEAT)]]);
  const big = [...field, move(T), roll([4]), roll([2]), roll([3]), roll([1, 2]), roll([2, 3, 3])];
  const few = [...field, move(T), roll([4]), roll([2]), roll([3]), roll([1, 2]), roll([1, 1, 2])];
  run('C11. Show of force, hostile: the volley does not drive them off, and the fight goes hand to hand', 'A tribe of 12 warriors, found as in C1 with other dice for the warriors.', big,
    [policy(3, 'Show of force'), R(6, 6, 6), R(1), R(6, 6), R(1), R(6), R(1), R(2), R(1), R(3), R(1), R(1), R(6), R(6, 6)]);
  run('C12. Defeated, the explorer escapes with two survival rolls', 'Continues C1; the fight as in C4.', met,
    [policy(3, 'Show of force'), R(6, 6, 6), R(1), R(1, 1), R(1), R(6), R(2), R(1), R(4), R(2), R(5)]);
  run('C13. Friendly approach: everything given to the chief', 'Continues C1.', met,
    [policy(5, 'Friendly approach'), R(1, 1, 1), ['do', 'The player chooses "Give everything"', event('natives/offered', { seat: SEAT, everything: true })], R(2, 3, 4), R(3), R(3), R(3), R(3)]);
  run('C14. Friendly approach: the chief insulted but too weak to attack, so he tries poison', 'A tribe of 2 warriors, found as in C1 with other dice for the warriors.', few,
    [policy(5, 'Friendly approach'), R(1, 1, 1), ['do', 'The player offers 1 gift', event('natives/offered', { seat: SEAT, gifts: 1 })], R(1, 1), R(6), R(3)]);
  writeFileSync('docs/sample-turn-text.md', assemble(out.join('\n')));
});

/** The samples between the words kept beside this file, grouped under the three headings. */
function assemble(body: string): string {
  const here = 'src/lib/docs/sample-turn-text';
  let text = body.trim().replace(/\n{3,}/g, '\n\n');
  for (const [first, heading] of [['A1', '## A. A step into a hex'], ['B1', '## B. The start of a turn in the field, and a step that gets lost'], ['C1', '## C. Natives']]) text = text.replace(`### ${first}.`, `${heading}\n\n### ${first}.`);
  return `${readFileSync(`${here}.head.md`, 'utf8').trimEnd()}\n\n${text}\n${readFileSync(`${here}.tail.md`, 'utf8')}`;
}
