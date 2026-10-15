<script lang="ts">
  // The camp panel (rules §5; PROMPTS.md, prompts 23 and 34): reorganise the expedition on any turn: cache goods
  // here, dismiss men, turn animals loose or eat them; take water where there is water; see how the expedition as
  // it now stands could move, as the outfitting screen shows it; and the caches on this hex with what each holds:
  // one made this turn gives its goods back item by item, an earlier one is dug up with a die first.
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
  const present = $derived(ITEMS.filter((i) => chart[i] > 0));
  const n = (item: Item) => Math.min(step, chart[item]);
  const held = (c: Cache) => (Object.entries(c.contents) as [Item, number][]).filter(([, v]) => v > 0);
  const listed = (c: Cache) => held(c).map(([k, v]) => `${v} ${k}`).join(', ');
</script>

<div class="panel" data-testid="reorganise-panel-{seat}" role="group" aria-label="The camp: reorganise the expedition, take water, use the caches here">
  <div class="head">
    <strong>Camp</strong>
    <button class="step" data-testid="reorganise-step-{seat}" aria-label="{step} at a time; tap to switch" aria-pressed={step === 10} onclick={() => (step = step === 1 ? 10 : 1)}>×{step}</button>
    <button class="close" data-testid="reorganise-close-{seat}" aria-label="Close" onclick={onclose}>×</button>
  </div>
  <MovementNotes {chart} {seat} testid="camp-capacity" />
  {#each present as item (item)}
    <div class="row" data-testid="reorganise-row-{item}-{seat}">
      <span class="icon" aria-label={item}><Icon name={item} /></span>
      <span class="have" data-count={chart[item]}>{chart[item]}</span>
      {#if MEN.includes(item)}
        <button data-testid="dismiss-{item}-{seat}" aria-label="Dismiss {n(item)} {item}" onclick={() => onaction('dismiss', item, n(item))}>dismiss</button>
      {:else if ANIMALS.includes(item)}
        <button data-testid="release-{item}-{seat}" aria-label="Turn {n(item)} {item} loose" onclick={() => onaction('release', item, n(item))}>loose</button>
        <button data-testid="eat-{item}-{seat}" aria-label="Eat {n(item)} {item}: ten rations each" onclick={() => onaction('eat', item, n(item))}>eat</button>
      {:else}
        <button data-testid="cache-{item}-{seat}" aria-label="Cache {n(item)} {item} here" onclick={() => onaction('cache', item, n(item))}>cache</button>
      {/if}
    </div>
  {/each}
  <div class="row water" data-testid="reorganise-row-water-{seat}" data-available={waterHere}>
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
  {#each caches as c (c.id)}
    <div class="row cache" data-testid="cache-row-{c.id}-{seat}" data-open={c.round === round} data-owner={c.seat}>
      <span class="icon" aria-label="Cache {c.id}">⌂</span>
      <span class="contents" data-testid="cache-contents-{c.id}-{seat}">{c.seat === seat ? '' : `${c.seat}'s: `}{listed(c) || 'empty'}</span>
      {#if c.round < round}
        <button data-testid="recover-cache-{c.id}-{seat}" aria-label="Dig up cache {c.id}: a 1 or 2 and it has gone" onclick={() => onrecover(c.id)}>dig up</button>
      {:else}
        <span class="note">this turn's</span>
      {/if}
    </div>
    {#if c.round === round}
      {#each held(c) as [item, count] (item)}
        <div class="row taken" data-testid="cache-item-{item}-{c.id}-{seat}">
          <span class="icon" aria-label={item}><Icon name={item} /></span>
          <span class="have" data-count={count}>{count}</span>
          <button data-testid="take-{item}-{c.id}-{seat}" aria-label="Take {Math.min(step, count)} {item} back from the cache" onclick={() => ontake(c.id, item, Math.min(step, count))}>take</button>
        </div>
      {/each}
    {/if}
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
  .row.cache {
    grid-template-columns: var(--target) 1fr auto;
  }
  .row.water {
    grid-template-columns: var(--target) calc(var(--target) * 0.8) 1fr;
  }
  .row.taken {
    grid-template-columns: var(--target) calc(var(--target) * 0.8) 1fr 1fr;
    padding-left: calc(var(--target) * 0.5);
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
