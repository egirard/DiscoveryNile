import type { GameEvent } from '$lib/game/events';
import type { ExplorerState, GameState, RollRecord } from '$lib/game/state';
import { BOARD, hexAt, isLand, type Terrain } from '$features/map/manifest';
import { generateTerrain, lostCheck, passableOnFoot, terrainLookup } from '$features/map/generate';
import { directionTo, neighbours, type HexId } from '$features/map/hex';
import { currentExplorer, replaceExplorer } from '$features/turn/reducer';

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

export interface MoveTarget {
  hex: HexId;
  /** Unknown to this explorer: entering risks becoming lost. */
  unknown: boolean;
}

/** Where the expedition may step this turn (slice 010: one adjacent hex, on foot). */
export function moveTargets(state: GameState, e: ExplorerState): MoveTarget[] {
  const from = standingHex(e);
  if (!from || !e.chart || !state.turn || state.turn.current !== e.seat || state.turn.phase !== 'act' || state.turn.moved) return [];
  return neighbours(from)
    .filter((h) => isLand(h) && passableOnFoot(terrainOf(state, h)))
    .map((hex) => ({ hex, unknown: unknownTo(e, hex) }));
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
      if (state.turn.moved) return 'the expedition has already moved this turn';
      const explorer = currentExplorer(state)!;
      const from = standingHex(explorer);
      if (!from) return 'the explorer is not in Africa';
      if (!explorer.chart) return 'the expedition is not outfitted';
      if (!Array.isArray(path) || path.length !== 1 || typeof path[0] !== 'string') return 'expedition/moved needs a path of one hex';
      const target = path[0] as HexId;
      if (!isLand(target)) return `${target} is not on the board`;
      if (directionTo(from, target) === null) return `${target} is not adjacent to ${from}`;
      const known = terrainOf(state, target);
      if (known && !passableOnFoot(known)) return `cannot enter ${known} on foot`;

      let rng = state.rng!;
      const log: RollRecord[] = [];
      let turn = { ...state.turn, moved: true };

      if (unknownTo(explorer, target)) {
        const check = lostCheck(rng, { from: terrainOf(state, from), river: null, guide: guideStatus(explorer, from), ailing: false });
        rng = check.rng;
        const { result } = check;
        log.push({ kind: 'lost-check', seat: explorer.seat, hex: target, rolls: result.rolls, modifiers: result.modifiers, total: result.total, outcome: result.lost ? 'lost' : 'found the way', lost: result.lost });
        if (result.lost) return { ...state, rng, turn: { ...turn, log: [...turn.log, ...log] } };
      }

      let map = state.map;
      let terrain = known;
      if (!terrain) {
        const gen = generateTerrain(rng, target, terrainLookup(state.map));
        rng = gen.rng;
        terrain = gen.result.terrain;
        log.push({ kind: 'terrain', seat: explorer.seat, hex: target, rolls: gen.result.rolls, outcome: `mapped ${terrain}${gen.result.copiedFrom ? ' (as the neighbour)' : ''}` });
        map = { ...map, [target]: { terrain, markers: [explorer.seat] } };
      } else if (!hexAt(target)?.terrain && !map[target].markers.includes(explorer.seat)) {
        map = { ...map, [target]: { ...map[target], markers: [...map[target].markers, explorer.seat] } };
      }

      // Terrain conflict (rules §7.1): the hex is mapped and claimed, but the expedition stays put.
      const bounced = !passableOnFoot(terrain);
      if (bounced) log[log.length - 1] = { ...log[log.length - 1], outcome: `mapped ${terrain}: impassable on foot, the expedition turns back` };
      const moved: ExplorerState = bounced
        ? { ...explorer, known: explorer.known.includes(target) ? explorer.known : [...explorer.known, target] }
        : { ...explorer, location: { kind: 'hex', hex: target }, known: explorer.known.includes(target) ? explorer.known : [...explorer.known, target] };
      return { ...replaceExplorer(state, moved), rng, map, turn: { ...turn, log: [...turn.log, ...log] } };
    }
    default:
      return state;
  }
}
