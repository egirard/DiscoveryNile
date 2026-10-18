// The disaster face of each card (rules §10), resolved as a pure function over the seeded dice.
// Card texts are the deck CSV's; the numbers below index them. Procedures that need systems from
// later slices (combat, the defeat table, the poisoning table) are recorded and left for them.
import type { Card } from '$features/cards/deck';
import type { Chart } from '$features/expedition/prices';
import type { Specialty, Sickness } from '$lib/game/state';
import type { Terrain } from '$features/map/manifest';
import { hasPart } from '$features/map/generate';
import type { Roll } from '$features/map/generate';
import { d6, dice as rollDice, noting, type DiceAsk, type RngState } from '$lib/game/random';

/** The expedition's circumstances when the card is drawn. */
export interface Situation {
  terrain: Terrain | null;
  river: boolean;
  /** An oasis here, known to this explorer. */
  oasis: boolean;
  /** A coastal hex: "far out on the sea" cards apply. */
  sea: boolean;
}

export interface Party {
  chart: Chart;
  sick: Sickness;
  specialties: Specialty[];
}

export interface DisasterResult {
  rng: RngState;
  applies: boolean;
  outcome: string;
  rolls: Roll[];
  chart: Chart;
  sick: Sickness;
  /** The expedition may not move this turn. */
  halted: boolean;
  /** "The Explorer is affected instead" by a killing card (rules §10). */
  explorerDies: boolean;
}

