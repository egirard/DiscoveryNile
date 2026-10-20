<script lang="ts">
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import QRCode from 'qrcode';
  import { openGame, type Game } from '$lib/game/store';
  import type { GameState, LoggedTurn } from '$lib/game/state';
  import type { GameEvent } from '$lib/game/events';
  import { initialState } from '$lib/game/state';
  import SeatRail from '$features/seats/SeatRail.svelte';
  import { rotationFor, seatsFor, type Seat } from '$lib/tabletop/seats';
  import { mmPerPx, pxFor, readDiagonalInches, screenGeometry, writeDiagonalInches } from '$lib/tabletop/screen';
  import OptionsPanel from '$lib/tabletop/OptionsPanel.svelte';
  import { attachTooltips } from '$lib/ui/tooltips';
  import HexBoard from '$features/map/HexBoard.svelte';
  import ExplorerSetup from '$features/explorers/ExplorerSetup.svelte';
  import ExplorerToken from '$features/explorers/ExplorerToken.svelte';
  import { explorerAt } from '$features/explorers/reducer';
  import { colourFor } from '$features/explorers/colours';
  import { fallenAt } from '$features/explorers/fate';
  import RetirePanel from '$features/explorers/RetirePanel.svelte';
  import SplitPanel from '$features/expedition/SplitPanel.svelte';
  import GameOver from '$features/turn/GameOver.svelte';
  import { chartOf, holderOf, moverOf, partyOf } from '$features/expedition/party';
  import Card from '$features/cards/Card.svelte';
  import DonationCards from '$features/cards/DonationCards.svelte';
  import DeckStack from '$features/cards/DeckStack.svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import TurnControls from '$features/turn/TurnControls.svelte';
  import { card as cardOf, handValue, type CardId } from '$features/cards/deck';
  import { BOARD, type PortId } from '$features/map/manifest';
  import type { BoardToken, PortChoice } from '$features/map/HexBoard.svelte';
  import { PASSAGE_FARE, waterAvailable, WATER_STEP, worksOwed, portOf, explorerSeats } from '$features/turn/reducer';
  import ExpeditionChart from '$features/expedition/ExpeditionChart.svelte';
  import ChartSummary from '$features/expedition/ChartSummary.svelte';
  import EdgePanel from '$lib/tabletop/EdgePanel.svelte';
  import DisasterCard from '$features/disasters/DisasterCard.svelte';
  import { situationOf } from '$features/disasters/draw';
  import { applies as disasterApplies } from '$features/disasters/resolve';
  import PolicyChooser from '$features/natives/PolicyChooser.svelte';
  import SpoilsChooser from '$features/natives/SpoilsChooser.svelte';
  import NegotiationPanel from '$features/natives/NegotiationPanel.svelte';
  import TradePanel from '$features/natives/TradePanel.svelte';
  import ReorganisePanel from '$features/expedition/ReorganisePanel.svelte';
  import type { Purchases } from '$features/expedition/prices';
  import { moveTargets, researchPending, standingHex } from '$features/exploration/reducer';
  import RollLog from '$features/exploration/RollLog.svelte';
  import Tally from '$features/scoring/Tally.svelte';
  import { publishable, scoreOf } from '$features/scoring/score';
  import type { HexId } from '$features/map/hex';
  import { SEAT_LAYOUT } from '$lib/game/config';
  import type { Specialty } from '$lib/game/state';
  import type { SeatId } from '$lib/tabletop/seats';
  import DicePrompt from '$features/dice/DicePrompt.svelte';
  import type { RollRecord } from '$lib/game/state';
  import DiceResult from '$features/dice/DiceResult.svelte';
  import { lingerLines } from '$features/dice/linger';
  import FirstPlayerRoll from '$features/turn/FirstPlayerRoll.svelte';
  import StatusLine from '$lib/tabletop/StatusLine.svelte';
  import Dicecam from '$features/dice/Dicecam.svelte';
  import RadialMenu from '$features/dice/RadialMenu.svelte';
  import type { Roll } from '$features/map/generate';
  import { consider, dieAt, gathering, lieOf, moved, rechecked, recheckText, type DicecamStatus, type EngineMessage, type Lie, type Point, type Recheck, type SeenDie, type Watch } from '$features/dice/dicecam';
  import type { DockTap } from '$features/dice/Dicecam.svelte';
  import { log as diagLog } from '$lib/diagnostics/diag';
  import { consumedRecord } from '$lib/diagnostics/dice';
  import { isPhysical, type DieSource } from '$lib/game/random';

  const layout = SEAT_LAYOUT;
  const seats = seatsFor(layout);

  let game = $state<Game | null>(null);
  let gameState = $state<GameState>(initialState());
  /** The game's events as last reduced, kept outside the state proxy (which would cache the list) for the dice corrections (prompt 37). */
  let gameEvents: GameEvent[] = [];
  let status = $state<'offline' | 'syncing' | 'synced'>('syncing');
  let qr = $state<Record<string, { url: string; image: string }>>({});
  let diagonal = $state(55);
  let viewport = $state({ w: 1920, h: 1080 });

  const k = $derived(mmPerPx(diagonal, viewport.w, viewport.h));
  const target = $derived(pxFor(12, k));
  // Everything measured in em follows the touch target, so a denser screen scales text and icons with its controls.
  const scale = $derived(target / 44);
  const qrSize = $derived(pxFor(30, k, 96));
  const railDepth = $derived(target * 2.6);

  function seatState(seat: Seat) {
    return gameState.seats.find((s) => s.id === seat.id) ?? { id: seat.id, uid: null, name: null };
  }
  // Once the game has started, a seat nobody took has no rail: the players' rails stay, the board
  // takes the edges that are free, and the piles keep to the board's corner. Before the start, and
  // again after a game ends and continues, every seat is offered.
  const shownSeats = $derived(gameState.turn ? seats.filter((s) => seatState(s).uid) : seats);
  const inset = $derived({
    top: shownSeats.some((s) => s.edge === 'top') ? railDepth : 0,
    bottom: shownSeats.some((s) => s.edge === 'bottom') ? railDepth : 0,
    left: shownSeats.some((s) => s.edge === 'left') ? railDepth : 0,
    right: shownSeats.some((s) => s.edge === 'right') ? railDepth : 0
  });
  const boardW = $derived(Math.max(200, viewport.w - inset.left - inset.right - 2 * target));
  const boardH = $derived(Math.max(200, viewport.h - inset.top - inset.bottom - 2 * target));

  async function join(seat: Seat) {
    await game?.append('seat/taken', { seat: seat.id, uid: `table:${seat.id}` });
  }

  async function commission(seat: Seat, specialties: Specialty[]) {
    await game?.append('explorer/commissioned', { seat: seat.id, specialties });
  }

  // The agreed length of the game (RQ-10): chosen beside the start control; null ends by consensus.
  let roundLimit = $state<number | null>(null);
  function limitBy(by: number) {
    const next = (roundLimit ?? 0) + by;
    roundLimit = next <= 0 ? null : next;
  }
  async function start() {
    await game?.append('game/started', roundLimit ? { roundLimit } : {});
  }

  const canStart = $derived(!gameState.turn && !gameState.ended && gameState.explorers.some((e) => e.location.kind !== 'dead'));

  async function endTurn(seat: Seat) {
    await game?.append('turn/ended', { seat: seat.id });
  }

  async function discard(seat: Seat, id: CardId) {
    await game?.append('cards/discarded', { seat: seat.id, cardIds: [id] });
  }

  // Sailing: the current seat opens the port chooser on the map; a port tap chooses, the check mark at the rail books (prompt 17).
  let sailingSeat = $state<string | null>(null);
  let chosenPort = $state<PortId | null>(null);
  function toggleSailing(seat: string) {
    sailingSeat = sailingSeat === seat ? null : seat;
    chosenPort = null;
  }
  const portChoices = $derived.by((): Partial<Record<PortId, PortChoice>> | null => {
    if (!sailingSeat || gameState.turn?.current !== sailingSeat) return null;
    const explorer = explorerAt(gameState, sailingSeat);
    if (!explorer || explorer.location.kind !== 'europe') return null;
    const cash = handValue(explorer.hand) + pooling.filter((s) => poolable.includes(s)).reduce((sum, s) => sum + handValue(explorerAt(gameState, s)!.hand), 0);
    const tickets = new Set(explorer.hand.map((id) => cardOf(id).donation).filter((d) => d.kind === 'ticket').map((d) => (d as { port: PortId }).port));
    const out: Partial<Record<PortId, PortChoice>> = {};
    for (const id of Object.keys(BOARD.ports) as PortId[]) out[id] = { fare: tickets.has(id) ? 'ticket' : cash >= PASSAGE_FARE ? 'cash' : 'none', selected: chosenPort === id };
    return out;
  });
  // Companions in Europe chosen to pool their donations and sail along (rules §13).
  let pooling = $state<SeatId[]>([]);
  const poolable = $derived.by(() => {
    if (!sailingSeat) return [];
    return gameState.explorers.filter((e) => e.seat !== sailingSeat && e.location.kind === 'europe' && e.party === null).map((e) => e.seat);
  });
  function choosePort(port: PortId) {
    chosenPort = chosenPort === port ? null : port;
  }
  async function bookPassage() {
    const seat = sailingSeat;
    const port = chosenPort;
    const explorer = seat ? explorerAt(gameState, seat) : undefined;
    if (!seat || !port || !explorer || portChoices?.[port]?.fare === 'none') return;
    const ticket = explorer.hand.find((id) => {
      const d = cardOf(id).donation;
      return d.kind === 'ticket' && d.port === port;
    });
    const companions = pooling.filter((s) => poolable.includes(s));
    sailingSeat = null;
    chosenPort = null;
    pooling = [];
    await game?.append('voyage/booked', { seat, port, ticketCardId: ticket ?? null, ...(companions.length ? { with: companions } : {}) });
  }
  let splittingSeat = $state<string | null>(null);
  const splitting = $derived.by(() => {
    if (!splittingSeat || gameState.turn?.current !== splittingSeat || gameState.turn.phase !== 'act') return null;
    const seat = seats.find((s) => s.id === splittingSeat);
    const explorer = seat && explorerAt(gameState, seat.id);
    const chart = explorer && chartOf(gameState, explorer);
    if (!seat || !explorer || !partyOf(gameState, explorer) || !chart) return null;
    return { seat, chart };
  });
  /** Other explorers standing in the same hex, not yet of the same party: candidates to join forces with. */
  function joinable(seat: string) {
    const explorer = explorerAt(gameState, seat);
    const hex = explorer && standingHex(explorer);
    if (!explorer || !hex || explorer.location.kind === 'captive' || explorer.party !== null) return [];
    return gameState.explorers.filter((e) => e.seat !== seat && e.location.kind !== 'dead' && e.location.kind !== 'captive' && standingHex(e) === hex && (e.chart || chartOf(gameState, e)));
  }
  async function outfit(seat: Seat, purchases: Purchases) {
    await game?.append('expedition/outfitted', { seat: seat.id, purchases });
  }

  /** The seat (if any) that is outfitting right now: current, at a port, not yet outfitted. */
  const outfitting = $derived.by(() => {
    const seat = seats.find((s) => s.id === gameState.turn?.current);
    const explorer = seat ? explorerAt(gameState, seat.id) : undefined;
    return seat && explorer && explorer.location.kind === 'port' && !explorer.chart && gameState.turn?.phase === 'act' ? { seat, explorer, port: explorer.location.port } : null;
  });

  const boardTokens = $derived.by((): BoardToken[] =>
    gameState.explorers.flatMap((e) => {
      const hex = standingHex(e);
      return hex ? [{ seat: e.seat, hex }] : [];
    })
  );

  const targets = $derived.by(() => {
    const explorer = gameState.turn ? explorerAt(gameState, gameState.turn.current) : undefined;
    return explorer ? moveTargets(gameState, explorer) : [];
  });
  /** The seat choosing a policy towards natives right now. */
  // The turn's disaster card, read in full before it applies (prompt 34): at the seat's edge over a scrim, like a roll.
  const facingDisaster = $derived.by(() => {
    if (gameState.turn?.phase !== 'disaster' || !gameState.turn.disaster) return null;
    const seat = seats.find((s) => s.id === gameState.turn!.current);
    const explorer = seat && explorerAt(gameState, seat.id);
    if (!seat || !explorer) return null;
    const situation = situationOf(gameState, explorer);
    return { seat, card: gameState.turn.disaster.card, applies: situation ? disasterApplies(cardOf(gameState.turn.disaster.card), situation) : false };
  });
  const facingNatives = $derived.by(() => {
    if (gameState.turn?.phase !== 'natives') return null;
    const seat = seats.find((s) => s.id === gameState.turn!.current);
    const explorer = seat && explorerAt(gameState, seat.id);
    if (!seat || !explorer || explorer.location.kind !== 'hex') return null;
    const id = gameState.map[explorer.location.hex]?.tribe;
    const tribe = id != null ? gameState.tribes[id] : undefined;
    return tribe ? { seat, explorer, tribe } : null;
  });
  const dealingSpoils = $derived.by(() => {
    if (gameState.turn?.phase !== 'spoils') return null;
    const seat = seats.find((s) => s.id === gameState.turn!.current);
    const explorer = seat && explorerAt(gameState, seat.id);
    if (!seat || !explorer || explorer.location.kind !== 'hex') return null;
    const id = gameState.map[explorer.location.hex]?.tribe;
    const tribe = id != null ? gameState.tribes[id] : undefined;
    return tribe?.pending ? { seat, prisoners: tribe.pending.prisoners } : null;
  });
  const negotiating = $derived.by(() => {
    if (gameState.turn?.phase !== 'negotiate') return null;
    const seat = seats.find((s) => s.id === gameState.turn!.current);
    const explorer = seat && explorerAt(gameState, seat.id);
    if (!seat || !explorer || explorer.location.kind !== 'hex' || !explorer.chart) return null;
    const id = gameState.map[explorer.location.hex]?.tribe;
    const tribe = id != null ? gameState.tribes[id] : undefined;
    return tribe ? { seat, explorer, tribe } : null;
  });
  const trading = $derived.by(() => {
    if (gameState.turn?.phase !== 'trade' || !gameState.turn.trade) return null;
    const seat = seats.find((s) => s.id === gameState.turn!.current);
    const explorer = seat && explorerAt(gameState, seat.id);
    if (!seat || !explorer || !explorer.chart) return null;
    return { seat, explorer, prices: gameState.turn.trade.prices };
  });
  let reorganisingSeat = $state<string | null>(null);
  const reorganising = $derived.by(() => {
    if (!reorganisingSeat || gameState.turn?.current !== reorganisingSeat || gameState.turn.phase !== 'act') return null;
    const seat = seats.find((s) => s.id === reorganisingSeat);
    const explorer = seat && explorerAt(gameState, seat.id);
    const hex = explorer && standingHex(explorer);
    const chart = explorer && chartOf(gameState, explorer);
    if (!seat || !explorer || !chart || !hex || explorer.location.kind === 'captive') return null;
    // One's own caches, and anyone's in a published hex (RQ-3); this turn's shown with its goods to take back (prompt 34).
    const caches = Object.values(gameState.caches).filter((c) => c.hex === hex && (c.seat === seat.id || !!gameState.map[hex]?.publishedBy));
    return { seat, explorer: { ...explorer, chart }, caches, waterHere: waterAvailable(gameState, explorer) };
  });
  // Publishing: the current seat, in Europe, opens the claim on the board; a tap on a marker hex publishes it.
  let publishingSeat = $state<string | null>(null);
  // Whether the current seat has anything reasonable left to do this turn (prompt 46): in Europe a passage it can
  // book or a hex to publish, in Africa a step to take, a study owed or an expedition to outfit. With nothing left
  // the end-turn control is a plain check mark that asks no confirmation.
  const canSailNow = $derived.by(() => {
    const t = gameState.turn;
    const explorer = t && explorerAt(gameState, t.current);
    if (!explorer || explorer.location.kind !== 'europe') return false;
    return handValue(explorer.hand) >= PASSAGE_FARE || explorer.hand.some((id) => cardOf(id).donation.kind === 'ticket');
  });
  const optionsLeft = $derived.by(() => {
    const t = gameState.turn;
    const explorer = t && explorerAt(gameState, t.current);
    if (!t || !explorer || t.phase !== 'act') return true;
    if (explorer.location.kind === 'europe') return canSailNow || publishable(gameState, t.current).length > 0;
    if (explorer.location.kind === 'port' && !holderOf(gameState, explorer).chart) return true; // the expedition is outfitted here
    if (explorer.location.kind === 'hex' || explorer.location.kind === 'port') return targets.length > 0 || (!t.moved && researchPending(explorer).length > 0);
    return false;
  });
  const publishTargets = $derived.by((): HexId[] => {
    if (!publishingSeat || gameState.turn?.current !== publishingSeat || gameState.turn.phase !== 'act') return [];
    const explorer = explorerAt(gameState, publishingSeat);
    if (!explorer || explorer.location.kind !== 'europe') return [];
    return publishable(gameState, publishingSeat as SeatId);
  });
  async function publish(hex: HexId) {
    const seat = publishingSeat;
    if (seat) await game?.append('hex/published', { seat, hex });
  }
  // Retiring: a tap on one's own explorer at the rail during one's turn asks for confirmation at the edge (rules §12).
  // The options screen: opened from the gear at the north-west or south-east corner and turned toward it.
  let options = $state<'nw' | 'se' | null>(null);

  // Physical dice (PROMPTS.md, prompts 18 and 19): the reducer holds an event at a roll and names the seat to roll;
  // the dicecam (the table's camera on a canvas, read by WebCamTool's engine loaded as a worker, docs/dicecam.md)
  // reports the tray, and two readings that agree send the throw as `dice/rolled`; a tapped face does the same.
  // The dicecam is on for the whole game, in a corner.
  const DICECAM_URL: string = import.meta.env.VITE_DICECAM_URL ? (String(import.meta.env.VITE_DICECAM_URL).startsWith('/') ? `${base}${import.meta.env.VITE_DICECAM_URL}` : String(import.meta.env.VITE_DICECAM_URL)) : '';
  const physical = $derived(isPhysical(gameState.rng));
  const awaiting = $derived(gameState.awaiting);
  // The roll for first player at every station (prompt 27): each seat's throw as it comes while the roll is asked
  // for, then every seat's with the winner's glowing while the game is starting; `game/begun` after the pause.
  const starting = $derived(gameState.starting);
  const firstPlayerRolls = $derived.by(() => {
    const out: { seat: Seat; values: number[]; winner: boolean; decided: boolean }[] = [];
    if (starting && gameState.rollOff) {
      for (const seat of seats) {
        const values = gameState.rollOff[seat.id]?.at(-1);
        if (values) out.push({ seat, values, winner: seat.id === starting, decided: true });
      }
    } else if (awaiting?.event.type === 'game/started') {
      const latest = new Map<string, number[]>();
      for (const r of awaiting.rolled) latest.set(r.seat, r.values);
      for (const seat of seats) {
        const values = latest.get(seat.id);
        if (values && seat.id !== awaiting.seat) out.push({ seat, values, winner: false, decided: false });
      }
    }
    return out;
  });
  /** What the dice just decided (prompts 54 and 55): the hunt's meal, the natives' nerve or the fight, kept at the seat's
   *  edge for a moment after the last die is in, so the result is read before the table goes on. */
  let lingering = $state<{ seat: Seat; prompt: string; lines: RollRecord[] } | null>(null);
  /** How long: `?dice-result=<ms>` (`hold` keeps it until tapped), else the build's, else two seconds. */
  const DICE_RESULT_MS: number | null = (() => {
    const q = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('dice-result');
    if (q === 'hold') return null;
    if (q !== null && q !== '' && Number.isFinite(Number(q))) return Number(q);
    const env = import.meta.env.VITE_DICE_RESULT_MS;
    return env !== undefined && env !== '' && Number.isFinite(Number(env)) ? Number(env) : 2000;
  })();
  let lastSeen: GameState | null = null;
  $effect(() => {
    const now = gameState;
    const before = lastSeen;
    lastSeen = now;
    if (!before) return;
    const lines = lingerLines(before, now);
    if (!lines) return;
    const seat = seats.find((s) => s.id === before.awaiting!.seat);
    if (seat) lingering = { seat, prompt: before.awaiting!.prompt, lines };
  });
  $effect(() => {
    if (!lingering || DICE_RESULT_MS === null) return;
    const t = setTimeout(() => (lingering = null), DICE_RESULT_MS);
    return () => clearTimeout(t);
  });
  /** How long the decided roll is shown before play begins: `?first-player-pause=<ms>` (`hold` never begins by itself), else the build's, else three seconds. */
  const FIRST_PLAYER_PAUSE_MS: number | null = (() => {
    const q = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('first-player-pause');
    if (q === 'hold') return null;
    if (q !== null && q !== '' && Number.isFinite(Number(q))) return Number(q);
    const env = import.meta.env.VITE_FIRST_PLAYER_PAUSE_MS;
    return env !== undefined && env !== '' && Number.isFinite(Number(env)) ? Number(env) : 3000;
  })();
  $effect(() => {
    if (!starting || FIRST_PLAYER_PAUSE_MS === null) return;
    const g = game;
    const t = setTimeout(() => void g?.append('game/begun', {}), FIRST_PLAYER_PAUSE_MS);
    return () => clearTimeout(t);
  });
  const awaitingSeat = $derived(awaiting ? (seats.find((s) => s.id === awaiting.seat) ?? null) : null);
  // The dicecam never moves in the DOM (that would restart its camera); it parks in the south-west corner and, while
  // a roll is asked, comes to the middle of the board turned toward the seat that rolls, over the dimmed table.
  const dockW = $derived(target * 7);
  const dockH = $derived(target * 4.7);
  const dockPlace = $derived.by(() => {
    if (awaitingSeat) {
      const cx = (inset.left + viewport.w - inset.right) / 2;
      const cy = (inset.top + viewport.h - inset.bottom) / 2;
      return { x: cx - dockW / 2, y: cy - dockH / 2, rotation: rotationFor(awaitingSeat.edge), centred: true };
    }
    return { x: inset.left + target * 0.4, y: viewport.h - inset.bottom - target * 0.4 - dockH, rotation: 0, centred: false };
  });
  let dicecamStatus = $state<DicecamStatus>('starting');
  let dicecamSeen = $state<number | null>(null);
  /** The reading is the tray as it already lay, not a throw (prompts 20 and 21): the status line waits for a roll. */
  let dicecamStale = $state(false);
  let watch: Watch | null = null;
  /** The throw last taken, whichever seat threw it, and the tray as the engine last read it. */
  let lastThrow: Lie | null = null;
  let lastReading: Lie | null = null;
  /**
   * The engine saw the dice move since the last throw was taken (prompt 57). Every throw consumed is written to the
   * capture with it, so the offline check (`bun run diag:dice`) can tell a die taken again where it lay from a throw,
   * and the judge takes a die's changed face at an unmoved place as a throw only once it is true (prompt 58).
   */
  let motionSinceTake = false;
  $effect(() => {
    // Each ask watches afresh: what lies in the tray as it opens (the last throw taken, or dice left from before)
    // is not the throw, die by die (prompt 36), and the engine's first reading at the start of the run is the tray as found.
    // A throw gathered in parts (prompt 33) watches again for the rest after each part, the part just taken a lie.
    // Whether the engine has seen the dice move since the last throw was taken goes with it (prompt 58): until it
    // has, a die read with another face where a die lay is a flicker of the engine's reading, not a throw.
    watch = awaiting ? gathering(awaiting.count, awaiting.have.length, lastThrow, lastReading) : null;
    if (watch && motionSinceTake) watch = moved(watch);
    dicecamSeen = null;
    dicecamStale = false;
    if (awaiting) diagLog('dice/asked', { seat: awaiting.seat, count: awaiting.count, have: awaiting.have, prompt: awaiting.prompt, rolled: awaiting.rolled, lying: lastReading?.dice ?? null });
  });
  function onDicecam(m: EngineMessage) {
    if (m.type === 'rolling') { dicecamSeen = 0; dicecamStale = false; motionSinceTake = true; if (watch) watch = moved(watch); recheck = null; dockHint = null; diagLog('dicecam/rolling', { asked: Boolean(awaiting) }); }
    else if (m.type === 'removed') { dicecamSeen = m.remaining; dicecamStale = false; }
    else if (m.type === 'error') diagLog('dicecam/error', m.message);
    else if (m.type === 'settled') {
      lastReading = lieOf(m);
      if (recheck) readAgain(m);
      if (!watch || !awaiting) { dicecamSeen = m.dice.length; return; }
      const ignore = watch.ignore;
      const judged = consider(watch, m);
      watch = judged.watch;
      dicecamSeen = judged.seen;
      dicecamStale = judged.stale;
      // A line per reading judged, for the console and the diagnostics capture: what lay where, and what the
      // table made of it; each die is judged on its own (prompt 36), so the line says how many rest where they lay.
      const lying = judged.resting ? `, ${judged.resting} lying` : '';
      const misread = judged.misread ? `, ${judged.misread} misread` : '';
      const verdict = (judged.accept ? `taken ${judged.accept.join(' ')}` : judged.stale ? 'lying there already' : judged.watch.pending ? 'read once' : `${judged.seen} of ${awaiting.count - awaiting.have.length} wanted`) + (judged.stale ? misread : lying + misread);
      console.debug('dicecam', m.rollId, lastReading.dice.map((d) => `${d.value}@${d.x.toFixed(2)},${d.y.toFixed(2)}`).join(' '), verdict);
      diagLog('dicecam/reading', { rollId: m.rollId, kind: m.kind, dice: m.dice.map((d) => ({ value: d.value, confidence: Number(d.confidence.toFixed(2)), askew: d.askew ?? false, at: d.normalizedPosition ?? null })), verdict });
      if (judged.accept) { lastThrow = lastReading; watch = null; recheck = null; dockHint = null; rolled(awaiting.seat, judged.accept, { rollId: m.rollId, dice: m.dice, lay: judged.lay ?? [], ignore }); }
    }
  }
  /**
   * A throw to the game, with where each die lay when the dicecam read it (prompt 37), so a tap on the picture finds
   * its die; and to the capture as `dice/consumed` (prompt 57): the faces and places, what else lay in the tray, what
   * the table ignored, whether anything moved since the last throw, and what the throw is for. Faces tapped (no
   * reading) are written the same way, without places.
   */
  async function rolled(seat: string, values: number[], read?: { rollId: string; dice: SeenDie[]; lay: (Point | null)[]; ignore: Lie[] }) {
    if (awaiting) diagLog('dice/consumed', consumedRecord(awaiting, seat, values, read ?? null, read ? 'dicecam' : 'tap', motionSinceTake));
    motionSinceTake = false;
    await game?.append('dice/rolled', read ? { seat, values, lay: read.lay } : { seat, values });
  }
  // A die in the picture tapped (prompt 37): the die of the game lying there is read again from the readings that
  // follow, and set right when two agree on another face; a second tap on it opens the six faces instead.
  let recheck: Recheck | null = null;
  let dockHint = $state<string | null>(null);
  function onDockTap(tap: DockTap) {
    const refused = new Set(gameState.diagnostics.map((d) => d.eventId));
    const found = tap.die?.normalizedPosition ? dieAt(gameEvents, tap.die.normalizedPosition, refused) : null;
    diagLog('dicecam/tapped', { at: tap.point, die: tap.die ? { value: tap.die.value, at: tap.die.normalizedPosition ?? null } : null, found });
    if (!tap.die) { dockHint = 'No die there'; return; }
    if (!found) { dockHint = 'Not a die of the game'; return; }
    const seat = seats.find((s) => s.id === found.seat) ?? seats[0];
    if (recheck && recheck.eventId === found.eventId && recheck.index === found.index) {
      // Tapped again: the player sets the face.
      recheck = null;
      dockHint = null;
      openDieMenu(seat, { label: 'die', value: found.value, from: { eventId: found.eventId, index: found.index } }, new DOMRect(tap.client.x, tap.client.y, 0, 0), dockPlace.rotation);
      return;
    }
    recheck = { ...found, at: tap.die.normalizedPosition!, seen: [] };
    dockHint = recheckText(found, { verdict: 'checking' });
  }
  function readAgain(reading: { rollId: string; dice: { value: number; confidence: number; askew?: boolean; normalizedPosition?: Point }[] }) {
    if (!recheck) return;
    const r = rechecked(recheck, reading);
    recheck = r.check;
    dockHint = recheckText(recheck, r.result);
    diagLog('dicecam/recheck', { die: { eventId: recheck.eventId, index: recheck.index, value: recheck.value }, seen: recheck.seen, verdict: r.result.verdict });
    if (r.result.verdict === 'gone') recheck = null;
    else if (r.result.verdict === 'changed') {
      const { seat, eventId, index } = recheck;
      recheck = { ...recheck, value: r.result.value };
      void game?.append('dice/corrected', { seat, eventId, index, value: r.result.value });
    }
  }
  /** The table rolls the rest of a gathered throw from the generator (prompt 33). */
  async function rolledAuto(seat: string) {
    if (awaiting) diagLog('dice/consumed', consumedRecord(awaiting, seat, [], null, 'auto', motionSinceTake));
    motionSinceTake = false;
    await game?.append('dice/rolled', { seat, auto: true });
  }
  async function toggleDice(on: boolean) {
    await game?.append('dice/physical', { on });
  }
  // A die set right after the fact (PROMPTS.md, prompt 37): a tap on a die in a log line (the rail's latest, the open
  // log, the prompt's lines so far) opens a radial menu of the six faces over the die, turned to the seat; the face
  // chosen goes as `dice/corrected`, which the reducer applies by folding the game again with the die changed, or
  // refuses with the reason when the game could not have gone on as it did. A refusal is shown at the seat's edge.
  let dieMenu = $state<{ seat: Seat; from: DieSource; value: number; x: number; y: number; rotation: number } | null>(null);
  /** Half the menu's width, with a little room: the menu is kept this far inside the viewport. */
  const menuReach = $derived(target * 1.7 + 4);
  function openDieMenu(seat: Seat, roll: Roll, anchor: DOMRect, rotation = rotationFor(seat.edge)) {
    if (!roll.from) return;
    const x = Math.min(viewport.w - menuReach, Math.max(menuReach, anchor.left + anchor.width / 2));
    const y = Math.min(viewport.h - menuReach, Math.max(menuReach, anchor.top + anchor.height / 2));
    dieMenu = { seat, from: roll.from, value: roll.value, x, y, rotation };
  }
  async function setDie(seat: string, from: DieSource, was: number, value: number) {
    dieMenu = null;
    if (value === was) return;
    await game?.append('dice/corrected', { seat, eventId: from.eventId, index: from.index, value });
  }
  /** A correction the reducer refused, shown at the seat's edge until the player carries on. */
  let dieNotice = $state<{ seat: Seat; value: number; why: string } | null>(null);
  /** How many refusals the state held when the game was opened: only a later one is a notice. */
  let noticedRefusals: number | null = null;
  $effect(() => {
    const diagnostics = gameState.diagnostics;
    if (noticedRefusals === null || diagnostics.length <= noticedRefusals) return;
    const fresh = diagnostics.slice(noticedRefusals);
    noticedRefusals = diagnostics.length;
    for (const d of fresh) {
      const e = gameEvents.find((x) => x.id === d.eventId);
      if (e?.type !== 'dice/corrected') continue;
      const { seat: id, value } = e.payload as { seat?: string; value?: number };
      const seat = seats.find((s) => s.id === id) ?? seats[0];
      dieNotice = { seat, value: value ?? 0, why: d.reason };
    }
  });
  function setDiagonal(inches: number) {
    diagonal = inches;
    writeDiagonalInches(inches);
    game?.publishGeometry(screenGeometry(diagonal, viewport.w, viewport.h));
  }
  async function endByAgreement() {
    const seat = gameState.turn?.current ?? gameState.seats.find((s) => s.uid)?.id;
    options = null;
    await game?.append('game/ended', { seat });
  }
  // The rest of a seat's log, opened in the rail's log box from the "+" at the end of its latest line (prompt 35).
  let logOpenSeat = $state<string | null>(null);
  /** The seat's turns so far with its own lines (a joint expedition's lines fall on the mover's turn), the turn in progress last when it is the seat's. */
  function turnsOf(seat: string): LoggedTurn[] {
    const own = (t: LoggedTurn) => ({ ...t, log: t.log.filter((r) => r.seat === seat) });
    const past = gameState.history.map(own).filter((t) => t.log.length > 0);
    const turn = gameState.turn;
    if (!turn) return past;
    const now = own({ round: turn.round, seat: turn.current, log: turn.log });
    return turn.current === seat || now.log.length > 0 ? [...past, now] : past;
  }
  let retiringSeat = $state<string | null>(null);
  const retiring = $derived.by(() => {
    if (!retiringSeat || gameState.turn?.current !== retiringSeat) return null;
    const seat = seats.find((s) => s.id === retiringSeat);
    const explorer = seat && explorerAt(gameState, seat.id);
    if (!seat || !explorer || explorer.location.kind === 'voyage' || explorer.location.kind === 'homeward') return null;
    const where = explorer.location.kind === 'europe' ? 'in Europe' : explorer.location.kind === 'captive' ? 'in captivity' : 'in Africa';
    return { seat, where };
  });
  async function retire(seat: string) {
    retiringSeat = null;
    await game?.append('explorer/retired', { seat });
  }
  async function perform(seat: string, specialty: string) {
    await game?.append('specialty/performed', { seat, specialty });
  }
  async function offerChief(seat: string, payload: Record<string, unknown>) {
    await game?.append('natives/offered', { seat, ...payload });
  }
  async function trade(seat: string, item: string, count: number, direction: 'buy' | 'sell') {
    await game?.append('natives/traded', { seat, item, count, direction });
  }
  async function chooseSpoils(seat: string, choice: 'release' | 'keep') {
    await game?.append('natives/spoils', { seat, choice });
  }
  async function choosePolicy(seat: string, policy: number) {
    await game?.append('natives/policy', { seat, policy });
  }
  async function takeWater(seat: string, rations: number) {
    await game?.append('water/taken', { seat, rations });
  }
  async function move(hex: HexId) {
    const seat = gameState.turn?.current;
    if (seat) await game?.append('expedition/moved', { seat, path: [hex] });
  }

  // The cards a seat has not looked at yet (prompt 44): the hand dealt at the start, shown beside the roll for first
  // player while the table stands still, and after that, or a card drawn later, at the seat's edge until taken or the
  // seat acts. The panel stands aside while another panel of the seat's is up.
  const unseenAt = (seat: string): CardId[] => explorerAt(gameState, seat)?.unseen ?? [];
  const busySeats = $derived(new Set([awaitingSeat?.id, outfitting?.seat.id, facingDisaster?.seat.id, facingNatives?.seat.id, dealingSpoils?.seat.id, negotiating?.seat.id, trading?.seat.id, retiring?.seat.id, splitting?.seat.id, reorganising?.seat.id, dieNotice?.seat.id, lingering?.seat.id].filter((x): x is SeatId => Boolean(x))));
  const donationPanels = $derived(starting ? [] : seats.filter((seat) => unseenAt(seat.id).length > 0 && !busySeats.has(seat.id)));
  async function takeCards(seat: string) {
    await game?.append('cards/seen', { seat });
  }

  onMount(() => {
    diagonal = readDiagonalInches();
    viewport = { w: innerWidth, h: innerHeight };
    // The table follows its window: the board, rails and panels are derived from the viewport.
    const onResize = () => {
      viewport = { w: innerWidth, h: innerHeight };
      opened?.publishGeometry(screenGeometry(diagonal, viewport.w, viewport.h));
    };
    addEventListener('resize', onResize);
    const detachTooltips = attachTooltips(document.body);
    let opened: Game | null = null;
    openGame({
      layout,
      onChange: (g) => {
        gameEvents = g.events;
        gameState = g.state;
        status = g.status;
      },
      onIntent: async (intent, g) => {
        if (intent.action === 'seat/take') await g.append('seat/taken', { seat: intent.seat, uid: intent.uid, name: intent.name });
        if (intent.action === 'seat/leave') await g.append('seat/left', { uid: intent.uid });
      }
    }).then(async (g) => {
      opened = g;
      game = g;
      noticedRefusals = g.state.diagnostics.length;
      g.publishGeometry(screenGeometry(diagonal, viewport.w, viewport.h));
      if (g.relayUrl) {
        const entries = await Promise.all(
          seats.map(async (seat) => {
            const url = `${location.origin}${base}/hand/?session=${g.gameId}&seat=${seat.id}`;
            const image = await QRCode.toDataURL(url, { errorCorrectionLevel: 'M', margin: 1, width: 240, color: { dark: '#1c2a2e', light: '#fffaf0' } });
            return [seat.id, { url, image }] as const;
          })
        );
        qr = Object.fromEntries(entries);
      }
    });
    return () => {
      removeEventListener('resize', onResize);
      detachTooltips();
      opened?.close();
    };
  });
