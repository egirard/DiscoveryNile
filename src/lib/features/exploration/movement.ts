// Movement rates and passability by mode of travel (rules §7.1), as pure functions.
import type { Chart } from '$features/expedition/prices';
import { capacity, load, mountedCarry } from '$features/expedition/prices';
import { isLand, type Terrain } from '$features/map/manifest';
import { neighbours, type HexId } from '$features/map/hex';
import { hasPart } from '$features/map/generate';
import { isWater } from '$features/map/rivers';

export type Mode = 'foot' | 'mounted' | 'canoe';

export interface MovementBudget {
  mode: Mode;
  /** Movement points for the turn; a known hex costs 1. */
  points: number;
  /** What entering an unknown hex costs, so that `points / unknownCost` unknown hexes fit. */
  unknownCost: number;
  spent: number;
  /** Lost this turn: movement is over. */
  halted: boolean;
}

/** Canoe speed in known hexes by paddlers per canoe (rules §7.1). */
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
    return { mode, points: rate.known, unknownCost: rate.unknown > 0 ? rate.known / rate.unknown : Infinity, spent: 0, halted: false };
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
 * The mode an expedition travels by this turn, decided when it first moves: canoes when they seat
 * everyone and the move is on water; mounts when everyone rides and the riders' and led animals'
 * loads cover the supplies (rules §5: a ridden animal carries 5, a led one 20); otherwise on foot.
 */
export function modeFor(chart: Chart, onWater: boolean): Mode {
  const cap = capacity(chart);
  if (chart.canoes > 0 && cap.canoeSeats >= cap.men && onWater) return 'canoe';
  const mounted = mountedCarry(chart);
  if (mounted !== null && load(chart) <= mounted) return 'mounted';
  return 'foot';
}
