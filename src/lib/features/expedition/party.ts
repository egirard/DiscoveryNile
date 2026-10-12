// Joint expeditions (rules §13): explorers who travel as one. The party's men, animals and goods
// are one chart, held by its leader; the others carry none. It moves once a round, on the turn of
// the member who comes last in the turn order, and any member may leave with an agreed share.
import type { Chart, Item } from './prices';
import { ITEMS } from './prices';
import type { ExplorerState, GameState, Party } from '$lib/game/state';
import type { SeatId } from '$lib/tabletop/seats';

export function partyOf(state: GameState, e: ExplorerState): Party | null {
  return e.party !== null ? (state.parties[e.party] ?? null) : null;
}

export function alive(state: GameState, seat: SeatId): ExplorerState | undefined {
  return state.explorers.find((x) => x.seat === seat && x.location.kind !== 'dead');
}

/** The members of an explorer's party (himself alone when he travels alone). */
export function members(state: GameState, e: ExplorerState): ExplorerState[] {
  const party = partyOf(state, e);
  return party ? party.members.map((s) => alive(state, s)).filter((x): x is ExplorerState => !!x) : [e];
}

/** The member whose chart the expedition uses: the party's leader, or the explorer himself. */
export function holderOf(state: GameState, e: ExplorerState): ExplorerState {
  const party = partyOf(state, e);
  return (party && alive(state, party.leader)) || e;
}

export function chartOf(state: GameState, e: ExplorerState): Chart | null {
  return holderOf(state, e).chart;
}

/** The member who moves the party: the one who comes last in the turn order each round (rules §13). */
export function moverOf(state: GameState, party: Party): SeatId {
  const order = state.turn?.order ?? [];
  const living = party.members.filter((s) => alive(state, s));
  return [...living].sort((a, b) => order.indexOf(b) - order.indexOf(a))[0];
}

export function addCharts(a: Chart, b: Chart): Chart {
  const sum = { ...a };
  for (const item of ITEMS) sum[item] = a[item] + b[item];
  sum.water = a.water + b.water;
  const guideHomes = { ...a.guideHomes };
  for (const [hex, n] of Object.entries(b.guideHomes)) guideHomes[hex] = (guideHomes[hex] ?? 0) + n;
  sum.guideHomes = guideHomes;
  return sum;
}

export function subtractChart(a: Chart, take: Partial<Record<Item, number>>): { rest: Chart; taken: Chart } | string {
  const rest = { ...a, guideHomes: { ...a.guideHomes } };
  const taken: Chart = { guides: 0, bearers: 0, askaris: 0, camels: 0, horses: 0, canoes: 0, muskets: 0, food: 0, gifts: 0, water: 0, guideHomes: {} };
  for (const [item, n] of Object.entries(take) as [Item | 'water', number | undefined][]) {
    if (!n || (item as string) === 'guideHomes') continue;
    if ((item !== 'water' && !ITEMS.includes(item)) || !Number.isInteger(n) || n < 0) return `bad share of ${item}`;
    if (rest[item] < n) return `only ${rest[item]} ${item} to divide`;
    rest[item] -= n;
    taken[item] += n;
  }
  return { rest, taken };
}

/**
 * A member leaves his party with `keep` as his own chart (null when he is dead or sailing home). The leader's chart,
 * less that share, passes to the next member; a party of one dissolves.
 */
export function leaveParty(state: GameState, seat: SeatId, keep: Chart | null): GameState {
  const e = alive(state, seat);
  const party = e && partyOf(state, e);
  if (!e || !party) return state;
  const rest = party.members.filter((s) => s !== seat && alive(state, s));
  const holder = alive(state, party.leader) ?? e;
  let explorers = state.explorers;
  const set = (s: SeatId, patch: Partial<ExplorerState>) => { explorers = explorers.map((x) => (x.seat === s && x.location.kind !== 'dead' ? { ...x, ...patch } : x)); };
  if (holder.seat === seat && rest.length) {
    // The men stay with the party: the next member takes the chart, less the leaver's share.
    const left = keep ? subtractChart(holder.chart ?? keep, keep) : null;
    set(rest[0], { chart: typeof left === 'string' || !left ? holder.chart : left.rest, sick: holder.sick });
  }
  set(seat, { chart: keep, party: null });
  const parties = { ...state.parties };
  if (rest.length < 2) {
    delete parties[party.id];
    for (const s of rest) set(s, { party: null });
  } else parties[party.id] = { ...party, members: rest, leader: holder.seat === seat ? rest[0] : party.leader };
  return { ...state, explorers, parties };
}
