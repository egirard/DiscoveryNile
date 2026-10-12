// Expedition Price List and the rules of personnel and equipment (rules §5).
import type { PortId } from '$features/map/manifest';

export type Item = 'guides' | 'bearers' | 'askaris' | 'camels' | 'horses' | 'canoes' | 'muskets' | 'food' | 'gifts';
export const ITEMS: readonly Item[] = ['guides', 'bearers', 'askaris', 'camels', 'horses', 'canoes', 'muskets', 'food', 'gifts'];

export const PRICES: Record<Item, number> = {
  guides: 50,
  bearers: 10,
  askaris: 50,
  camels: 50,
  horses: 50,
  canoes: 50,
  muskets: 10,
  food: 2,
  gifts: 2
};

export const CAMEL_PORTS: readonly PortId[] = ['khartoum'];
export const HORSE_PORTS: readonly PortId[] = ['capetown', 'durban', 'port-elizabeth'];

/** Whether an item can be bought at a port of entry. */
export function availableAt(item: Item, port: PortId): boolean {
  if (item === 'camels') return CAMEL_PORTS.includes(port);
  if (item === 'horses') return HORSE_PORTS.includes(port);
  return true;
}

export type Purchases = Record<Item, number>;

export const NO_PURCHASES: Purchases = { guides: 0, bearers: 0, askaris: 0, camels: 0, horses: 0, canoes: 0, muskets: 0, food: 0, gifts: 0 };

export function cost(p: Purchases): number {
  return ITEMS.reduce((sum, item) => sum + p[item] * PRICES[item], 0);
}

/** The explorer's Expedition Organization Chart: what the expedition has. */
export interface Chart extends Purchases {
  water: number;
}

export interface CapacitySummary {
  /** Explorer, guides, bearers, askaris. */
  men: number;
  /** Ration-weight units to carry: food, gifts, muskets, water (four each). */
  load: number;
  /** Units the bearers and led animals can carry; canoes carry unlimited goods on water. */
  carry: number;
  /** Men the canoes can hold, and the bearers each needs to paddle at full speed. */
  canoeSeats: number;
  paddlersWanted: number;
  /** Bearers needed to lead the animals (one per three). */
  handlersWanted: number;
  /** The expedition cannot carry everything, so it moves at the on-foot rate (rules §7.1). */
  onFoot: boolean;
}

/**
 * Carrying arithmetic from the rules of personnel and equipment. Animals are assumed led where
 * bearers suffice (20 units each) and ridden otherwise (5 units each); bearers leading animals
 * carry nothing else.
 */
export function capacity(c: Chart): CapacitySummary {
  const men = 1 + c.guides + c.bearers + c.askaris;
  const load = c.food + c.gifts + c.muskets + 4 * c.water;
  const animals = c.camels + c.horses;
  const handlersWanted = Math.ceil(animals / 3);
  const handlers = Math.min(c.bearers, handlersWanted);
  const led = Math.min(animals, handlers * 3);
  const ridden = animals - led;
  const carry = (c.bearers - handlers) * 10 + led * 20 + ridden * 5;
  const canoeSeats = c.canoes * 12;
  const paddlersWanted = c.canoes * 8;
  const onFoot = c.canoes > 0 ? canoeSeats < men || c.bearers < c.canoes : load > carry;
  return { men, load, carry, canoeSeats, paddlersWanted, handlersWanted, onFoot };
}
