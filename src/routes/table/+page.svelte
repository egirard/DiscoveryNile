<script lang="ts">
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import QRCode from 'qrcode';
  import { openGame, type Game } from '$lib/game/store';
  import type { GameState } from '$lib/game/state';
  import { initialState } from '$lib/game/state';
  import SeatRail from '$features/seats/SeatRail.svelte';
  import { DEFAULT_LAYOUT, seatsFor, type Seat } from '$lib/tabletop/seats';
  import { mmPerPx, pxFor, readDiagonalInches, screenGeometry } from '$lib/tabletop/screen';
  import Icon from '$lib/ui/Icon.svelte';

  const layout = DEFAULT_LAYOUT;
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

  function seatState(seat: Seat) {
    return gameState.seats.find((s) => s.id === seat.id) ?? { id: seat.id, uid: null, name: null };
  }

  async function join(seat: Seat) {
    await game?.append('seat/taken', { seat: seat.id, uid: `table:${seat.id}` });
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
  style="--target:{target}px; --qr:{qrSize}px; --rail-length:{Math.min(viewport.w, viewport.h) * 0.6}px; --rail-depth:{target * 2.6}px; --gap:{target * 0.3}px"
>
  <div class="board" data-testid="board" data-e2e-fit>
    <Icon name="table" size="min(20vw, 20vh)" />
    <span class="code" data-testid="room-code" aria-label="Room code">{gameState.gameId ?? ''}</span>
  </div>

  {#each seats as seat (seat.id)}
    <SeatRail {seat} state={seatState(seat)} qrImage={qr[seat.id]?.image} qrUrl={qr[seat.id]?.url} onjoin={join} />
  {/each}

  <div class="status" role="status" data-status={status} data-e2e-status-area aria-label="Connection status">
    <span class="dot"></span>
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
  .code {
    letter-spacing: 0.3em;
    font-size: min(3vw, 3vh);
    opacity: 0.6;
  }
  .status {
    position: absolute;
    left: 50%;
    top: 50%;
    translate: -50% calc(min(20vw, 20vh) + 2rem);
    width: 1rem;
    height: 1rem;
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
