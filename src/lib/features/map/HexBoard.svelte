<script lang="ts">
  // The shared map. Pointy-top hexes in the board's own orientation (north up); on a landscape
  // table the whole board is turned so north points to the left edge, because Africa is taller
  // than it is wide and hexes must stay touch-sized.
  import { BOARD, LAND_HEXES, PORTS, type BoardHex } from './manifest';
  import { hexPoints, toPixel } from './hex';

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

  function centre(h: BoardHex) {
    const p = toPixel(h, radius);
    return { x: p.x - extents.minX * radius, y: p.y - extents.minY * radius };
  }
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
  <g {transform}>
    {#each LAND_HEXES as h (h.id)}
      {@const c = centre(h)}
      <polygon
        data-testid="hex-{h.id}"
        data-col={h.col}
        data-row={h.row}
        data-terrain={h.terrain ?? 'blank'}
        class="hex"
        points={hexPoints(c.x, c.y, radius * 0.96)}
      />
    {/each}
    {#each PORTS as p (p.id)}
      {@const c = centre(BOARD.hexes[p.hex])}
      <g data-testid="port-{p.id}" class="port" aria-label="Port of entry: {p.name}" transform="translate({c.x} {c.y}) rotate({rotated ? 90 : 0})">
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
