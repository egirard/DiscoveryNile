<script lang="ts">
  // The shared map. Pointy-top hexes in the board's own orientation (north up); on a landscape
  // table the whole board is turned so north points to the left edge, because Africa is taller
  // than it is wide and hexes must stay touch-sized. Symbols and labels are kept upright for the
  // bottom seat; every seat reads the same omnidirectional iconography.
  // The symbols, rivers, cataracts, ports and names are drawn by the parts shared with the map editor (art.ts,
  // TerrainSymbols, BoardFeatures; PROMPTS.md, prompt 52), so the table and the editor show the same map.
  import { BOARD, LAND_HEXES, hexAt, type BoardHex, type PortId } from './manifest';
  import { DIRECTIONS, hexPoints, parseHexId, type HexId } from './hex';
  import rawBoard from './board.json';
  import type { RawBoard } from './editor';
  import { EDGE, HATCH, SYMBOLS, bearing, centreIn, extentsOf, hatchAcross, portLabel } from './art';
  import TerrainSymbols from './TerrainSymbols.svelte';
  import BoardFeatures from './BoardFeatures.svelte';

  import { colourFor } from '$features/explorers/colours';
  import type { MappedHex, Cache } from '$lib/game/state';
  import type { MoveTarget } from '$features/exploration/reducer';

  export interface BoardToken {
    seat: string;
    hex: HexId;
  }
  export interface PortChoice {
    /** 'ticket': a free ticket pays; 'cash': the $500 fare; 'none': unaffordable. */
    fare: 'ticket' | 'cash' | 'none';
    /** The port tapped, awaiting the confirmation at the rail (prompt 17). */
    selected?: boolean;
  }

  interface Props {
    width: number;
    height: number;
    /** The touch target in px: a chooser on the board is never smaller, whatever the hex size. */
    touch?: number;
    /** Explorer tokens standing on hexes. */
    tokens?: BoardToken[];
    /** When set, the ports become a chooser (sailing from Europe). */
    portChoices?: Partial<Record<PortId, PortChoice>> | null;
    onport?: (port: PortId) => void;
    /** Hexes mapped in play, drawn over the blank board, with their markers. */
    mapped?: Record<string, MappedHex>;
    /** Hexes the current expedition may step into. */
    targets?: MoveTarget[];
    /** Cache markers left on the board (rules §5). */
    caches?: Cache[];
    onhex?: (hex: HexId) => void;
    /** Hexes the explorer in Europe may publish now (rules §12): a tap claims one. */
    publishable?: HexId[];
    onpublish?: (hex: HexId) => void;
  }
  let { width, height, touch = 44, tokens = [], portChoices = null, onport, mapped = {}, targets = [], caches = [], onhex, publishable = [], onpublish }: Props = $props();
  const terrainFor = (h: BoardHex) => mapped[h.id]?.terrain ?? h.terrain;

  /** The window shown: the land's bounding box with an unmarked margin around it for the names at the coast (prompt 53). */
  const extents = extentsOf(LAND_HEXES);

  const rotated = $derived(width > height);
  const radius = $derived(rotated ? Math.min(width / extents.h, height / extents.w) : Math.min(width / extents.w, height / extents.h));
  const natW = $derived(extents.w * radius);
  const natH = $derived(extents.h * radius);
  const svgW = $derived(rotated ? natH : natW);
  const svgH = $derived(rotated ? natW : natH);
  const transform = $derived(rotated ? `translate(0 ${natW}) rotate(-90)` : '');
  const upright = $derived(rotated ? 'rotate(90)' : '');

  /** The centre of a hex, land or (for a river's reach) the sea beside it. */
  function centre(h: BoardHex | HexId | string) {
    const hex = typeof h === 'string' ? (hexAt(h) ?? parseHexId(h)!) : h;
    return centreIn(extents, radius, hex);
  }

  /** The compass (PROMPTS.md, prompt 20): a hex with the six directions numbered as the dice give them (hex.ts),
   *  in the sea off Capetown, where every seat can read it when the terrain's direction is rolled. */
  const compass = $derived.by(() => {
    const c = centre(BOARD.ports.capetown.hex);
    return { x: c.x - Math.sqrt(3) * radius * 6, y: c.y + radius * 0.75 };
  });
  function segment(c: { x: number; y: number }, d: number): string {
    const [ux, uy] = EDGE[d];
    const k = radius * 0.87;
    return `${c.x.toFixed(1)},${c.y.toFixed(1)} ${(c.x + ux * k).toFixed(1)},${(c.y + uy * k).toFixed(1)}`;
  }

  /** The fare of a port chooser sits on the side of the port its name does not take: below a name above, else above. */
  const fareDy = (id: PortId) => (portLabel(rawBoard as RawBoard, id, BOARD.ports[id].hex, rotated).y < -0.3 ? 1.1 : -0.95);
  /** The chooser's state on a port's group, for the scenarios and the styles. */
  const portAttrs = (id: string) => {
    const choice = portChoices?.[id as PortId];
    return { 'data-choosable': choice ? 'true' : undefined, 'data-fare': choice?.fare, 'data-selected': choice ? String(Boolean(choice.selected)) : undefined };
  };

