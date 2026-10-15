// What the table says when it asks for physical dice (PROMPTS.md, prompt 18): one sentence per throw,
// "Roll a D6 to see if you are lost; 4+ means you're okay", built from the rule's own words (`DiceAsk`)
// at the place the rule rolls, so the prompt and the roll can never disagree.
import type { DiceAsk } from '$lib/game/random';

/** "Roll a D6 {what}; {hint}" or "Roll 4 D6 {what}; {hint}". */
export function promptText(count: number, ask: DiceAsk): string {
  const what = count === 1 ? 'a D6' : `${count} D6`;
  return `Roll ${what} ${ask.what}${ask.hint ? `; ${ask.hint}` : ''}`;
}

/**
 * The hint for a check passed by rolling `need` or more on one die: "4+ means you're okay"; a check that
 * cannot fail or cannot pass says so, since the rules roll the die regardless.
 */
export function okayFrom(need: number, okay = "you're okay", not = "you're lost"): string {
  if (need <= 1) return `any roll and ${okay}`;
  if (need > 6) return `whatever you roll ${not}`;
  return `${need}+ means ${okay}`;
}

/** The same threshold as the log notes it: "4+", "any", "none" (prompt 20). */
export function needText(need: number): string {
  if (need <= 1) return 'any';
  if (need > 6) return 'none';
  return `${need}+`;
}

/**
 * The throws already made for the held event that no log line yet accounts for (prompt 34): the lines so far
 * carry their own dice, so a throw is listed on its own only until its line is written.
 */
export function uncovered<T extends { values: number[] }>(rolled: T[], sofar: { rolls: unknown[] }[]): T[] {
  let dice = sofar.reduce((n, r) => n + r.rolls.length, 0);
  let i = 0;
  while (i < rolled.length && rolled[i].values.length <= dice) {
    dice -= rolled[i].values.length;
    i++;
  }
  return rolled.slice(i);
}
