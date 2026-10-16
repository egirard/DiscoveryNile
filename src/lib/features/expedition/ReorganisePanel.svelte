<script lang="ts">
  // The camp panel (rules §5; PROMPTS.md, prompts 23, 34 and 38): reorganise the expedition on any turn: cache goods
  // here, dismiss men, turn animals loose or eat them; take water where there is water; see how the expedition as
  // it now stands could move, as the outfitting screen shows it; and the caches on this hex with what each holds.
  // The goods cached this turn stand in a column to the right of the expedition's, item by item, with the control
  // that takes them back between the two columns; an earlier cache is listed below, to be dug up with a die first.
  import Icon from '$lib/ui/Icon.svelte';
  import MovementNotes from './MovementNotes.svelte';
  import { ITEMS, type Chart, type Item } from './prices';
  import type { Cache } from '$lib/game/state';

  interface Props {
    seat: string;
    chart: Chart;
    /** The caches on this hex the explorer may use: its own, and anyone's once the hex is published (RQ-3). */
    caches: Cache[];
    /** The round in play: a cache made this round is open, an earlier one is dug up first. */
    round: number;
    /** Water is free here (anywhere but a dry desert hex). */
    waterHere: boolean;
    waterStep?: number;
    onaction: (action: 'cache' | 'dismiss' | 'release' | 'eat', item: Item, count: number) => void;
    /** Goods back out of a cache made this round. */
    ontake: (cacheId: number, item: Item, count: number) => void;
    onrecover: (cacheId: number) => void;
    /** Water rations taken (positive) or poured out (negative). */
    onwater: (rations: number) => void;
    onclose: () => void;
  }
  let { seat, chart, caches, round, waterHere, waterStep = 10, onaction, ontake, onrecover, onwater, onclose }: Props = $props();
  let step = $state(1);
  const MEN: Item[] = ['guides', 'bearers', 'askaris'];
  const ANIMALS: Item[] = ['camels', 'horses'];
  const n = (item: Item) => Math.min(step, chart[item]);
  const held = (c: Cache) => (Object.entries(c.contents) as [Item, number][]).filter(([, v]) => v > 0);
  const listed = (c: Cache) => held(c).map(([k, v]) => `${v} ${k}`).join(', ');
  /** The explorer's own cache made this turn, open to take from (prompt 38): its goods stand in the right column. */
  const open = $derived(caches.find((c) => c.round === round && c.seat === seat && held(c).length > 0) ?? null);
  const cached = (item: Item) => open?.contents[item] ?? 0;
  /** The rows: every item the expedition has, and every item cached this turn, even when none is left in the expedition. */
  const rows = $derived(ITEMS.filter((i) => chart[i] > 0 || cached(i) > 0));
  /** The caches listed below the goods: earlier ones to dig up, and others' (the open one stands in the column). */
  const listedCaches = $derived(caches.filter((c) => c !== open));
</script>

