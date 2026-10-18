// After the fight (rules §8.4): the consequences of defeat with the Escape Survival table, captivity,
// and the results of victory — prisoners, the village, looting. Pure functions over the 'combat' stream.
import { NO_PURCHASES, type Chart } from '$features/expedition/prices';
import type { Roll } from '$features/map/generate';
import type { Terrain } from '$features/map/manifest';
import { d6, dice, type DiceAsk, type RngState } from '$lib/game/random';

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

/**
 * One die (less three for a captive's escape attempt) on the consequences-of-defeat table. Survival
 * rolls yield only what the expedition had (`had`), re-rolling impossible results.
 */
export function consequencesOfDefeat(rng: RngState, had: Chart, modifier = 0, seat?: string): DefeatResult {
  const rolls: Roll[] = [];
  const roll = (label: string, ask: DiceAsk = { what: `for ${label}`, seat }) => {
    const r = d6(rng, 'combat', ask);
    rng = r.state;
    rolls.push({ label, value: r.value });
    return r.value;
  };
  const die = roll(modifier ? 'escape' : 'defeat', { what: modifier ? 'for an escape' : 'on the consequences of defeat', hint: `${modifier ? `with ${modifier > 0 ? '+' : '−'}${Math.abs(modifier)}: ` : ''}1 killed, 2 prisoner, 3 escapes alone, 4 a musket and rations, 5 and 6 survival rolls`, seat });
  const fate = fateOf(die + modifier);
  const chart: Chart = { ...EMPTY };
  // The die and its modifier open the line (prompt 56): "defeat 2: the explorer is held prisoner", "escape 5 − 3 = 2: …".
  const notes: string[] = [`${modifier ? 'escape' : 'defeat'} ${die}${modifier ? ` ${modifier > 0 ? '+' : '−'} ${Math.abs(modifier)} = ${die + modifier}` : ''}:`];
  if (fate === 'killed') notes.push('the explorer is killed');
  else if (fate === 'prisoner') notes.push('the explorer is held prisoner');
  else {
    notes.push('the explorer escapes alone');
    if (fate !== 'alone') {
      chart.muskets = 1;
      chart.food = 9;
      notes.push('with a musket and 9 rations');
      const tries = fate === 'one-roll' ? 1 : fate === 'two-rolls' ? 2 : 0;
      for (let i = 0; i < tries; i++) {
        let item: (typeof ITEMS)[number] | null = null;
        for (let attempt = 0; attempt < 12 && !item; attempt++) {
          const candidate = ITEMS[roll('survival', { what: 'on the survival table', hint: '1 guide, 2 bearer, 3 askari, 4 camel, 5 horse, 6 canoe', seat }) - 1];
          if (had[candidate] > 0) item = candidate;
        }
        if (!item) { notes.push('nothing more to be found'); continue; }
        chart[item] += 1;
        const noun = item.slice(0, -1);
        let note = `${/^[aeiou]/.test(noun) ? 'an' : 'a'} ${noun} (survival ${rolls.at(-1)!.value})`;
        if (LOADED.has(item)) {
          const load = roll('load', { what: `for what the ${noun} carries`, hint: '1–3 rations, 4–5 gifts, 6 muskets', seat });
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
  const p = d6(rng, 'combat', { what: 'for prisoners', hint: `${askaris} askaris less the die; 6 takes none` });
  rng = p.state;
  const rolls: Roll[] = [{ label: 'prisoners', value: p.value }];
  const noQuarter = p.value === 6;
  const prisoners = noQuarter ? 0 : Math.min(Math.max(0, askaris - p.value), warriors);
  const v = dice(rng, 2, 'combat', { what: 'to find the village', hint: `${prisoners + policy} or less finds it` });
  rng = v.state;
  v.values.forEach((value) => rolls.push({ label: 'village', value }));
  const villageFound = v.values[0] + v.values[1] <= prisoners + policy;
  // Each check with its arithmetic (prompt 56): the askaris less the die, then two dice against prisoners plus policy.
  const taken = noQuarter ? 'prisoners: a 6, no quarter, none taken' : `prisoners: ${askaris} askaris − ${p.value} = ${prisoners} taken${askaris - p.value > warriors ? ` (the ${warriors} warriors left)` : ''}`;
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
  const v = dice(rng, 2, 'combat', { what: 'to find the village', hint: `${prisoners + policy} or less finds it`, seat });
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
  const r = dice(rng, original, 'combat', { what: 'for the loot', hint: `one die a warrior: 1–4 that many rations, 5 a gift, 6 ${terrain === 'desert' ? 'a camel' : water ? 'a canoe' : 'nothing'}` });
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
