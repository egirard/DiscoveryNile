// After the fight (rules §8.4): the consequences of defeat with the Escape Survival table, captivity,
// and the results of victory — prisoners, the village, looting. Pure functions over the 'combat' stream.
import { NO_PURCHASES, type Chart } from '$features/expedition/prices';
import type { Terrain } from '$features/map/manifest';
import { capital, num, type Roll } from '$features/map/generate';
import { count, d6, dice, rollOf, type DiceAsk, type RngState } from '$lib/game/random';

export type Fate = 'killed' | 'prisoner' | 'alone' | 'musket' | 'one-roll' | 'two-rolls';

export interface DefeatResult {
  rng: RngState;
  rolls: Roll[];
  fate: Fate;
  /** What the explorer has after escaping (nothing when killed or held). */
  chart: Chart;
  summary: string;
}

const EMPTY: Chart = { ...NO_PURCHASES, water: 0, guideHomes: {} };
const ITEMS = ['guides', 'bearers', 'askaris', 'camels', 'horses', 'canoes'] as const;
const LOADED = new Set(['bearers', 'camels', 'horses', 'canoes']);

export function fateOf(total: number): Fate {
  if (total <= 1) return 'killed';
  if (total === 2) return 'prisoner';
  if (total === 3) return 'alone';
  if (total === 4) return 'musket';
  if (total === 5) return 'one-roll';
  return 'two-rolls';
}

/** A captive's escape, face by face (prompt 89): "6 escapes with nothing, 5 stays held, 1 to 4 is fatal". */
export function escapeHint(modifier: number): string {
  const WORDS: Record<ReturnType<typeof fateOf>, string> = { killed: 'is fatal', prisoner: 'stays held', alone: 'escapes with nothing', musket: 'escapes with a musket and 9 rations', 'one-roll': 'escapes with a musket, 9 rations and one companion', 'two-rolls': 'escapes with a musket, 9 rations and two companions' };
  const groups: { from: number; to: number; fate: ReturnType<typeof fateOf> }[] = [];
  for (let v = 6; v >= 1; v--) {
    const fate = fateOf(v + modifier);
    const last = groups.at(-1);
    if (last && last.fate === fate) last.from = v;
    else groups.push({ from: v, to: v, fate });
  }
  return groups.map((g) => `${g.from === g.to ? g.to : `${g.from} to ${g.to}`} ${WORDS[g.fate]}`).join(', ');
}

/**
 * One die (less three for a captive's escape attempt) on the consequences-of-defeat table. Survival
 * rolls yield only what the expedition had (`had`), re-rolling impossible results.
 */
