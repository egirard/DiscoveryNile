// Negotiation, trading and poisoning (rules §8.5) as pure functions over the 'combat' stream.
import type { Item } from '$features/expedition/prices';
import type { Roll } from '$features/map/generate';
import { d6, dice, type RngState } from '$lib/game/random';
import { okayFrom } from '$features/dice/prompt';

export interface OfferResult {
  rng: RngState;
  rolls: Roll[];
  satisfied: boolean;
  summary: string;
}

/** Gifts offered times the larger of two dice must reach the tribe's warriors, or the chief is insulted. */
export function offerGifts(rng: RngState, gifts: number, warriors: number): OfferResult {
  const two = dice(rng, 2, 'combat', { what: `for the offer of ${gifts} gift${gifts === 1 ? '' : 's'}`, hint: `the larger die times ${gifts} must reach ${warriors} warriors` });
  const larger = Math.max(...two.values);
  const satisfied = gifts * larger >= warriors;
  return {
    rng: two.state,
    rolls: two.values.map((value) => ({ label: 'offer', value })),
    satisfied,
    // The arithmetic in the line (prompt 56): the larger die times the gifts against the warriors.
    summary: `${gifts} gift${gifts === 1 ? '' : 's'} offered: the larger die ${larger} × ${gifts} = ${larger * gifts}, ${satisfied ? 'reaching' : 'short of'} ${warriors} warriors: the chief is ${satisfied ? 'satisfied' : 'insulted'}`
  };
}

/** Giving everything but the men always satisfies; the chief returns three dice of gifts. */
export function giveEverything(rng: RngState): { rng: RngState; rolls: Roll[]; gifts: number } {
  const three = dice(rng, 3, 'combat', { what: "for the chief's gifts in return", hint: 'the total in gifts' });
  return { rng: three.state, rolls: three.values.map((value) => ({ label: 'chief’s gifts', value })), gifts: three.values.reduce((a, b) => a + b, 0) };
}

export type PoisonResult = 'dies' | 'recovers' | 'fails';

export function attemptPoison(rng: RngState, bonus: number): { rng: RngState; rolls: Roll[]; result: PoisonResult; summary: string } {
  const r = d6(rng, 'combat', { what: "for the chief's poison", hint: okayFrom(4 - bonus, 'you shrug it off', 'it takes hold') });
  const total = r.value + bonus;
  const result: PoisonResult = total <= 2 ? 'dies' : total === 3 ? 'recovers' : 'fails';
  const die = bonus ? `${r.value} + ${bonus} = ${total}` : `${total}`;
  const summary = result === 'dies' ? `the chief’s poison kills the explorer (${die}, 2 or less)` : result === 'recovers' ? `poisoned, the explorer recovers (${die}; hardened against the next attempt)` : `the chief’s poisoning attempt fails (${die}, 4 or more)`;
  return { rng: r.state, rolls: [{ label: 'poison', value: r.value }], result, summary };
}

export interface TradeContext {
  desert: boolean;
  /** Swamp, lake or river: canoes for sale. */
  water: boolean;
}

/** Items the tribe sells here, in the rules' order; `food` is rations per gift. */
export function tradeGoods(ctx: TradeContext): Item[] {
  const out: Item[] = [];
  if (ctx.desert) out.push('camels', 'horses');
  if (ctx.water) out.push('canoes');
  out.push('food', 'bearers', 'guides', 'askaris');
  return out;
}

/** One die per item for sale, this tribe, this turn. */
export function tradePrices(rng: RngState, ctx: TradeContext): { rng: RngState; rolls: Roll[]; prices: Partial<Record<Item, number>> } {
  const goods = tradeGoods(ctx);
  const prices: Partial<Record<Item, number>> = {};
  const rolls: Roll[] = [];
  // One die at a time, each named (prompt 20): a physical table asks "for the price of bearers" and lists each as it is read.
  for (const item of goods) {
    const r = d6(rng, 'combat', { what: `for the price of ${item}`, hint: `in gifts${item === 'food' ? ', rations per gift' : ' each'}` });
    rng = r.state;
    prices[item] = r.value;
    rolls.push({ label: `price of ${item}`, value: r.value });
  }
  return { rng, rolls, prices };
}

/** What can be sold back to the tribe at its price: rations (per gift), animals and canoes. */
export const SELLABLE: readonly Item[] = ['food', 'camels', 'horses', 'canoes'];
