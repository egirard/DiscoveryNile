<script lang="ts">
  // The shared map. Pointy-top hexes in the board's own orientation (north up); on a landscape
  // table the whole board is turned so north points to the left edge, because Africa is taller
  // than it is wide and hexes must stay touch-sized. Symbols and labels are kept upright for the
  // bottom seat; every seat reads the same omnidirectional iconography.
  import { BOARD, LAND_HEXES, PORTS, RIVERS, hexAt, riverMouths, type BoardHex, type River } from './manifest';
  import { hexPoints, toPixel, type HexId } from './hex';

  interface Props {
    width: number;
    height: number;
  }
  let { width, height }: Props = $props();

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
      <polygon
        data-testid="hex-{h.id}"
        data-col={h.col}
        data-row={h.row}
        data-terrain={h.terrain ?? 'blank'}
        class="hex {h.terrain ?? 'blank'}"
        points={hexPoints(c.x, c.y, radius * 0.96)}
      />
    {/each}
    {#each LAND_HEXES as h (h.id)}
      {#if h.terrain && symbolFor[h.terrain].length}
        {@const c = centre(h)}
        <g data-testid="terrain-{h.id}" data-terrain={h.terrain} aria-label={h.terrain} transform="translate({c.x} {c.y}) {upright} scale({radius})">
          {#each symbolFor[h.terrain] as sym (sym)}
            <use href="#sym-{sym}" />
          {/each}
        </g>
      {/if}
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
      <g data-testid="port-{p.id}" class="port" aria-label="Port of entry: {p.name}" transform="translate({c.x} {c.y}) {upright}">
        <circle r={radius * 0.48} />
        <g class="anchor" transform="scale({radius / 28}) translate(-12 -12)">
          <circle cx="12" cy="5" r="3" />
          <line x1="12" y1="22" x2="12" y2="8" />
          <path d="M5 12H2a10 10 0 0 0 20 0h-3" />
        </g>
        <text class="label" y={radius * 1.25} font-size={radius * 0.62}>{p.name}</text>
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
  .port circle:first-child {
    fill: #1c2a2e;
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
