<script lang="ts">
  // A die's face set by hand (PROMPTS.md, prompt 37), the way WebCamTool's Yahtzee page offers it on a die in its
  // feed: six wedges round a centre, one a face, 1 at the top and on clockwise, the face the die shows now marked,
  // and in the centre an X that leaves the die as it is. Each wedge is a touch target in itself; the whole is drawn in
  // targets so it is the same size in the hand on every screen.
  import { PIPS } from '$lib/ui/pips';

  interface Props {
    seat: string;
    /** The face the die shows now. */
    current: number;
    onselect: (value: number) => void;
    oncancel: () => void;
  }
  let { seat, current, onselect, oncancel }: Props = $props();

  /** Outer and inner radius, in targets: every wedge and the centre are at least a target across. */
  const R = 1.6;
  const r = 0.55;
  const faces = [1, 2, 3, 4, 5, 6];
  const at = (angle: number, radius: number) => ({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
  /** The i-th wedge, sixty degrees from the top clockwise. */
  function wedge(i: number): string {
    const a0 = -Math.PI / 2 + (i * Math.PI) / 3;
    const a1 = a0 + Math.PI / 3;
    const o0 = at(a0, R);
    const o1 = at(a1, R);
    const i0 = at(a0, r);
    const i1 = at(a1, r);
    return `M ${i0.x} ${i0.y} L ${o0.x} ${o0.y} A ${R} ${R} 0 0 1 ${o1.x} ${o1.y} L ${i1.x} ${i1.y} A ${r} ${r} 0 0 0 ${i0.x} ${i0.y} Z`;
  }
  /** Where the i-th wedge's face sits: midway along the wedge. */
  const faceAt = (i: number) => at(-Math.PI / 2 + ((i + 0.5) * Math.PI) / 3, (R + r) / 2);
  const FACE = 0.56;
  const key = (fn: () => void) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fn();
    }
  };
</script>

<svg class="menu" viewBox="-1.7 -1.7 3.4 3.4" data-testid="die-menu-{seat}" data-current={current} role="menu" aria-label="Set the die's face: it shows a {current}">
  {#each faces as v, i (v)}
    {@const c = faceAt(i)}
    <g class="wedge" class:current={v === current} role="button" tabindex="0" data-testid="die-set-{v}-{seat}" data-value={v} aria-label={v === current ? `Leave the die a ${v}` : `The die shows a ${v}`} onclick={() => onselect(v)} onkeydown={key(() => onselect(v))}>
      <path class="sector" d={wedge(i)} />
      <g transform="translate({c.x - FACE / 2} {c.y - FACE / 2}) scale({FACE / 24})">
        <rect class="face" x="1" y="1" width="22" height="22" rx="4" />
        {#each PIPS[v] as [x, y], j (j)}
          <circle class="pip" cx={x} cy={y} r="2.3" />
        {/each}
      </g>
    </g>
  {/each}
  <g class="centre" role="button" tabindex="0" data-testid="die-menu-cancel-{seat}" aria-label="Leave the die as it is" onclick={oncancel} onkeydown={key(oncancel)}>
    <circle class="hub" r={r - 0.04} />
    <path class="x" d="M -0.17 -0.17 L 0.17 0.17 M 0.17 -0.17 L -0.17 0.17" />
  </g>
</svg>

<style>
  .menu {
    display: block;
    width: calc(var(--target) * 3.4);
    height: calc(var(--target) * 3.4);
    overflow: visible;
    filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.45));
    user-select: none;
  }
  .wedge,
  .centre {
    cursor: pointer;
    outline: none;
  }
  .sector {
    fill: var(--paper);
    stroke: var(--ink);
    stroke-width: 0.04;
  }
  .wedge:hover .sector,
  .wedge:focus-visible .sector {
    fill: #f3e6c4;
  }
  .wedge.current .sector {
    fill: var(--accent);
  }
  .face {
    fill: #fffaf0;
    stroke: var(--ink);
    stroke-width: 1.5;
  }
  .pip {
    fill: var(--ink);
  }
  .hub {
    fill: var(--ink);
    stroke: var(--paper);
    stroke-width: 0.04;
  }
  .centre:hover .hub,
  .centre:focus-visible .hub {
    fill: #35494e;
  }
  .x {
    fill: none;
    stroke: var(--paper);
    stroke-width: 0.07;
    stroke-linecap: round;
    pointer-events: none;
  }
</style>
