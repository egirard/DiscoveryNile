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
  style="--target:{target}px; --qr:{qrSize}px; --rail-length:{Math.min(viewport.w, viewport.h) * 0.45}px; --rail-depth:{railDepth}px; --gap:{target * 0.3}px"
>
  <div class="board" data-testid="board" data-e2e-fit>
    <HexBoard width={boardW} height={boardH} />
  </div>

  {#each seats as seat (seat.id)}
    <SeatRail {seat} state={seatState(seat)} qrImage={qr[seat.id]?.image} qrUrl={qr[seat.id]?.url} onjoin={join}>
      {#snippet content()}
        {@const explorer = explorerAt(gameState, seat.id)}
        {#if explorer}
          <ExplorerToken {explorer} />
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
