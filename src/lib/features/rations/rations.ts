// Hunting and the adjustment of rations at the end of an African turn (rules §11), as pure functions.
import type { Chart } from '$features/expedition/prices';
import type { Sickness } from '$lib/game/state';
import type { Terrain } from '$features/map/manifest';
import { hasPart, type Modifier, type Roll } from '$features/map/generate';
import { d6, type DiceAsk, type RngState } from '$lib/game/random';

export interface Camp {
  terrain: Terrain | null;
  river: boolean;
  /** An oasis here, known to this explorer. */
  oasis: boolean;
}

/** A desert hex with neither river nor (known) oasis: the only place water must be carried (rules §5, §11). */
export function dryDesert(camp: Camp): boolean {
  return camp.terrain === 'desert' && !camp.river && !camp.oasis;
}

/** Water rations one turn in the dry desert costs: one per man, four per horse or camel (G-48). */
export function waterPerTurn(chart: Chart, explorers = 1): number {
  return explorers + chart.guides + chart.bearers + chart.askaris + 4 * (chart.horses + chart.camels);
}

export interface DrinkResult {
  chart: Chart;
  drank: number;
  /** Men and animals left without water die (rules §11); thirsty animals are shot for their meat (G-48). */
  died: { guides: number; bearers: number; askaris: number; horses: number; camels: number };
  explorerThirsty: boolean;
  summary: string;
}

/**
 * The evening's water in a dry desert hex: men drink first (the explorer, askaris, bearers, then guides
 * go without in reverse), then horses and camels; anyone without water dies.
 */
export function drink(chart: Chart, camp: Camp, explorers = 1): DrinkResult | null {
  if (!dryDesert(camp)) return null;
  const next = { ...chart };
  let water = next.water;
  const died = { guides: 0, bearers: 0, askaris: 0, horses: 0, camels: 0 };
  const take = (n: number) => { const t = Math.min(water, n); water -= t; return t; };
  const explorerDrank = take(explorers) === explorers; // a joint expedition's explorers drink first, together
  for (const type of ['askaris', 'bearers', 'guides'] as const) {
    const got = take(next[type]);
    died[type] = next[type] - got;
    next[type] = got;
  }
  for (const a of ['horses', 'camels'] as const) {
    const got = Math.floor(take(4 * next[a]) / 4);
    died[a] = next[a] - got;
    next[a] = got;
  }
  const drank = next.water - water;
  next.water = water;
  const meat = 10 * (died.horses + died.camels);
  next.food += meat;
  const parts = [`drank ${drank} water${water ? `, ${water} left` : ''}`];
  const lost = (['guides', 'bearers', 'askaris'] as const).filter((t) => died[t]).map((t) => `${died[t]} ${died[t] === 1 ? t.slice(0, -1) : t}`);
  if (lost.length) parts.push(`${lost.join(', ')} died of thirst`);
  const shot = (['horses', 'camels'] as const).filter((a) => died[a]).map((a) => `${died[a]} ${died[a] === 1 ? a.slice(0, -1) : a}`);
  if (shot.length) parts.push(`${shot.join(' and ')} shot for want of water (${meat} rations)`);
  if (!explorerDrank) parts.push('the explorer is struck down by thirst');
  return { chart: next, drank, died, explorerThirsty: !explorerDrank, summary: parts.join(', ') };
}

/** Terrain modifiers to the hunting die (rules §11): composites add their parts, a river or oasis adds 2 once. */
export function huntingModifiers(camp: Camp): Modifier[] {
  const out: Modifier[] = [];
  const t = camp.terrain;
  if (hasPart(t, 'desert')) out.push({ label: 'desert', value: -4 });
  if (hasPart(t, 'lake')) out.push({ label: 'lake', value: -3 });
  if (hasPart(t, 'swamp')) out.push({ label: 'swamp', value: -1 });
  if (hasPart(t, 'jungle')) out.push({ label: 'jungle', value: 1 });
  if (camp.river || camp.oasis) out.push({ label: camp.river ? 'river' : 'oasis', value: 2 });
  return out;
}

/** Rations per hunter for a modified roll. */
export function rationsPerHunter(total: number): number {
  if (total <= 1) return 0;
  if (total <= 3) return 1;
  if (total <= 5) return 2;
  return 3;
}

export interface HuntResult {
  rolls: Roll[];
  modifiers: Modifier[];
  total: number;
  /** What the modified die needed, as the log notes it. */
  needed: string;
  /** Rations bagged: askaris at the table rate, the explorer at his own (zoologist +1). */
  game: number;
}

/** One die for the expedition (RQ-7), applied per hunter; a zoologist explorer adds one to his own share. */
export function hunt(rng: RngState, camp: Camp, askaris: number, zoologist: boolean): { rng: RngState; result: HuntResult } {
  const modifiers = huntingModifiers(camp);
  const bonus = modifiers.reduce((a, m) => a + m.value, 0);
  const r = d6(rng, 'hunting', { what: 'for the hunt', hint: `the die${bonus ? ` ${bonus > 0 ? '+' : '−'} ${Math.abs(bonus)} for the camp` : ''} bags a ration a hunter at 2, two at 4, three at 6` });
  const total = r.value + modifiers.reduce((a, m) => a + m.value, 0);
  const game = rationsPerHunter(total) * askaris + rationsPerHunter(total + (zoologist ? 1 : 0));
  return { rng: r.state, result: { rolls: [{ label: 'hunting', value: r.value }], modifiers, total, needed: '2 / 4 / 6 for one, two, three a hunter', game } };
}

