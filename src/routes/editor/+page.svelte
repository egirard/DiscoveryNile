<script lang="ts">
  // The map editor (PROMPTS.md, prompt 47): a tool of its own at /editor/, for the developer, not the table. The board
  // was transcribed from a photograph (tools/mapfit, RQ-5) and some hexes were misread; here every hex of the grid is
  // drawn north up, a brush is chosen and tapped onto hexes, the changes are listed, and Save sends the whole board to
  // the diagnostics capture server as a `save` command, which writes board.json in the source tree. The dev server then
  // offers the table its reload. Without a capture server (the hosted build) the editor only shows the board.
  import { onMount } from 'svelte';
  import rawBoard from '$features/map/board.json';
  import { BRUSHES, brushAt, changesBetween, counts, paint, type Brush, type HexChange, type RawBoard } from '$features/map/editor';
  import { hexId, hexPoints, parseHexId, toPixel, type HexId } from '$features/map/hex';
  import { serverUrlFrom } from '$lib/diagnostics/diag';

  const SESSION = 'map-editor';
  const clone = (b: RawBoard): RawBoard => JSON.parse(JSON.stringify(b)) as RawBoard;

  let saved = $state<RawBoard>(clone(rawBoard as RawBoard));
  let working = $state<RawBoard>(clone(rawBoard as RawBoard));
  let brush = $state<Brush | null>(null);
  let selected = $state<HexId | null>(null);
  let server = $state<string | null>(null);
  let message = $state('');
  let status = $state<'synced' | 'edited' | 'saving' | 'failed'>('synced');
  let paneW = $state(0);
  let paneH = $state(0);
  let zoom = $state(1);

  onMount(() => {
    server = serverUrlFrom(location.search);
  });

  const changes = $derived(changesBetween(saved, working));
  const tally = $derived(counts(working));
  const selectedHex = $derived(selected ? working.hexes[selected] : undefined);

  // The grid north up: every hex of cols × rows, sea or land, sized to the pane.
  const SQ3 = Math.sqrt(3);
  const gridW = $derived(SQ3 * (working.cols + 0.5));
  const gridH = $derived(1.5 * working.rows + 0.5);
  const radius = $derived(Math.max(4, Math.min(paneW / gridW, paneH / gridH)) * zoom);
  const svgW = $derived(gridW * radius);
  const svgH = $derived(gridH * radius);
  function centre(col: number, row: number) {
    const p = toPixel({ col, row }, radius);
    return { x: p.x + (SQ3 / 2) * radius, y: p.y + radius };
  }
  const grid = $derived.by(() => {
    const out: { id: HexId; col: number; row: number }[] = [];
    for (let row = 0; row < working.rows; row++) for (let col = 0; col < working.cols; col++) out.push({ id: hexId(col, row), col, row });
    return out;
  });
  const symbolFor: Record<string, string[]> = {
    desert: [], veldt: ['veldt'], swamp: ['swamp'], mountain: ['mountain'], jungle: ['jungle'], lake: [],
    'jungle-swamp': ['jungle', 'swamp'], 'jungle-mountain': ['jungle', 'mountain']
  };
  function riverPoints(path: string[]): string {
    return path.map((id) => { const at = parseHexId(id)!; const c = centre(at.col, at.row); return `${c.x.toFixed(1)},${c.y.toFixed(1)}`; }).join(' ');
  }
  const changed = $derived(new Set(changes.map((c) => c.id)));

  function tap(id: HexId) {
    selected = id;
    if (!brush) return;
    const next = paint(working, id, brush);
    if (typeof next === 'string') {
      message = next;
      return;
    }
    working = next;
    message = '';
    status = changesBetween(saved, working).length ? 'edited' : 'synced';
  }
  function undo(id: HexId) {
    const back = paint(working, id, brushAt(saved, id));
    if (typeof back === 'string') return;
    working = back;
    status = changesBetween(saved, working).length ? 'edited' : 'synced';
  }
  function revert() {
    working = clone(saved);
    message = '';
    status = 'synced';
  }
  async function save() {
    if (!server || !changes.length) return;
    status = 'saving';
    message = '';
    try {
      const res = await fetch(`${server}/diag/${SESSION}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'save', target: 'board', changes, data: working })
      });
      const body = (await res.json().catch(() => ({}))) as { saved?: string; error?: string };
      if (!res.ok || !body.saved) throw new Error(body.error ?? `the server answered ${res.status}`);
      const n = changes.length;
      saved = clone(working);
      status = 'synced';
      message = `Saved ${n} hex ${n === 1 ? 'change' : 'changes'} to ${body.saved}; the table's dev server offers the reload`;
    } catch (e) {
      status = 'failed';
      message = `Not saved: ${(e as Error).message}`;
    }
  }
  const words = (b: Brush) => b.replace('-', ' and ');
</script>

<svelte:head><title>Map editor</title></svelte:head>

<main class="editor" data-e2e-layout data-testid="map-editor" style="--target:44px; --gap:8px">
  <div class="pane" data-testid="editor-pane" bind:clientWidth={paneW} bind:clientHeight={paneH}>
    {#if paneW > 0}
      <svg data-testid="editor-grid" width={svgW} height={svgH} viewBox="0 0 {svgW} {svgH}" role="img" aria-label="The board, every hex of its grid, north up" style="--r:{radius}px">
        <defs>
          <g id="ed-mountain" class="sym mountain"><path d="M-0.5 0.36 L0 -0.42 L0.5 0.36" /></g>
          <g id="ed-veldt" class="sym veldt"><path d="M-0.5 -0.32 L-0.26 0.36 L0 -0.12 L0.26 0.36 L0.5 -0.32" /></g>
          <g id="ed-swamp" class="sym swamp"><path d="M-0.42 0.38 H0.42 M0 0.38 V-0.42 M-0.24 0.38 L-0.3 -0.22 M0.24 0.38 L0.3 -0.22" /></g>
          <g id="ed-jungle" class="sym jungle"><polygon points={hexPoints(0, 0, 0.74)} /></g>
        </defs>
        {#each grid as g (g.id)}
          {@const c = centre(g.col, g.row)}
          {@const h = working.hexes[g.id]}
          {@const kind = h ? (h.terrain ?? 'blank') : 'sea'}
          <polygon
            class="hex {kind}"
            class:selected={selected === g.id}
            role="button"
            tabindex="0"
            data-e2e-hex-sized
            data-testid="edit-hex-{g.id}"
            data-kind={h ? 'land' : 'sea'}
            data-terrain={kind}
            data-port={h?.port}
            aria-label="{g.id}: {kind}{h?.port ? `, port of ${working.ports[h.port].name}` : ''}{brush ? `; paint ${words(brush)}` : ''}"
            points={hexPoints(c.x, c.y, radius * 0.96)}
            onclick={() => tap(g.id)}
            onkeydown={(e) => e.key === 'Enter' && tap(g.id)}
          />
        {/each}
        {#each grid as g (g.id)}
          {@const t = working.hexes[g.id]?.terrain}
          {#if t && symbolFor[t].length}
            {@const c = centre(g.col, g.row)}
            <g class="symbols" transform="translate({c.x} {c.y}) scale({radius})">
              {#each symbolFor[t] as sym (sym)}<use href="#ed-{sym}" />{/each}
            </g>
          {/if}
        {/each}
        {#each working.rivers as r (r.id)}
          <polyline class="river" points={riverPoints(r.path)} aria-label="River {r.name}" />
        {/each}
        {#each Object.values(working.ports) as p (p.hex)}
          {@const at = parseHexId(p.hex)!}
          {@const c = centre(at.col, at.row)}
          <g class="port" transform="translate({c.x} {c.y})">
            <circle r={radius * 0.4} />
            <text y={-radius * 0.75} font-size={radius * 0.7}>{p.name}</text>
          </g>
        {/each}
        {#each changes as ch (ch.id)}
          {@const at = parseHexId(ch.id)!}
          {@const c = centre(at.col, at.row)}
          <polygon class="changed" data-testid="changed-{ch.id}" points={hexPoints(c.x, c.y, radius * 0.96)} />
        {/each}
        {#if selected}
          {@const at = parseHexId(selected)!}
          {@const c = centre(at.col, at.row)}
          <polygon class="outline" points={hexPoints(c.x, c.y, radius * 0.96)} />
        {/if}
      </svg>
    {/if}
  </div>
  <aside class="side" data-e2e-fit>
    <h1>Map editor</h1>
    <p class="counts" data-testid="editor-counts" data-land={tally.land} data-blank={tally.blank}>{tally.land} land hexes, {tally.blank} blank</p>
    <p class="server" data-testid="editor-server" data-server={server ?? 'none'}>
      {#if server}Saves to the capture server at {server}{:else}No capture server: open with ?diag-server=http://127.0.0.1:3002 (or from bun run dev) to save{/if}
    </p>
    <div class="zoom" role="group" aria-label="Zoom">
      {#each [1, 2, 3] as z (z)}
        <button data-testid="zoom-{z}" aria-pressed={zoom === z} onclick={() => (zoom = z)}>{z}×</button>
      {/each}
    </div>
    <h2>Brush</h2>
    <div class="brushes" role="group" aria-label="Brush: tap a hex to paint it">
      {#each BRUSHES as b (b)}
        <button class="brush {b}" data-testid="brush-{b}" aria-pressed={brush === b} aria-label="{words(b)}{brush === b ? ' (chosen)' : ''}" onclick={() => (brush = brush === b ? null : b)}>
          <span class="swatch {b}"></span>{words(b)}
        </button>
      {/each}
    </div>
    <h2>Hex</h2>
    <p class="hex-info" data-testid="selected-hex" data-hex={selected ?? 'none'} data-terrain={selected ? brushAt(working, selected) : 'none'}>
      {#if selected}
        <strong>{selected}</strong> {brushAt(working, selected)}{#if selectedHex?.port}, port of {working.ports[selectedHex.port].name}{/if}{#if changed.has(selected)}{' '}(was {brushAt(saved, selected)}){/if}
      {:else}Tap a hex{/if}
    </p>
    <h2>Changes</h2>
    <ul class="changes" data-testid="editor-changes" data-count={changes.length}>
      {#each changes as ch (ch.id)}
        <li data-testid="change-{ch.id}">
          <span>{ch.id}: {ch.from} → {ch.to}</span>
          <button class="undo" data-testid="undo-{ch.id}" aria-label="Take back the change to {ch.id}" onclick={() => undo(ch.id)}>✕</button>
        </li>
      {:else}
        <li class="none">None</li>
      {/each}
    </ul>
    <div class="actions">
      <button class="save" data-testid="save-board" disabled={!server || !changes.length || status === 'saving'} onclick={save}>Save</button>
      <button class="revert" data-testid="revert-board" disabled={!changes.length} onclick={revert}>Revert</button>
    </div>
    <p class="message" role="status" data-testid="editor-status" data-status={status}>{message}</p>
  </aside>
</main>

<style>
  :global(body) {
    margin: 0;
    background: #1c2a2e;
    color: #e8d8b0;
    font-family: 'Nile Sans', 'DejaVu Sans', sans-serif;
  }
  .editor {
    height: 100vh;
    display: grid;
    grid-template-columns: 1fr 340px;
    overflow: hidden;
  }
  .pane {
    overflow: auto;
    display: grid;
    place-items: start center;
  }
  svg {
    display: block;
  }
  .hex {
    fill: #efe6cc;
    stroke: #6f9663;
    stroke-width: 1;
    cursor: pointer;
  }
  .hex.sea {
    fill: #27393f;
    stroke: #33484f;
  }
  .hex.desert {
    fill: #a8614a;
    stroke: #6b3a2c;
  }
  .hex.lake {
    fill: #3f86c9;
    stroke: #2b5f94;
  }
  .hex:focus-visible {
    outline: none;
    stroke: #fff;
    stroke-width: 2;
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
  .sym.swamp,
  .sym.jungle {
    stroke: #3f8a3f;
  }
  .sym.jungle {
    stroke-width: 0.12;
  }
  .symbols,
  .river,
  .port,
  .changed,
  .outline {
    pointer-events: none;
  }
  .river {
    fill: none;
    stroke: #2d72c9;
    stroke-width: calc(var(--r) * 0.16);
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .port circle {
    fill: #1c2a2e;
  }
  .port text {
    fill: #e8d8b0;
    text-anchor: middle;
    font-weight: 700;
    paint-order: stroke;
    stroke: #1c2a2e;
    stroke-width: 3px;
  }
  .changed {
    fill: none;
    stroke: #f0a030;
    stroke-width: 3;
    stroke-dasharray: 4 3;
  }
  .outline {
    fill: none;
    stroke: #fff;
    stroke-width: 3;
  }
  .side {
    padding: 16px;
    overflow: auto;
    border-left: 2px solid #33484f;
    display: grid;
    align-content: start;
    gap: 8px;
  }
  h1 {
    margin: 0;
    font-size: 1.3rem;
  }
  h2 {
    margin: 8px 0 0;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    opacity: 0.7;
  }
  p {
    margin: 0;
    font-size: 0.85rem;
  }
  .server {
    opacity: 0.75;
    overflow-wrap: anywhere;
  }
  button {
    min-height: var(--target);
    min-width: var(--target);
    border: 2px solid #e8d8b0;
    border-radius: 8px;
    background: transparent;
    color: #e8d8b0;
    font: inherit;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.4;
    cursor: default;
  }
  button[aria-pressed='true'] {
    background: #c9a24a;
    color: #1c2a2e;
    border-color: #c9a24a;
  }
  .zoom {
    display: flex;
    gap: 6px;
  }
  .brushes {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }
  .brush {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 10px;
    text-align: left;
    font-size: 0.85rem;
  }
  .swatch {
    width: 18px;
    height: 18px;
    border-radius: 4px;
    border: 1px solid #1c2a2e;
    background: #efe6cc;
    flex: none;
  }
  .swatch.desert {
    background: #a8614a;
  }
  .swatch.lake {
    background: #3f86c9;
  }
  .swatch.sea {
    background: #27393f;
    border-color: #e8d8b0;
  }
  .swatch.veldt,
  .swatch.swamp,
  .swatch.jungle,
  .swatch.mountain,
  .swatch.jungle-swamp,
  .swatch.jungle-mountain {
    background: linear-gradient(135deg, #efe6cc 50%, #3f8a3f 50%);
  }
  .swatch.mountain,
  .swatch.jungle-mountain {
    background: linear-gradient(135deg, #efe6cc 50%, #6b3a2c 50%);
  }
  .changes {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 4px;
    font-size: 0.85rem;
    max-height: 30vh;
    overflow: auto;
  }
  .changes li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .changes .none {
    opacity: 0.6;
  }
  .undo {
    border-style: dashed;
  }
  .actions {
    display: flex;
    gap: 8px;
  }
  .save {
    flex: 1;
    background: #c9a24a;
    color: #1c2a2e;
    border-color: #c9a24a;
    font-weight: 700;
  }
  .save:disabled {
    background: transparent;
    color: #e8d8b0;
    border-color: #e8d8b0;
  }
  .message {
    min-height: 1.2em;
  }
  .message[data-status='failed'] {
    color: #f0a0a0;
  }
</style>