type Men = 'guides' | 'bearers' | 'askaris';
const MEN: Men[] = ['bearers', 'askaris', 'guides'];
const half = (n: number) => Math.ceil(n / 2);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : word.endsWith('s') ? '' : 's'}`;

/** Whether the card's context matches the situation. */
export function applies(card: Card, s: Situation): boolean {
  const t = s.terrain;
  switch (card.disaster.context) {
    case 'VELDT': return t === 'veldt';
    case 'JUNGLE': return t !== null && hasPart(t, 'jungle');
    case 'MOUNTAIN': return t !== null && hasPart(t, 'mountain');
    case 'SWAMP': return t !== null && hasPart(t, 'swamp');
    case 'DESERT': return t === 'desert';
    case 'LAKE': return t === 'lake';
    case 'RIVER': return s.river;
    case 'JUNGLE / RIVER': return t !== null && hasPart(t, 'jungle') && s.river;
    case 'DESERT (Oasis)': return t === 'desert' && s.oasis;
    case 'LAKE / SEA': return t === 'lake' || s.sea;
    default: return true; // General and "None / Special"
  }
}

class Resolver {
  rolls: Roll[] = [];
  notes: string[] = [];
  chart: Chart;
  sick: Sickness;
  halted = false;
  explorerDies = false;
  constructor(public rng: RngState, party: Party, private specialties: Specialty[], private seat?: string) {
    this.chart = { ...party.chart };
    this.sick = { ...party.sick };
  }
  /** The card is drawn at the start of the explorer's turn by the previous seat's `turn/ended`: the ask names him. */
  private roll(label: string, ask: DiceAsk = { what: `for the ${label}` }): number {
    const r = this.asking(() => d6(this.rng, 'main', { ...ask, seat: this.seat }));
    this.rng = r.state;
    this.rolls.push({ label, value: r.value });
    return r.value;
  }
  /** A die asked for part way through the card: the card's line so far, its dice and what they did, goes with the ask (prompt 56). */
  private asking<T>(run: () => T): T {
    return noting(run, { making: () => ({ kind: 'disaster', applies: true, rolls: [...this.rolls], outcome: this.notes.join(', ') || 'the dice so far' }) });
  }
  /** One die per explorer and askari; a 6 (5–6 for a zoologist explorer) is a kill. */
  shoot(label: string): number {
    let kills = 0;
    const explorerHits = this.specialties.includes('zoology') ? 5 : 6;
    if (this.roll(`${label}: explorer`, { what: `for the explorer's shot (${label})`, hint: `${explorerHits}+ kills` }) >= explorerHits) kills++;
    for (let i = 0; i < this.chart.askaris; i++) if (this.roll(`${label}: askari`, { what: `for an askari's shot (${label})`, hint: '6 kills' }) === 6) kills++;
    return kills;
  }
  /** A doctor's 6 averts sickness, poison and snakebite. */
  doctorAverts(): boolean {
    if (!this.specialties.includes('medicine')) return false;
    const v = this.roll('doctor', { what: 'for the doctor', hint: '6 averts it' });
    if (v === 6) this.notes.push('averted by the doctor');
    return v === 6;
  }
  kill(type: Men, n: number) {
    const taken = Math.min(n, this.chart[type]);
    this.chart[type] -= taken;
    if (taken) this.notes.push(`${plural(taken, type.slice(0, -1))} killed`);
    if (taken < n) this.strikeExplorer('killed');
  }
  sicken(type: Men, n: number) {
    const well = this.chart[type] - this.sick[type];
    const taken = Math.min(n, Math.max(0, well));
    this.sick[type] += taken;
    if (taken) this.notes.push(`${plural(taken, type.slice(0, -1))} sick`);
    if (taken < n) this.strikeExplorer('sick');
  }
  /** "The Explorer is affected instead!" (rules §10): a killing card kills him, a sickening card sickens him (G-38). */
  strikeExplorer(how: 'killed' | 'sick') {
    if (how === 'killed') {
      if (this.explorerDies) return;
      this.explorerDies = true;
      this.notes.push('no such men: the explorer is struck down and dies');
      return;
    }
    if (this.sick.explorer) return;
    this.sick.explorer = true;
    this.notes.push('no such men: the explorer is sick');
  }
  loseAnimals(n: number, what = 'animal') {
    let left = n;
    for (const a of ['camels', 'horses'] as const) {
      const taken = Math.min(left, this.chart[a]);
      this.chart[a] -= taken;
      left -= taken;
    }
    if (n - left) this.notes.push(`${plural(n - left, what)} lost`);
  }
  loseMen(n: number, how = 'lost') {
    let left = n;
    for (const type of MEN) {
      const taken = Math.min(left, this.chart[type]);
      this.chart[type] -= taken;
      left -= taken;
      if (taken) this.notes.push(`${plural(taken, type.slice(0, -1))} ${how}`);
    }
    if (left > 0) this.strikeExplorer('killed');
  }
  halve(what: readonly (keyof Chart & string)[], how: string) {
    for (const k of what) {
      const n = this.chart[k] as number;
      const taken = half(n);
      if (taken) {
        (this.chart as unknown as Record<string, number>)[k] = n - taken;
        this.notes.push(`${plural(taken, k.endsWith('s') ? k.slice(0, -1) : k)} ${how}`);
      }
    }
  }
  /** Canoes overturned: their share of the goods is lost, the canoes are not (rules §10 note). */
  overturn(n: number) {
    const canoes = this.chart.canoes;
    if (!canoes) return;
    const share = Math.min(n, canoes) / canoes;
    for (const k of ['food', 'gifts', 'muskets'] as const) {
      const lost = Math.floor(this.chart[k] * share);
      this.chart[k] -= lost;
      if (lost) this.notes.push(`${lost} ${k} lost`);
    }
    this.notes.push(`${plural(Math.min(n, canoes), 'canoe')} overturned`);
  }
  twoDice(label: string, ask: DiceAsk = { what: `for the ${label}` }): number {
    const r = this.asking(() => rollDice(this.rng, 2, 'main', { ...ask, seat: this.seat }));
    this.rng = r.state;
    r.values.forEach((v) => this.rolls.push({ label, value: v }));
    return r.values[0] + r.values[1];
  }
  /** The geologist is safe from rockslides and flash floods. */
  geologistSafe(): boolean {
    if (!this.specialties.includes('geology')) return false;
    this.notes.push('the geologist saw it coming: no harm');
    return true;
  }
}

const MEN_ALL: readonly (keyof Chart & string)[] = ['bearers', 'askaris', 'guides'];
const ANIMALS: readonly (keyof Chart & string)[] = ['camels', 'horses'];
const GOODS: readonly (keyof Chart & string)[] = ['canoes', 'muskets', 'food', 'gifts', 'water'];

