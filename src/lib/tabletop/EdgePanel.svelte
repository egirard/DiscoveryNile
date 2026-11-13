<script lang="ts">
  // A player-facing panel on the board next to a seat's rail: positioned along that seat's span
  // of its edge and rotated toward the seat, so the player reads it upright.
  import { untrack, type Snippet } from 'svelte';
  import { positionAlongEdge, rotationFor, type Seat } from './seats';

  interface Rect {
    x: number;
    y: number;
    w: number;
    h: number;
  }
  interface Props {
    seat: Seat;
    viewport: { w: number; h: number };
    /** Distance from the edge to the panel's near side, in px (rail depth plus a gap). */
    inset: number;
    testid?: string;
    /** Above the scrim that holds the table still while the dice are rolled. */
    raised?: boolean;
    /**
     * Rectangles of the page the panel stands clear of: the manual dice tray (prompt 67), the hexes the expedition may
     * step into while the panel prompts for a step (prompt 74). It stands aside along its edge, and again when they change.
     */
    clear?: Rect | null | (Rect | null)[];
    /** Stood down for a moment so the board beneath can be watched (the terrain's direction played out, prompt 68): faint, and not in the way of a tap. */
    faded?: boolean;
    children: Snippet;
  }
  let { seat, viewport, inset, testid, raised = false, clear = null, faded = false, children }: Props = $props();
  // The panel can be dragged about by any part of it that is not a control (PROMPTS.md, prompt 45), with no
  // affordance; the offset is the component's own, so it is forgotten when the panel closes and the next opens in
  // its place. The panel is kept inside the viewport.
  let dx = $state(0);
  let dy = $state(0);
  // Where the panel has stood aside by itself, apart from where a hand has dragged it.
  let ax = $state(0);
  let ay = $state(0);
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
  // Over a rectangle to keep clear, the panel stands aside along its edge by the shorter way that keeps it on the
  // screen, past every rectangle in its way; when they change it finds its place again. A panel the player has
  // dragged is left where he put it.
  $effect(() => {
    void anchor;
    const rects = (Array.isArray(clear) ? clear : [clear]).filter((c): c is Rect => c !== null);
    if (!el) return;
    untrack(() => {
      if (dx !== 0 || dy !== 0) return;
      if (rects.length === 0) {
        ax = 0;
        ay = 0;
        return;
      }
      const r = el!.getBoundingClientRect();
      const gap = 8;
      const horizontal = seat.edge === 'bottom' || seat.edge === 'top';
      // The panel's box where it opens, without the step it has already taken.
      const home = { left: r.left - ax, right: r.right - ax, top: r.top - ay, bottom: r.bottom - ay };
      const [lo, hi, max] = horizontal ? [home.left, home.right, viewport.w] : [home.top, home.bottom, viewport.h];
      const fits = (d: number) => lo + d >= 0 && hi + d <= max;
      let step = 0;
      let from = Infinity;
      let to = -Infinity;
      for (let i = 0; i <= rects.length; i++) {
        const sx = horizontal ? step : 0;
        const sy = horizontal ? 0 : step;
        const hit = rects.filter((c) => !(home.right + sx <= c.x || home.left + sx >= c.x + c.w || home.bottom + sy <= c.y || home.top + sy >= c.y + c.h));
        if (hit.length === 0) break;
        for (const c of hit) {
          from = Math.min(from, horizontal ? c.x : c.y);
          to = Math.max(to, horizontal ? c.x + c.w : c.y + c.h);
        }
        const forward = to + gap - lo;
        const back = from - gap - hi;
        step = fits(forward) && (!fits(back) || forward <= -back) ? forward : fits(back) ? back : 0;
        if (step === 0) break;
      }
      ax = horizontal ? step : 0;
      ay = horizontal ? 0 : step;
    });
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="panel" class:raised class:faded data-faded={faded} bind:this={el} data-testid={testid} data-seat={seat.id} data-moved={dx !== 0 || dy !== 0} data-aside={ax !== 0 || ay !== 0} data-e2e-fit style="left:{anchor.x}px; top:{anchor.y}px; --rotation:{rotation}deg; --dx:{dx + ax}px; --dy:{dy + ay}px" onpointerdown={grab}>
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
  .panel {
    transition: opacity 200ms;
  }
  .faded {
    opacity: 0.08;
    pointer-events: none;
  }
  .raised {
    z-index: 6;
  }
</style>
