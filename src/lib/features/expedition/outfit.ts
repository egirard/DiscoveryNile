// Outfitting aids (rules §5, §7.1): how an expedition on the chart could move, and the rules' three
// sample expeditions for $1000 scaled to whatever budget the explorer has.
import type { PortId } from '$features/map/manifest';
import { canoeRate } from '$features/exploration/movement';
import type { Sickness } from '$lib/game/state';
import { CAMEL_PORTS, HORSE_PORTS, ITEMS, NO_PURCHASES, PRICES, cost, load, mountedCarry, overlandCarry, people, type Chart, type Item, type Purchases } from './prices';

/** The price list's names, for the chart's rows. */
export const ITEM_NAMES: Record<Item, string> = {
  guides: 'Guide',
  bearers: 'Bearer',
  askaris: 'Askari',
  camels: 'Camel',
  horses: 'Horse',
  canoes: 'Canoe',
  muskets: 'Musket',
  food: 'Ration',
  gifts: 'Gift'
};

export interface MovementOptions {
  people: number;
  load: number;
  /** Units the bearers and animals can carry overland once the canoes are shouldered; null when they cannot even lift the canoes. */
  overlandCarry: number | null;
  /** The whole load, canoes included, can be carried: the expedition can walk. */
  overland: boolean;
  /** Known hexes a turn by canoe, from the paddlers per canoe (1 drifting); 0 without canoes. */
  canoeHexes: number;
  /** Everyone has a seat in the canoes. */
  canoeSeats: boolean;
  /** Eight bearers or more: the canoes can be carried past a cataract (rules §7.5). */
  portage: boolean;
  /** Units the riders' and led animals carry; null when there is no mount for everyone. */
  mountedCarry: number | null;
  /** Everyone rides and the loads are carried: the expedition moves at the mounted rate. */
  mounted: boolean;
  /** The sick men, the explorer among them, when the sick are counted (the camp, prompt 76). */
  sickMen: number;
  /** The sick cannot all be carried (an animal, two well bearers or a canoe seat each): the expedition cannot move at all. */
  halted: boolean;
}

/**
 * How the expedition could move. With the sick told (the camp, prompt 76) the numbers are those the board moves by
 * (`overload` and `sickCarried`): a sick bearer carries nothing, every sick man is twenty units of what is carried
 * overland (RQ-18), and when the sick cannot all be carried nothing moves.
 */
export function movementOptions(c: Chart, sick?: Sickness): MovementOptions {
  const n = people(c);
  const weight = load(c);
  const sickMen = sick ? sick.guides + sick.bearers + sick.askaris + (sick.explorer ? 1 : 0) : 0;
  const carriers = c.camels + c.horses + Math.floor(Math.max(0, c.bearers - (sick?.bearers ?? 0)) / 2) + c.canoes * 12;
  const halted = sickMen > carriers;
  const able = overlandCarry({ ...c, bearers: Math.max(0, c.bearers - (sick?.bearers ?? 0)) });
  const overland = able === null ? null : Math.max(0, able - 20 * sickMen);
  const mounted = mountedCarry(c);
  if (sick)
    return {
      people: n,
      load: weight,
      overlandCarry: overland,
      overland: overland !== null && weight <= overland && !halted,
      canoeHexes: c.canoes > 0 ? canoeRate(Math.floor(c.bearers / c.canoes)).known : 0,
      canoeSeats: c.canoes > 0 && 12 * c.canoes >= n && !halted,
      portage: c.bearers >= 8,
      mountedCarry: mounted,
      mounted: mounted !== null && weight <= mounted && !halted,
      sickMen,
      halted
    };
  return {
    people: n,
    load: weight,
    overlandCarry: overland,
    overland: overland !== null && weight <= overland,
    canoeHexes: c.canoes > 0 ? canoeRate(Math.floor(c.bearers / c.canoes)).known : 0,
    canoeSeats: c.canoes > 0 && 12 * c.canoes >= n,
    portage: c.bearers >= 8,
    mountedCarry: mounted,
    mounted: mounted !== null && weight <= mounted,
    sickMen: 0,
    halted: false
  };
}

export type OutfitKind = 'foot' | 'canoe' | 'mounted';

/** The rules' three sample expeditions for $1000 (Rules: Three Sample Expeditions). The mounted one rides horses. */
export const SAMPLES: Record<OutfitKind, Purchases> = {
  canoe: { ...NO_PURCHASES, canoes: 2, bearers: 16, guides: 1, askaris: 6, muskets: 4, gifts: 50, food: 125 },
  mounted: { ...NO_PURCHASES, horses: 11, askaris: 4, guides: 1, bearers: 2, muskets: 1, gifts: 20, food: 50 },
  foot: { ...NO_PURCHASES, guides: 1, askaris: 9, bearers: 17, muskets: 1, gifts: 20, food: 140 }
};

/** The animal a port sells, if any: camels at Khartoum, horses at the Cape ports. */
export function mountSoldAt(port: PortId): 'camels' | 'horses' | null {
  if (CAMEL_PORTS.includes(port)) return 'camels';
  if (HORSE_PORTS.includes(port)) return 'horses';
  return null;
}

const asChart = (p: Purchases): Chart => ({ ...p, water: 0, guideHomes: {} });

/**
 * Whether a chart still moves the way the sample intends. The canoe guard also keeps the greedy fill
 * from painting itself into a corner: no more than four non-paddlers a canoe, and money kept back for
 * the paddlers the canoes still lack, so every canoe ends with eight.
 */
function keeps(kind: OutfitKind, p: Purchases, left: number): boolean {
  const m = movementOptions(asChart(p));
  switch (kind) {
    case 'foot':
      return m.overland;
    case 'mounted':
      return m.mounted;
    case 'canoe':
      return (p.canoes === 0 || m.canoeSeats) && m.people - p.bearers <= 4 * p.canoes && left >= PRICES.bearers * Math.max(0, 8 * p.canoes - p.bearers);
  }
}

/**
 * Spend a budget on an expedition in the proportions of a sample, at a port: items are bought one at a
 * time, always the one furthest behind its share of the sample, as long as it is affordable and the
 * expedition still moves the sample's way. Whatever no purchase can use is left over (and forfeited).
 */
export function outfitLike(kind: OutfitKind, budget: number, port: PortId): Purchases {
  const mount = mountSoldAt(port);
  const sample = { ...SAMPLES[kind] };
  if (kind === 'mounted') {
    if (!mount) return { ...NO_PURCHASES };
    sample[mount] = sample.horses + sample.camels;
    sample[mount === 'horses' ? 'camels' : 'horses'] = 0;
  }
  const p: Purchases = { ...NO_PURCHASES };
  for (;;) {
    let best: Item | null = null;
    let bestShare = Infinity;
    for (const item of ITEMS) {
      if (sample[item] === 0) continue;
      const share = (p[item] + 1) / sample[item];
      if (share >= bestShare) continue;
      const next = { ...p, [item]: p[item] + 1 };
      const left = budget - cost(next);
      if (left < 0 || !keeps(kind, next, left)) continue;
      best = item;
      bestShare = share;
    }
    if (!best) return p;
    p[best] += 1;
  }
}