export function resolveDisaster(rng: RngState, card: Card, situation: Situation, party: Party, seat?: string): DisasterResult {
  const r = new Resolver(rng, party, party.specialties, seat);
  const done = (applies: boolean, outcome?: string): DisasterResult => ({
    rng: r.rng, applies, outcome: outcome ?? (r.notes.join(', ') || 'no effect'), rolls: r.rolls, chart: r.chart, sick: r.sick, halted: r.halted, explorerDies: r.explorerDies
  });
  if (card.disaster.type === 'None') return done(false, 'no disaster on this card');
  if (!applies(card, situation)) return done(false, `not here: ${card.disaster.context.toLowerCase()}`);
  const n = card.number;
  const sickness = (apply: () => void) => { if (!r.doctorAverts()) apply(); };
  switch (n) {
    case 1: r.kill('askaris', 1); break;
    case 2: sickness(() => { r.sicken('bearers', half(r.chart.bearers)); r.sicken('askaris', half(r.chart.askaris)); r.sicken('guides', half(r.chart.guides)); }); break;
    case 3: sickness(() => sickenMen(r, 5)); break;
    case 5: r.kill('guides', 1); break;
    case 6: sickness(() => { r.sicken('askaris', 4); r.sicken('bearers', 4); }); break;
    case 7: if (!r.doctorAverts()) r.kill('guides', 1); break;
    case 8: return done(true, 'a rumour: the Elephants’ Graveyard lies in the next hex east');
    case 9: { const shot = r.shoot('hippo'); const wrecked = Math.min(r.chart.canoes, Math.max(0, 4 - shot)); r.chart.canoes -= wrecked; r.notes.push(`${plural(shot, 'hippo')} shot, ${plural(wrecked, 'canoe')} wrecked`); break; }
    case 11: r.kill('bearers', 1); break;
    case 12: if (!r.geologistSafe()) { r.halve(MEN_ALL, 'drowned'); r.halve(ANIMALS, 'drowned'); } break;
    case 13: { const shot = r.shoot('crocodile'); if (shot >= 4) r.notes.push('all four crocodiles shot: the askari is saved'); else { r.notes.push(`${plural(shot, 'crocodile')} shot`); r.kill('askaris', 1); } break; }
    case 14: { const stay = Math.max(0, r.chart.bearers - r.chart.askaris); r.chart.bearers -= stay; r.notes.push(stay ? `${plural(stay, 'bearer')} refuse to go on and desert` : 'the askaris keep every bearer in line'); break; }
    case 15: r.halve(ANIMALS, 'lost in the sandstorm'); if (!r.notes.length) r.notes.push('no animals to lose'); break;
    case 16: { const toll = r.twoDice('toll', { what: 'for the toll', hint: 'in gifts' }); if (r.chart.gifts >= toll) { r.chart.gifts -= toll; r.notes.push(`toll of ${toll} gifts paid`); } else r.notes.push(`toll of ${toll} gifts cannot be paid: the raiders attack (combat arrives with slice 017)`); break; }
    case 17: r.kill('askaris', 4); break;
    case 18: return done(true, 'the oasis is poisoned (the poisoning table arrives with slice 019)');
    case 19: if (!r.geologistSafe()) { r.halve(MEN_ALL, 'lost'); r.halve(ANIMALS, 'lost'); r.halve(GOODS, 'lost'); r.chart.water = Math.max(r.chart.water, 0); r.notes.push('plenty of water found'); } break;
    case 20: sickness(() => r.sicken('askaris', 1)); break;
    case 21: r.overturn(1); break;
    case 22: if (!r.geologistSafe()) { r.halve(MEN_ALL, 'lost'); r.halve(ANIMALS, 'lost'); r.halve(GOODS, 'lost'); } break;
    case 23: { let charges = 0; while (charges < 6) { charges++; if (r.shoot(`charge ${charges}`) > 0) { r.notes.push(`the rhino is shot on charge ${charges}`); break; } r.loseMen(1, 'killed by the rhino'); } break; }
    case 24: r.kill('askaris', 1); break;
    case 25: r.loseAnimals(1, 'horse'); break;
    case 26: r.kill('bearers', 1); break;
    case 27: { const eaten = Math.min(r.chart.food, r.chart.camels + r.chart.horses); r.chart.food -= eaten; r.notes.push(eaten ? `${eaten} rations fed to the animals` : 'no animals to feed'); break; }
    case 28: r.kill('guides', 1); break;
    case 29: return done(true, 'forty cannibals attack (hostile natives arrive with slice 017)');
    case 30: { const shot = r.shoot('baboon'); const lost = Math.max(0, 6 - Math.floor(shot / 2)); r.notes.push(`${plural(shot, 'baboon')} shot`); r.loseMen(lost, 'killed by the baboons'); break; }
    case 31: return done(true, 'a warning: powerful, unfriendly natives in the next blank hex east; the guide will desert if you go there');
    case 32: r.chart.canoes += 1; r.chart.gifts += 10; r.chart.muskets += 1; r.notes.push('a cache found: 1 canoe, 10 gifts and a musket'); break;
    case 33: sickness(() => { for (const t of MEN) r.sicken(t, r.chart[t] - r.sick[t]); const a = half(r.chart.camels + r.chart.horses - r.sick.animals); r.sick.animals += a; if (a) r.notes.push(`${plural(a, 'animal')} sick`); if (!r.notes.length) r.strikeExplorer('sick'); }); break;
    case 34: r.overturn(half(r.chart.canoes)); if (!r.chart.canoes) r.notes.push('no canoes to overturn'); break;
    case 35: sickness(() => { r.sicken('bearers', 6); r.sicken('askaris', 1); }); break;
    case 36: { const lost = Math.min(10, r.chart.food); r.chart.food -= lost; r.notes.push(`${lost} rations thrown away`); break; }
    case 37: r.loseAnimals(2, 'horse'); r.kill('bearers', 1); break;
    case 38: { const shot = r.shoot('crocodile'); if (shot > 0) r.notes.push('the crocodile is shot: the guide is saved'); else r.kill('guides', 1); break; }
    case 39: sickness(() => { for (const t of MEN) r.sicken(t, half(r.chart[t] - r.sick[t])); if (!r.notes.length) r.strikeExplorer('sick'); }); break;
    case 40: sickness(() => r.sicken('bearers', 4)); break;
    case 41: r.halted = true; r.notes.push('bad omens: the bearers will not leave camp this turn'); break;
    case 42: r.kill('guides', 1); break;
    case 43: { const raiders = r.twoDice('raiders', { what: 'for the raiders', hint: 'how many animals they are after' }); const shot = r.shoot('raider'); const stolen = Math.max(0, Math.min(raiders, r.chart.camels + r.chart.horses) - shot); r.notes.push(`${plural(shot, 'raider')} shot`); r.loseAnimals(stolen, 'animal'); if (!stolen) r.notes.push('no animal stolen'); break; }
    case 44: r.kill('askaris', 1); break;
    case 45: sickness(() => r.sicken('bearers', 1)); break;
    case 46: { const roll = d6(r.rng, 'main', { what: 'on the consequences of defeat', hint: 'plus 2: 3 escapes alone, 4 a musket and rations, 5 and 6 survival rolls', seat }); r.rng = roll.state; r.rolls.push({ label: 'defeat', value: roll.value }); return done(true, `the camp is destroyed: defeat roll ${roll.value} + 2 (the consequences of defeat table arrives with slice 018)`); }
    case 47: if (!r.doctorAverts()) r.kill('bearers', 1); break;
    case 48: r.kill('bearers', 1); break;
    default: return done(true, 'no effect');
  }
  return done(true);
}

/** n men fall sick, bearers first, then askaris, then guides; the explorer when they run out. */
function sickenMen(r: Resolver, n: number) {
  let left = n;
  for (const t of MEN) {
    const well = Math.max(0, r.chart[t] - r.sick[t]);
    const taken = Math.min(left, well);
    if (taken) r.sicken(t, taken);
    left -= taken;
  }
  if (left > 0) r.strikeExplorer('sick');
}
