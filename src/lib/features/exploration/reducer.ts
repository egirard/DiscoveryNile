import type { GameEvent } from '$lib/game/events';
import type { ExplorerState, GameState, RollRecord } from '$lib/game/state';
import { BOARD, hexAt, isLand, type Terrain } from '$features/map/manifest';
import { generateTerrain, lostCheck, terrainLookup } from '$features/map/generate';
import { directionTo, neighbours, opposite, type Direction, type HexId } from '$features/map/hex';
import { printedCourse, resolveWater, riverDirection, isWater, type HexKnowledge, type RiverCourse } from '$features/map/rivers';
import { RIVERS } from '$features/map/manifest';
import { currentExplorer, replaceExplorer } from '$features/turn/reducer';
import { budgetFor, coastal, modeFor, passable, type Mode, type MovementBudget } from './movement';
import { d6 } from '$lib/game/random';
import { isCataract } from '$features/map/manifest';

/** The hex an explorer stands on, if on the board. */
export function standingHex(e: ExplorerState): HexId | null {
  if (e.location.kind === 'port') return BOARD.ports[e.location.port].hex;
  if (e.location.kind === 'hex') return e.location.hex;
  return null;
}

/** Terrain as the table knows it: generated in play, else pre-printed, else unknown. */
export function terrainOf(state: GameState, id: HexId): Terrain | null {
  return state.map[id]?.terrain ?? hexAt(id)?.terrain ?? null;
}

/** A hex is unknown to an explorer unless pre-printed or passed through (published hexes come later). */
export function unknownTo(e: ExplorerState, id: HexId): boolean {
  return hexAt(id)?.terrain == null && !e.known.includes(id);
}

/** The river course through a hex as the table knows it: generated, else pre-printed. */
export function courseAt(state: GameState, id: HexId): RiverCourse | null {
  const m = state.map[id];
  if (m) return m.river;
  return printedCourse(id);
}

/** A pre-printed river end still waiting for the hex it continues into (rules §7.4, drainage). */
function needsContinuation(state: GameState, id: HexId): boolean {
  const end = RIVERS.some((r) => r.path.at(-1) === id && !r.continuesOffMap);
  if (!end) return false;
  return !neighbours(id).some((n) => {
    const d = directionTo(n, id);
    return d !== null && state.map[n]?.river?.out === d;
  });
}

export function knowledgeOf(state: GameState): (id: HexId) => HexKnowledge | null {
  return (id) => {
    if (!isLand(id)) return null;
    const m = state.map[id];
    if (m) return { terrain: m.terrain, mapped: true, river: m.river, needsContinuation: false };
    const printed = hexAt(id)!.terrain;
    if (printed) return { terrain: printed, mapped: true, river: printedCourse(id), needsContinuation: needsContinuation(state, id) };
    return { terrain: null, mapped: false, river: null, needsContinuation: false };
  };
}

export interface MoveTarget {
  hex: HexId;
  /** Unknown to this explorer: entering risks becoming lost. */
  unknown: boolean;
  mode: Mode;
  cost: number;
}

/** Canoes may go from `from` to `to`: along a river course, across a lake, along the coast, into swamp. */
export function waterLink(state: GameState, from: HexId, to: HexId): boolean {
  const d = directionTo(from, to);
  if (d === null) return false;
  const back = opposite(d);
  const a = courseAt(state, from), b = courseAt(state, to);
  if (a && (a.out === d || a.in.includes(d))) return true;
  if (b && (b.out === back || b.in.includes(back))) return true;
  const ta = terrainOf(state, from), tb = terrainOf(state, to);
  if (tb === 'lake' || ta === 'lake') return true;
  if (tb === 'swamp') return true;
  return coastal(from) && coastal(to);
}

function cataractAt(state: GameState, id: HexId): boolean {
  return state.map[id]?.river?.cataract ?? isCataract(id);
}

/** What a step from `from` to `to` would cost and by what mode, or why it is not allowed. */
function stepPlan(state: GameState, e: ExplorerState, from: HexId, to: HexId): { mode: Mode; cost: number; unknown: boolean; water: boolean } | string {
  const chart = e.chart!;
  const water = waterLink(state, from, to);
  const mode: Mode = state.turn!.movement?.mode ?? modeFor(chart, water);
  const terrain = terrainOf(state, to);
  if (mode === 'canoe' && !water) return 'canoes must follow the water';
  if (terrain && !passable(mode, terrain, chart)) return `cannot enter ${terrain} ${mode === 'canoe' ? 'by canoe' : mode === 'mounted' ? 'mounted' : 'on foot'}`;
  if (mode === 'canoe' && cataractAt(state, to) && chart.bearers < 8) return 'fewer than eight bearers cannot portage the cataract';
  const budget = state.turn!.movement ?? budgetFor(mode, chart);
  const unknown = unknownTo(e, to);
  let cost = unknown ? budget.unknownCost : 1;
  if (mode === 'canoe' && terrain === 'swamp') cost *= 2;
  if (budget.halted) return 'the expedition is lost for this turn';
  if (budget.spent + cost > budget.points) return `no movement left for that hex (${budget.points - budget.spent} of ${budget.points} points, it costs ${cost})`;
  return { mode, cost, unknown, water };
}

/** Where the expedition may step now, with the mode and cost of each step. */
export function moveTargets(state: GameState, e: ExplorerState): MoveTarget[] {
  const from = standingHex(e);
  if (!from || !e.chart || !state.turn || state.turn.current !== e.seat || state.turn.phase !== 'act' || state.turn.moved) return [];
  const out: MoveTarget[] = [];
  for (const hex of neighbours(from)) {
    if (!isLand(hex)) continue;
    const plan = stepPlan(state, e, from, hex);
    if (typeof plan === 'string') continue;
    out.push({ hex, unknown: plan.unknown, mode: plan.mode, cost: plan.cost });
  }
  return out;
}

