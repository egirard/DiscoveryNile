// The natives' reaction to the explorer's policy and the fight that may follow (rules §8.2–8.3),
// as a pure function over the seeded dice on the 'combat' stream.
import { modifierText } from '$features/map/generate';
import type { Chart } from '$features/expedition/prices';
import type { Modifier, Roll } from '$features/map/generate';
import { count, d6, dice, noting, rollOf, wantedFace, type DiceAsk, type RngState } from '$lib/game/random';

export interface ReactionInput {
  policy: number;
  distanceToPort: number;
  warriors: number;
  chart: Chart;
  /** A guide hired in an adjacent hex, prior negotiation with this tribe, or a published hex (+1 for policies 3 and 5). */
  localKnowledge: boolean;
  attitude: number;
  /** The tribe's regard for this explorer alone (rules §8.6). */
  regard: number;
  inDesert: boolean;
  /** Every man rides (rules: "entirely mounted on camels and/or horses"). */
  mounted: boolean;
}

export type Outcome = 'calm' | 'hide' | 'victory' | 'defeat';

export interface ReactionResult {
  rng: RngState;
  /** The three-dice reaction with its modifiers. */
  reaction: { rolls: Roll[]; modifiers: Modifier[]; target: number; total: number; hostile: boolean };
  /** The hide-or-attack check, surprise and every round of combat, in order. */
  combat: Roll[];
  outcome: Outcome;
  /** What happened, for the rail. */
  summary: string;
  chart: Chart;
  warriors: number;
}

/** The policies by name (rules §8.1), as the panel offers them. */
export const POLICY_NAMES: Record<number, string> = { 1: 'defensive stand', 2: 'retreat', 3: 'show of force', 4: 'ignore them', 5: 'friendly approach' };

export function reactionModifiers(input: ReactionInput): Modifier[] {
  const { policy, chart } = input;
  const out: Modifier[] = [{ label: `hex${input.distanceToPort === 1 ? '' : 'es'} to the nearest port`, value: input.distanceToPort }, { label: `policy ${policy}, ${POLICY_NAMES[policy] ?? ''}`.replace(/, $/, ''), value: policy }];
  if ((policy === 4 || policy === 5) && chart.askaris === 0) {
    out.push({ label: 'no askaris', value: 2 });
    if (chart.muskets === 0) out.push({ label: 'unarmed', value: 1 });
  }
  if ((policy === 3 || policy === 5) && input.localKnowledge) out.push({ label: 'local knowledge', value: 1 });
  if (input.attitude) out.push({ label: 'attitude', value: input.attitude });
  if (input.regard) out.push({ label: 'regard for you', value: input.regard });
  return out;
}

/** The reaction line's verdict (prompt 56): the dice against the target the modifiers make, "hostile: 18 on the dice, over the target of 4". */
export function reactionOutcome(r: { total: number; target: number; hostile: boolean }): string {
  return r.hostile ? `hostile: ${r.total} on the dice, over the target of ${r.target}` : `not hostile: ${r.total} on the dice, within the target of ${r.target}`;
}

export function react(rng: RngState, input: ReactionInput): ReactionResult {
  const modifiers = reactionModifiers(input);
  const target = modifiers.reduce((a, m) => a + m.value, 0);
  const three = dice(rng, 3, 'combat', { what: `Are they hostile? ${rollOf(3)}`, hint: `${target} or less and they are not (${modifiers.map((m, i) => (i === 0 ? `${count(m.value, 'hex', 'hexes')} to port` : i === 1 ? `+ policy ${input.policy}` : `${m.value < 0 ? '−' : '+'} ${Math.abs(m.value)} ${m.label}`)).join(' ')})`, label: 'Hostile?', result: (vs) => { const sum = vs.reduce((a, b) => a + b, 0); return `${sum}, ${sum > target ? 'over' : 'not over'} ${target} => ${sum > target ? 'Hostile' : 'Not hostile'}`; } });
  rng = three.state;
  const total = three.values.reduce((a, b) => a + b, 0);
  const hostile = target < total;
  const reaction = { rolls: three.values.map((value) => ({ label: 'reaction', value })), modifiers, target, total, hostile };
  if (!hostile) return { rng, reaction, combat: [], outcome: 'calm', summary: 'the natives are not hostile', chart: { ...input.chart }, warriors: input.warriors };
  // A die of the fight asked for: the reaction's line goes with the ask, ahead of the fight so far (prompt 56).
  const h = noting(() => hostilities(rng, input), { making: () => ({ kind: 'reaction', rolls: reaction.rolls, modifiers, needed: `${target} or less`, outcome: reactionOutcome(reaction) }) });
  return { ...h, reaction };
}

