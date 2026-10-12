// Publishing and points (rules §12). Hexes are claimed in Europe, one event per hex; the
// publisher scores the hex's terrain and its tribe, draws a donation card, and every marker on
// the hex comes off. Specimens and good works score when the explorer lands back in Europe (G-79).
import type { ExplorerState, GameState, ScoreEntry } from '$lib/game/state';
import type { SeatId } from '$lib/tabletop/seats';
import type { HexId } from '$features/map/hex';
import { terrainPoints } from '$features/map/scoring';
import { superlativesOf } from './superlatives';
import { TRANSIT_BONUS, fmtPoints } from './transits';
import type { SuperlativeRecord } from '$lib/game/state';

export interface Publication {
  points: number;
  /** What was counted, for the rail: 'veldt', 'river', 'tribe 2 discovered', 'tribe 2 defeated' … */
  parts: string[];
  entries: ScoreEntry[];
  /** Superlatives ranked by this publication (rules §12), scoring or not. */
  superlatives: SuperlativeRecord[];
}

/** Hexes this seat may publish now: mapped in play, unpublished, carrying its marker. */
export function publishable(state: GameState, seat: SeatId): HexId[] {
  return (Object.entries(state.map) as [HexId, GameState['map'][string]][]).filter(([, m]) => !m.publishedBy && m.markers.includes(seat)).map(([id]) => id);
}

/** What publishing a hex is worth to this seat (rules §12: areas mapped and native tribes). */
export function valueOf(state: GameState, hex: HexId, seat: SeatId, round: number): Publication {
  const m = state.map[hex];
  const parts: string[] = [m.terrain];
  if (m.river) parts.push('river');
  if (m.oasis) parts.push('oasis');
  const terrain = terrainPoints(m.terrain, { river: m.river !== null, oasis: m.oasis });
  const entries: ScoreEntry[] = [{ kind: 'hex', detail: hex, points: terrain, round }];
  if (m.tribe != null) {
    const tribe = state.tribes[m.tribe];
    let points = 1;
    parts.push(`tribe ${tribe.id} discovered`);
    if (tribe.defeatedBy.includes(seat)) {
      points += 1;
      parts.push('defeated');
    }
    entries.push({ kind: 'tribe', detail: String(tribe.id), points, round });
  }
  const superlatives = superlativesOf(state, hex, seat, round);
  parts.push(...superlatives.parts);
  entries.push(...superlatives.entries);
  // An epic transit's route hex earns its bonus as it is published (rules §12).
  const explorer = state.explorers.find((e) => e.seat === seat && e.location.kind !== 'dead');
  if (explorer?.transit?.route.includes(hex)) {
    const bonus = TRANSIT_BONUS[explorer.transit.order - 1];
    entries.push({ kind: 'transit', detail: `${explorer.transit.crossing} ${hex}`, points: bonus, round });
    parts.push(`epic transit (${fmtPoints(bonus)})`);
  }
  return { points: entries.reduce((sum, e) => sum + e.points, 0), parts, entries, superlatives: superlatives.records };
}

/** What an explorer brings home to score on landing in Europe: specimens and the specialties' good works. */
export function homecoming(e: ExplorerState, round: number): ScoreEntry[] {
  const out: ScoreEntry[] = [];
  const specimens = e.specimens.zoology + e.specimens.geology;
  if (specimens) out.push({ kind: 'specimens', detail: `${specimens} specimen${specimens === 1 ? '' : 's'}`, points: specimens, round });
  if (e.goodWorks.evangelism) out.push({ kind: 'works', detail: 'evangelism', points: e.goodWorks.evangelism, round });
  if (e.goodWorks.medicine) out.push({ kind: 'works', detail: 'medicine', points: e.goodWorks.medicine, round });
  return out;
}

export function scoreOf(state: GameState, seat: SeatId): number {
  return (state.scores[seat] ?? []).reduce((sum, e) => sum + e.points, 0);
}

export function addScore(state: GameState, seat: SeatId, entries: ScoreEntry[]): GameState {
  if (!entries.length) return state;
  return { ...state, scores: { ...state.scores, [seat]: [...(state.scores[seat] ?? []), ...entries] } };
}
