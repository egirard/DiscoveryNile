<script lang="ts">
  // A player-facing panel on the board next to a seat's rail: positioned along that seat's span
  // of its edge and rotated toward the seat, so the player reads it upright.
  import type { Snippet } from 'svelte';
  import { positionAlongEdge, rotationFor, type Seat } from './seats';

  interface Props {
    seat: Seat;
    viewport: { w: number; h: number };
    /** Distance from the edge to the panel's near side, in px (rail depth plus a gap). */
    inset: number;
    testid?: string;
    children: Snippet;
  }
  let { seat, viewport, inset, testid, children }: Props = $props();

  const along = $derived(positionAlongEdge(seat));
  const rotation = $derived(rotationFor(seat.edge));
  const anchor = $derived.by(() => {
    switch (seat.edge) {
      case 'bottom': return { x: along * viewport.w, y: viewport.h - inset };
      case 'top': return { x: (1 - along) * viewport.w, y: inset };
      case 'left': return { x: inset, y: along * viewport.h };
      case 'right': return { x: viewport.w - inset, y: (1 - along) * viewport.h };
    }
  });
</script>

<div class="panel" data-testid={testid} data-seat={seat.id} data-e2e-fit style="left:{anchor.x}px; top:{anchor.y}px; --rotation:{rotation}deg">
  {@render children()}
</div>

<style>
  .panel {
    position: absolute;
    transform-origin: 0 0;
    transform: rotate(var(--rotation)) translate(-50%, -100%);
    background: var(--paper);
    color: var(--ink);
    border: 3px solid var(--ink);
    border-radius: 12px;
    padding: calc(var(--gap) * 1.2);
    box-shadow: 0 4px 18px rgba(0, 0, 0, 0.4);
  }
</style>