function guideStatus(e: ExplorerState, from: HexId): 'home' | 'adjacent' | null {
  const homes = Object.entries(e.chart?.guideHomes ?? {}).filter(([, n]) => n > 0).map(([h]) => h as HexId);
  if (homes.includes(from)) return 'home';
  if (homes.some((h) => directionTo(from, h) !== null)) return 'adjacent';
  return null;
}

export function reduceExploration(state: GameState, event: GameEvent): GameState | string {
  switch (event.type) {
    case 'expedition/moved': {
      const { seat, path } = event.payload as { seat?: string; path?: unknown };
      if (!state.turn) return 'game not started';
      if (seat !== state.turn.current) return `it is not ${seat}'s turn`;
      if (state.turn.phase !== 'act') return 'cannot move while discarding';
      const explorer = currentExplorer(state)!;
      const from = standingHex(explorer);
      if (!from) return 'the explorer is not in Africa';
      if (!explorer.chart) return 'the expedition is not outfitted';
      if (!Array.isArray(path) || path.length !== 1 || typeof path[0] !== 'string') return 'expedition/moved needs a path of one hex';
      const target = path[0] as HexId;
      if (!isLand(target)) return `${target} is not on the board`;
      if (directionTo(from, target) === null) return `${target} is not adjacent to ${from}`;
      const plan = stepPlan(state, explorer, from, target);
      if (typeof plan === 'string') return plan;
      const { mode, cost } = plan;
      const chart = explorer.chart;
      let movement: MovementBudget = state.turn.movement ?? budgetFor(mode, chart);

      let rng = state.rng!;
      const log: RollRecord[] = [];
      const finish = (st: GameState, mv: MovementBudget) => ({ ...st, rng, turn: { ...st.turn!, movement: mv, moved: mv.halted || mv.spent >= mv.points, log: [...st.turn!.log, ...log] } });

      if (plan.unknown) {
        const river = riverDirection(courseAt(state, from), directionTo(from, target) as Direction);
        const check = lostCheck(rng, { from: terrainOf(state, from), river, guide: guideStatus(explorer, from), ailing: false });
        rng = check.rng;
        const { result } = check;
        log.push({ kind: 'lost-check', seat: explorer.seat, hex: target, rolls: result.rolls, modifiers: result.modifiers, total: result.total, outcome: result.lost ? 'lost' : 'found the way', lost: result.lost });
        if (result.lost) return finish(state, { ...movement, halted: true });
      }

      let map = state.map;
      let terrain = terrainOf(state, target);
      let newlyMapped = false;
      if (!terrain) {
        newlyMapped = true;
        const gen = generateTerrain(rng, target, terrainLookup(state.map));
        rng = gen.rng;
        terrain = gen.result.terrain;
        log.push({ kind: 'terrain', seat: explorer.seat, hex: target, rolls: gen.result.rolls, outcome: `mapped ${terrain}${gen.result.copiedFrom ? ' (as the neighbour)' : ''}` });
        // Rivers, oases, cataracts and peaks (rules §7.4–7.5); water may replace the terrain.
        const water = resolveWater(rng, target, terrain, knowledgeOf(state));
        rng = water.rng;
        terrain = water.result.terrain;
        if (water.result.rolls.length || water.result.notes.length) {
          log.push({ kind: 'water', seat: explorer.seat, hex: target, rolls: water.result.rolls, outcome: water.result.notes.join('; ') || 'no river' });
        }
        map = {
          ...map,
          [target]: { terrain, markers: [explorer.seat], river: water.result.river, oasis: water.result.oasis, oasisKnownTo: water.result.oasis ? [explorer.seat] : [], peakFeet: water.result.peakFeet }
        };
      } else if (!hexAt(target)?.terrain && !map[target].markers.includes(explorer.seat)) {
        map = { ...map, [target]: { ...map[target], markers: [...map[target].markers, explorer.seat] } };
      }
      const known = explorer.known.includes(target) ? explorer.known : [...explorer.known, target];

      // Terrain conflict (rules §7.1): the hex is mapped and claimed, but the expedition turns back.
      if (!passable(mode, terrain, chart)) {
        log.push({ kind: 'turned-back', seat: explorer.seat, hex: target, rolls: [], outcome: `${terrain} is impassable ${mode === 'canoe' ? 'by canoe' : mode === 'mounted' ? 'mounted' : 'on foot'}: the expedition turns back` });
        return finish({ ...replaceExplorer(state, { ...explorer, known }), map }, { ...movement, spent: movement.spent + cost, halted: true });
      }

      // Canoes first discovering a cataract going downstream: d6 − 3 canoes go over the falls (rules §7.5).
      let nextChart = chart;
      if (mode === 'canoe' && newlyMapped && map[target].river?.cataract && riverDirection(courseAt(state, from), directionTo(from, target) as Direction) === 'downstream') {
        const r = d6(rng);
        rng = r.state;
        const lostCanoes = Math.min(chart.canoes, Math.max(0, r.value - 3));
        nextChart = { ...chart, canoes: chart.canoes - lostCanoes };
        log.push({ kind: 'canoes', seat: explorer.seat, hex: target, rolls: [{ label: 'canoes over the falls', value: r.value }], outcome: lostCanoes ? `${lostCanoes} canoe${lostCanoes > 1 ? 's' : ''} lost over the cataract` : 'every canoe survives the cataract' });
      }
      const moved: ExplorerState = { ...explorer, location: { kind: 'hex', hex: target }, known, chart: nextChart };
      return finish({ ...replaceExplorer(state, moved), map }, { ...movement, spent: movement.spent + cost });
    }
    default:
      return state;
  }
}