export function consequencesOfDefeat(rng: RngState, had: Chart, modifier = 0, seat?: string): DefeatResult {
  const rolls: Roll[] = [];
  const roll = (label: string, ask: DiceAsk = { what: `Roll a D6 for ${label}`, label, seat }) => {
    const r = d6(rng, 'combat', ask);
    rng = r.state;
    rolls.push({ label, value: r.value });
    return r.value;
  };
  const die = roll(modifier ? 'escape' : 'defeat', { what: modifier ? 'Escape? Roll a D6' : 'Defeat. Roll a D6', hint: modifier ? escapeHint(modifier) : '1 killed, 2 held prisoner, 3 escape with nothing, 4 with a musket and 9 rations, 5 the same and one companion, 6 the same and two', label: modifier ? 'Escape?' : 'Defeat', seat, result: ([v]) => { const f = fateOf(v + modifier); return `=> ${f === 'killed' ? 'The explorer is killed' : f === 'prisoner' ? (modifier ? 'Still held' : 'The explorer is held prisoner') : f === 'alone' ? (modifier ? 'The explorer escapes alone, with nothing' : 'The explorer escapes alone with nothing') : f === 'musket' ? 'The explorer escapes with a musket and 9 rations' : f === 'one-roll' ? 'The explorer escapes with a musket, 9 rations and one companion' : 'The explorer escapes with a musket, 9 rations and two companions'}`; } });
  const fate = fateOf(die + modifier);
  const chart: Chart = { ...EMPTY };
  // The die and its modifier open the line (prompt 56): "defeat 2: the explorer is held prisoner", "escape 5 − 3 = 2: …".
  const notes: string[] = [`${modifier ? 'escape' : 'defeat'} ${die}${modifier ? ` ${modifier > 0 ? '+' : '−'} ${Math.abs(modifier)} = ${num(die + modifier)}` : ''}:`];
  if (fate === 'killed') notes.push('the explorer is killed');
  else if (fate === 'prisoner') notes.push(modifier ? 'the explorer is held prisoner' : 'the explorer is held prisoner and the expedition is lost; an escape is rolled for each turn');
  else {
    notes.push(modifier ? 'the explorer escapes alone' : 'the explorer escapes alone, the expedition lost');
    if (fate !== 'alone') {
      chart.muskets = 1;
      chart.food = 9;
      notes.push('with a musket and 9 rations');
      const tries = fate === 'one-roll' ? 1 : fate === 'two-rolls' ? 2 : 0;
      for (let i = 0; i < tries; i++) {
        let item: (typeof ITEMS)[number] | null = null;
        for (let attempt = 0; attempt < 12 && !item; attempt++) {
          const candidate = ITEMS[roll('survival', { what: 'Who gets away with you? Roll a D6', hint: '1 guide, 2 bearer, 3 askari, 4 camel, 5 horse, 6 canoe', label: 'Companion', seat, result: ([v]) => { const it = ITEMS[v - 1]; const noun = it.slice(0, -1); return had[it] > 0 ? `=> ${/^[aeiou]/.test(noun) ? 'An' : 'A'} ${noun}` : `=> ${capital(noun)}: the expedition had none. Roll a D6 again.`; } }) - 1];
          if (had[candidate] > 0) item = candidate;
        }
        if (!item) { notes.push('nothing more to be found'); continue; }
        chart[item] += 1;
        const noun = item.slice(0, -1);
        let note = `${/^[aeiou]/.test(noun) ? 'an' : 'a'} ${noun} (survival ${rolls.at(-1)!.value})`;
        if (LOADED.has(item)) {
          const load = roll('load', { what: `The ${noun}'s load: Roll a D6`, hint: '1 to 3 ten rations, 4 or 5 ten gifts, 6 ten muskets', label: 'Load', seat, result: ([v]) => (v <= 3 ? '=> 10 rations' : v <= 5 ? '=> 10 gifts' : '=> 10 muskets') });
          if (load <= 3) { chart.food += 10; note += ` with 10 rations (load ${load})`; }
          else if (load <= 5) { chart.gifts += 10; note += ` with 10 gifts (load ${load})`; }
          else { chart.muskets += 10; note += ` with 10 muskets (load ${load})`; }
        }
        notes.push(note);
      }
    }
  }
  return { rng, rolls, fate, chart, summary: `${notes[0]} ${notes.slice(1).join(', ')}` };
}

export interface VictoryResult {
  rng: RngState;
  rolls: Roll[];
  prisoners: number;
  /** A six: the askaris take no prisoners and loot the village if it is found. */
  noQuarter: boolean;
  villageFound: boolean;
  summary: string;
}

/** Prisoners (surviving askaris less a die, at most the surviving warriors) and the search for the village. */
export function resultsOfVictory(rng: RngState, askaris: number, warriors: number, policy: number): VictoryResult {
  const p = d6(rng, 'combat', { what: warriors === 0 ? 'Prisoners: no warrior is left to take' : `Prisoners: ${count(askaris, 'askari')} less the die, at most the ${count(warriors, 'warrior')} left`, hint: warriors === 0 ? 'a 6 loots the village if it is found' : 'a 6 takes none', label: 'Prisoners', result: ([v]) => (warriors === 0 ? '=> None: no warrior is left' : v === 6 ? '=> None taken' : `${askaris} − ${v} = ${Math.max(0, askaris - v)} => ${Math.min(Math.max(0, askaris - v), warriors)} taken${askaris - v > warriors ? ', all who were left' : ''}`) });
  rng = p.state;
  const rolls: Roll[] = [{ label: 'prisoners', value: p.value }];
  const noQuarter = p.value === 6;
  const prisoners = noQuarter ? 0 : Math.min(Math.max(0, askaris - p.value), warriors);
  const v = dice(rng, 2, 'combat', { what: `Village found? ${rollOf(2)}`, hint: `${prisoners + policy} or less finds it (${count(prisoners, 'prisoner')} + policy ${policy})`, label: 'Village?', result: ([a, b]) => `${a + b}, ${a + b <= prisoners + policy ? 'not over' : 'over'} ${prisoners + policy} => ${a + b <= prisoners + policy ? 'The village is found' : 'Not found'}` });
  rng = v.state;
  v.values.forEach((value) => rolls.push({ label: 'village', value }));
  const villageFound = v.values[0] + v.values[1] <= prisoners + policy;
  // Each check with its arithmetic (prompt 56): the askaris less the die, then two dice against prisoners plus policy.
  const taken = warriors === 0 ? 'prisoners: none, every warrior fell' : noQuarter ? 'prisoners: a 6, no quarter, none taken' : `prisoners: ${askaris} askaris − ${p.value} = ${Math.max(0, askaris - p.value)}, ${prisoners} taken${askaris - p.value > warriors ? ` (every warrior left)` : ''}`;
  return { rng, rolls, prisoners, noQuarter, villageFound, summary: `${taken}; ${villageSearchText(v.values, prisoners, policy)}` };
}

