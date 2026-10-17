<script lang="ts">
  // The map editor (PROMPTS.md, prompt 47): a tool of its own at /editor/, for the developer, not the table. The board
  // was transcribed from a photograph (tools/mapfit, RQ-5) and some hexes were misread; here every hex of the grid is
  // drawn north up, a brush is chosen and tapped onto hexes, the changes are listed, and Save sends the whole board to
  // the diagnostics capture server as a `save` command, which writes board.json in the source tree. The dev server then
  // offers the table its reload. Without a capture server (the hosted build) the editor only shows the board.
  // Rivers too (prompt 48): a river is chosen from the list (or added), the course tool adds a hex at either end with a
  // tap or takes an end hex off, the cataract tool marks a hex of a course, and the river's name, drainage number, hexes
  // off the map, the river it joins and whether it continues off the map are fields beside the list. The single hex
  // editor (prompt 49) shows the hex tapped with six spokes, blue where a river leaves it; a tap on a spoke adds or
  // clears that river edge as an edit of the courses, and the map follows at once. A spoke toward the sea makes the hex
  // the river's mouth, flowing out that way (prompt 51); the hex's terrain is shown there with the game's own symbols
  // and changed with a tap on one of them. The map is drawn through the parts the table's board uses (art.ts,
  // TerrainSymbols, BoardFeatures; prompt 52): the same window of the grid (the land's bounding box, the sea hexes
  // inside it), the same symbols, rivers, cataracts, ports and names.
  import { onMount } from 'svelte';
  import rawBoard from '$features/map/board.json';
  import { BRUSHES, DIRECTION_NAMES, DIRECTIONS, addRiver, brushAt, changesBetween, counts, paint, removeRiver, riverCandidates, riverSpokes, riverTap, toggleCataract, toggleRiverSpoke, updateRiver, validateBoard, type Brush, type RawBoard, type RawRiver } from '$features/map/editor';
  import { hexId, hexPoints, neighbour, parseHexId, type HexId } from '$features/map/hex';
  import { HATCH, SYMBOLS, bearing, centreIn, extentsOf, hatchAcross } from '$features/map/art';
  import TerrainSymbols from '$features/map/TerrainSymbols.svelte';
  import BoardFeatures from '$features/map/BoardFeatures.svelte';
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
  const spokes = $derived(selected ? riverSpokes(working, selected) : []);
  const riversThrough = $derived(selected ? working.rivers.filter((r) => r.path.includes(selected!)) : []);
  const cataractHere = $derived(selected ? working.rivers.some((r) => r.cataracts.includes(selected!)) : false);
  const HEX_R = 62;
  /** The wedge of the single hex editor's hex that is direction d's control: from the centre to the edge in that direction. */
  function wedge(d: number): string {
    const a = bearing(d) - Math.PI / 6, b = bearing(d) + Math.PI / 6;
    return `0,0 ${(Math.cos(a) * HEX_R * 1.3).toFixed(1)},${(Math.sin(a) * HEX_R * 1.3).toFixed(1)} ${(Math.cos(b) * HEX_R * 1.3).toFixed(1)},${(Math.sin(b) * HEX_R * 1.3).toFixed(1)}`;
  }
  const isBrush = (t: typeof tool): t is Brush => t !== null && t !== 'river' && t !== 'cataract';

  // The window the table shows (art.ts): the land's bounding box as saved, north up and sized to the pane, with the sea
  // hexes inside it drawn too, so the coast can be moved. A hex painted sea at the window's edge stays in view until saved.
  const extents = $derived(extentsOf(Object.values(saved.hexes)));
  const radius = $derived(Math.max(4, Math.min(paneW / extents.w, paneH / extents.h)) * zoom);
  const svgW = $derived(extents.w * radius);
  const svgH = $derived(extents.h * radius);
  const centre = (id: string) => centreIn(extents, radius, working.hexes[id] ?? parseHexId(id)!);
  const grid = $derived.by(() => {
    const out: { id: HexId; col: number; row: number }[] = [];
    for (let row = extents.minRow; row <= extents.maxRow; row++) for (let col = extents.minCol; col <= extents.maxCol; col++) out.push({ id: hexId(col, row), col, row });
    return out;
  });
  /** The hatch across the single hex editor's hex at a cataract: perpendicular to the course through its spokes. */
  const hatch = $derived.by(() => {
    const at = spokes.map((s) => ({ x: Math.cos(bearing(s.direction)), y: Math.sin(bearing(s.direction)) }));
    return hatchAcross(at[0] ?? null, { x: 0, y: 0 }, at[1] ?? null);
  });
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
  function spoke(d: (typeof DIRECTIONS)[number]) {
    if (selected) apply(toggleRiverSpoke(working, selected, d));
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

{#snippet swatch(kind: Brush)}
  <!-- A hex in the game's own iconography (HexBoard's symbols), for the brushes and the hex editor. -->
  <svg class="swatch" viewBox="-1.15 -1.15 2.3 2.3" aria-hidden="true">
    <polygon class="hex {kind}" points={hexPoints(0, 0, 1)} />
    {#each SYMBOLS[kind] ?? [] as sym (sym)}<use href="#sym-{sym}" />{/each}
  </svg>
{/snippet}

<main class="editor" data-e2e-layout data-testid="map-editor" style="--target:44px; --gap:8px">
  <svg class="defs" width="0" height="0" aria-hidden="true"><TerrainSymbols /></svg>
  <div class="pane" data-testid="editor-pane" bind:clientWidth={paneW} bind:clientHeight={paneH}>
    {#if paneW > 0}
      <svg data-testid="editor-grid" width={svgW} height={svgH} viewBox="0 0 {svgW} {svgH}" role="img" aria-label="The board as the table shows it, north up, with the sea hexes between" style="--r:{radius}px">
        {#each grid as g (g.id)}
          {@const c = centre(g.id)}
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
          {#if t && SYMBOLS[t].length}
            {@const c = centre(g.id)}
            <g class="symbols" transform="translate({c.x} {c.y}) scale({radius})">
              {#each SYMBOLS[t] as sym (sym)}<use href="#sym-{sym}" />{/each}
            </g>
          {/if}
        {/each}
        <BoardFeatures board={working} {centre} {radius} chosen={riverId} />
        {#each candidates as id (id)}
          {@const c = centre(id)}
          <polygon class="candidate" data-testid="river-candidate-{id}" points={hexPoints(c.x, c.y, radius * 0.8)} />
        {/each}
        {#each [...changed] as id (id)}
          {@const c = centre(id)}
          <polygon class="changed" data-testid="changed-{id}" points={hexPoints(c.x, c.y, radius * 0.96)} />
        {/each}
        {#if selected}
          {@const c = centre(selected)}
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
      {#if server}Saves to {server}{:else}No capture server: open with ?diag-server=http://127.0.0.1:3002 (or from bun run dev) to save{/if}
    </p>
    <h2>Brush</h2>
    <div class="brushes" role="group" aria-label="Brush: tap a hex to paint it">
      {#each BRUSHES as b (b)}
        <button class="brush" data-testid="brush-{b}" aria-pressed={tool === b} aria-label="Brush: {words(b)}{tool === b ? ' (chosen)' : ''}" title={words(b)} onclick={() => (tool = tool === b ? null : b)}>
          {@render swatch(b)}
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
        <label><span>Off map</span><input data-testid="river-offmap" type="number" min="0" value={river.offMapHexes ?? ''} oninput={(e) => setField({ offMapHexes: numberOrNone(e.currentTarget.value) })} /></label>
        <button class="small" data-testid="river-continues" aria-pressed={Boolean(river.continuesOffMap)} aria-label={river.continuesOffMap ? 'Continues off the map; tap to end it on the map' : 'Ends on the map; tap to continue it off the map'} onclick={() => setField({ continuesOffMap: !river!.continuesOffMap })}>{river.continuesOffMap ? 'Off map ↗' : 'Ends here'}</button>
        <button class="small remove" data-testid="river-remove" aria-label="Remove the {river.name}" onclick={dropRiver}>Remove</button>
      </div>
    {/if}
    <h2>Hex</h2>
    <div class="hex-editor" data-testid="hex-editor" data-hex={selected ?? 'none'} data-spokes={spokes.map((s) => s.direction).join(',')}>
      <svg class="one-hex" viewBox="-92 -92 184 184" width="140" height="140" role="group" aria-label={selected ? `${selected}: the directions a river leaves it in; tap a spoke to add or clear a river there` : 'No hex chosen'}>
        {#if selected}
          <polygon class="hex {brushAt(working, selected)}" points={hexPoints(0, 0, HEX_R)} />
          {#each DIRECTIONS as d (d)}
            {@const on = spokes.find((s) => s.direction === d)}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <polygon
              class="wedge"
              role="button"
              tabindex="0"
              data-testid="spoke-{d}"
              data-river={on?.river.id}
              data-sea={on?.sea ? 'true' : undefined}
              aria-pressed={Boolean(on)}
              aria-label="{DIRECTION_NAMES[d]} ({d}): {on?.sea ? `the ${on.river.name} flows out to sea here` : on ? `the ${on.river.name} leaves here; tap to clear it` : selected && !working.hexes[neighbour(selected, d)] ? 'the sea; tap to make this hex the mouth of its river' : 'no river; tap to lead one here'}"
              points={wedge(d)}
              onclick={() => spoke(d)}
              onkeydown={(e) => e.key === 'Enter' && spoke(d)}
            />
            <line class="spoke" class:river={on} class:sea={on?.sea} x1="0" y1="0" x2={(Math.cos(bearing(d)) * HEX_R * 0.87).toFixed(1)} y2={(Math.sin(bearing(d)) * HEX_R * 0.87).toFixed(1)} />
            <text class="dir" x={(Math.cos(bearing(d)) * HEX_R * 1.15).toFixed(1)} y={(Math.sin(bearing(d)) * HEX_R * 1.15).toFixed(1)}>{d}</text>
          {/each}
          {#if cataractHere}
            <g class="cataract" aria-label="Cataract">
              <line class="hatch-bank" x1={(-hatch.x * HATCH * HEX_R).toFixed(1)} y1={(-hatch.y * HATCH * HEX_R).toFixed(1)} x2={(hatch.x * HATCH * HEX_R).toFixed(1)} y2={(hatch.y * HATCH * HEX_R).toFixed(1)} />
              <line class="hatch" x1={(-hatch.x * HATCH * HEX_R).toFixed(1)} y1={(-hatch.y * HATCH * HEX_R).toFixed(1)} x2={(hatch.x * HATCH * HEX_R).toFixed(1)} y2={(hatch.y * HATCH * HEX_R).toFixed(1)} />
            </g>
          {/if}
        {/if}
      </svg>
      {#if selected}
        <div class="terrains" role="group" aria-label="The terrain of {selected}: tap one to change it">
          {#each BRUSHES as b (b)}
            <button class="terrain" data-testid="hex-terrain-{b}" aria-pressed={brushAt(working, selected) === b} aria-label="{words(b)}{brushAt(working, selected) === b ? ' (this hex)' : ''}" title={words(b)} onclick={() => apply(paint(working, selected!, b))}>
              {@render swatch(b)}
            </button>
          {/each}
        </div>
      {/if}
    </div>
    <p class="hex-info" data-testid="selected-hex" data-hex={selected ?? 'none'} data-terrain={selected ? brushAt(working, selected) : 'none'}>
      {#if selected}
        <strong>{selected}</strong> {brushAt(working, selected)}{#if selectedHex?.port}, port of {working.ports[selectedHex.port].name}{/if}{#if changed.has(selected)}{' '}(was {brushAt(saved, selected)}){/if}{#if riversThrough.length}; {riversThrough.map((r) => r.name).join(', ')}{cataractHere ? '; cataract' : ''}{/if}
      {:else}Tap a hex on the map: its terrain and the spokes a river leaves it by, blue where one does{/if}
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
    grid-template-columns: 1fr 372px;
    overflow: hidden;
  }
  .pane {
    overflow: auto;
    display: grid;
    place-items: start center;
  }
  svg {
    display: block;
    overflow: visible; /* a name at the edge of the window may run past its margin */
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
  .symbols,
  .cataract,
  .changed,
  .candidate,
  .outline {
    pointer-events: none;
  }
  .candidate {
    fill: rgba(143, 196, 255, 0.35);
    stroke: #8fc4ff;
    stroke-width: 2;
    stroke-dasharray: 3 3;
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
  .defs {
    position: absolute;
  }
  .brushes,
  .terrains {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .brush,
  .terrain {
    width: var(--target);
    height: var(--target);
    padding: 4px;
    display: grid;
    place-items: center;
  }
  .swatch {
    width: 100%;
    height: 100%;
    display: block;
    overflow: visible;
  }
  .swatch .hex {
    stroke-width: 0.08;
  }
  .swatch .hex.sea {
    stroke: #e8d8b0;
  }
  .terrains {
    width: 188px;
    flex: none;
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
    grid-template-columns: 1fr 1fr 1fr 1fr;
    gap: 6px;
  }
  .fields label:nth-child(-n + 2) {
    grid-column: span 2;
  }
  .fields .small {
    align-self: end;
    font-size: 0.8rem;
    padding: 0 6px;
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
  .hex-editor {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .spoke.sea {
    stroke: #8fc4ff;
  }
  .one-hex {
    flex: none;
    overflow: visible;
  }
  .one-hex .hex {
    stroke-width: 2;
  }
  .wedge {
    fill: transparent;
    cursor: pointer;
  }
  .wedge:hover {
    fill: rgba(143, 196, 255, 0.2);
  }
  .wedge:focus-visible {
    outline: none;
    fill: rgba(143, 196, 255, 0.3);
  }
  .spoke {
    stroke: rgba(28, 42, 46, 0.25);
    stroke-width: 3;
    stroke-dasharray: 4 4;
    pointer-events: none;
  }
  .spoke.river {
    stroke: #2d72c9;
    stroke-width: 9;
    stroke-dasharray: none;
    stroke-linecap: round;
  }
  .dir {
    fill: #e8d8b0;
    font-size: 15px;
    font-weight: 700;
    text-anchor: middle;
    dominant-baseline: central;
    pointer-events: none;
  }
  .one-hex .hatch-bank {
    stroke: #efe6cc;
    stroke-width: 13;
    stroke-linecap: round;
  }
  .one-hex .hatch {
    stroke: #2d72c9;
    stroke-width: 6;
    stroke-linecap: round;
  }
  .hex-info {
    line-height: 1.3;
  }
  .changes {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 4px;
    font-size: 0.85rem;
    max-height: 15vh;
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
