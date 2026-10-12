// Hunting and the adjustment of rations at the end of an African turn (rules §11), as pure functions.
import type { Chart } from '$features/expedition/prices';
import type { Sickness } from '$lib/game/state';
import type { Terrain } from '$features/map/manifest';
import { hasPart, type Modifier, type Roll } from '$features/map/generate';
import { d6, type RngState } from '$lib/game/random';

export interface Camp {
  terrain: Terrain | null;
  river: boolean;
  oasis: boolean;
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
  /** Rations bagged: askaris at the table rate, the explorer at his own (zoologist +1). */
  game: number;
}

/** One die for the expedition (RQ-7), applied per hunter; a zoologist explorer adds one to his own share. */
export function hunt(rng: RngState, camp: Camp, askaris: number, zoologist: boolean): { rng: RngState; result: HuntResult } {
  const r = d6(rng, 'hunting');
  const modifiers = huntingModifiers(camp);
  const total = r.value + modifiers.reduce((a, m) => a + m.value, 0);
  const game = rationsPerHunter(total) * askaris + rationsPerHunter(total + (zoologist ? 1 : 0));
  return { rng: r.state, result: { rolls: [{ label: 'hunting', value: r.value }], modifiers, total, game } };
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
export function feed(chart: Chart, sick: Sickness, camp: Camp, game: number): MealResult {
  const next = { ...chart };
  const men = 1 + next.guides + next.bearers + next.askaris;
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
  parts.push(`${men} men ate${fromGame < men ? ` (${men - fromGame} from the stores)` : ''}`);
  if (forHorses) parts.push(`${next.horses} horses ate ${horsesFed}`);
  if (shot.horses || shot.camels) parts.push(`shot for food: ${[shot.horses ? `${shot.horses} horse${shot.horses > 1 ? 's' : ''}` : '', shot.camels ? `${shot.camels} camel${shot.camels > 1 ? 's' : ''}` : ''].filter(Boolean).join(' and ')}`);
  if (hungryMen) parts.push(`${hungryMen} men go hungry`);
  if (hungryHorses) parts.push(`${hungryHorses} horses go hungry`);
  void sick;
  return { chart: next, men, fromGame, fromStore: menFromStore, forHorses, shot, hungryMen, hungryHorses, summary: parts.join(', ') };
}
