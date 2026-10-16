<script lang="ts">
  // The map editor (PROMPTS.md, prompt 47): a tool of its own at /editor/, for the developer, not the table. The board
  // was transcribed from a photograph (tools/mapfit, RQ-5) and some hexes were misread; here every hex of the grid is
  // drawn north up, a brush is chosen and tapped onto hexes, the changes are listed, and Save sends the whole board to
  // the diagnostics capture server as a `save` command, which writes board.json in the source tree. The dev server then
  // offers the table its reload. Without a capture server (the hosted build) the editor only shows the board.
  // Rivers too (prompt 48): a river is chosen from the list (or added), the course tool adds a hex at either end with a
  // tap or takes an end hex off, the cataract tool marks a hex of a course, and the river's name, drainage number, hexes
  // off the map, the river it joins and whether it continues off the map are fields beside the list.
  import { onMount } from 'svelte';
  import rawBoard from '$features/map/board.json';
  import { BRUSHES, addRiver, brushAt, changesBetween, counts, paint, removeRiver, riverCandidates, riverTap, toggleCataract, updateRiver, validateBoard, type Brush, type RawBoard, type RawRiver } from '$features/map/editor';
  import { hexId, hexPoints, parseHexId, toPixel, type HexId } from '$features/map/hex';
  import { serverUrlFrom } from '$lib/diagnostics/diag';

  const SESSION = 'map-editor';
  const clone = (b: RawBoard): RawBoard => JSON.parse(JSON.stringify(b)) as RawBoard;

  let saved = $state<RawBoard>(clone(rawBoard as RawBoard));
  let working = $state<RawBoard>(clone(rawBoard as RawBoard));
  /** A terrain brush, the river course tool, the cataract tool, or nothing (a tap then only selects the hex). */
  let tool = $state<Brush | 'river' | 'cataract' | null>(null);
  let selected = $state<HexId | null>(null);
  let riverId = $state<string | null>(null);
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
  const river = $derived(riverId ? working.rivers.find((r) => r.id === riverId) ?? null : null);
  const candidates = $derived(tool === 'river' && riverId ? riverCandidates(working, riverId) : []);
  const brush = $derived(tool && tool !== 'river' && tool !== 'cataract' ? tool : null);
  const isBrush = (t: typeof tool): t is Brush => t !== null && t !== 'river' && t !== 'cataract';

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
  const changed = $derived(new Set(changes.filter((c) => c.kind === 'hex').map((c) => c.id)));

  /** Take a result of the pure functions: a board is applied, a reason is shown. */
  function apply(next: RawBoard | string) {
    if (typeof next === 'string') {
      message = next;
      return false;
    }
    working = next;
    message = '';
    status = changesBetween(saved, working).length ? 'edited' : 'synced';
    return true;
  }
  function tap(id: HexId) {
    selected = id;
    if (tool === 'river') {
      if (!riverId) {
        message = 'Choose a river, or add one, before drawing its course';
        return;
      }
      apply(riverTap(working, riverId, id));
    } else if (tool === 'cataract') {
      apply(toggleCataract(working, id, riverId ?? undefined));
    } else if (isBrush(tool)) {
      apply(paint(working, id, tool));
    }
  }
  function undo(id: HexId) {
    apply(paint(working, id, brushAt(saved, id)));
  }
  /** The river as it was saved: put back, taken out if it was added, or put back in its place if it was removed. */
  function undoRiver(id: string) {
    const was = saved.rivers.find((r) => r.id === id);
    const at = saved.rivers.findIndex((r) => r.id === id);
    let rivers = working.rivers.filter((r) => r.id !== id);
    if (was) rivers = [...rivers.slice(0, at), JSON.parse(JSON.stringify(was)) as RawRiver, ...rivers.slice(at)];
    if (!was && riverId === id) riverId = null;
    apply({ ...working, rivers });
  }
  function newRiver() {
    const { board, id } = addRiver(working);
    apply(board);
    riverId = id;
    tool = 'river';
    message = 'Tap the hex at the mouth of the new river, then each hex inland';
  }
  function dropRiver() {
    if (!riverId) return;
    if (apply(removeRiver(working, riverId))) riverId = null;
  }
  function setField(patch: Parameters<typeof updateRiver>[2]) {
    if (riverId) apply(updateRiver(working, riverId, patch));
  }
  const numberOrNone = (v: string): number | undefined => (v.trim() === '' ? undefined : Number(v));
  function revert() {
    working = clone(saved);
    message = '';
    status = 'synced';
  }
  async function save() {
    if (!server || !changes.length) return;
    const problem = validateBoard(working);
    if (problem) {
      status = 'failed';
      message = `Not saved: ${problem}`;
      return;
    }
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
      message = `Saved ${n} ${n === 1 ? 'change' : 'changes'} to ${body.saved}; the table's dev server offers the reload`;
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
            aria-label="{g.id}: {kind}{h?.port ? `, port of ${working.ports[h.port].name}` : ''}{brush ? `; paint ${words(brush)}` : tool === 'river' && river ? `; draw the ${river.name} here` : tool === 'cataract' ? '; mark a cataract' : ''}"
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
          {#if r.path.length}
            <polyline class="river" class:chosen={r.id === riverId} data-testid="river-course-{r.id}" data-hexes={r.path.join(',')} points={riverPoints(r.path)} aria-label="River {r.name}" />
          {/if}
        {/each}
        {#each working.rivers as r (r.id)}
          {#each r.cataracts as id (id)}
            {@const at = parseHexId(id)!}
            {@const c = centre(at.col, at.row)}
            <g class="cataract" data-testid="cataract-{id}" transform="translate({c.x} {c.y}) scale({radius})"><circle r="0.34" /><path d="M-0.2 -0.08 H0.2 M-0.2 0.08 H0.2" /></g>
          {/each}
          {#if r.path.length && !r.joins && r.drainage !== undefined}
            {@const at = parseHexId(r.path[0])!}
            {@const c = centre(at.col, at.row)}
            <text class="drainage" x={c.x} y={c.y + radius * 0.3} font-size={radius * 0.8}>{r.drainage}</text>
          {/if}
        {/each}
        {#each candidates as id (id)}
          {@const at = parseHexId(id)!}
          {@const c = centre(at.col, at.row)}
          <polygon class="candidate" data-testid="river-candidate-{id}" points={hexPoints(c.x, c.y, radius * 0.8)} />
        {/each}
        {#each Object.values(working.ports) as p (p.hex)}
          {@const at = parseHexId(p.hex)!}
          {@const c = centre(at.col, at.row)}
          <g class="port" transform="translate({c.x} {c.y})">
            <circle r={radius * 0.4} />
            <text y={-radius * 0.75} font-size={radius * 0.7}>{p.name}</text>
          </g>
        {/each}
        {#each [...changed] as id (id)}
          {@const at = parseHexId(id)!}
          {@const c = centre(at.col, at.row)}
          <polygon class="changed" data-testid="changed-{id}" points={hexPoints(c.x, c.y, radius * 0.96)} />
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
    <div class="head">
      <div>
        <h1>Map editor</h1>
        <p class="counts" data-testid="editor-counts" data-land={tally.land} data-blank={tally.blank}>{tally.land} land hexes, {tally.blank} blank</p>
      </div>
      <div class="zoom" role="group" aria-label="Zoom">
        {#each [1, 2, 3] as z (z)}
          <button data-testid="zoom-{z}" aria-pressed={zoom === z} onclick={() => (zoom = z)}>{z}×</button>
        {/each}
      </div>
    </div>
    <p class="server" data-testid="editor-server" data-server={server ?? 'none'}>
      {#if server}Saves to the capture server at {server}{:else}No capture server: open with ?diag-server=http://127.0.0.1:3002 (or from bun run dev) to save{/if}
    </p>
    <h2>Brush</h2>
    <div class="brushes" role="group" aria-label="Brush: tap a hex to paint it">
      {#each BRUSHES as b (b)}
        <button class="brush {b}" data-testid="brush-{b}" aria-pressed={tool === b} aria-label="{words(b)}{tool === b ? ' (chosen)' : ''}" onclick={() => (tool = tool === b ? null : b)}>
          <span class="swatch {b}"></span>{words(b)}
        </button>
      {/each}
    </div>
    <h2>Rivers</h2>
    <div class="tools" role="group" aria-label="River tools">
      <button data-testid="tool-river" aria-pressed={tool === 'river'} aria-label="Draw the course: a tap adds a hex at either end of the chosen river, or takes an end hex off" onclick={() => (tool = tool === 'river' ? null : 'river')}>Course</button>
      <button data-testid="tool-cataract" aria-pressed={tool === 'cataract'} aria-label="Cataract: a tap marks or unmarks one on a river hex" onclick={() => (tool = tool === 'cataract' ? null : 'cataract')}>Cataract</button>
      <button data-testid="river-add" aria-label="Add a river" onclick={newRiver}>+ River</button>
    </div>
    <select class="rivers" data-testid="river-select" data-count={working.rivers.length} aria-label="The river to edit" value={riverId ?? ''} onchange={(e) => (riverId = e.currentTarget.value || null)}>
      <option value="">— choose a river —</option>
      {#each working.rivers as r (r.id)}
        <option value={r.id}>{r.name} ({r.path.length} {r.path.length === 1 ? 'hex' : 'hexes'}{r.joins ? `, joins the ${working.rivers.find((x) => x.id === r.joins)?.name ?? r.joins}` : ''})</option>
      {/each}
    </select>
    {#if river}
      <div class="fields" data-testid="river-fields" data-river={river.id}>
        <label><span>Name</span><input data-testid="river-name" value={river.name} oninput={(e) => setField({ name: e.currentTarget.value })} /></label>
        <label><span>Joins</span>
          <select data-testid="river-joins" value={river.joins ?? ''} onchange={(e) => setField({ joins: e.currentTarget.value || undefined })}>
            <option value="">— the sea —</option>
            {#each working.rivers.filter((r) => r.id !== river!.id) as r (r.id)}<option value={r.id}>{r.name}</option>{/each}
          </select>
        </label>
        <label><span>Drainage</span><input data-testid="river-drainage" type="number" min="1" value={river.drainage ?? ''} oninput={(e) => setField({ drainage: numberOrNone(e.currentTarget.value) })} /></label>
        <label><span>Hexes off the map</span><input data-testid="river-offmap" type="number" min="0" value={river.offMapHexes ?? ''} oninput={(e) => setField({ offMapHexes: numberOrNone(e.currentTarget.value) })} /></label>
        <button data-testid="river-continues" aria-pressed={Boolean(river.continuesOffMap)} onclick={() => setField({ continuesOffMap: !river!.continuesOffMap })}>{river.continuesOffMap ? 'Continues off the map' : 'Ends on the map'}</button>
        <button class="remove" data-testid="river-remove" aria-label="Remove the {river.name}" onclick={dropRiver}>Remove</button>
      </div>
    {/if}
    <h2>Hex</h2>
    <p class="hex-info" data-testid="selected-hex" data-hex={selected ?? 'none'} data-terrain={selected ? brushAt(working, selected) : 'none'}>
      {#if selected}
        <strong>{selected}</strong> {brushAt(working, selected)}{#if selectedHex?.port}, port of {working.ports[selectedHex.port].name}{/if}{#if changed.has(selected)}{' '}(was {brushAt(saved, selected)}){/if}
      {:else}Tap a hex{/if}
    </p>
    <h2>Changes</h2>
    <ul class="changes" data-testid="editor-changes" data-count={changes.length}>
      {#each changes as ch (ch.kind + ch.id)}
        {#if ch.kind === 'hex'}
          <li data-testid="change-{ch.id}">
            <span>{ch.id}: {ch.from} → {ch.to}</span>
            <button class="undo" data-testid="undo-{ch.id}" aria-label="Take back the change to {ch.id}" onclick={() => undo(ch.id)}>✕</button>
          </li>
        {:else}
          <li data-testid="change-river-{ch.id}">
            <span>{ch.name}: {ch.summary}</span>
            <button class="undo" data-testid="undo-river-{ch.id}" aria-label="Take back the changes to the {ch.name}" onclick={() => undoRiver(ch.id)}>✕</button>
          </li>
        {/if}
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
  .cataract,
  .drainage,
  .port,
  .changed,
  .candidate,
  .outline {
    pointer-events: none;
  }
  .river.chosen {
    stroke: #8fc4ff;
    stroke-width: calc(var(--r) * 0.26);
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
    font-weight: 700;
    paint-order: stroke;
    stroke: #efe6cc;
    stroke-width: 3px;
  }
  .candidate {
    fill: rgba(143, 196, 255, 0.35);
    stroke: #8fc4ff;
    stroke-width: 2;
    stroke-dasharray: 3 3;
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
    padding: 12px 16px;
    overflow: auto;
    border-left: 2px solid #33484f;
    display: grid;
    align-content: start;
    gap: 6px;
  }
  .head {
    display: flex;
    justify-content: space-between;
    align-items: start;
    gap: 8px;
  }
  h1 {
    margin: 0;
    font-size: 1.3rem;
  }
  h2 {
    margin: 4px 0 0;
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
  .tools {
    display: flex;
    gap: 6px;
  }
  .rivers,
  .fields input,
  .fields select {
    min-height: var(--target);
    border: 2px solid #e8d8b0;
    border-radius: 8px;
    background: transparent;
    color: #e8d8b0;
    font: inherit;
    font-size: 0.9rem;
    padding: 0 8px;
    box-sizing: border-box;
    width: 100%;
  }
  .rivers option,
  .fields select option {
    color: #1c2a2e;
  }
  .fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }
  .fields label {
    display: grid;
    gap: 2px;
    font-size: 0.75rem;
    opacity: 0.9;
  }
  .remove {
    border-style: dashed;
  }
  .changes {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 4px;
    font-size: 0.85rem;
    max-height: 14vh;
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
