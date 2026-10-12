<script lang="ts">
  import type { SeatState } from '$lib/game/state';
  import { positionAlongEdge, rotationFor, type Seat } from '$lib/tabletop/seats';
  import Icon from '$lib/ui/Icon.svelte';

  interface Props {
    seat: Seat;
    state: SeatState;
    qrImage?: string | null;
    qrUrl?: string | null;
    onjoin: (seat: Seat) => void;
  }
  let { seat, state, qrImage = null, qrUrl = null, onjoin }: Props = $props();

  const taken = $derived(Boolean(state.uid));
  const rotation = $derived(rotationFor(seat.edge));
  const along = $derived(positionAlongEdge(seat));
  const style = $derived.by(() => {
    const pct = `${along * 100}%`;
    switch (seat.edge) {
      case 'bottom': return `left:${pct}; bottom:0; translate:-50% 0;`;
      case 'top': return `left:${100 - along * 100}%; top:0; translate:-50% 0;`;
      case 'left': return `left:0; top:${pct}; translate:0 -50%;`;
      case 'right': return `right:0; top:${100 - along * 100}%; translate:0 -50%;`;
    }
  });
</script>

<div
  class="rail"
  class:taken
  style="{style} --rotation:{rotation}deg"
  data-testid="seat-rail-{seat.id}"
  data-seat={seat.id}
  data-edge={seat.edge}
  data-taken={taken}
  data-e2e-fit
>
  <div class="face">
    {#if taken}
      <span class="who" data-testid="seat-name-{seat.id}" aria-label={`Seat ${seat.id} taken by ${state.name ?? 'a player'}`}>
        <Icon name="player" />
        {#if state.name}<span class="name">{state.name}</span>{/if}
      </span>
    {:else}
      <button class="join" data-testid="seat-join-{seat.id}" aria-label={`Take seat ${seat.id}`} onclick={() => onjoin(seat)}>
        <Icon name="sit" />
      </button>
      {#if qrImage && qrUrl}
        <a class="qr" href={qrUrl} data-testid="seat-qr-{seat.id}" aria-label={`Join seat ${seat.id} from a phone`}>
          <img src={qrImage} alt="" />
        </a>
      {/if}
    {/if}
  </div>
</div>

<style>
  .rail {
    position: absolute;
    width: var(--rail-length);
    height: var(--rail-depth);
    pointer-events: none;
  }
  .rail[data-edge='left'],
  .rail[data-edge='right'] {
    width: var(--rail-depth);
    height: var(--rail-length);
  }
  .face {
    /* Centre the unrotated box on the rail, then rotate it about its own centre. */
    position: absolute;
    left: 50%;
    top: 50%;
    translate: -50% -50%;
    rotate: var(--rotation);
    display: flex;
    align-items: center;
    gap: var(--gap);
    pointer-events: auto;
  }
  .join {
    width: var(--target);
    height: var(--target);
    border-radius: 50%;
    border: 3px solid var(--ink);
    background: var(--paper);
    color: var(--ink);
    display: grid;
    place-items: center;
    cursor: pointer;
  }
  .join:active {
    background: var(--accent);
  }
  .who {
    display: flex;
    align-items: center;
    gap: 0.5em;
    color: var(--paper);
    font-size: calc(var(--target) * 0.4);
  }
  .qr {
    display: block;
    width: var(--qr);
    height: var(--qr);
    background: var(--paper);
    border-radius: 6px;
    padding: 4px;
  }
  .qr img {
    width: 100%;
    height: 100%;
    display: block;
  }
</style>
