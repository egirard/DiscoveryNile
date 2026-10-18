// The natives' reaction to the explorer's policy and the fight that may follow (rules §8.2–8.3),
// as a pure function over the seeded dice on the 'combat' stream.
import type { Chart } from '$features/expedition/prices';
import type { Modifier, Roll } from '$features/map/generate';
import { d6, dice, noting, type DiceAsk, type RngState } from '$lib/game/random';

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

export function reactionModifiers(input: ReactionInput): Modifier[] {
  const { policy, chart } = input;
  const out: Modifier[] = [{ label: 'distance to port', value: input.distanceToPort }, { label: `policy ${policy}`, value: policy }];
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
  const three = dice(rng, 3, 'combat', { what: "for the natives' reaction", hint: `${target} or less keeps them calm` });
  rng = three.state;
  const total = three.values.reduce((a, b) => a + b, 0);
  const hostile = target < total;
  const reaction = { rolls: three.values.map((value) => ({ label: 'reaction', value })), modifiers, target, total, hostile };
  if (!hostile) return { rng, reaction, combat: [], outcome: 'calm', summary: 'the natives are not hostile', chart: { ...input.chart }, warriors: input.warriors };
  // A die of the fight asked for: the reaction's line goes with the ask, ahead of the fight so far (prompt 56).
  const h = noting(() => hostilities(rng, input), { making: () => ({ kind: 'reaction', rolls: reaction.rolls, modifiers, total, outcome: reactionOutcome(reaction) }) });
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
  const roll = (label: string, ask: DiceAsk = { what: `for ${label}` }) => {
    const r = d6(rng, 'combat', ask);
    rng = r.state;
    combat.push({ label, value: r.value });
    return r.value;
  };
  const done = (outcome: Outcome, summary: string): Omit<ReactionResult, 'reaction'> => ({ rng, combat, outcome, summary, chart, warriors });

  // Hostile: strong enough to attack? d6 × askaris ÷ policy against the warriors.
  // The line states the check in full (prompt 55): the die, the askaris, the policy, the result against the warriors.
  const die = roll('strength', { what: "for the natives' nerve", hint: `the die × ${chart.askaris} askaris ÷ policy ${input.policy}: more than the ${warriors} warrior${warriors === 1 ? '' : 's'} and they hide` });
  const strength = Math.floor((die * chart.askaris) / input.policy);
  const nerve = `nerve ${die} × ${chart.askaris} askari${chart.askaris === 1 ? '' : 's'} ÷ policy ${input.policy} = ${strength}, ${strength > warriors ? 'more' : 'not more'} than ${warriors} warrior${warriors === 1 ? '' : 's'}`;
  if (strength > warriors) return done('hide', `hostile; ${nerve}: the natives hide`);
  notes.push(`hostile; ${nerve}: the natives attack`);
  const original = chart.askaris;

  // Surprise: two dice, mounted or desert adjustments, under the policy number means surprised.
  const s2 = dice(rng, 2, 'combat', { what: 'for surprise', hint: `${input.policy}+ ${!input.inDesert && input.mounted ? 'with 1 for riding ' : input.inDesert && !input.mounted ? 'less 1 on foot in the desert ' : ''}and the expedition is ready` });
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
    const die = roll('driven off?', { what: 'to drive them off', hint: `the die × ${killed} killed over ${warriors} warriors drives them off` });
    const morale = die * killed;
    notes.push(`morale ${die} × ${killed} killed = ${morale}, ${morale > warriors ? 'more' : 'not more'} than the ${warriorsLeft()}: ${morale > warriors ? 'the natives are driven off' : 'they close in'}`);
    if (morale > warriors) return done('victory', notes.join('; '));
  }

  // Melee: the natives strike, then the askaris, until one side is finished.
  for (let round = 0; round < 50; round++) {
    const strike = roll('natives strike', { what: "for the natives' strike", hint: `${warriors} warriors ÷ the die askaris fall` });
    const struck = Math.floor(warriors / strike);
    const casualties = Math.min(chart.askaris, struck);
    notes.push(`the natives strike: ${warriors} warriors ÷ ${strike} = ${struck}${struck > chart.askaris ? `, all ${chart.askaris}` : ''} askari${casualties === 1 ? ' falls' : 's fall'}`);
    chart.askaris -= casualties;
    if (chart.askaris === 0) { notes.push('every askari is dead: defeat'); return done('defeat', notes.join('; ')); }
    if (casualties > 0) {
      const die = roll('askaris break?', { what: 'to see if the askaris break', hint: `the die × ${casualties} fallen over ${original} and they run` });
      const broken = die * casualties > original;
      notes.push(`the askaris' nerve ${die} × ${casualties} fallen = ${die * casualties}, ${broken ? 'over' : 'not over'} the ${original} that stood: ${broken ? 'the askaris break and run: defeat' : 'the askaris hold'}`);
      if (broken) return done('defeat', notes.join('; '));
    }
    const volley = roll('askaris strike', { what: "for the askaris' strike", hint: `${chart.askaris} askaris ÷ the die, plus one, warriors fall` });
    const hit = Math.floor(chart.askaris / volley) + 1;
    const slain = Math.min(warriors, hit);
    notes.push(`the askaris strike: ${chart.askaris} askaris ÷ ${volley} + 1 = ${hit}${hit > warriors ? `, all ${warriors}` : ''} warrior${slain === 1 ? ' falls' : 's fall'}`);
    warriors -= slain;
    if (warriors === 0) { notes.push('the natives are destroyed'); return done('victory', notes.join('; ')); }
    const die = roll('natives break?', { what: 'to see if the natives break', hint: `the die × ${slain} fallen over ${warriors} warriors drives them off` });
    const morale = die * slain;
    notes.push(`morale ${die} × ${slain} fallen = ${morale}, ${morale > warriors ? 'more' : 'not more'} than the ${warriorsLeft()}: ${morale > warriors ? 'the natives are driven off' : 'they fight on'}`);
    if (morale > warriors) return done('victory', notes.join('; '));
  }
  return done('defeat', notes.join('; '));
}