</script>

<main
  data-e2e-layout
  data-testid="table"
  data-e2e-no-scroll
  style="--target:{target}px; --scale:{scale}; --qr:{qrSize}px; --rail-length:{Math.min(viewport.w, viewport.h) * 0.5}px; --rail-depth:{railDepth}px; --gap:{target * 0.3}px; --inset-top:{inset.top}px; --inset-right:{inset.right}px; --inset-bottom:{inset.bottom}px; --inset-left:{inset.left}px"
  data-diagonal={diagonal}
  data-mm-per-px={k}
>
  <div class="board" data-testid="board" data-e2e-fit style="inset: {inset.top}px {inset.right}px {inset.bottom}px {inset.left}px">
    <HexBoard width={boardW} height={boardH} touch={target} tokens={boardTokens} {portChoices} onport={choosePort} mapped={gameState.map} caches={Object.values(gameState.caches)} {targets} onhex={move} publishable={publishTargets} onpublish={publish} />
  </div>

  {#if canStart}
    <button class="start" data-testid="start-game" aria-label="Start the game{roundLimit ? ` of ${roundLimit} rounds` : ''}" onclick={start}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
    </button>
    <span class="limit" data-testid="round-limit" data-rounds={roundLimit ?? ''} data-e2e-fit>
      <button data-testid="round-limit-less" aria-label="Fewer rounds" onclick={() => limitBy(-1)}>−</button>
      <span class="rounds" aria-label={roundLimit ? `${roundLimit} rounds` : 'No round limit: the game ends by consensus'}>{roundLimit ?? '∞'}</span>
      <button data-testid="round-limit-more" aria-label="One round more" onclick={() => limitBy(1)}>+</button>
      <button data-testid="round-limit-more5" aria-label="Five rounds more" onclick={() => limitBy(5)}>+5</button>
    </span>
  {/if}

  {#if gameState.ended}
    <GameOver ended={gameState.ended} game={gameState.games + 1} oncontinue={() => game?.append('game/continued', {})} />
  {/if}

  {#if awaiting && awaitingSeat}
    <!-- The table stands still until the dice are rolled: nothing else can be tapped, which is also what the reducer says. -->
    <div class="scrim" data-testid="dice-scrim" aria-hidden="true"></div>
    <EdgePanel seat={awaitingSeat} {viewport} inset={railDepth + target * 0.4} testid="dice-edge-{awaitingSeat.id}" raised>
      <DicePrompt seat={awaitingSeat.id} prompt={awaiting.prompt} count={awaiting.count} rolled={awaiting.event.type === 'game/started' ? [] : awaiting.rolled} sofar={awaiting.sofar} have={awaiting.have} status={dicecamStatus} seen={dicecamSeen} stale={dicecamStale} configured={Boolean(DICECAM_URL)} onroll={(values) => rolled(awaitingSeat!.id, values)} onauto={() => rolledAuto(awaitingSeat!.id)} oncorrect={(roll, anchor) => openDieMenu(awaitingSeat!, roll, anchor)} />
    </EdgePanel>
  {:else if lingering}
    <!-- The last die is in: what it decided stays at the seat's edge for a moment (prompts 54 and 55), the table still until it is read. -->
    <div class="scrim" data-testid="dice-result-scrim" aria-hidden="true"></div>
    <EdgePanel seat={lingering.seat} {viewport} inset={railDepth + target * 0.4} testid="dice-result-edge-{lingering.seat.id}" raised>
      <DiceResult seat={lingering.seat.id} prompt={lingering.prompt} lines={lingering.lines} ondone={() => (lingering = null)} oncorrect={(roll, anchor) => openDieMenu(lingering!.seat, roll, anchor)} />
    </EdgePanel>
  {/if}
  {#if starting}
    <!-- The first player is decided: the table stands still while every station reads its roll and the winner's glows. -->
    <div class="scrim" data-testid="first-player-scrim" aria-hidden="true"></div>
  {/if}
  {#each firstPlayerRolls as r (r.seat.id)}
    <EdgePanel seat={r.seat} {viewport} inset={railDepth + target * 0.4} testid="first-player-edge-{r.seat.id}" raised>
      <FirstPlayerRoll seat={r.seat.id} values={r.values} winner={r.winner} decided={r.decided} />
      {#if r.decided && unseenAt(r.seat.id).length}
        <!-- The hand dealt, in full under the roll (prompt 44), while the table stands still. -->
        <DonationCards seat={r.seat.id} ids={unseenAt(r.seat.id)} ontake={() => takeCards(r.seat.id)} />
      {/if}
    </EdgePanel>
  {/each}
  {#each donationPanels as seat (seat.id)}
    <EdgePanel {seat} {viewport} inset={railDepth + target * 0.4} testid="donations-edge-{seat.id}">
      <DonationCards seat={seat.id} ids={unseenAt(seat.id)} ontake={() => takeCards(seat.id)} />
    </EdgePanel>
  {/each}
  {#if physical && DICECAM_URL}
    <div class="dock-area" data-testid="dicecam-place" data-centred={dockPlace.centred} style="left:{dockPlace.x}px; top:{dockPlace.y}px; width:{dockW}px; height:{dockH}px; rotate:{dockPlace.rotation}deg">
      <Dicecam url={DICECAM_URL} onmessage={onDicecam} onstatus={(s) => { dicecamStatus = s; diagLog('dicecam/status', s); }} ontap={onDockTap} hint={dockHint} rotation={dockPlace.rotation} />
    </div>
  {/if}

  {#if dieMenu}
    <!-- The six faces round the die tapped (prompt 37), turned to the seat; a tap anywhere else leaves the die as it is. -->
    <div class="menu-scrim" data-testid="die-menu-scrim" role="presentation" onclick={() => (dieMenu = null)}></div>
    <div class="menu-layer" data-testid="die-menu-place-{dieMenu.seat.id}" data-e2e-fit style="left:{dieMenu.x}px; top:{dieMenu.y}px; rotate:{dieMenu.rotation}deg">
      <RadialMenu seat={dieMenu.seat.id} current={dieMenu.value} onselect={(v) => setDie(dieMenu!.seat.id, dieMenu!.from, dieMenu!.value, v)} oncancel={() => (dieMenu = null)} />
    </div>
  {/if}
  {#if dieNotice}
    <!-- The reducer would not change the die: why, at the seat's edge, and the game goes on as it is. -->
    <div class="scrim" data-testid="die-notice-scrim" aria-hidden="true"></div>
    <EdgePanel seat={dieNotice.seat} {viewport} inset={railDepth + target * 0.4} testid="die-notice-{dieNotice.seat.id}" raised>
      <div class="notice" role="alertdialog" aria-labelledby="die-notice-title-{dieNotice.seat.id}">
        <p class="title" id="die-notice-title-{dieNotice.seat.id}">The die cannot be changed to a {dieNotice.value}</p>
        <p class="why" data-testid="die-notice-why-{dieNotice.seat.id}">{dieNotice.why.replace(/^./, (c) => c.toUpperCase())}.</p>
        <button type="button" class="carry-on" data-testid="die-notice-ok-{dieNotice.seat.id}" onclick={() => (dieNotice = null)}>Carry on</button>
      </div>
    </EdgePanel>
  {/if}

  {#if outfitting}
    <EdgePanel seat={outfitting.seat} {viewport} inset={railDepth + target * 0.4} testid="outfit-panel-{outfitting.seat.id}">
      <ExpeditionChart seat={outfitting.seat.id} port={outfitting.port} budget={outfitting.explorer.money} onconfirm={(p) => outfit(outfitting!.seat, p)} />
    </EdgePanel>
  {/if}

  {#if facingDisaster}
    <div class="scrim" data-testid="disaster-scrim" aria-hidden="true"></div>
    <EdgePanel seat={facingDisaster.seat} {viewport} inset={railDepth + target * 0.4} testid="disaster-edge-{facingDisaster.seat.id}" raised>
      <DisasterCard seat={facingDisaster.seat.id} card={facingDisaster.card} applies={facingDisaster.applies} onface={() => game?.append('disaster/faced', { seat: facingDisaster!.seat.id })} />
    </EdgePanel>
  {/if}
  {#if facingNatives}
    <EdgePanel seat={facingNatives.seat} {viewport} inset={railDepth + target * 0.4} testid="policy-edge-{facingNatives.seat.id}">
      <PolicyChooser seat={facingNatives.seat.id} tribe={facingNatives.tribe.id} warriors={facingNatives.tribe.warriors} attitude={facingNatives.tribe.attitude} regard={facingNatives.tribe.regard[facingNatives.seat.id] ?? 0} onchoose={(policy) => choosePolicy(facingNatives!.seat.id, policy)} />
    </EdgePanel>
  {/if}

  {#if dealingSpoils}
    <EdgePanel seat={dealingSpoils.seat} {viewport} inset={railDepth + target * 0.4} testid="spoils-edge-{dealingSpoils.seat.id}">
      <SpoilsChooser seat={dealingSpoils.seat.id} prisoners={dealingSpoils.prisoners} onchoose={(choice) => chooseSpoils(dealingSpoils!.seat.id, choice)} />
    </EdgePanel>
  {/if}

  {#if negotiating}
    <EdgePanel seat={negotiating.seat} {viewport} inset={railDepth + target * 0.4} testid="negotiation-edge-{negotiating.seat.id}">
      <NegotiationPanel seat={negotiating.seat.id} tribe={negotiating.tribe.id} warriors={negotiating.tribe.warriors} gifts={negotiating.explorer.chart!.gifts}
        onoffer={(gifts) => offerChief(negotiating!.seat.id, { gifts })} oneverything={() => offerChief(negotiating!.seat.id, { everything: true })} ondecline={() => offerChief(negotiating!.seat.id, { decline: true })} />
    </EdgePanel>
  {/if}
  {#if trading}
    <EdgePanel seat={trading.seat} {viewport} inset={railDepth + target * 0.4} testid="trade-edge-{trading.seat.id}">
      <TradePanel seat={trading.seat.id} prices={trading.prices} chart={trading.explorer.chart!} works={trading.explorer.specialties.filter((sp) => sp === 'evangelism' || sp === 'medicine')} owed={worksOwed(gameState, trading.explorer)} onwork={(sp) => perform(trading!.seat.id, sp)} ontrade={(item, count, direction) => trade(trading!.seat.id, item, count, direction)} ondone={() => game?.append('natives/done', { seat: trading!.seat.id })} />
    </EdgePanel>
  {/if}

  {#if retiring}
    <EdgePanel seat={retiring.seat} {viewport} inset={railDepth + target * 0.4} testid="retire-edge-{retiring.seat.id}">
      <RetirePanel seat={retiring.seat.id} where={retiring.where} onconfirm={() => retire(retiring!.seat.id)} oncancel={() => (retiringSeat = null)} />
    </EdgePanel>
  {/if}

  {#if splitting}
    <EdgePanel seat={splitting.seat} {viewport} inset={railDepth + target * 0.4} testid="split-edge-{splitting.seat.id}">
      <SplitPanel seat={splitting.seat.id} chart={splitting.chart} onsplit={(take) => { const seat = splitting!.seat.id; splittingSeat = null; game?.append('expedition/split', { seat, take }); }} onclose={() => (splittingSeat = null)} />
    </EdgePanel>
  {/if}

  {#if reorganising}
    <EdgePanel seat={reorganising.seat} {viewport} inset={railDepth + target * 0.4} testid="reorganise-edge-{reorganising.seat.id}">
      <ReorganisePanel seat={reorganising.seat.id} chart={reorganising.explorer.chart!} caches={reorganising.caches} round={gameState.turn!.round} waterHere={reorganising.waterHere} waterStep={WATER_STEP}
        onaction={(action, item, count) => game?.append('expedition/reorganised', { seat: reorganising!.seat.id, action, item, count })}
        ontake={(cacheId, item, count) => game?.append('expedition/reorganised', { seat: reorganising!.seat.id, action: 'take', item, count, cacheId })}
        onrecover={(cacheId) => game?.append('cache/recovered', { seat: reorganising!.seat.id, cacheId })}
        onwater={(rations) => takeWater(reorganising!.seat.id, rations)}
        onclose={() => (reorganisingSeat = null)} />
    </EdgePanel>
  {/if}

  {#if gameState.deck}
    <div class="deck-area" data-e2e-fit>
      <DeckStack deck={gameState.deck} />
    </div>
  {/if}

  <!-- A seat's span: its share of the edge, less the gap at each end along the long edges and less a rail's depth at each end along the short ones, so the corners belong to the long edges' rails; an even number of pixels keeps the centred content on whole pixels. -->
  {#each shownSeats as seat (seat.id)}
    <SeatRail {seat} state={seatState(seat)} qrImage={qr[seat.id]?.image} qrUrl={qr[seat.id]?.url} onjoin={join} current={gameState.turn?.current === seat.id} span={seat.edge === 'bottom' || seat.edge === 'top' ? viewport.w / seat.count - 2 * target : 2 * Math.floor((viewport.h / seat.count - 2 * railDepth) / 2)}>
      {#snippet content()}
        {@const explorer = explorerAt(gameState, seat.id)}
        {#if explorer}
          {@const canRetire = gameState.turn?.current === seat.id && explorer.location.kind !== 'voyage' && explorer.location.kind !== 'homeward'}
          <svelte:element this={canRetire ? 'button' : 'span'} class="turn-marker" role={canRetire ? 'button' : undefined} data-testid="turn-marker-{seat.id}" data-current={gameState.turn?.current === seat.id} aria-label={canRetire ? 'It is this seat\'s turn; tap the explorer to retire him' : gameState.turn?.current === seat.id ? 'It is this seat\'s turn' : ''} onclick={canRetire ? () => (retiringSeat = retiringSeat === seat.id ? null : seat.id) : undefined}>
            <ExplorerToken {explorer} />
          </svelte:element>
          {#if gameState.turn}
            {@const mine = gameState.turn.current === seat.id}
            {@const discarding = mine && gameState.turn.phase === 'discard'}
            <!-- A hand swollen by publication (a card per hex) overlaps its cards so the rail still fits; the limit applies next turn. -->
            <span class="hand" class:crowded={explorer.hand.length > 7} style="--overlap:{explorer.hand.length > 7 ? Math.min(0.85, 0.4 + (explorer.hand.length - 7) * 0.06) : 0}" data-testid="hand-{seat.id}" data-count={explorer.hand.length}>
              {#each explorer.hand as id (id)}
                <Card {id} seat={seat.id} onselect={discarding ? (c) => discard(seat, c) : undefined} />
              {/each}
            </span>
            {@const party = partyOf(gameState, explorer)}
            {#if explorer.chart}
              <ChartSummary seat={seat.id} chart={explorer.chart} sick={explorer.sick} specimens={explorer.specimens} />
            {:else if party}
              <!-- A companion's rail: the men icon and the leader's colour; the leader's own rail counts the explorers. -->
              <span class="party" data-testid="party-{seat.id}" data-party={party.id} data-leader={party.leader} data-mover={moverOf(gameState, party)} aria-label="In a joint expedition led by {party.leader}; it moves on {moverOf(gameState, party)}'s turn">
                <Icon name="people" size="1.2em" />
                {#if party.leader === seat.id}{party.members.length}{:else}<span class="leader" style="--colour:{colourFor(holderOf(gameState, explorer).seat)}"></span>{/if}
              </span>
            {:else}
              <span class="money" data-testid="money-{seat.id}" aria-label={explorer.location.kind === 'europe' ? 'Money raised' : 'Expedition budget'}>${explorer.location.kind === 'europe' ? handValue(explorer.hand) : explorer.money}</span>
            {/if}
            {#if party && explorer.chart}
              <span class="party" data-testid="party-{seat.id}" data-party={party.id} data-leader={party.leader} data-mover={moverOf(gameState, party)} aria-label="Leading a joint expedition with {party.members.filter((s) => s !== seat.id).join(', ')}; it moves on {moverOf(gameState, party)}'s turn">
                <Icon name="people" size="1.2em" />{party.members.length}
              </span>
            {/if}
            <Tally seat={seat.id} points={scoreOf(gameState, seat.id as SeatId)} />
            {#if mine}
              {#if explorer.location.kind === 'europe' && gameState.turn.phase === 'act' && publishable(gameState, seat.id as SeatId).length}
                <button class="reorganise" data-testid="publish-{seat.id}" aria-label="Publish discoveries: choose the hexes on the map" aria-pressed={publishingSeat === seat.id} onclick={() => (publishingSeat = publishingSeat === seat.id ? null : seat.id)}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h10l4 4v14H5z" /><path d="M15 3v4h4" /><path d="M8 12h8M8 16h8" /></svg>
                </button>
              {/if}
              {#if gameState.turn.movement}
                {@const mv = gameState.turn.movement}
                <span class="movement" data-testid="movement-{seat.id}" data-mode={mv.mode} data-left={mv.halted ? 0 : mv.points - mv.spent} aria-label="{mv.mode}: {mv.halted ? 0 : mv.points - mv.spent} of {mv.points} movement points left">
                  <Icon name={mv.mode === 'canoe' ? 'canoes' : mv.mode === 'mounted' ? 'horses' : 'bearers'} size="1.2em" />
                  {#each Array(mv.points) as _, i (i)}<span class="pip" class:used={i < mv.spent || mv.halted}></span>{/each}
                </span>
              {/if}
              {#if gameState.turn.phase === 'act' && !gameState.turn.moved && researchPending(explorer).length}
                <span class="research" data-testid="research-{seat.id}">
                  {#each researchPending(explorer) as sp (sp)}
                    <button class="study" data-testid="research-{sp}-{seat.id}" aria-label="Spend the turn on {sp} in this hex" onclick={() => perform(seat.id, sp)}><Icon name={sp} size="1.3em" /></button>
                  {/each}
                </span>
              {/if}
              {#if explorer.location.kind === 'captive' && gameState.turn.phase === 'act' && explorer.specialties.some((sp) => sp === 'evangelism' || sp === 'medicine')}
                <span class="research" data-testid="captive-works-{seat.id}">
                  {#each explorer.specialties.filter((sp) => sp === 'evangelism' || sp === 'medicine') as sp (sp)}
                    <button class="study" data-testid="specialty-{sp}-{seat.id}" aria-label="{sp === 'evangelism' ? 'Preach to your captors' : 'Treat your captors'}" onclick={() => perform(seat.id, sp)}><Icon name={sp} size="1.3em" /></button>
                  {/each}
                </span>
              {/if}
              {#if sailingSeat === seat.id && poolable.length}
                <span class="pooling" data-testid="pooling-{seat.id}">
                  {#each poolable as other (other)}
                    <button class="pool" class:on={pooling.includes(other)} data-testid="pool-{other}-{seat.id}" aria-pressed={pooling.includes(other)} aria-label="{pooling.includes(other) ? 'Sail without' : 'Pool donations and sail with'} {other}" style="--colour:{colourFor(other)}" onclick={() => (pooling = pooling.includes(other) ? pooling.filter((s) => s !== other) : [...pooling, other])}><span class="dot"></span></button>
                  {/each}
                </span>
              {/if}
              {#if gameState.turn.phase === 'act' && !gameState.turn.moved}
                {#each joinable(seat.id) as other (other.seat)}
                  <button class="reorganise" data-testid="join-{other.seat}-{seat.id}" aria-label="Join forces with {other.seat}'s expedition" onclick={() => game?.append('expedition/joined', { seat: seat.id, with: other.seat })}>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="8" r="3" /><circle cx="16" cy="8" r="3" /><path d="M2 20v-2a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v2M12 20v-2a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v2" /></svg>
                  </button>
                {/each}
              {/if}
              {#if party && gameState.turn.phase === 'act' && explorer.location.kind !== 'captive'}
                <button class="reorganise" data-testid="split-{seat.id}" aria-label="Leave the joint expedition with a share" aria-pressed={splittingSeat === seat.id} onclick={() => (splittingSeat = splittingSeat === seat.id ? null : seat.id)}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="7" cy="8" r="3" /><circle cx="17" cy="8" r="3" /><path d="M2 20v-2a5 5 0 0 1 5-5M22 20v-2a5 5 0 0 0-5-5" /><path d="M9 15l6 6M15 15l-6 6" /></svg>
                </button>
              {/if}
              {#if (explorer.chart || party) && gameState.turn.phase === 'act' && portOf(explorer)}
                <button class="reorganise" data-testid="sail-home-{seat.id}" aria-label="Dismiss the expedition and sail home to Europe" onclick={() => game?.append('expedition/returned', { seat: seat.id })}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17h18l-2 4H5z" /><path d="M12 3v14" /><path d="M12 3c-4 2-6 5-6 9h6" /><path d="M12 6c3 1 5 3 5 6h-5" /></svg>
                </button>
              {/if}
              {#if chartOf(gameState, explorer) && gameState.turn.phase === 'act' && explorer.location.kind !== 'captive' && standingHex(explorer)}
                <button class="reorganise" data-testid="reorganise-{seat.id}" aria-label="The camp: reorganise the expedition, use the caches here" aria-pressed={reorganisingSeat === seat.id} onclick={() => (reorganisingSeat = reorganisingSeat === seat.id ? null : seat.id)}>
                  <Icon name="cache" size="60%" />
                </button>
              {/if}
              <TurnControls
                seat={seat.id}
                phase={gameState.turn.phase}
                onend={() => endTurn(seat)}
                onsail={explorer.location.kind === 'europe' && canSailNow ? () => toggleSailing(seat.id) : null}
                done={!optionsLeft}
                waiting={explorer.location.kind === 'europe'}
                sailing={sailingSeat === seat.id}
                portChosen={sailingSeat === seat.id && chosenPort !== null && portChoices?.[chosenPort]?.fare !== 'none'}
                onbook={bookPassage}
                onstay={() => toggleSailing(seat.id)}
                onundo={gameState.undo?.seat === seat.id ? () => game?.append('turn/undone', { seat: seat.id, eventId: gameState.undo!.eventId }) : null}
              />
            {/if}
          {/if}
        {:else}
          {@const fallen = fallenAt(gameState, seat.id)}
          {#if fallen?.fate}
            <span class="obituary" data-testid="fate-{seat.id}" data-fate={fallen.fate.kind} aria-label="The explorer {fallen.fate.cause}">{fallen.fate.cause}</span>
          {/if}
          {#if gameState.turn}
            <Tally seat={seat.id} points={scoreOf(gameState, seat.id as SeatId)} />
          {/if}
          {#if gameState.ended}
            <!-- The game is over: the standings are in the middle of the table; nothing more is commissioned until it continues. -->
          {:else if gameState.turn && gameState.turn.current === seat.id && explorerSeats(gameState).some((s) => s !== seat.id)}
            <!-- The seat's turn goes on after the explorer's death or retirement, so the rail can be read; it ends like any other. -->
            <TurnControls seat={seat.id} phase="act" onend={() => endTurn(seat)} onundo={gameState.undo?.seat === seat.id ? () => game?.append('turn/undone', { seat: seat.id, eventId: gameState.undo!.eventId }) : null} />
          {:else}
            <ExplorerSetup seat={seat.id} oncommission={(specialties) => commission(seat, specialties)} />
          {/if}
        {/if}
      {/snippet}
      {#snippet log()}
        <!-- The rail's second section (prompt 35): the seat's log in its outlined box, inward of the status row; nothing before the game starts. -->
        <RollLog seat={seat.id} turns={turnsOf(seat.id)} current={gameState.turn?.current === seat.id} expanded={logOpenSeat === seat.id} ontoggle={() => (logOpenSeat = logOpenSeat === seat.id ? null : seat.id)} oncorrect={(roll, anchor) => openDieMenu(seat, roll, anchor)} />
      {/snippet}
    </SeatRail>
  {/each}

  <div class="corner" data-e2e-status-area>
    <div class="status" role="status" data-status={status} aria-label="Connection status">
      <span class="dot"></span>
    </div>
    <span class="code" data-testid="room-code" aria-label="Room code">{gameState.gameId ?? ''}</span>
  </div>
  <!-- A gear at the north-west and the south-east corner of the board, so a player at any edge reaches one; each opens the options turned its way. -->
  <button class="gear nw" data-testid="options-nw" aria-label="Options (screen size, phones, ending the game)" aria-pressed={options === 'nw'} style="left:{inset.left + target * 0.3}px; top:{inset.top + target * 0.3}px" onclick={() => (options = options === 'nw' ? null : 'nw')}>
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
  </button>
  <button class="gear se" data-testid="options-se" aria-label="Options (screen size, phones, ending the game)" aria-pressed={options === 'se'} style="right:{inset.right + target * 0.3}px; bottom:{inset.bottom + target * 0.3}px" onclick={() => (options = options === 'se' ? null : 'se')}>
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
  </button>
  {#if options}
    <OptionsPanel {seats} {qr} {diagonal} mmPerPx={k} running={Boolean(gameState.turn) && !gameState.ended} {physical} rotation={options === 'nw' ? 180 : 0} onclose={() => (options = null)} ondiagonal={setDiagonal} ontoggledice={toggleDice} onend={endByAgreement} />
  {/if}
  <!-- The status line beside the north-west gear (prompt 32): the capture, the version, the build, an update waiting. -->
  <StatusLine left={inset.left + target * 1.5} top={inset.top + target * 0.3} height={target} />
</main>

<style>
  :global(body) {
    margin: 0;
    overflow: hidden;
    background: #1c2a2e;
    font-family: 'Nile Sans', 'DejaVu Sans', sans-serif;
    --ink: #1c2a2e;
    --paper: #e8d8b0;
    --accent: #c9a24a;
  }
  main {
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    color: var(--paper);
    font-size: calc(1rem * var(--scale));
  }
  .board {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 1rem;
    pointer-events: none;
  }
  .start {
    position: absolute;
    left: 50%;
    top: 50%;
    translate: -50% -50%;
    width: calc(var(--target) * 2);
    height: calc(var(--target) * 2);
    border-radius: 50%;
    border: 4px solid var(--paper);
    background: var(--accent);
    color: var(--ink);
    display: grid;
    place-items: center;
    cursor: pointer;
  }
  .start svg {
    width: 60%;
    fill: currentColor;
  }
  .limit {
    position: absolute;
    left: 50%;
    top: calc(50% + var(--target) * 1.4);
    translate: -50% 0;
    display: inline-flex;
    align-items: center;
    gap: calc(var(--gap) * 0.5);
    padding: calc(var(--gap) * 0.3) calc(var(--gap) * 0.6);
    border-radius: 999px;
    background: var(--ink);
    border: 2px solid var(--accent);
    color: var(--paper);
    font-family: 'Nile Sans', 'DejaVu Sans', sans-serif;
    font-weight: 700;
    font-size: calc(var(--target) * 0.36);
  }
  .limit button {
    min-width: var(--target);
    height: var(--target);
    border-radius: 999px;
    border: 2px solid var(--paper);
    background: var(--paper);
    color: var(--ink);
    font: inherit;
    cursor: pointer;
  }
  .limit .rounds {
    min-width: 1.6em;
    text-align: center;
  }
  /* The piles sit in the sea at the board's top-right corner, inside the rails, where no seat's rail reaches. */
  .deck-area {
    position: absolute;
    right: calc(var(--inset-right) + var(--gap));
    top: calc(var(--inset-top) + var(--gap));
  }
  .turn-marker {
    display: inline-flex;
    border-radius: 999px;
    padding: 3px;
    border: 3px solid transparent;
    background: none;
    font: inherit;
    color: inherit;
    margin: 0;
  }
  button.turn-marker {
    cursor: pointer;
  }
  .party {
    display: inline-flex;
    align-items: center;
    gap: 0.2em;
    margin-left: var(--gap);
    padding: 0.15em 0.5em;
    border-radius: 999px;
    border: 2px solid var(--accent);
    color: var(--paper);
    font-family: 'Nile Sans', 'DejaVu Sans', sans-serif;
    font-weight: 700;
    font-size: calc(var(--target) * 0.3);
  }
  .party .leader {
    width: 0.9em;
    height: 0.9em;
    border-radius: 50%;
    background: var(--colour);
    border: 2px solid var(--paper);
  }
  .pooling {
    display: inline-flex;
    gap: calc(var(--gap) * 0.4);
    margin-left: var(--gap);
  }
  .pool {
    width: var(--target);
    height: var(--target);
    border-radius: 50%;
    border: 3px solid var(--paper);
    background: transparent;
    display: grid;
    place-items: center;
    cursor: pointer;
    opacity: 0.55;
  }
  .pool.on {
    opacity: 1;
    background: var(--accent);
  }
  .pool .dot {
    width: 55%;
    height: 55%;
    border-radius: 50%;
    background: var(--colour);
    border: 2px solid var(--paper);
  }
  .obituary {
    margin-left: var(--gap);
    flex-shrink: 0;
    max-width: calc(var(--target) * 5);
    font-family: 'Nile Sans', 'DejaVu Sans', sans-serif;
    font-size: calc(var(--target) * 0.3);
    line-height: 1.2;
    color: #e7b4a8;
  }
  .turn-marker[data-current='true'] {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--ink), 0 0 12px var(--accent);
  }
  .hand {
    display: inline-flex;
    gap: calc(var(--gap) * 0.6);
    margin-left: var(--gap);
  }
  .hand.crowded {
    gap: 0;
  }
  .hand.crowded > :global(:not(:first-child)) {
    margin-left: calc(var(--target) * -1 * var(--overlap));
  }
  .reorganise {
    width: var(--target);
    height: var(--target);
    margin-left: var(--gap);
    border-radius: 50%;
    border: 3px solid var(--ink);
    background: var(--paper);
    color: var(--ink);
    display: grid;
    place-items: center;
    cursor: pointer;
  }
  .reorganise[aria-pressed='true'] {
    background: var(--accent);
  }
  .reorganise svg {
    width: 60%;
    height: 60%;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .research {
    display: inline-flex;
    gap: calc(var(--gap) * 0.4);
    margin-left: var(--gap);
  }
  .study {
    width: var(--target);
    height: var(--target);
    border-radius: 50%;
    border: 3px solid var(--paper);
    background: var(--accent);
    color: var(--ink);
    display: grid;
    place-items: center;
    cursor: pointer;
  }
  .movement {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    margin-left: var(--gap);
    color: var(--paper);
  }
  .pip {
    width: 0.5em;
    height: 0.5em;
    border-radius: 50%;
    background: var(--accent);
    border: 1px solid var(--ink);
  }
  .pip.used {
    background: transparent;
    border-color: var(--paper);
    opacity: 0.5;
  }
  .money {
    margin-left: var(--gap);
    padding: 0.15em 0.5em;
    border-radius: 999px;
    background: var(--paper);
    color: var(--ink);
    font-weight: 700;
    font-size: calc(var(--target) * 0.36);
  }
  .scrim {
    position: absolute;
    inset: 0;
    z-index: 5;
    background: rgba(28, 42, 46, 0.35);
  }
  .dock-area {
    /* Parked, it sits under the seats' panels (the outfitting chart reaches the corner); centred, above the scrim. */
    position: absolute;
  }
  .menu-scrim {
    position: absolute;
    inset: 0;
    z-index: 7;
  }
  .menu-layer {
    position: absolute;
    z-index: 8;
    translate: -50% -50%;
  }
  .notice {
    display: grid;
    gap: calc(var(--gap) * 0.6);
    width: calc(var(--target) * 9);
    font-family: 'Nile Sans', 'DejaVu Sans', sans-serif;
  }
  .notice .title {
    margin: 0;
    font-size: calc(var(--target) * 0.42);
    font-weight: 700;
    line-height: 1.2;
  }
  .notice .why {
    margin: 0;
    font-size: calc(var(--target) * 0.3);
    line-height: 1.3;
  }
  .carry-on {
    justify-self: end;
    height: var(--target);
    padding: 0 calc(var(--gap) * 1.2);
    border: 2px solid var(--ink);
    border-radius: 8px;
    background: var(--accent);
    color: var(--ink);
    font: inherit;
    font-size: calc(var(--target) * 0.3);
    font-weight: 700;
    cursor: pointer;
  }
  .dock-area[data-centred='true'] {
    z-index: 6;
  }
  .gear {
    /* Above every scrim and panel (prompt 59): the options, and ending the game, are reachable while the table is held. */
    position: absolute;
    z-index: 9;
    width: var(--target);
    height: var(--target);
    border-radius: 50%;
    border: 3px solid var(--ink);
    background: var(--paper);
    color: var(--ink);
    display: grid;
    place-items: center;
    cursor: pointer;
    opacity: 0.85;
  }
  .gear[aria-pressed='true'] {
    background: var(--accent);
  }
  .gear svg {
    width: 60%;
    height: 60%;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linejoin: round;
  }
  .corner {
    position: absolute;
    left: 0.5rem;
    bottom: 0.25rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .code {
    letter-spacing: 0.3em;
    font-size: 0.8rem;
    opacity: 0.6;
  }
  .status {
    width: 0.8rem;
    height: 0.8rem;
  }
  .dot {
    display: block;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: #6a7;
  }
  .status[data-status='syncing'] .dot { background: #cb5; }
  .status[data-status='offline'] .dot { background: #c55; }
</style>
