<script lang="ts">
  // The shared map. Pointy-top hexes in the board's own orientation (north up); on a landscape
  // table the whole board is turned so north points to the left edge, because Africa is taller
  // than it is wide and hexes must stay touch-sized. Symbols and labels are kept upright for the
  // bottom seat; every seat reads the same omnidirectional iconography.
  import { BOARD, LAND_HEXES, PORTS, RIVERS, hexAt, riverMouths, type BoardHex, type PortId, type River } from './manifest';
  import { hexPoints, toPixel, type HexId } from './hex';

  import { colourFor } from '$features/explorers/colours';
  import type { MappedHex } from '$lib/game/state';
  import type { MoveTarget } from '$features/exploration/reducer';

  export interface BoardToken {
    seat: string;
    hex: HexId;
  }
  export interface PortChoice {
    /** 'ticket': a free ticket pays; 'cash': the $500 fare; 'none': unaffordable. */
    fare: 'ticket' | 'cash' | 'none';
  }

  interface Props {
    width: number;
    height: number;
    /** Explorer tokens standing on hexes. */
    tokens?: BoardToken[];
    /** When set, the ports become a chooser (sailing from Europe). */
    portChoices?: Partial<Record<PortId, PortChoice>> | null;
    onport?: (port: PortId) => void;
    /** Hexes mapped in play, drawn over the blank board, with their markers. */
    mapped?: Record<string, MappedHex>;
    /** Hexes the current expedition may step into. */
    targets?: MoveTarget[];
    onhex?: (hex: HexId) => void;
  }
  let { width, height, tokens = [], portChoices = null, onport, mapped = {}, targets = [], onhex }: Props = $props();
  const terrainFor = (h: BoardHex) => mapped[h.id]?.terrain ?? h.terrain;

  const SQ3 = Math.sqrt(3);
  const extents = (() => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const h of LAND_HEXES) {
      const { x, y } = toPixel(h, 1);
      minX = Math.min(minX, x - SQ3 / 2);
      maxX = Math.max(maxX, x + SQ3 / 2);
      minY = Math.min(minY, y - 1);
      maxY = Math.max(maxY, y + 1);
    }
    return { minX, minY, w: maxX - minX, h: maxY - minY };
  })();

  const rotated = $derived(width > height);
  const radius = $derived(rotated ? Math.min(width / extents.h, height / extents.w) : Math.min(width / extents.w, height / extents.h));
  const natW = $derived(extents.w * radius);
  const natH = $derived(extents.h * radius);
  const svgW = $derived(rotated ? natH : natW);
  const svgH = $derived(rotated ? natW : natH);
  const transform = $derived(rotated ? `translate(0 ${natW}) rotate(-90)` : '');
  const upright = $derived(rotated ? 'rotate(90)' : '');

  function centre(h: BoardHex | HexId) {
    const hex = typeof h === 'string' ? hexAt(h)! : h;
    const p = toPixel(hex, radius);
    return { x: p.x - extents.minX * radius, y: p.y - extents.minY * radius };
  }

  /** A river as a polyline through hex centres, extended past a mouth (or the board edge) into the sea. */
  function riverPoints(r: River): string {
    const pts = r.path.map((id) => centre(id));
    if (!r.joins && pts.length > 1) {
      const [m, n] = pts;
      const dx = m.x - n.x, dy = m.y - n.y;
      const len = Math.hypot(dx, dy) || 1;
      pts.unshift({ x: m.x + (dx / len) * radius * 0.95, y: m.y + (dy / len) * radius * 0.95 });
    }
    if (r.continuesOffMap && pts.length > 1) {
      const e = pts[pts.length - 1], p = pts[pts.length - 2];
      const dx = e.x - p.x, dy = e.y - p.y;
      const len = Math.hypot(dx, dy) || 1;
      pts.push({ x: e.x + (dx / len) * radius * 0.95, y: e.y + (dy / len) * radius * 0.95 });
    }
    return pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  }

  /** Where the drainage number sits: just seaward of the mouth. */
  function mouthLabel(r: River) {
    const m = centre(r.path[0]);
    const n = centre(r.path[1]);
    const dx = m.x - n.x, dy = m.y - n.y;
    const len = Math.hypot(dx, dy) || 1;
    return { x: m.x + (dx / len) * radius * 1.15 + (dy / len) * radius * 0.9, y: m.y + (dy / len) * radius * 1.15 - (dx / len) * radius * 0.9 };
  }

  /** Unit vector from a hex centre toward the midpoint of the edge in direction d (pointy-top). */
  const EDGE: Record<number, [number, number]> = { 1: [0.5, -0.866], 2: [1, 0], 3: [0.5, 0.866], 4: [-0.5, 0.866], 5: [-1, 0], 6: [-0.5, -0.866] };
  function segment(c: { x: number; y: number }, d: number): string {
    const [ux, uy] = EDGE[d];
    const k = radius * 0.87;
    return `${c.x.toFixed(1)},${c.y.toFixed(1)} ${(c.x + ux * k).toFixed(1)},${(c.y + uy * k).toFixed(1)}`;
  }

  const symbolFor: Record<string, string[]> = {
    desert: [],
    veldt: ['veldt'],
    swamp: ['swamp'],
    mountain: ['mountain'],
    jungle: ['jungle'],
    lake: [],
    'jungle-swamp': ['jungle', 'swamp'],
    'jungle-mountain': ['jungle', 'mountain']
  };
