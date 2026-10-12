<script lang="ts">
  // The outfitted expedition at the rail: an icon and a count per item that is present.
  import Icon from '$lib/ui/Icon.svelte';
  import { ITEMS, type Chart } from './prices';
  import type { Sickness } from '$lib/game/state';

  interface Props {
    seat: string;
    chart: Chart;
    sick?: Sickness;
  }
  let { seat, chart, sick }: Props = $props();
  const present = $derived([...ITEMS, 'water' as const].filter((i) => chart[i] > 0));
  const sickCount = $derived(sick ? sick.guides + sick.bearers + sick.askaris + sick.animals + (sick.explorer ? 1 : 0) : 0);
</script>

<span class="summary" data-testid="chart-summary-{seat}" aria-label="Expedition: {present.map((i) => `${chart[i]} ${i}`).join(', ')}">
  {#each present as item (item)}
    <span class="item" data-testid="have-{item}-{seat}" data-count={chart[item]}><Icon name={item} size="1.2em" />{chart[item]}</span>
  {/each}
  {#if sickCount}
    <span class="item sick" data-testid="sick-{seat}" data-count={sickCount} data-explorer={sick!.explorer} aria-label="{sickCount} sick"><Icon name="medicine" size="1.2em" />{sickCount}</span>
  {/if}
</span>

<style>
  .summary {
    display: inline-flex;
    gap: calc(var(--gap) * 0.8);
    margin-left: var(--gap);
    font-family: system-ui, sans-serif;
    font-weight: 700;
    font-size: calc(var(--target) * 0.34);
    color: var(--paper);
  }
  .item {
    display: inline-flex;
    align-items: center;
    gap: 0.15em;
  }
  .sick {
    color: #e7b4a8;
  }
</style>
