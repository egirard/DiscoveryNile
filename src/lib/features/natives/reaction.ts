// The natives' reaction to the explorer's policy and the fight that may follow (rules §8.2–8.3),
// as a pure function over the seeded dice on the 'combat' stream.
import type { Chart } from '$features/expedition/prices';
import type { Modifier, Roll } from '$features/map/generate';
import { d6, dice, type DiceAsk, type RngState } from '$lib/game/random';

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

export function react(rng: RngState, input: ReactionInput): ReactionResult {
  const modifiers = reactionModifiers(input);
  const target = modifiers.reduce((a, m) => a + m.value, 0);
  const three = dice(rng, 3, 'combat', { what: "for the natives' reaction", hint: `${target} or less keeps them calm` });
  rng = three.state;
  const total = three.values.reduce((a, b) => a + b, 0);
  const hostile = target < total;
  const reaction = { rolls: three.values.map((value) => ({ label: 'reaction', value })), modifiers, target, total, hostile };
  if (!hostile) return { rng, reaction, combat: [], outcome: 'calm', summary: 'the natives are not hostile', chart: { ...input.chart }, warriors: input.warriors };
  const h = hostilities(rng, input);
  return { ...h, reaction };
}

/** Hostile natives: strong enough to attack, or do they hide? Then the fight (rules §8.2–8.3). Also an insulted chief's second thoughts (§8.5). */
export function hostilities(rng: RngState, input: ReactionInput): Omit<ReactionResult, 'reaction'> {
  const chart = { ...input.chart };
  let warriors = input.warriors;
  const combat: Roll[] = [];
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
  const notes: string[] = [`hostile; ${nerve}: the natives attack`];
  const original = chart.askaris;

  // Surprise: two dice, mounted or desert adjustments, under the policy number means surprised.
  const s2 = dice(rng, 2, 'combat', { what: 'for surprise', hint: `${input.policy}+ ${!input.inDesert && input.mounted ? 'with 1 for riding ' : input.inDesert && !input.mounted ? 'less 1 on foot in the desert ' : ''}and the expedition is ready` });
  rng = s2.state;
  s2.values.forEach((value) => combat.push({ label: 'surprise', value }));
  let surprise = s2.values[0] + s2.values[1];
  if (!input.inDesert && input.mounted) surprise += 1;
  if (input.inDesert && !input.mounted) surprise -= 1;
  const surprised = surprise < input.policy;

  if (!surprised) {
    const killed = Math.min(warriors, chart.askaris + 1);
    warriors -= killed;
    notes.push(`the volley kills ${killed}`);
    if (warriors === 0) { notes.push('the natives are destroyed'); return done('victory', notes.join('; ')); }
    const morale = roll('driven off?', { what: 'to drive them off', hint: `the die × ${killed} killed over ${warriors} warriors drives them off` }) * killed;
    if (morale > warriors) { notes.push('the natives are driven off'); return done('victory', notes.join('; ')); }
    notes.push('they close in');
  } else notes.push('the expedition is surprised');

  // Melee: the natives strike, then the askaris, until one side is finished.
  for (let round = 0; round < 50; round++) {
    const casualties = Math.min(chart.askaris, Math.floor(warriors / roll('natives strike', { what: "for the natives' strike", hint: `${warriors} warriors ÷ the die askaris fall` })));
    chart.askaris -= casualties;
    if (casualties) notes.push(`${casualties} askari${casualties > 1 ? 's fall' : ' falls'}`);
    if (chart.askaris === 0) { notes.push('every askari is dead: defeat'); return done('defeat', notes.join('; ')); }
    if (casualties > 0 && roll('askaris break?', { what: 'to see if the askaris break', hint: `the die × ${casualties} fallen over ${original} and they run` }) * casualties > original) { notes.push('the askaris break and run: defeat'); return done('defeat', notes.join('; ')); }
    const slain = Math.min(warriors, Math.floor(chart.askaris / roll('askaris strike', { what: "for the askaris' strike", hint: `${chart.askaris} askaris ÷ the die, plus one, warriors fall` })) + 1);
    warriors -= slain;
    notes.push(`${slain} warrior${slain > 1 ? 's fall' : ' falls'}`);
    if (warriors === 0) { notes.push('the natives are destroyed'); return done('victory', notes.join('; ')); }
    if (roll('natives break?', { what: 'to see if the natives break', hint: `the die × ${slain} fallen over ${warriors} warriors drives them off` }) * slain > warriors) { notes.push('the natives are driven off'); return done('victory', notes.join('; ')); }
  }
  return done('defeat', notes.join('; '));
}
