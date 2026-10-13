<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { SeatState } from '$lib/game/state';
  import { positionAlongEdge, rotationFor, type Seat } from '$lib/tabletop/seats';
  import Icon from '$lib/ui/Icon.svelte';

  interface Props {
    seat: Seat;
    state: SeatState;
    qrImage?: string | null;
    qrUrl?: string | null;
    onjoin: (seat: Seat) => void;
    /** What the taken rail shows beside the player: the explorer setup, the explorer, later the chart. */
    content?: Snippet;
    /** It is this seat's turn. */
    current?: boolean;
    /** The seat's span of its edge in px: the rail's content wraps rather than reach into the next seat's. */
    span?: number | null;
  }
  let { seat, state: seatState, qrImage = null, qrUrl = null, onjoin, content, current = false, span = null }: Props = $props();

  const taken = $derived(Boolean(seatState.uid));
  const rotation = $derived(rotationFor(seat.edge));
  const along = $derived(positionAlongEdge(seat));
  const spanStyle = $derived(span === null ? 'var(--rail-length)' : `${span}px`);
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
  style="{style} --rotation:{rotation}deg; --span:{spanStyle}"
  data-testid="seat-rail-{seat.id}"
  data-seat={seat.id}
  data-edge={seat.edge}
  data-taken={taken}
  data-current={current}
  data-e2e-fit
>
  <!-- The face is anchored at the table's edge and grows inward when it wraps, so a crowded rail never hangs off the table. -->
  <div class="face">
    {#if taken}
      <span class="who" data-testid="seat-name-{seat.id}" aria-label={`Seat ${seat.id} taken by ${seatState.name ?? 'a player'}`}>
        <Icon name="player" />
        {#if seatState.name}<span class="name">{seatState.name}</span>{/if}
      </span>
      {@render content?.()}
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
    /* The seat's span of its edge by the rail's depth. */
    position: absolute;
    width: var(--span);
    height: var(--rail-depth);
    pointer-events: none;
  }
  .rail[data-edge='left'],
  .rail[data-edge='right'] {
    width: var(--rail-depth);
    height: var(--span);
  }
  .face {
    /* The unrotated face is the rail's span wide and at least its depth tall, its content centred, so
       a crowded rail (six seats, a hand and a row of controls) wraps onto a second row instead of
       reaching into the next seat or off the table. It is rotated toward its seat about the rail's
       corner, with its bottom (the player's side) kept on the table's edge, so a face taller than the
       rail grows inward over the gap the board leaves. */
    position: absolute;
    left: 0;
    top: 0;
    width: var(--span);
    min-height: var(--rail-depth);
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    align-content: center;
    justify-content: center;
    gap: var(--gap);
    row-gap: 0;
    transform-origin: 0 0;
    /* The translate (applied first) puts the face's bottom on the edge; the rotation turns it to its seat. */
    rotate: var(--rotation);
    pointer-events: auto;
  }
  .rail[data-edge='bottom'] .face {
    transform: translate(0, calc(var(--rail-depth) - 100%));
  }
  .rail[data-edge='top'] .face {
    transform: translate(-100%, -100%);
  }
  .rail[data-edge='left'] .face {
    transform: translate(0, -100%);
  }
  .rail[data-edge='right'] .face {
    transform: translate(-100%, calc(var(--rail-depth) - 100%));
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
