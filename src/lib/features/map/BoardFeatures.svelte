<svelte:options namespace="svg" />

<script lang="ts">
  // The features drawn over the hexes, shared by the table's board and the map editor (PROMPTS.md, prompt 52) so both
  // label the map alike: the rivers with their reach into the sea, a single hatch across the river at each cataract,
  // the drainage number and the name at each mouth, and the ports, each a brown square set half-way toward the sea
  // (clear of the terrain symbol in the middle of the hex) with its name in the water beside it. Nothing here takes
  // a tap; the board's own controls lie under or over it. The table adds its port chooser through the snippets.
  import type { Snippet } from 'svelte';
  import { HATCH, MARK, cataractHatch, mouthLabelAt, nameSide, pointsOf, portAnchor, portLabel, riverLine, type Pt } from './art';
  import { seaward, type RawBoard } from './editor';
  import type { HexId } from './hex';

  interface Props {
    board: RawBoard;
    centre: (id: string) => Pt;
    radius: number;
    /** The transform that keeps text upright when the board is turned. */
    upright?: string;
    rotated?: boolean;
    /** A river drawn brighter (the editor's chosen river). */
    chosen?: string | null;
    /** Drawn under a port's mark, and over its name, in the upright frame (the table's chooser halo, fare and hit area). */
    under?: Snippet<[string]>;
    over?: Snippet<[string]>;
    /** Attributes for a port's group (the chooser's state, for tests and styling). */
    portAttrs?: (id: string) => Record<string, string | boolean | undefined>;
  }
  let { board, centre, radius, upright = '', rotated = false, chosen = null, under, over, portAttrs }: Props = $props();

  const rivers = $derived(board.rivers.map((r) => ({ r, line: pointsOf(riverLine(board, r, centre, radius)) })).filter((x) => x.line));
  const mouths = $derived(board.rivers.filter((r) => !r.joins && r.path.length));
</script>

{#each rivers as { r, line } (r.id)}
  <polyline class="river-bank" points={line} />
{/each}
{#each rivers as { r, line } (r.id)}
  <polyline data-testid="river-{r.id}" class="river" class:chosen={r.id === chosen} data-hexes={r.path.join(',')} data-mouth={seaward(board, r) ?? undefined} aria-label="River {r.name}" points={line} />
{/each}
{#each board.rivers as r (r.id)}
  {#each r.cataracts as id (id)}
    {@const c = centre(id)}
    {@const h = cataractHatch(board, r, id, centre)}
    {@const x1 = c.x - h.x * HATCH * radius}
    {@const y1 = c.y - h.y * HATCH * radius}
    {@const x2 = c.x + h.x * HATCH * radius}
    {@const y2 = c.y + h.y * HATCH * radius}
    <g data-testid="cataract-{id}" class="cataract" aria-label="Cataract on the {r.name}" data-across="{h.x.toFixed(2)},{h.y.toFixed(2)}">
      <line class="hatch-bank" {x1} {y1} {x2} {y2} />
      <line class="hatch" {x1} {y1} {x2} {y2} />
    </g>
  {/each}
{/each}
{#each mouths as r (r.id)}
  {@const m = centre(r.path[0])}
  {@const p = mouthLabelAt(board, r, centre, radius)}
  {@const side = nameSide(r, m, p, radius, rotated)}
  {#if r.drainage !== undefined}
    <text data-testid="drainage-{r.id}" class="drainage" aria-label="{r.name} drains at least {r.drainage} hexes" transform="translate({p.x} {p.y}) {upright}" font-size={radius * 0.8}>{r.drainage}</text>
  {/if}
  <!-- The river's name beside its mouth, upright for a reader at the south edge. -->
  <text data-testid="label-river-{r.id}" class="river-name" aria-label="Mouth of the {r.name}" transform="translate({p.x} {p.y}) {upright}" x={side.x} text-anchor={side.anchor} font-size={radius * 0.55}>{r.name}</text>
{/each}
{#each Object.entries(board.ports) as [id, p] (id)}
  {@const c = centre(p.hex)}
  {@const a = portAnchor(board, p.hex as HexId)}
  {@const l = portLabel(id)}
  <g data-testid="port-{id}" class="port" aria-label="Port of entry: {p.name}" {...portAttrs?.(id)} transform="translate({c.x} {c.y})">
    {@render under?.(id)}
    <rect class="mark" data-testid="mark-port-{id}" data-at={a.at} x={(a.dx - MARK) * radius} y={(a.dy - MARK) * radius} width={2 * MARK * radius} height={2 * MARK * radius} />
    <g transform={upright}>
      <text class="label" data-testid="label-port-{id}" x={radius * l.dx} y={radius * l.dy} text-anchor={l.anchor} dominant-baseline="central" font-size={radius * 0.62}>{p.name}</text>
      {@render over?.(id)}
    </g>
  </g>
{/each}

<style>
  /* Nothing drawn here takes a tap: a tap on a river hex must reach the control beneath, and the table's port chooser re-enables its own hit area. */
  .river-bank,
  .river,
  .cataract,
  .drainage,
  .river-name,
  .port {
    pointer-events: none;
  }
  .river-bank {
    fill: none;
    stroke: #efe6cc;
    stroke-width: calc(var(--r) * 0.34);
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .river {
    fill: none;
    stroke: #2d72c9;
    stroke-width: calc(var(--r) * 0.16);
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .river.chosen {
    stroke: #8fc4ff;
    stroke-width: calc(var(--r) * 0.26);
  }
  .hatch-bank {
    stroke: #efe6cc;
    stroke-width: calc(var(--r) * 0.22);
    stroke-linecap: round;
  }
  .hatch {
    stroke: #2d72c9;
    stroke-width: calc(var(--r) * 0.1);
    stroke-linecap: round;
  }
  .drainage {
    fill: #1c2a2e;
    text-anchor: middle;
    dominant-baseline: central;
    font-family: 'Nile Sans', 'DejaVu Sans', sans-serif;
    font-weight: 700;
    paint-order: stroke;
    stroke: #efe6cc;
    stroke-width: 3px;
    stroke-linejoin: round;
  }
  .river-name {
    fill: #2d72c9;
    dominant-baseline: central;
    font-family: 'Nile Sans', 'DejaVu Sans', sans-serif;
    font-weight: 700;
    font-style: italic;
    paint-order: stroke;
    stroke: #efe6cc;
    stroke-width: 3px;
    stroke-linejoin: round;
  }
  .mark {
    fill: #6b3a2c;
    stroke: #efe6cc;
    stroke-width: 1;
  }
  .label {
    fill: #1c2a2e;
    font-family: 'Nile Sans', 'DejaVu Sans', sans-serif;
    font-weight: 600;
    paint-order: stroke;
    stroke: #efe6cc;
    stroke-width: 3px;
    stroke-linejoin: round;
  }
</style>