export interface MealResult {
  chart: Chart;
  men: number;
  fromGame: number;
  fromStore: number;
  /** Horses' rations in the desert (four each). */
  forHorses: number;
  shot: { horses: number; camels: number };
  /** Men and horses left without food: starvation arrives with slice 021. */
  hungryMen: number;
  hungryHorses: number;
  summary: string;
}

/**
 * The meal: every man eats one ration, game first (it does not keep), then the stores; horses in the
 * desert eat four rations each from the stores. When the stores run short, horses and then camels are
 * shot for ten rations apiece (rules §11) before anyone goes hungry.
 */
export function feed(chart: Chart, sick: Sickness, camp: Camp, game: number, explorers = 1): MealResult {
  const next = { ...chart };
  const men = explorers + next.guides + next.bearers + next.askaris;
  const fromGame = Math.min(game, men);
  const desert = camp.terrain === 'desert';
  let need = men - fromGame + (desert ? 4 * next.horses : 0);
  const shot = { horses: 0, camels: 0 };
  while (next.food < need && next.horses + next.camels > 0) {
    if (next.horses > 0) { next.horses--; shot.horses++; } else { next.camels--; shot.camels++; }
    next.food += 10;
    if (desert) need = Math.max(0, need - 4);
  }
  const forHorses = desert ? 4 * next.horses : 0;
  const menFromStore = Math.min(next.food, men - fromGame);
  next.food -= menFromStore;
  const horsesFed = Math.min(next.food, forHorses);
  next.food -= horsesFed;
  const hungryMen = men - fromGame - menFromStore;
  const hungryHorses = Math.ceil((forHorses - horsesFed) / 4);
  const parts: string[] = [];
  parts.push(game ? `${game} rations bagged` : 'no game');
  parts.push(`${men} men ate${fromGame < men ? ` (${menFromStore} from the stores)` : ''}`);
  if (forHorses) parts.push(`${next.horses} horses ate ${horsesFed}`);
  if (shot.horses || shot.camels) parts.push(`shot for food: ${[shot.horses ? `${shot.horses} horse${shot.horses > 1 ? 's' : ''}` : '', shot.camels ? `${shot.camels} camel${shot.camels > 1 ? 's' : ''}` : ''].filter(Boolean).join(' and ')}`);
  if (hungryMen) parts.push(`${hungryMen} men go hungry`);
  if (hungryHorses) parts.push(`${hungryHorses} horses go hungry`);
  void sick;
  return { chart: next, men, fromGame, fromStore: menFromStore, forHorses, shot, hungryMen, hungryHorses, summary: parts.join(', ') };
}

// ---- Starvation, desertion and sickness (rules §11) --------------------------------------------

export interface StarvationResult {
  chart: Chart;
  /** Men still with the expedition but unfed this turn, by type (the explorer separately). */
  starving: { guides: number; bearers: number; askaris: number; explorer: boolean };
  deserted: { guides: number; bearers: number; askaris: number };
  summary: string;
}

/**
 * The hungry go without in the rules' order: bearers first, then guides, askaris, and the explorer last.
 * Starving guides and askaris desert (the askaris with their muskets); starving bearers desert unless an
 * askari guards each of them. Sick men cannot walk away (G-68).
 */