</script>

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
  <defs>
    <!-- Terrain symbols in units of the hex radius, centred on the origin. Original iconography. -->
    <g id="sym-mountain" class="sym mountain"><path d="M-0.5 0.36 L0 -0.42 L0.5 0.36" /></g>
    <g id="sym-veldt" class="sym veldt"><path d="M-0.5 -0.32 L-0.26 0.36 L0 -0.12 L0.26 0.36 L0.5 -0.32" /></g>
    <g id="sym-swamp" class="sym swamp"><path d="M-0.42 0.38 H0.42 M0 0.38 V-0.42 M-0.24 0.38 L-0.3 -0.22 M0.24 0.38 L0.3 -0.22" /></g>
    <g id="sym-jungle" class="sym jungle"><polygon points={hexPoints(0, 0, 0.74)} /></g>
  </defs>
  <g {transform}>
    {#each LAND_HEXES as h (h.id)}
      {@const c = centre(h)}
      {@const t = terrainFor(h)}
      <polygon
        data-testid="hex-{h.id}"
        data-col={h.col}
        data-row={h.row}
        data-terrain={t ?? 'blank'}
        data-mapped={h.id in mapped}
        class="hex {t ?? 'blank'}"
        class:explored={h.id in mapped}
        points={hexPoints(c.x, c.y, radius * 0.96)}
      />
    {/each}
    {#each LAND_HEXES as h (h.id)}
      {@const t = terrainFor(h)}
      {#if t && symbolFor[t].length}
        {@const c = centre(h)}
        <g data-testid="terrain-{h.id}" data-terrain={t} aria-label={t} transform="translate({c.x} {c.y}) {upright} scale({radius})">
          {#each symbolFor[t] as sym (sym)}
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
            <g class="cataract" data-testid="cataract-{id}" transform="translate({c.x} {c.y}) {upright} scale({radius})">
              <circle r="0.34" /><path d="M-0.2 -0.08 H0.2 M-0.2 0.08 H0.2" />
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
        data-testid="move-target-{t.hex}"
        data-unknown={t.unknown}
        data-mode={t.mode}
        data-cost={t.cost}
        aria-label="Move to {t.hex} {t.mode}, {t.cost} movement point{t.cost === 1 ? '' : 's'}{t.unknown ? ' (unknown: risk of becoming lost)' : ''}"
        onclick={() => onhex?.(t.hex)}
        onkeydown={(e) => e.key === 'Enter' && onhex?.(t.hex)}
      />
    {/each}
    {#each RIVERS as r (r.id)}
      <polyline data-testid="river-{r.id}" class="river-bank" points={riverPoints(r)} />
      <polyline class="river" aria-label="River {r.name}" points={riverPoints(r)} />
    {/each}
    {#each RIVERS as r (r.id)}
      {#each r.cataracts as id (id)}
        {@const c = centre(id)}
        <g data-testid="cataract-{id}" class="cataract" aria-label="Cataract on the {r.name}" transform="translate({c.x} {c.y}) {upright} scale({radius})">
          <circle r="0.34" />
          <path d="M-0.2 -0.08 H0.2 M-0.2 0.08 H0.2" />
        </g>
      {/each}
    {/each}
    {#each riverMouths() as { river } (river.id)}
      {@const p = mouthLabel(river)}
      <text data-testid="drainage-{river.id}" class="drainage" aria-label="{river.name} drains at least {river.drainage} hexes" transform="translate({p.x} {p.y}) {upright}" font-size={radius * 0.8}>{river.drainage}</text>
    {/each}
    {#each PORTS as p (p.id)}
      {@const c = centre(BOARD.hexes[p.hex])}
      {@const choice = portChoices?.[p.id]}
      <g data-testid="port-{p.id}" class="port" class:choosable={Boolean(choice)} data-fare={choice?.fare} aria-label="Port of entry: {p.name}" transform="translate({c.x} {c.y}) {upright}">
        {#if choice}
          <circle class="halo" class:none={choice.fare === 'none'} r={radius * 1.15} />
        {/if}
        <circle r={radius * 0.48} />
        <g class="anchor" transform="scale({radius / 28}) translate(-12 -12)">
          <circle cx="12" cy="5" r="3" />
          <line x1="12" y1="22" x2="12" y2="8" />
          <path d="M5 12H2a10 10 0 0 0 20 0h-3" />
        </g>
        <text class="label" y={radius * 1.25} font-size={radius * 0.62}>{p.name}</text>
        {#if choice}
          <g class="fare" transform="translate(0 {-radius * 0.95})">
            {#if choice.fare === 'ticket'}
              <rect x={-radius * 0.55} y={-radius * 0.32} width={radius * 1.1} height={radius * 0.64} rx={radius * 0.12} class="ticket" />
              <path d="M{-radius * 0.15} {-radius * 0.22} V{radius * 0.22}" class="ticket-perf" />
            {:else}
              <text class="fare-text" font-size={radius * 0.6} dominant-baseline="central">{choice.fare === 'cash' ? '$500' : '✕'}</text>
            {/if}
          </g>
          <circle
            class="hit"
            r={radius * 1.2}
            role="button"
            tabindex="0"
            data-testid="choose-port-{p.id}"
            aria-disabled={choice.fare === 'none'}
            aria-label="Sail to {p.name}{choice.fare === 'ticket' ? ' with a free ticket' : choice.fare === 'cash' ? ' for $500' : ': cannot afford passage'}"
            onclick={() => choice.fare !== 'none' && onport?.(p.id)}
            onkeydown={(e) => e.key === 'Enter' && choice.fare !== 'none' && onport?.(p.id)}
          />
        {/if}
      </g>
    {/each}
    {#each tokens as t (t.seat)}
      {@const c = centre(t.hex)}
      <g data-testid="board-token-{t.seat}" data-hex={t.hex} class="token" aria-label="Explorer of seat {t.seat} at {t.hex}" transform="translate({c.x} {c.y})">
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
  .sym {
    fill: none;
    stroke-width: 0.14;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .sym.mountain {
    stroke: #6b3a2c;
  }
  .sym.veldt,
  .sym.swamp {
    stroke: #3f8a3f;
  }
  .sym.jungle {
    stroke: #3f8a3f;
    stroke-width: 0.12;
  }
  /* Rivers, cataracts and heights are drawn over the targets; a tap on a river hex must still reach its target. */
  .river-bank,
  .river,
  .cataract,
  .drainage,
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
  .cataract circle {
    fill: #2d72c9;
  }
  .cataract path {
    fill: none;
    stroke: #efe6cc;
    stroke-width: 0.07;
    stroke-linecap: round;
  }
  .drainage {
    fill: #1c2a2e;
    text-anchor: middle;
    dominant-baseline: central;
    font-family: system-ui, sans-serif;
    font-weight: 700;
    paint-order: stroke;
    stroke: #efe6cc;
    stroke-width: 3px;
    stroke-linejoin: round;
  }
  .port > circle:not(.halo):not(.hit) {
    fill: #1c2a2e;
  }
  .halo {
    fill: #c9a24a;
    opacity: 0.85;
  }
  .halo.none {
    fill: #777;
    opacity: 0.4;
  }
  .hit {
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
    font-family: system-ui, sans-serif;
    font-weight: 700;
    paint-order: stroke;
    stroke: #efe6cc;
    stroke-width: 3px;
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
    font-family: system-ui, sans-serif;
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
  .marker {
    stroke: #efe6cc;
    stroke-width: 1;
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
    font-family: system-ui, sans-serif;
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
  .anchor {
    fill: none;
    stroke: #e8d8b0;
    stroke-width: 2.5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .label {
    fill: #1c2a2e;
    text-anchor: middle;
    font-family: system-ui, sans-serif;
    font-weight: 600;
    paint-order: stroke;
    stroke: #efe6cc;
    stroke-width: 3px;
    stroke-linejoin: round;
  }
</style>