/** "village 3 + 4 = 7, within 4 prisoners + policy 3 = 7: the village is found". */
export function villageSearchText(values: number[], prisoners: number, policy: number): string {
  const sum = values[0] + values[1];
  const found = sum <= prisoners + policy;
  return `village ${values[0]} + ${values[1]} = ${sum}, ${found ? 'within' : 'over'} ${prisoners} prisoner${prisoners === 1 ? '' : 's'} + policy ${policy} = ${prisoners + policy}: the village ${found ? 'is found' : 'cannot be found'}`;
}

/** Another search for the village on a later turn (rules §8.4). */
export function searchVillage(rng: RngState, prisoners: number, policy: number, seat?: string): { rng: RngState; rolls: Roll[]; found: boolean; summary: string } {
  const v = dice(rng, 2, 'combat', { what: `Village found? ${rollOf(2)}`, hint: `${prisoners + policy} or less finds it (${count(prisoners, 'prisoner')} + policy ${policy})`, label: 'Village?', seat, result: ([a, b]) => `${a + b}, ${a + b <= prisoners + policy ? 'not over' : 'over'} ${prisoners + policy} => ${a + b <= prisoners + policy ? 'The village is found' : 'Not found'}` });
  return { rng: v.state, rolls: v.values.map((value) => ({ label: 'village', value })), found: v.values[0] + v.values[1] <= prisoners + policy, summary: villageSearchText(v.values, prisoners, policy) };
}

export interface LootResult {
  rng: RngState;
  rolls: Roll[];
  rations: number;
  gifts: number;
  camels: number;
  canoes: number;
  summary: string;
}

/** One die per original warrior: 1–4 that many rations, 5 a gift, 6 a camel in the desert or a canoe on water. */
export function loot(rng: RngState, original: number, terrain: Terrain | null, water: boolean): LootResult {
  const r = dice(rng, original, 'combat', { what: original === 1 ? 'Loot: a D6 for the one warrior' : `Loot: ${original}D6, one per warrior`, hint: `1 to 4 that many rations, 5 a gift, 6 ${terrain === 'desert' ? 'a camel' : water ? 'a canoe' : 'nothing'}`, label: 'Loot', result: (vs) => { const food = vs.filter((x) => x <= 4).reduce((a, b) => a + b, 0), five = vs.filter((x) => x === 5).length, six = vs.filter((x) => x === 6).length; const sixes = terrain === 'desert' ? 'camel' : water ? 'canoe' : ''; return `=> ${[food ? count(food, 'ration') : '', five ? count(five, 'gift') : '', six && sixes ? count(six, sixes) : ''].filter(Boolean).join(', ') || 'Nothing'}`; } });
  let rations = 0, gifts = 0, camels = 0, canoes = 0;
  for (const v of r.values) {
    if (v <= 4) rations += v;
    else if (v === 5) gifts += 1;
    else if (terrain === 'desert') camels += 1;
    else if (water) canoes += 1;
  }
  const parts = [rations ? `${rations} rations` : '', gifts ? `${gifts} gift${gifts > 1 ? 's' : ''}` : '', camels ? `${camels} camel${camels > 1 ? 's' : ''}` : '', canoes ? `${canoes} canoe${canoes > 1 ? 's' : ''}` : ''].filter(Boolean);
  const table = `a die a warrior: 1 to 4 that many rations, 5 a gift, 6 ${terrain === 'desert' ? 'a camel' : water ? 'a canoe' : 'nothing'}`;
  return { rng: r.state, rolls: r.values.map((value) => ({ label: 'loot', value })), rations, gifts, camels, canoes, summary: parts.length ? `looted ${parts.join(', ')} (${table})` : `the village yields nothing (${table})` };
}