export function starve(chart: Chart, sick: Sickness, hungry: number): StarvationResult {
  const next = { ...chart };
  let left = hungry;
  const take = (n: number) => { const t = Math.min(left, n); left -= t; return t; };
  const bearersHungry = take(next.bearers);
  const guidesHungry = take(next.guides);
  const askarisHungry = take(next.askaris);
  const explorer = take(1) > 0;
  const deserted = { guides: 0, bearers: 0, askaris: 0 };
  // Guides and askaris walk away (the sick among them cannot).
  deserted.guides = Math.max(0, guidesHungry - sick.guides);
  deserted.askaris = Math.max(0, askarisHungry - sick.askaris);
  next.guides -= deserted.guides;
  next.askaris -= deserted.askaris;
  next.muskets = Math.max(0, next.muskets - deserted.askaris);
  // Bearers stay only where an askari guards each; the sick stay regardless.
  const guards = next.askaris;
  const wellHungryBearers = Math.max(0, bearersHungry - sick.bearers);
  deserted.bearers = Math.max(0, wellHungryBearers - guards);
  next.bearers -= deserted.bearers;
  const starving = { guides: guidesHungry - deserted.guides, bearers: bearersHungry - deserted.bearers, askaris: askarisHungry - deserted.askaris, explorer };
  const parts: string[] = [];
  const list = (o: Record<string, number>, verb: string) => Object.entries(o).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${n === 1 ? k.slice(0, -1) : k}`).join(', ') + (Object.values(o).some((n) => n > 0) ? ` ${verb}` : '');
  if (Object.values(deserted).some((n) => n > 0)) parts.push(list(deserted, 'desert'));
  const kept = { guides: starving.guides, bearers: starving.bearers, askaris: starving.askaris };
  if (Object.values(kept).some((n) => n > 0)) parts.push(list(kept, 'go hungry'));
  if (explorer) parts.push('the explorer goes hungry');
  return { chart: next, starving, deserted, summary: parts.join('; ') };
}

export interface SicknessRound {
  rng: RngState;
  rolls: Roll[];
  chart: Chart;
  sick: Sickness;
  died: { guides: number; bearers: number; askaris: number };
  explorerDied: boolean;
  summary: string;
}

type MenType = 'guides' | 'bearers' | 'askaris';
const MEN: MenType[] = ['bearers', 'guides', 'askaris'];

/**
 * Each starving man rolls once: 4–6 and he falls sick. Each man already sick rolls once, −1 with a healthy
 * doctor, +3 if starving: 1 or less recovers, 5 or more dies. The starving sick are counted first (G-68).
 */
export function sicknessRound(rng: RngState, chart: Chart, sick: Sickness, starving: StarvationResult['starving'], doctor: boolean): SicknessRound {
  const rolls: Roll[] = [];
  const roll = (label: string, ask: DiceAsk = { what: `for the ${label}` }) => {
    const r = d6(rng, 'sickness', ask);
    rng = r.state;
    rolls.push({ label, value: r.value });
    return r.value;
  };
  const next = { ...chart };
  const nextSick = { ...sick };
  const died = { guides: 0, bearers: 0, askaris: 0 };
  const notes: string[] = [];
  const healthyDoctor = doctor && !sick.explorer;
  // Recovers at 1 or less, dies at 5 or more, after −1 for a healthy doctor and +3 for starving.
  const sickHint = (doc: boolean, isStarving: boolean) => {
    const shift = (doc ? 1 : 0) - (isStarving ? 3 : 0);
    const lo = 1 + shift;
    const hi = 5 + shift;
    return `${lo >= 1 ? `${lo} or less recovers` : 'no recovery'}, ${hi <= 6 ? `${hi} or more dies` : 'no death'}`;
  };
  // The sick: recovery or death.
  for (const t of MEN) {
    let recovered = 0;
    for (let i = 0; i < sick[t]; i++) {
      const isStarving = i < starving[t];
      const v = roll(`sick ${t.slice(0, -1)}`, { what: `for the sick ${t.slice(0, -1)}`, hint: sickHint(healthyDoctor, isStarving) }) - (healthyDoctor ? 1 : 0) + (isStarving ? 3 : 0);
      if (v <= 1) { nextSick[t]--; recovered++; }
      else if (v >= 5) { nextSick[t]--; next[t]--; died[t]++; }
    }
    if (recovered) notes.push(`${recovered} ${recovered === 1 ? t.slice(0, -1) : t} recover${recovered === 1 ? 's' : ''}`);
    if (died[t]) notes.push(`${died[t]} ${died[t] === 1 ? t.slice(0, -1) : t} die${died[t] === 1 ? 's' : ''} of sickness`);
  }
  let explorerDied = false;
  if (sick.explorer) {
    const v = roll('sick explorer', { what: 'for the sick explorer', hint: sickHint(false, starving.explorer) }) + (starving.explorer ? 3 : 0);
    if (v <= 1) { nextSick.explorer = false; notes.push('the explorer recovers'); }
    else if (v >= 5) { explorerDied = true; notes.push('the explorer dies of sickness'); }
  }
  // The starving who were well: do they fall sick?
  for (const t of MEN) {
    let fell = 0;
    const wellStarving = Math.max(0, starving[t] - sick[t]);
    for (let i = 0; i < wellStarving; i++) if (roll(`starving ${t.slice(0, -1)}`, { what: `for the starving ${t.slice(0, -1)}`, hint: '4+ and he falls sick' }) >= 4) fell++;
    nextSick[t] += fell;
    if (fell) notes.push(`${fell} starving ${fell === 1 ? t.slice(0, -1) : t} fall${fell === 1 ? 's' : ''} sick`);
  }
  if (starving.explorer && !sick.explorer && !explorerDied && roll('starving explorer', { what: 'for the starving explorer', hint: '4+ and he falls sick' }) >= 4) { nextSick.explorer = true; notes.push('the starving explorer falls sick'); }
  return { rng, rolls, chart: next, sick: nextSick, died, explorerDied, summary: notes.join(', ') };
}

/** Sick men must be carried: by an animal, by two unladen bearers, or in a canoe; otherwise the expedition halts. */
export function sickCarried(chart: Chart, sick: Sickness): { sickMen: number; carriers: number; halted: boolean } {
  const sickMen = sick.guides + sick.bearers + sick.askaris + (sick.explorer ? 1 : 0);
  const carriers = chart.camels + chart.horses + Math.floor(Math.max(0, chart.bearers - sick.bearers) / 2) + chart.canoes * 12;
  return { sickMen, carriers, halted: sickMen > carriers };
}
