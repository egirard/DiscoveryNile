<script lang="ts">
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import QRCode from 'qrcode';
  import { openGame, type Game } from '$lib/game/store';
  import type { GameState } from '$lib/game/state';
  import { initialState } from '$lib/game/state';
  import SeatRail from '$features/seats/SeatRail.svelte';
  import { seatsFor, type Seat } from '$lib/tabletop/seats';
  import { mmPerPx, pxFor, readDiagonalInches, screenGeometry } from '$lib/tabletop/screen';
  import HexBoard from '$features/map/HexBoard.svelte';
  import ExplorerSetup from '$features/explorers/ExplorerSetup.svelte';
  import ExplorerToken from '$features/explorers/ExplorerToken.svelte';
  import { explorerAt } from '$features/explorers/reducer';
  import Card from '$features/cards/Card.svelte';
  import DeckStack from '$features/cards/DeckStack.svelte';
  import DiceRoll from '$lib/ui/DiceRoll.svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import TurnControls from '$features/turn/TurnControls.svelte';
  import { card as cardOf, handValue, type CardId } from '$features/cards/deck';
  import { BOARD, type PortId } from '$features/map/manifest';
  import type { BoardToken, PortChoice } from '$features/map/HexBoard.svelte';
  import { PASSAGE_FARE, waterAvailable, WATER_STEP, worksOwed } from '$features/turn/reducer';
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
  import type { HexId } from '$features/map/hex';
  import { SEAT_LAYOUT } from '$lib/game/config';
  import type { Specialty } from '$lib/game/state';

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
  const qrSize = $derived(pxFor(30, k, 96));
  const railDepth = $derived(target * 2.6);
  const boardW = $derived(Math.max(200, viewport.w - 2 * railDepth - 2 * target));
  const boardH = $derived(Math.max(200, viewport.h - 2 * railDepth - 2 * target));

  function seatState(seat: Seat) {
    return gameState.seats.find((s) => s.id === seat.id) ?? { id: seat.id, uid: null, name: null };
  }

  async function join(seat: Seat) {
    await game?.append('seat/taken', { seat: seat.id, uid: `table:${seat.id}` });
  }

  async function commission(seat: Seat, specialties: Specialty[]) {
    await game?.append('explorer/commissioned', { seat: seat.id, specialties });
  }

  async function start() {
    await game?.append('game/started', {});
  }

  const canStart = $derived(!gameState.turn && gameState.explorers.length > 0);

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
    const cash = handValue(explorer.hand);
    const tickets = new Set(explorer.hand.map((id) => cardOf(id).donation).filter((d) => d.kind === 'ticket').map((d) => (d as { port: PortId }).port));
    const out: Partial<Record<PortId, PortChoice>> = {};
    for (const id of Object.keys(BOARD.ports) as PortId[]) out[id] = { fare: tickets.has(id) ? 'ticket' : cash >= PASSAGE_FARE ? 'cash' : 'none' };
    return out;
  });
  async function bookPassage(port: PortId) {
    const seat = sailingSeat;
    const explorer = seat ? explorerAt(gameState, seat) : undefined;
    if (!seat || !explorer) return;
    const ticket = explorer.hand.find((id) => {
      const d = cardOf(id).donation;
      return d.kind === 'ticket' && d.port === port;
    });
    sailingSeat = null;
    await game?.append('voyage/booked', { seat, port, ticketCardId: ticket ?? null });
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
    if (!seat || !explorer || !explorer.chart || !hex || explorer.location.kind === 'captive') return null;
    const caches = Object.values(gameState.caches).filter((c) => c.hex === hex && c.seat === seat.id && c.round < gameState.turn!.round);
    return { seat, explorer, caches };
  });
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
    return () => opened?.close();
  });
</script>

<main
  data-e2e-layout
  data-testid="table"
  data-e2e-no-scroll
  style="--target:{target}px; --qr:{qrSize}px; --rail-length:{Math.min(viewport.w, viewport.h) * 0.5}px; --rail-depth:{railDepth}px; --gap:{target * 0.3}px"
