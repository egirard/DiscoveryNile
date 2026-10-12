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
  import TurnControls from '$features/turn/TurnControls.svelte';
  import { handValue, type CardId } from '$features/cards/deck';
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
    <HexBoard width={boardW} height={boardH} />
  </div>

  {#if canStart}
    <button class="start" data-testid="start-game" aria-label="Start the game" onclick={start}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
    </button>
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
            <span class="money" data-testid="money-{seat.id}" aria-label="Money raised">${handValue(explorer.hand)}</span>
            {#if mine}
              <TurnControls seat={seat.id} phase={gameState.turn.phase} onend={() => endTurn(seat)} />
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