<div class="panel" data-testid="reorganise-panel-{seat}" role="group" aria-label="The camp: reorganise the expedition, take water, use the caches here">
  <div class="head">
    <strong>Camp</strong>
    <button class="step" data-testid="reorganise-step-{seat}" aria-label="{step} at a time; tap to switch" aria-pressed={step === 10} onclick={() => (step = step === 1 ? 10 : 1)}>×{step}</button>
    <button class="close" data-testid="reorganise-close-{seat}" aria-label="Close" onclick={onclose}>×</button>
  </div>
  <MovementNotes {chart} {seat} testid="camp-capacity" />
  {#if open}
    <div class="row heads" class:cached={open}>
      <span class="col-head expedition">expedition</span>
      <span class="col-head cache-head" data-testid="cache-row-{open.id}-{seat}" data-open="true" data-owner={open.seat} aria-label="Cached here this turn: {listed(open)}"><Icon name="cache" /> cached</span>
    </div>
  {/if}
  {#each rows as item (item)}
    <div class="row" class:cached={open} data-testid="reorganise-row-{item}-{seat}">
      <span class="icon" aria-label={item}><Icon name={item} /></span>
      <span class="have" class:none={chart[item] === 0} data-count={chart[item]}>{chart[item]}</span>
      {#if chart[item] === 0}
        <span class="note span2">none left</span>
      {:else if MEN.includes(item)}
        <button data-testid="dismiss-{item}-{seat}" aria-label="Dismiss {n(item)} {item}" onclick={() => onaction('dismiss', item, n(item))}>dismiss</button>
      {:else if ANIMALS.includes(item)}
        <button data-testid="release-{item}-{seat}" aria-label="Turn {n(item)} {item} loose" onclick={() => onaction('release', item, n(item))}>loose</button>
        <button data-testid="eat-{item}-{seat}" aria-label="Eat {n(item)} {item}: ten rations each" onclick={() => onaction('eat', item, n(item))}>eat</button>
      {:else}
        <button data-testid="cache-{item}-{seat}" aria-label="Cache {n(item)} {item} here" onclick={() => onaction('cache', item, n(item))}>cache</button>
      {/if}
      {#if open}
        {#if cached(item) > 0}
          <!-- Between the columns: the goods come back from the cache to the expedition, leftward. -->
          <button class="take" data-testid="take-{item}-{open.id}-{seat}" aria-label="Take {Math.min(step, cached(item))} {item} back from the cache" onclick={() => ontake(open!.id, item, Math.min(step, cached(item)))}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12H5m6-6l-6 6 6 6" /></svg>
          </button>
          <span class="cached-cell" data-testid="cache-item-{item}-{open.id}-{seat}" data-count={cached(item)}>
            <span class="icon" aria-hidden="true"><Icon name={item} /></span>
            <span class="have">{cached(item)}</span>
          </span>
        {/if}
      {/if}
    </div>
  {/each}
  <div class="row water" class:cached={open} data-testid="reorganise-row-water-{seat}" data-available={waterHere}>
    <span class="icon" aria-label="water"><Icon name="water" /></span>
    <span class="have" data-testid="camp-water-{seat}" data-count={chart.water}>{chart.water}</span>
    {#if waterHere}
      <span class="water-controls" data-testid="water-controls-{seat}">
        <button data-testid="take-water-{seat}" aria-label="Take {waterStep} water rations" onclick={() => onwater(waterStep)}>+{waterStep}</button>
        {#if chart.water > 0}
          <button data-testid="pour-water-{seat}" aria-label="Pour out {Math.min(waterStep, chart.water)} water rations" onclick={() => onwater(-Math.min(waterStep, chart.water))}>−{Math.min(waterStep, chart.water)}</button>
        {/if}
      </span>
    {:else}
      <span class="note" data-testid="no-water-{seat}">no water here</span>
    {/if}
  </div>
  {#each listedCaches as c (c.id)}
    <div class="row cache" data-testid="cache-row-{c.id}-{seat}" data-open={c.round === round} data-owner={c.seat}>
      <span class="icon" aria-label="Cache {c.id}"><Icon name="cache" /></span>
      <span class="contents" data-testid="cache-contents-{c.id}-{seat}">{c.seat === seat ? '' : `${c.seat}'s: `}{listed(c) || 'empty'}</span>
      {#if c.round < round}
        <button data-testid="recover-cache-{c.id}-{seat}" aria-label="Dig up cache {c.id}: a 1 or 2 and it has gone" onclick={() => onrecover(c.id)}>dig up</button>
      {:else}
        <span class="note">this turn's</span>
      {/if}
    </div>
  {/each}
</div>

<style>
  .panel {
    display: grid;
    gap: calc(var(--gap) * 0.35);
    width: calc(var(--target) * 7.5);
    font-family: 'Nile Sans', 'DejaVu Sans', sans-serif;
    color: var(--ink);
  }
  .head {
    display: flex;
    align-items: center;
    gap: calc(var(--gap) * 0.5);
    font-size: calc(var(--target) * 0.36);
  }
  .head strong {
    flex: 1;
  }
  .row {
    display: grid;
    grid-template-columns: var(--target) calc(var(--target) * 0.8) 1fr 1fr;
    align-items: center;
    gap: calc(var(--gap) * 0.4);
  }
  /* With a cache open this turn (prompt 38) every row gains the take-back column and the cached column to its right. */
  .panel:has(.row.cached) {
    width: calc(var(--target) * 10.6);
  }
  .row.cached {
    grid-template-columns: var(--target) calc(var(--target) * 0.8) 1fr 1fr var(--target) calc(var(--target) * 1.9);
  }
  .row.cache {
    grid-template-columns: var(--target) 1fr auto;
  }
  .row.water {
    grid-template-columns: var(--target) calc(var(--target) * 0.8) 1fr;
  }
  .row.water.cached {
    grid-template-columns: var(--target) calc(var(--target) * 0.8) 2fr var(--target) calc(var(--target) * 1.9);
  }
  .heads {
    font-size: calc(var(--target) * 0.22);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    opacity: 0.75;
  }
  .heads .expedition {
    grid-column: 1 / 5;
  }
  .heads .cache-head {
    grid-column: 6;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: calc(var(--gap) * 0.3);
  }
  .span2 {
    grid-column: span 2;
  }
  .have.none {
    opacity: 0.4;
  }
  .take {
    grid-column: 5;
    width: var(--target);
    padding: 0;
    display: grid;
    place-items: center;
    background: var(--accent);
  }
  .take svg {
    width: 55%;
    height: 55%;
    fill: none;
    stroke: var(--ink);
    stroke-width: 2.4;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .cached-cell {
    grid-column: 6;
    display: grid;
    grid-template-columns: var(--target) calc(var(--target) * 0.8);
    align-items: center;
    gap: calc(var(--gap) * 0.4);
    border-left: 2px solid rgba(28, 42, 46, 0.25);
    padding-left: calc(var(--gap) * 0.2);
  }
  .icon {
    display: grid;
    place-items: center;
    font-size: calc(var(--target) * 0.5);
  }
  .have {
    text-align: center;
    font-weight: 700;
    font-size: calc(var(--target) * 0.34);
  }
  .contents,
  .note {
    font-size: calc(var(--target) * 0.26);
  }
  .note {
    opacity: 0.7;
    font-style: italic;
  }
  .water-controls {
    display: flex;
    gap: calc(var(--gap) * 0.4);
  }
  .water-controls button {
    flex: 1;
  }
  button {
    min-height: var(--target);
    padding: 0 calc(var(--gap) * 0.6);
    border: 2px solid var(--ink);
    border-radius: 8px;
    background: var(--paper);
    color: var(--ink);
    font-size: calc(var(--target) * 0.26);
    cursor: pointer;
  }
  .step,
  .close {
    width: var(--target);
    height: var(--target);
    padding: 0;
    border-radius: 50%;
    font-weight: 700;
    font-size: calc(var(--target) * 0.3);
  }
  .step[aria-pressed='true'] {
    background: var(--ink);
    color: var(--paper);
  }
</style>