>
  <div class="board" data-testid="board" data-e2e-fit>
    <HexBoard width={boardW} height={boardH} tokens={boardTokens} {portChoices} onport={bookPassage} mapped={gameState.map} caches={Object.values(gameState.caches)} {targets} onhex={move} />
  </div>

  {#if canStart}
    <button class="start" data-testid="start-game" aria-label="Start the game" onclick={start}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
    </button>
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

  {#each seats as seat (seat.id)}
    <SeatRail {seat} state={seatState(seat)} qrImage={qr[seat.id]?.image} qrUrl={qr[seat.id]?.url} onjoin={join} current={gameState.turn?.current === seat.id}>
      {#snippet content()}
        {@const explorer = explorerAt(gameState, seat.id)}
        {#if explorer}
          <span class="turn-marker" data-testid="turn-marker-{seat.id}" data-current={gameState.turn?.current === seat.id} aria-label={gameState.turn?.current === seat.id ? 'It is this seat\'s turn' : ''}>
            <ExplorerToken {explorer} />
          </span>
          {#if gameState.rollOff?.[seat.id]}
            <DiceRoll values={gameState.rollOff[seat.id].at(-1) ?? []} label="Roll for first player" testid="roll-off-{seat.id}" />
          {/if}
          {#if gameState.turn}
            {@const mine = gameState.turn.current === seat.id}
            {@const discarding = mine && gameState.turn.phase === 'discard'}
            <span class="hand" data-testid="hand-{seat.id}" data-count={explorer.hand.length}>
              {#each explorer.hand as id (id)}
                <Card {id} seat={seat.id} onselect={discarding ? (c) => discard(seat, c) : undefined} />
              {/each}
            </span>
            {#if explorer.chart}
              <ChartSummary seat={seat.id} chart={explorer.chart} sick={explorer.sick} specimens={explorer.specimens} />
            {:else}
              <span class="money" data-testid="money-{seat.id}" aria-label={explorer.location.kind === 'europe' ? 'Money raised' : 'Expedition budget'}>${explorer.location.kind === 'europe' ? handValue(explorer.hand) : explorer.money}</span>
            {/if}
            {#if mine}
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
              {#if explorer.chart && gameState.turn.phase === 'act' && explorer.location.kind !== 'captive' && standingHex(explorer)}
                <button class="reorganise" data-testid="reorganise-{seat.id}" aria-label="Reorganise the expedition: cache, dismiss, turn loose or eat" aria-pressed={reorganisingSeat === seat.id} onclick={() => (reorganisingSeat = reorganisingSeat === seat.id ? null : seat.id)}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h16v10H4z" /><path d="M4 9l2-4h12l2 4" /><path d="M10 13h4" /></svg>
                </button>
              {/if}
              {#if explorer.chart && waterAvailable(gameState, explorer)}
                <span class="water-controls" data-testid="water-controls-{seat.id}">
                  <button class="water" data-testid="take-water-{seat.id}" aria-label="Take {WATER_STEP} water rations" onclick={() => takeWater(seat.id, WATER_STEP)}><Icon name="water" size="1.2em" /><span class="sign">+</span></button>
                  {#if explorer.chart.water > 0}
                    <button class="water" data-testid="pour-water-{seat.id}" aria-label="Pour out {Math.min(WATER_STEP, explorer.chart.water)} water rations" onclick={() => takeWater(seat.id, -Math.min(WATER_STEP, explorer.chart!.water))}><Icon name="water" size="1.2em" /><span class="sign">−</span></button>
                  {/if}
                </span>
              {/if}
              <RollLog seat={seat.id} log={gameState.turn.log} />
              <TurnControls
                seat={seat.id}
                phase={gameState.turn.phase}
                onend={() => endTurn(seat)}
                onsail={explorer.location.kind === 'europe' ? () => (sailingSeat = sailingSeat === seat.id ? null : seat.id) : null}
                sailing={sailingSeat === seat.id}
              />
            {:else if explorer.lastMeal}
              <RollLog seat={seat.id} log={[explorer.lastMeal]} />
            {/if}
          {/if}
        {:else}
          <ExplorerSetup seat={seat.id} oncommission={(specialties) => commission(seat, specialties)} />
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
  <p class="build" data-testid="build-marker">{__GIT_HASH__.slice(0, 7)}</p>
</main>

<style>
  :global(body) {
    margin: 0;
    overflow: hidden;
    background: #1c2a2e;
    font-family: system-ui, sans-serif;
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
  .deck-area {
    position: absolute;
    right: calc(var(--rail-depth) + var(--gap));
    bottom: calc(var(--rail-depth) * 0.1);
  }
  .turn-marker {
    display: inline-flex;
    border-radius: 999px;
    padding: 3px;
    border: 3px solid transparent;
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
    font-family: system-ui, sans-serif;
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
