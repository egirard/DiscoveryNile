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
    /** Above the scrim that holds the table still while the dice are rolled. */
    raised?: boolean;
    children: Snippet;
  }
  let { seat, viewport, inset, testid, raised = false, children }: Props = $props();
  // The panel can be dragged about by any part of it that is not a control (PROMPTS.md, prompt 45), with no
  // affordance; the offset is the component's own, so it is forgotten when the panel closes and the next opens in
  // its place. The panel is kept inside the viewport.
  let dx = $state(0);
  let dy = $state(0);
  let el: HTMLDivElement | undefined = $state();
  function grab(e: PointerEvent) {
    if (e.button !== 0 || !el) return;
    if ((e.target as HTMLElement).closest('button, input, select, textarea, a, canvas, [role="button"], [role="menu"], [role="slider"]')) return;
    const from = { x: e.clientX - dx, y: e.clientY - dy };
    const move = (m: PointerEvent) => {
      const r = el!.getBoundingClientRect();
      // Keep the panel's box within the viewport: trim the step that would take it out.
      let nx = m.clientX - from.x;
      let ny = m.clientY - from.y;
      const sx = nx - dx;
      const sy = ny - dy;
      if (r.left + sx < 0) nx = dx - r.left;
      if (r.right + sx > viewport.w) nx = dx + viewport.w - r.right;
      if (r.top + sy < 0) ny = dy - r.top;
      if (r.bottom + sy > viewport.h) ny = dy + viewport.h - r.bottom;
      dx = nx;
      dy = ny;
    };
    const drop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', drop);
      window.removeEventListener('pointercancel', drop);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', drop);
    window.addEventListener('pointercancel', drop);
    e.preventDefault();
  }

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

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="panel" class:raised bind:this={el} data-testid={testid} data-seat={seat.id} data-moved={dx !== 0 || dy !== 0} data-e2e-fit style="left:{anchor.x}px; top:{anchor.y}px; --rotation:{rotation}deg; --dx:{dx}px; --dy:{dy}px" onpointerdown={grab}>
  {@render children()}
</div>

<style>
  .panel {
    position: absolute;
    transform-origin: 0 0;
    transform: translate(var(--dx, 0px), var(--dy, 0px)) rotate(var(--rotation)) translate(-50%, -100%);
    touch-action: none;
    background: var(--paper);
    color: var(--ink);
    border: 3px solid var(--ink);
    border-radius: 12px;
    padding: calc(var(--gap) * 1.2);
    box-shadow: 0 4px 18px rgba(0, 0, 0, 0.4);
  }
  .raised {
    z-index: 6;
  }
</style>
