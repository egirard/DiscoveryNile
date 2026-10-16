// The turn's log of everything that happened (PROMPTS.md, prompts 13 and 16): the rules' rolls are
// recorded where they are made; an action that rolls nothing (a card drawn, passage booked, the
// expedition outfitted, a step through known country, water taken…) gets a plain line here, so the
// "+" at the rail is there from the first thing a player does on his turn.
import type { GameEvent } from '$lib/game/events';
import type { GameState, RollRecord } from '$lib/game/state';
import type { SeatId } from '$lib/tabletop/seats';
import { BOARD, type PortId } from '$features/map/manifest';
import { ITEMS } from '$features/expedition/prices';
import { ITEM_NAMES } from '$features/expedition/outfit';
import { card } from '$features/cards/deck';
import type { CardId } from '$features/cards/deck';

const portName = (id: unknown) => (typeof id === 'string' && id in BOARD.ports ? BOARD.ports[id as PortId].name : String(id));

/** The hex the seat's explorer stands in, for the record; none in Europe or at sea. */
function hexOf(state: GameState, seat: SeatId) {
  const e = state.explorers.find((x) => x.seat === seat && x.location.kind !== 'dead');
  const loc = e?.location;
  if (!loc) return undefined;
  if (loc.kind === 'hex' || loc.kind === 'captive') return loc.hex;
  if (loc.kind === 'port') return BOARD.ports[loc.port].hex;
  return undefined;
}

/** What a card gives when drawn: a donation, or a free ticket. */
export function describeCard(id: CardId): string {
  const d = card(id).donation;
  if (d.kind === 'ticket') return `a free ticket to ${portName(d.port)}`;
  if (d.kind === 'money') return `$${d.amount}${d.note ? ` (${d.note})` : ''}`;
  return 'a card worth nothing';
}

/**
 * A line for an action of the current seat's turn that made no record of its own, or null when the
 * event is not such an action (the game's own events, seats, a turn ending, an undo).
 */
export function describeAction(event: GameEvent, before: GameState, after: GameState): string | null {
  const p = event.payload as Record<string, unknown>;
  const seat = p.seat as SeatId;
  const explorer = after.explorers.find((x) => x.seat === seat && x.location.kind !== 'dead');
  switch (event.type) {
    case 'cards/discarded': {
      const ids = p.cardIds as CardId[];
      return `discarded ${ids.map(describeCard).join(', ')}`;
    }
    case 'voyage/booked':
      return `booked passage to ${portName(p.port)}${p.ticketCardId != null ? ' on a free ticket' : ' for $500'}`;
    case 'expedition/outfitted': {
      const chart = explorer?.chart;
      const bought = chart ? ITEMS.filter((i) => chart[i] > 0).map((i) => `${chart[i]} ${ITEM_NAMES[i].toLowerCase()}${chart[i] === 1 ? '' : 's'}`) : [];
      return `outfitted at ${explorer?.location.kind === 'port' ? portName(explorer.location.port) : 'the port'}: ${bought.join(', ') || 'nothing'}`;
    }
    case 'expedition/moved': {
      const to = hexOf(after, seat);
      return to ? `moved to ${to}${explorer?.location.kind === 'port' ? ` (${portName(explorer.location.port)})` : ''}` : 'moved';
    }
    case 'water/taken': {
      const n = p.rations as number;
      return n > 0 ? `took ${n} water ration${n === 1 ? '' : 's'}` : `poured out ${-n} water ration${n === -1 ? '' : 's'}`;
    }
    case 'natives/policy':
      return `policy ${p.policy}${p.policy === 2 ? ': the expedition retreats' : ''}`;
    case 'natives/offered':
      return p.decline ? 'declined to give gifts' : p.everything ? 'gave the chief everything' : `offered the chief ${p.gifts} gift${p.gifts === 1 ? '' : 's'}`;
    case 'natives/done':
      return 'took leave of the chief';
    case 'natives/spoils':
      return p.choice === 'keep' ? 'kept the prisoners as bearers' : 'released the prisoners';
    case 'explorer/retired':
      return before.explorers.find((x) => x.seat === seat)?.location.kind === 'europe' ? 'retired in Europe' : 'retired from the field';
    case 'expedition/returned':
    case 'hex/published':
    case 'expedition/joined':
    case 'expedition/split':
    case 'expedition/reorganised':
    case 'cache/recovered':
    case 'specialty/performed':
    case 'natives/traded':
      return event.type.replace('/', ': ').replace(/-/g, ' ');
    default:
      return null;
  }
}

/**
 * After an event of the current seat's turn that left the log as it was, append its line. Events
 * that start or end a turn, or that the rules already recorded, pass through untouched.
 */
export function noteAction(event: GameEvent, before: GameState, after: GameState): GameState {
  if (!before.turn || !after.turn || after.turn.current !== before.turn.current || after.turn.round !== before.turn.round) return after;
  const seat = (event.payload as { seat?: unknown }).seat;
  // A record made: a line more, or the latest line written again (the camp's line grows in place, prompt 39).
  const recorded = after.turn.log.length !== before.turn.log.length || after.turn.log.at(-1) !== before.turn.log.at(-1);
  if (seat !== before.turn.current || recorded) return after;
  const outcome = describeAction(event, before, after);
  if (!outcome) return after;
  const record: RollRecord = { kind: 'action', seat: seat as SeatId, hex: hexOf(after, seat as SeatId), rolls: [], outcome };
  return { ...after, turn: { ...after.turn, log: [...after.turn.log, record] } };
}