</script>

{#snippet under(id: string)}
  {@const choice = portChoices?.[id as PortId]}
  {#if choice}
    <circle class="halo" class:none={choice.fare === 'none'} class:selected={choice.selected} r={radius * (choice.selected ? 1.45 : 1.15)} />
  {/if}
{/snippet}
{#snippet over(id: string)}
  {@const p = BOARD.ports[id as PortId]}
  {@const choice = portChoices?.[id as PortId]}
  {#if choice}
    <g class="fare" transform="translate(0 {radius * fareDy(p.id)})">
      {#if choice.fare === 'ticket'}
        <rect x={-radius * 0.55} y={-radius * 0.32} width={radius * 1.1} height={radius * 0.64} rx={radius * 0.12} class="ticket" />
        <path d="M{-radius * 0.15} {-radius * 0.22} V{radius * 0.22}" class="ticket-perf" />
      {:else}
        <text class="fare-text" font-size={radius * 0.6} dominant-baseline="central">{choice.fare === 'cash' ? '$500' : '✕'}</text>
      {/if}
    </g>
    <circle
      class="hit"
      r={Math.max(radius * 1.2, touch / 2)}
      role="button"
      tabindex="0"
      data-testid="choose-port-{p.id}"
      aria-disabled={choice.fare === 'none'}
      aria-label="Sail to {p.name}{choice.fare === 'ticket' ? ' with a free ticket' : choice.fare === 'cash' ? ' for $500' : ': cannot afford passage'}"
      onclick={() => choice.fare !== 'none' && onport?.(p.id)}
      onkeydown={(e) => e.key === 'Enter' && choice.fare !== 'none' && onport?.(p.id)}
    />
  {/if}
{/snippet}

<svg
  data-testid="hex-grid"
  data-e2e-fit
  data-rotated={rotated}
  width={svgW}
  height={svgH}
  viewBox="0 0 {svgW} {svgH}"
  role="img"
  aria-label="Map of Africa"
  style="--r:{radius}px"
>
  <TerrainSymbols />
  <g {transform}>
    {#each LAND_HEXES as h (h.id)}
      {@const c = centre(h)}
      {@const t = terrainFor(h)}
      <polygon
        data-testid="hex-{h.id}"
        data-port={h.port}
        data-col={h.col}
        data-row={h.row}
        data-terrain={t ?? 'blank'}
        data-mapped={h.id in mapped}
        data-published={mapped[h.id]?.publishedBy ?? undefined}
        class="hex {t ?? 'blank'}"
        class:explored={h.id in mapped}
        class:published={Boolean(mapped[h.id]?.publishedBy)}
        points={hexPoints(c.x, c.y, radius * 0.96)}
      />
    {/each}
    {#each LAND_HEXES as h (h.id)}
      {@const t = terrainFor(h)}
      {#if t && SYMBOLS[t].length}
        {@const c = centre(h)}
        <g data-testid="terrain-{h.id}" data-terrain={t} aria-label={t} transform="translate({c.x} {c.y}) {upright} scale({radius})">
          {#each SYMBOLS[t] as sym (sym)}
            <use href="#sym-{sym}" />
          {/each}
        </g>
      {/if}
    {/each}
    {#each Object.entries(mapped) as [id, m] (id)}
      {@const c = centre(id as HexId)}
      {#if m.river}
        <g data-testid="course-{id}" class="course" data-in={m.river.in.join(',')} data-out={m.river.out ?? ''} data-source={m.river.source} data-cataract={m.river.cataract}>
          {#each [...m.river.in, ...(m.river.out !== null ? [m.river.out] : [])] as d (d)}
            <polyline class="river-bank" points={segment(c, d)} />
            <polyline class="river" points={segment(c, d)} />
          {/each}
          {#if m.river.source}
            <circle class="source" cx={c.x} cy={c.y} r={radius * 0.22} />
          {/if}
          {#if m.river.cataract}
            <!-- A single hatch across the course (prompt 52): perpendicular to the way in and out. -->
            {@const h = hatchAcross(m.river.in.length ? { x: c.x + EDGE[m.river.in[0]][0], y: c.y + EDGE[m.river.in[0]][1] } : null, c, m.river.out !== null ? { x: c.x + EDGE[m.river.out][0], y: c.y + EDGE[m.river.out][1] } : null)}
            <g class="cataract" data-testid="cataract-{id}" data-across="{h.x.toFixed(2)},{h.y.toFixed(2)}">
              <line class="hatch-bank" x1={c.x - h.x * HATCH * radius} y1={c.y - h.y * HATCH * radius} x2={c.x + h.x * HATCH * radius} y2={c.y + h.y * HATCH * radius} />
              <line class="hatch" x1={c.x - h.x * HATCH * radius} y1={c.y - h.y * HATCH * radius} x2={c.x + h.x * HATCH * radius} y2={c.y + h.y * HATCH * radius} />
            </g>
          {/if}
          {#if m.river.waterfallFeet}
            <text class="height blue" data-testid="waterfall-{id}" transform="translate({c.x} {c.y + radius * 0.95}) {upright}" font-size={radius * 0.5}>{m.river.waterfallFeet}</text>
          {/if}
        </g>
      {/if}
      {#if m.oasis}
        <circle data-testid="oasis-{id}" class="oasis" cx={c.x} cy={c.y} r={radius * 0.24} />
      {/if}
      {#if m.peakFeet}
        <text class="height brown" data-testid="peak-{id}" transform="translate({c.x} {c.y - radius * 0.7}) {upright}" font-size={radius * 0.5}>{m.peakFeet / 100}</text>
      {/if}
      {#if m.tribe != null}
        {@const c = centre(id as HexId)}
        <g class="tribe" data-testid="tribe-{id}" data-tribe={m.tribe} transform="translate({c.x} {c.y - radius * 0.55}) {upright}" aria-label="Tribe {m.tribe}">
          <circle r={radius * 0.3} />
          <text font-size={radius * 0.4}>{m.tribe}</text>
        </g>
      {/if}
      {#if m.markers.length}
        {@const c = centre(id as HexId)}
        <g class="markers" transform="translate({c.x} {c.y}) {upright}">
          {#each m.markers as seat, i (seat)}
            <circle data-testid="marker-{id}-{seat}" class="marker" r={radius * 0.16} cx={(i - (m.markers.length - 1) / 2) * radius * 0.36} cy={radius * 0.62} fill={colourFor(seat)} />
          {/each}
        </g>
      {/if}
    {/each}
    {#each caches as cache (cache.id)}
      {@const c = centre(cache.hex)}
      <g class="cache" data-testid="cache-{cache.hex}-{cache.seat}" data-cache={cache.id} transform="translate({c.x + radius * 0.55} {c.y - radius * 0.55}) {upright}" aria-label="Cache of seat {cache.seat}">
        <rect x={-radius * 0.22} y={-radius * 0.22} width={radius * 0.44} height={radius * 0.44} rx={radius * 0.06} fill={colourFor(cache.seat)} />
        <path d={`M${-radius * 0.12} 0 H${radius * 0.12}`} />
      </g>
    {/each}
    {#each targets as t (t.hex)}
      {@const c = centre(t.hex)}
      <circle
        class="target"
        class:unknown={t.unknown}
        r={radius * 0.98}
        cx={c.x}
        cy={c.y}
        role="button"
        tabindex="0"
        data-e2e-hex-sized
        data-testid="move-target-{t.hex}"
        data-unknown={t.unknown}
        data-mode={t.mode}
        data-cost={t.cost}
        aria-label="Move to {t.hex} {t.mode}, {t.cost} movement point{t.cost === 1 ? '' : 's'}{t.unknown ? ' (unknown: risk of becoming lost)' : ''}"
        onclick={() => onhex?.(t.hex)}
        onkeydown={(e) => e.key === 'Enter' && onhex?.(t.hex)}
      />
    {/each}
    {#each publishable as hex (hex)}
      {@const c = centre(hex)}
      <circle
        class="target publish"
        r={radius * 0.98}
        cx={c.x}
        cy={c.y}
        role="button"
        tabindex="0"
        data-e2e-hex-sized
        data-testid="publish-target-{hex}"
        aria-label="Publish {hex}"
        onclick={() => onpublish?.(hex)}
        onkeydown={(e) => e.key === 'Enter' && onpublish?.(hex)}
      />
    {/each}
    <BoardFeatures board={rawBoard as RawBoard} {centre} {radius} {upright} {rotated} {under} {over} {portAttrs} />
    <g class="compass" data-testid="compass" role="img" aria-label="Compass: the directions 1 to 6 around a hex, as a die gives them" transform="translate({compass.x} {compass.y})">
      <polygon class="rose" points={hexPoints(0, 0, radius * 1.1)} />
      {#each DIRECTIONS as d (d)}
        <line class="spoke" x1={Math.cos(bearing(d)) * radius * 0.5} y1={Math.sin(bearing(d)) * radius * 0.5} x2={Math.cos(bearing(d)) * radius * 1.35} y2={Math.sin(bearing(d)) * radius * 1.35} />
        <text class="direction" data-testid="compass-{d}" transform="translate({Math.cos(bearing(d)) * radius * 1.95} {Math.sin(bearing(d)) * radius * 1.95}) {upright}" font-size={radius * 0.85}>{d}</text>
      {/each}
    </g>
    {#each tokens as t (t.seat)}
      {@const c = centre(t.hex)}
      {@const sharing = tokens.filter((o) => o.hex === t.hex)}
      {@const k = sharing.findIndex((o) => o.seat === t.seat)}
      {@const dx = sharing.length > 1 ? (k - (sharing.length - 1) / 2) * radius * 0.5 : 0}
      <!-- Explorers sharing a hex (a joint expedition, or a meeting) sit side by side. -->
      <g data-testid="board-token-{t.seat}" data-hex={t.hex} data-shared={sharing.length > 1} class="token" aria-label="Explorer of seat {t.seat} at {t.hex}" transform="translate({c.x + dx} {c.y})">
        <circle r={radius * 0.42} fill={colourFor(t.seat)} />
      </g>
    {/each}
  </g>
</svg>

<style>
  svg {
    display: block;
    pointer-events: auto;
    overflow: visible;
  }
  .hex {
    fill: #efe6cc;
    stroke: #6f9663;
    stroke-width: 1;
  }
  .hex.desert {
    fill: #a8614a;
    stroke: #6b3a2c;
  }
  .hex.lake {
    fill: #3f86c9;
    stroke: #2b5f94;
  }
  /* Courses mapped in play, their cataracts and heights are drawn over the targets; a tap on a river hex must still reach its target. */
  .course,
  .cataract,
  .height {
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
  .halo {
    fill: #c9a24a;
    opacity: 0.85;
  }
  .halo.none {
    fill: #777;
    opacity: 0.4;
  }
  .halo.selected {
    /* The port tapped: a wider, solid halo until the rail confirms or the chooser closes. */
    opacity: 1;
    stroke: #efe6cc;
    stroke-width: 3px;
  }
  .hit {
    /* The one part of a port that takes a tap, while it is a chooser (BoardFeatures draws the rest without). */
    pointer-events: auto;
    fill: transparent;
    cursor: pointer;
  }
  .fare .ticket {
    fill: #d7e6c4;
    stroke: #1c2a2e;
    stroke-width: 1;
  }
  .fare .ticket-perf {
    stroke: #1c2a2e;
    stroke-width: 1;
    stroke-dasharray: 2 2;
  }
  .fare-text {
    fill: #1c2a2e;
    text-anchor: middle;
    font-family: 'Nile Sans', 'DejaVu Sans', sans-serif;
    font-weight: 700;
    paint-order: stroke;
    stroke: #efe6cc;
    stroke-width: 3px;
  }
  /* Tokens sit over the targets; a tap on a hex another explorer stands in must still reach its target. */
  .token {
    pointer-events: none;
  }
  .token circle {
    stroke: #efe6cc;
    stroke-width: 2;
  }
  .source {
    fill: #2d72c9;
    stroke: #efe6cc;
    stroke-width: 1;
  }
  .oasis {
    fill: #2d72c9;
    stroke: #efe6cc;
    stroke-width: 1.5;
  }
  .height {
    text-anchor: middle;
    dominant-baseline: central;
    font-family: 'Nile Sans', 'DejaVu Sans', sans-serif;
    font-weight: 700;
    paint-order: stroke;
    stroke: #efe6cc;
    stroke-width: 2px;
  }
  .height.blue {
    fill: #2d72c9;
  }
  .height.brown {
    fill: #6b3a2c;
  }
  .hex.explored {
    stroke: #1c2a2e;
    stroke-width: 1.4;
  }
  /* A published hex is inked for good: a heavier outline than a hex still only claimed by markers. */
  .hex.published {
    stroke-width: 3;
  }
  .marker {
    stroke: #efe6cc;
    stroke-width: 1;
  }
  .cache rect {
    stroke: #efe6cc;
    stroke-width: 1.2;
  }
  .cache path {
    stroke: #efe6cc;
    stroke-width: 1.2;
  }
  .tribe circle {
    fill: #1c2a2e;
    stroke: #efe6cc;
    stroke-width: 1.5;
  }
  .tribe text {
    fill: #efe6cc;
    text-anchor: middle;
    dominant-baseline: central;
    font-family: 'Nile Sans', 'DejaVu Sans', sans-serif;
    font-weight: 700;
  }
  .target {
    fill: #c9a24a;
    fill-opacity: 0.35;
    stroke: #c9a24a;
    stroke-width: 2;
    cursor: pointer;
  }
  .target.unknown {
    stroke-dasharray: 4 3;
  }
  .target.publish {
    fill: #efe6cc;
    fill-opacity: 0.5;
    stroke: #1c2a2e;
    stroke-width: 3;
  }
  .compass .rose {
    fill: rgba(239, 230, 204, 0.08);
    stroke: #efe6cc;
    stroke-width: calc(var(--r) * 0.1);
    opacity: 0.9;
  }
  .compass .spoke {
    stroke: #efe6cc;
    stroke-width: calc(var(--r) * 0.08);
    stroke-linecap: round;
    opacity: 0.7;
  }
  .compass .direction {
    fill: #efe6cc;
    font-family: 'Nile Sans', 'DejaVu Sans', sans-serif;
    font-weight: 700;
    text-anchor: middle;
    dominant-baseline: central;
  }
</style>
