<script lang="ts">
  // Reorganising the expedition on any turn (rules §5): cache goods here, dismiss men, turn animals loose or eat them;
  // dig up an earlier cache of one's own on this hex.
  import Icon from '$lib/ui/Icon.svelte';
  import { ITEMS, type Chart, type Item } from './prices';
  import type { Cache } from '$lib/game/state';

  interface Props {
    seat: string;
    chart: Chart;
    /** This explorer's caches on this hex, made on earlier turns. */
    caches: Cache[];
    onaction: (action: 'cache' | 'dismiss' | 'release' | 'eat', item: Item, count: number) => void;
    onrecover: (cacheId: number) => void;
    onclose: () => void;
  }
  let { seat, chart, caches, onaction, onrecover, onclose }: Props = $props();
  let step = $state(1);
  const MEN: Item[] = ['guides', 'bearers', 'askaris'];
  const ANIMALS: Item[] = ['camels', 'horses'];
  const present = $derived(ITEMS.filter((i) => chart[i] > 0));
  const n = (item: Item) => Math.min(step, chart[item]);
</script>

<div class="panel" data-testid="reorganise-panel-{seat}" role="group" aria-label="Reorganise the expedition">
  <div class="head">
    <strong>Reorganise</strong>
    <button class="step" data-testid="reorganise-step-{seat}" aria-label="{step} at a time; tap to switch" aria-pressed={step === 10} onclick={() => (step = step === 1 ? 10 : 1)}>×{step}</button>
    <button class="close" data-testid="reorganise-close-{seat}" aria-label="Close" onclick={onclose}>×</button>
  </div>
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
  {#each caches as c (c.id)}
    <div class="row cache" data-testid="cache-row-{c.id}-{seat}">
      <span class="icon" aria-label="Cache {c.id}">⌂</span>
      <span class="contents">{Object.entries(c.contents).map(([k, v]) => `${v} ${k}`).join(', ')}</span>
      <button data-testid="recover-cache-{c.id}-{seat}" aria-label="Dig up cache {c.id}" onclick={() => onrecover(c.id)}>dig up</button>
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
  .row.cache {
    grid-template-columns: var(--target) 1fr auto;
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
  .contents {
    font-size: calc(var(--target) * 0.26);
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
