<script lang="ts">
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import QRCode from 'qrcode';
  import { openGame, type Game } from '$lib/game/store';
  import type { GameState } from '$lib/game/state';
  import { initialState } from '$lib/game/state';
  import SeatRail from '$features/seats/SeatRail.svelte';
  import { seatsFor, type Seat } from '$lib/tabletop/seats';
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
  import DeckStack from '$features/cards/DeckStack.svelte';
  import DiceRoll from '$lib/ui/DiceRoll.svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import TurnControls from '$features/turn/TurnControls.svelte';
  import { card as cardOf, handValue, type CardId } from '$features/cards/deck';
  import { BOARD, type PortId } from '$features/map/manifest';
  import type { BoardToken, PortChoice } from '$features/map/HexBoard.svelte';
  import { PASSAGE_FARE, waterAvailable, WATER_STEP, worksOwed, portOf, explorerSeats } from '$features/turn/reducer';
  import ExpeditionChart from '$features/expedition/ExpeditionChart.svelte';
  import ChartSummary from '$features/expedition/ChartSummary.svelte';
  import EdgePanel from '$lib/tabletop/EdgePanel.svelte';
  import PolicyChooser from '$features/natives/PolicyChooser.svelte';
  import SpoilsChooser from '$features/natives/SpoilsChooser.svelte';
  import NegotiationPanel from '$features/natives/NegotiationPanel.svelte';
  import TradePanel from '$features/natives/TradePanel.svelte';
  import ReorganisePanel from '$features/expedition/ReorganisePanel.svelte';
  import type { Purchases } from '$features/expedition/prices';
  import { moveTargets, researchPending, standingHex } from '$features/exploration/reducer';
  import RollLog from '$features/exploration/RollLog.svelte';
  import TurnLog from '$features/exploration/TurnLog.svelte';
  import Tally from '$features/scoring/Tally.svelte';
  import { publishable, scoreOf } from '$features/scoring/score';
  import type { HexId } from '$features/map/hex';
  import { SEAT_LAYOUT } from '$lib/game/config';
  import type { Specialty } from '$lib/game/state';
  import type { SeatId } from '$lib/tabletop/seats';

  const layout = SEAT_LAYOUT;
  const seats = seatsFor(layout);

  let game = $state<Game | null>(null);
  let gameState = $state<GameState>(initialState());
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

  // Sailing: the current seat opens the port chooser on the map; a port tap books passage.
  let sailingSeat = $state<string | null>(null);
  const portChoices = $derived.by((): Partial<Record<PortId, PortChoice>> | null => {
    if (!sailingSeat || gameState.turn?.current !== sailingSeat) return null;
    const explorer = explorerAt(gameState, sailingSeat);
    if (!explorer || explorer.location.kind !== 'europe') return null;
    const cash = handValue(explorer.hand) + pooling.filter((s) => poolable.includes(s)).reduce((sum, s) => sum + handValue(explorerAt(gameState, s)!.hand), 0);
    const tickets = new Set(explorer.hand.map((id) => cardOf(id).donation).filter((d) => d.kind === 'ticket').map((d) => (d as { port: PortId }).port));
    const out: Partial<Record<PortId, PortChoice>> = {};
    for (const id of Object.keys(BOARD.ports) as PortId[]) out[id] = { fare: tickets.has(id) ? 'ticket' : cash >= PASSAGE_FARE ? 'cash' : 'none' };
    return out;
  });
  // Companions in Europe chosen to pool their donations and sail along (rules §13).
  let pooling = $state<SeatId[]>([]);
  const poolable = $derived.by(() => {
    if (!sailingSeat) return [];
    return gameState.explorers.filter((e) => e.seat !== sailingSeat && e.location.kind === 'europe' && e.party === null).map((e) => e.seat);
  });
  async function bookPassage(port: PortId) {
    const seat = sailingSeat;
    const explorer = seat ? explorerAt(gameState, seat) : undefined;
    if (!seat || !explorer) return;
    const ticket = explorer.hand.find((id) => {
      const d = cardOf(id).donation;
      return d.kind === 'ticket' && d.port === port;
    });
    const companions = pooling.filter((s) => poolable.includes(s));
    sailingSeat = null;
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
    // One's own caches, and anyone's in a published hex (RQ-3).
    const caches = Object.values(gameState.caches).filter((c) => c.hex === hex && (c.seat === seat.id || !!gameState.map[hex]?.publishedBy) && c.round < gameState.turn!.round);
    return { seat, explorer: { ...explorer, chart }, caches };
  });
  // Publishing: the current seat, in Europe, opens the claim on the board; a tap on a marker hex publishes it.
  let publishingSeat = $state<string | null>(null);
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
  // The full list of a turn's records, opened from the "+" at the end of a rail's roll log.
  let logOpenSeat = $state<string | null>(null);
  const openLog = $derived.by(() => {
    if (!logOpenSeat) return null;
    const seat = seats.find((s) => s.id === logOpenSeat);
    const explorer = seat && explorerAt(gameState, seat.id);
    const log = gameState.turn?.current === logOpenSeat ? gameState.turn.log : explorer?.lastMeal ? [explorer.lastMeal] : [];
    if (!seat || !log.some((r) => r.seat === logOpenSeat)) return null;
    return { seat, log };
  });
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
    <HexBoard width={boardW} height={boardH} touch={target} tokens={boardTokens} {portChoices} onport={bookPassage} mapped={gameState.map} caches={Object.values(gameState.caches)} {targets} onhex={move} publishable={publishTargets} onpublish={publish} />
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

  {#if outfitting}
    <EdgePanel seat={outfitting.seat} {viewport} inset={railDepth + target * 0.4} testid="outfit-panel-{outfitting.seat.id}">
      <ExpeditionChart seat={outfitting.seat.id} port={outfitting.port} budget={outfitting.explorer.money} onconfirm={(p) => outfit(outfitting!.seat, p)} />
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

  {#if openLog}
    <EdgePanel seat={openLog.seat} {viewport} inset={railDepth + target * 0.4} testid="turn-log-edge-{openLog.seat.id}">
      <TurnLog seat={openLog.seat.id} log={openLog.log} onclose={() => (logOpenSeat = null)} />
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
      <ReorganisePanel seat={reorganising.seat.id} chart={reorganising.explorer.chart!} caches={reorganising.caches}
        onaction={(action, item, count) => game?.append('expedition/reorganised', { seat: reorganising!.seat.id, action, item, count })}
        onrecover={(cacheId) => game?.append('cache/recovered', { seat: reorganising!.seat.id, cacheId })}
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
          {#if gameState.rollOff?.[seat.id]}
            <DiceRoll values={gameState.rollOff[seat.id].at(-1) ?? []} label="Roll for first player" testid="roll-off-{seat.id}" />
          {/if}
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
                <Icon name="men" size="1.2em" />
                {#if party.leader === seat.id}{party.members.length}{:else}<span class="leader" style="--colour:{colourFor(holderOf(gameState, explorer).seat)}"></span>{/if}
              </span>
            {:else}
              <span class="money" data-testid="money-{seat.id}" aria-label={explorer.location.kind === 'europe' ? 'Money raised' : 'Expedition budget'}>${explorer.location.kind === 'europe' ? handValue(explorer.hand) : explorer.money}</span>
            {/if}
            {#if party && explorer.chart}
              <span class="party" data-testid="party-{seat.id}" data-party={party.id} data-leader={party.leader} data-mover={moverOf(gameState, party)} aria-label="Leading a joint expedition with {party.members.filter((s) => s !== seat.id).join(', ')}; it moves on {moverOf(gameState, party)}'s turn">
                <Icon name="men" size="1.2em" />{party.members.length}
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
                <button class="reorganise" data-testid="reorganise-{seat.id}" aria-label="Reorganise the expedition: cache, dismiss, turn loose or eat" aria-pressed={reorganisingSeat === seat.id} onclick={() => (reorganisingSeat = reorganisingSeat === seat.id ? null : seat.id)}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h16v10H4z" /><path d="M4 9l2-4h12l2 4" /><path d="M10 13h4" /></svg>
                </button>
              {/if}
              {#if chartOf(gameState, explorer) && waterAvailable(gameState, explorer)}
                <span class="water-controls" data-testid="water-controls-{seat.id}">
                  <button class="water" data-testid="take-water-{seat.id}" aria-label="Take {WATER_STEP} water rations" onclick={() => takeWater(seat.id, WATER_STEP)}><Icon name="water" size="1.2em" /><span class="sign">+</span></button>
                  {#if chartOf(gameState, explorer)!.water > 0}
                    <button class="water" data-testid="pour-water-{seat.id}" aria-label="Pour out {Math.min(WATER_STEP, chartOf(gameState, explorer)!.water)} water rations" onclick={() => takeWater(seat.id, -Math.min(WATER_STEP, chartOf(gameState, explorer)!.water))}><Icon name="water" size="1.2em" /><span class="sign">−</span></button>
                  {/if}
                </span>
              {/if}
              <RollLog seat={seat.id} log={gameState.turn.log} expanded={logOpenSeat === seat.id} ontoggle={() => (logOpenSeat = logOpenSeat === seat.id ? null : seat.id)} />
              <TurnControls
                seat={seat.id}
                phase={gameState.turn.phase}
                onend={() => endTurn(seat)}
                onsail={explorer.location.kind === 'europe' ? () => (sailingSeat = sailingSeat === seat.id ? null : seat.id) : null}
                sailing={sailingSeat === seat.id}
                onundo={gameState.undo?.seat === seat.id ? () => game?.append('turn/undone', { seat: seat.id, eventId: gameState.undo!.eventId }) : null}
              />
            {:else if explorer.lastMeal}
              <RollLog seat={seat.id} log={[explorer.lastMeal]} expanded={logOpenSeat === seat.id} ontoggle={() => (logOpenSeat = logOpenSeat === seat.id ? null : seat.id)} />
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
            <RollLog seat={seat.id} log={gameState.turn.log} expanded={logOpenSeat === seat.id} ontoggle={() => (logOpenSeat = logOpenSeat === seat.id ? null : seat.id)} />
            <TurnControls seat={seat.id} phase="act" onend={() => endTurn(seat)} onundo={gameState.undo?.seat === seat.id ? () => game?.append('turn/undone', { seat: seat.id, eventId: gameState.undo!.eventId }) : null} />
          {:else}
            <ExplorerSetup seat={seat.id} oncommission={(specialties) => commission(seat, specialties)} />
          {/if}
        {/if}
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
    <OptionsPanel {seats} {qr} {diagonal} mmPerPx={k} running={Boolean(gameState.turn) && !gameState.ended} rotation={options === 'nw' ? 180 : 0} onclose={() => (options = null)} ondiagonal={setDiagonal} onend={endByAgreement} />
  {/if}
  <p class="build" data-testid="build-marker">{__GIT_HASH__.slice(0, 7)}</p>
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
  .water-controls {
    display: inline-flex;
    gap: calc(var(--gap) * 0.4);
    margin-left: var(--gap);
  }
  .water {
    width: var(--target);
    height: var(--target);
    border-radius: 50%;
    border: 2px solid var(--paper);
    background: #2d72c9;
    color: var(--paper);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 2px;
    font-family: 'Nile Sans', 'DejaVu Sans', sans-serif;
    font-weight: 700;
    font-size: calc(var(--target) * 0.4);
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
  .gear {
    position: absolute;
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
  .build {
    position: absolute;
    right: 0.5rem;
    bottom: 0.25rem;
    margin: 0;
    font-size: 0.7rem;
    opacity: 0.4;
  }
</style>
