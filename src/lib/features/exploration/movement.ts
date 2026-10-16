// Movement rates and passability by mode of travel (rules §7.1), as pure functions.
import type { Chart } from '$features/expedition/prices';
import type { Sickness } from '$lib/game/state';
import { capacity, load, mountedCarry, overlandCarry } from '$features/expedition/prices';
import { isLand, type Terrain } from '$features/map/manifest';
import { neighbours, type HexId } from '$features/map/hex';
import { hasPart } from '$features/map/generate';
import { isWater } from '$features/map/rivers';

export type Mode = 'foot' | 'mounted' | 'canoe';

export interface MovementBudget {
  mode: Mode;
  /** Movement points for the turn: the mode's known hexes a turn; a known hex costs 1. */
  points: number;
  /**
   * What entering an unknown hex costs: 2, whatever the mode, so that known and unknown hexes mix in one turn as the
   * points allow (PROMPTS.md, prompt 47; RQ-19): three points by canoe are three known hexes, or one unknown and one
   * known. Never more than the points (a canoe with one paddler has one point and enters its one unknown hex with it);
   * Infinity when the mode enters no unknown hex (canoes drifting without paddlers).
   */
  unknownCost: number;
  spent: number;
  /** Lost this turn: movement is over. */
  halted: boolean;
}

/** Canoe speed by paddlers per canoe (rules §7.1): the hexes a turn when all are known, and when all are unknown. */
export function canoeRate(paddlersPerCanoe: number): { known: number; unknown: number } {
  if (paddlersPerCanoe >= 8) return { known: 4, unknown: 2 };
  if (paddlersPerCanoe >= 4) return { known: 3, unknown: 1 };
  if (paddlersPerCanoe >= 2) return { known: 2, unknown: 1 };
  if (paddlersPerCanoe >= 1) return { known: 1, unknown: 1 };
  return { known: 1, unknown: 0 }; // drifting downstream only
}

export function budgetFor(mode: Mode, chart: Chart): MovementBudget {
  if (mode === 'mounted') return { mode, points: 4, unknownCost: 2, spent: 0, halted: false };
  if (mode === 'canoe') {
    const rate = canoeRate(chart.canoes > 0 ? Math.floor(chart.bearers / chart.canoes) : 0);
    return { mode, points: rate.known, unknownCost: rate.unknown > 0 ? Math.min(2, rate.known) : Infinity, spent: 0, halted: false };
  }
  return { mode, points: 2, unknownCost: 2, spent: 0, halted: false };
}

/** Whether the mode may enter terrain (rules §7.1). Unknown terrain (null) is always attempted. */
export function passable(mode: Mode, terrain: Terrain | null, chart: Chart): boolean {
  if (terrain === null) return true;
  switch (mode) {
    case 'foot':
      return !isWater(terrain);
    case 'mounted':
      if (isWater(terrain)) return false;
      if (chart.camels > 0 && hasPart(terrain, 'jungle')) return false; // camels: no jungle
      return true;
    case 'canoe':
      return terrain !== 'jungle-swamp';
  }
}

/** A hex on the coast: fewer than six land neighbours. Canoes may follow the coastline. */
export function coastal(id: HexId): boolean {
  return neighbours(id).some((n) => !isLand(n));
}

/**
 * Whether the mode may enter the hex `to`: its terrain's rule, except that canoes always traverse the ocean shore,
 * a coastal jungle-swamp (the Zambezi delta at Quilimane, the Niger's at Brass) included (RQ-17, prompt 32).
 */
export function canEnter(mode: Mode, terrain: Terrain | null, chart: Chart, to: HexId): boolean {
  if (mode === 'canoe' && coastal(to)) return true;
  return passable(mode, terrain, chart);
}

/**
 * The mode an expedition travels by this turn, decided when it first moves: canoes when they seat
 * everyone and the move is on water; mounts when everyone rides and the riders' and led animals'
 * loads cover the supplies (rules §5: a ridden animal carries 5, a led one 20); otherwise on foot.
 */
/**
 * Overland the expedition carries what its bearers and animals can carry (rules §4; PROMPTS.md, prompt 43): the load
 * (specimens a ration each) against the capacity, less the sick, who are carried by two bearers carrying nothing else
 * or by an animal in place of its load, twenty units either way (RQ-18); a sick bearer carries nothing. Null when the
 * load fits; else the load and what is carried, for the reason and the rail's mark.
 */
export function overload(chart: Chart, sick: Sickness, extraLoad = 0): { load: number; carry: number } | null {
  const able = { ...chart, bearers: Math.max(0, chart.bearers - sick.bearers) };
  const carry = overlandCarry(able);
  const sickMen = sick.guides + sick.bearers + sick.askaris + (sick.explorer ? 1 : 0);
  const room = carry === null ? null : carry - 20 * sickMen;
  const weight = load(chart) + extraLoad;
  return room !== null && weight <= room ? null : { load: weight, carry: Math.max(0, room ?? 0) };
}

export function modeFor(chart: Chart, onWater: boolean): Mode {
  const cap = capacity(chart);
  if (chart.canoes > 0 && cap.canoeSeats >= cap.men && onWater) return 'canoe';
  const mounted = mountedCarry(chart);
  if (mounted !== null && load(chart) <= mounted) return 'mounted';
  return 'foot';
}