/** Hostile natives: strong enough to attack, or do they hide? Then the fight (rules §8.2–8.3). Also an insulted chief's second thoughts (§8.5). */
export function hostilities(rng: RngState, input: ReactionInput): Omit<ReactionResult, 'reaction'> {
  const combat: Roll[] = [];
  const notes: string[] = [];
  // A die asked for part way: the fight so far, every check explained, goes with the ask (prompt 56).
  return noting(() => fight(rng, input, combat, notes), { making: () => ({ kind: 'combat', rolls: [...combat], outcome: notes.join('; ') }) });
}

function fight(rng: RngState, input: ReactionInput, combat: Roll[], notes: string[]): Omit<ReactionResult, 'reaction'> {
  const chart = { ...input.chart };
  let warriors = input.warriors;
  const roll = (label: string, ask: DiceAsk = { what: `Roll a D6 for ${label}`, label }) => {
    const r = d6(rng, 'combat', ask);
    rng = r.state;
    combat.push({ label, value: r.value });
    return r.value;
  };
  const done = (outcome: Outcome, summary: string): Omit<ReactionResult, 'reaction'> => ({ rng, combat, outcome, summary, chart, warriors });

  // Hostile: strong enough to attack? d6 × askaris ÷ policy against the warriors.
  // The line states the check in full (prompt 55): the die, the askaris, the policy, the result against the warriors.
  const die = roll('strength', { what: 'Do they attack? Roll a D6', hint: `${wantedFace((v) => Math.floor((v * chart.askaris) / input.policy) > warriors, 'makes them hide')} (die × ${count(chart.askaris, 'askari')} ÷ policy ${input.policy} must beat ${count(warriors, 'warrior')})`, label: 'Attack?', result: ([v]) => { const s = Math.floor((v * chart.askaris) / input.policy); return `${v} × ${chart.askaris} ÷ ${input.policy} = ${s}${(v * chart.askaris) % input.policy ? ' (rounded down)' : ''}, ${s > warriors ? 'over' : 'not over'} ${warriors} => The natives ${s > warriors ? 'hide' : 'attack'}`; } });
  const strength = Math.floor((die * chart.askaris) / input.policy);
  const nerve = `nerve ${die} × ${chart.askaris} askari${chart.askaris === 1 ? '' : 's'} ÷ policy ${input.policy} = ${strength}, ${strength > warriors ? 'more' : 'not more'} than ${warriors} warrior${warriors === 1 ? '' : 's'}`;
  if (strength > warriors) return done('hide', `hostile; ${nerve}: the natives hide`);
  notes.push(`hostile; ${nerve}: the natives attack`);
  const original = chart.askaris;

  // Surprise: two dice, mounted or desert adjustments, under the policy number means surprised.
  const s2 = dice(rng, 2, 'combat', { what: `Surprised? ${rollOf(2)}`, hint: `${input.policy}+ and you fire first (policy ${input.policy}${!input.inDesert && input.mounted ? ', +1 for riding' : input.inDesert && !input.mounted ? ', −1 on foot in the desert' : ''})`, label: 'Surprised?', result: ([a, b]) => { const shift = !input.inDesert && input.mounted ? 1 : input.inDesert && !input.mounted ? -1 : 0; const sum = a + b + shift; const fall = Math.min(warriors, chart.askaris + 1); return `${a + b}${shift ? ` ${shift > 0 ? '+' : '−'} 1 = ${sum}` : ''} => ${sum < input.policy ? 'Surprised: the natives strike first' : `Not surprised: ${count(chart.askaris + 1, 'shot')}, ${fall === warriors ? `all ${count(fall, 'warrior falls', 'warriors fall')}: victory` : `${count(fall, 'warrior falls', 'warriors fall')}, ${warriors - fall} left`}`}`; } });
  rng = s2.state;
  s2.values.forEach((value) => combat.push({ label: 'surprise', value }));
  let surprise = s2.values[0] + s2.values[1];
  const adjust = !input.inDesert && input.mounted ? ' + 1 mounted' : input.inDesert && !input.mounted ? ' − 1 on foot in the desert' : '';
  if (!input.inDesert && input.mounted) surprise += 1;
  if (input.inDesert && !input.mounted) surprise -= 1;
  const surprised = surprise < input.policy;
  // Every check with its arithmetic (prompt 56), so the fight can be followed by players new to the rules.
  notes.push(`surprise ${s2.values[0]} + ${s2.values[1]}${adjust} = ${surprise}, ${surprised ? 'under' : 'not under'} policy ${input.policy}: the expedition is ${surprised ? 'surprised' : 'ready'}`);
  const warriorsLeft = () => `${warriors} warrior${warriors === 1 ? '' : 's'} left`;

  if (!surprised) {
    const killed = Math.min(warriors, chart.askaris + 1);
    warriors -= killed;
    notes.push(`the volley: ${chart.askaris} askari${chart.askaris === 1 ? '' : 's'} and the explorer fire, ${killed} warrior${killed === 1 ? ' falls' : 's fall'}`);
    if (warriors === 0) { notes.push('the natives are destroyed'); return done('victory', notes.join('; ')); }
    const die = roll('driven off?', { what: 'Driven off? Roll a D6', hint: `${wantedFace((v) => v * killed > warriors, 'drives them off')} (die × ${killed} fallen must beat the ${count(warriors, 'warrior')} left)`, label: 'Driven off?', result: ([v]) => `${v} × ${killed} = ${v * killed}, ${v * killed > warriors ? 'over' : 'not over'} ${warriors} => ${v * killed > warriors ? 'The natives are driven off: victory' : 'They close in'}` });
    const morale = die * killed;
    notes.push(`morale ${die} × ${killed} killed = ${morale}, ${morale > warriors ? 'more' : 'not more'} than the ${warriorsLeft()}: ${morale > warriors ? 'the natives are driven off' : 'they close in'}`);
    if (morale > warriors) return done('victory', notes.join('; '));
  }

  // Melee: the natives strike, then the askaris, until one side is finished.
  for (let round = 0; round < 50; round++) {
    const strike = roll('natives strike', { what: `Natives strike: ${count(warriors, 'warrior')} ÷ the die gives the askaris who fall, of ${chart.askaris}`, label: 'Natives strike', result: ([v]) => { const struck = Math.floor(warriors / v); return `${warriors} ÷ ${v} = ${struck}${warriors % v ? ' (rounded down)' : ''} => ${struck >= chart.askaris ? `All ${count(chart.askaris, 'askari falls', 'askaris fall')}: defeat` : struck === 0 ? 'No askari falls' : `${count(struck, 'askari falls', 'askaris fall')}, ${chart.askaris - struck} left`}`; } });
    const struck = Math.floor(warriors / strike);
    const casualties = Math.min(chart.askaris, struck);
    notes.push(`the natives strike: ${warriors} warriors ÷ ${strike} = ${struck}${struck > chart.askaris ? `, all ${chart.askaris}` : ''} askari${casualties === 1 ? ' falls' : 's fall'}`);
    chart.askaris -= casualties;
    if (chart.askaris === 0) { notes.push('every askari is dead: defeat'); return done('defeat', notes.join('; ')); }
    if (casualties > 0) {
      const die = roll('askaris break?', { what: 'Do the askaris break? Roll a D6', hint: `${wantedFace((v) => v * casualties > original, 'and they run')} (die × ${casualties} fallen must beat the ${original} who began)`, label: 'Askaris break?', result: ([v]) => `${v} × ${casualties} = ${v * casualties}, ${v * casualties > original ? 'over' : 'not over'} ${original} => ${v * casualties > original ? 'The askaris break and run: defeat' : 'The askaris hold'}` });
      const broken = die * casualties > original;
      notes.push(`the askaris' nerve ${die} × ${casualties} fallen = ${die * casualties}, ${broken ? 'over' : 'not over'} the ${original} that stood: ${broken ? 'the askaris break and run: defeat' : 'the askaris hold'}`);
      if (broken) return done('defeat', notes.join('; '));
    }
    const volley = roll('askaris strike', { what: `Askaris strike: ${count(chart.askaris, 'askari')} ÷ the die, plus 1, gives the warriors who fall, of ${warriors}`, label: 'Askaris strike', result: ([v]) => { const hit = Math.floor(chart.askaris / v) + 1; return `${chart.askaris} ÷ ${v} + 1 = ${hit}${chart.askaris % v ? ' (rounded down)' : ''} => ${hit >= warriors ? `All ${count(warriors, 'warrior falls', 'warriors fall')}: victory` : `${count(hit, 'warrior falls', 'warriors fall')}, ${warriors - hit} left`}`; } });
    const hit = Math.floor(chart.askaris / volley) + 1;
    const slain = Math.min(warriors, hit);
    notes.push(`the askaris strike: ${chart.askaris} askaris ÷ ${volley} + 1 = ${hit}${hit > warriors ? `, all ${warriors}` : ''} warrior${slain === 1 ? ' falls' : 's fall'}`);
    warriors -= slain;
    if (warriors === 0) { notes.push('the natives are destroyed'); return done('victory', notes.join('; ')); }
    const die = roll('natives break?', { what: 'Do the natives break? Roll a D6', hint: `${wantedFace((v) => v * slain > warriors, 'and they run')} (die × ${slain} fallen must beat the ${warriors} left)`, label: 'Natives break?', result: ([v]) => `${v} × ${slain} = ${v * slain}, ${v * slain > warriors ? 'over' : 'not over'} ${warriors} => ${v * slain > warriors ? 'The natives are driven off: victory' : 'They fight on'}` });
    const morale = die * slain;
    notes.push(`morale ${die} × ${slain} fallen = ${morale}, ${morale > warriors ? 'more' : 'not more'} than the ${warriorsLeft()}: ${morale > warriors ? 'the natives are driven off' : 'they fight on'}`);
    if (morale > warriors) return done('victory', notes.join('; '));
  }
  return done('defeat', notes.join('; '));
}
