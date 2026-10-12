<script lang="ts">
  // The outfitted expedition at the rail: an icon and a count per item that is present.
  import Icon from '$lib/ui/Icon.svelte';
  import { ITEMS, type Chart } from './prices';

  interface Props {
    seat: string;
    chart: Chart;
  }
  let { seat, chart }: Props = $props();
  const present = $derived([...ITEMS, 'water' as const].filter((i) => chart[i] > 0));
</script>

<span class="summary" data-testid="chart-summary-{seat}" aria-label="Expedition: {present.map((i) => `${chart[i]} ${i}`).join(', ')}">
  {#each present as item (item)}
    <span class="item" data-testid="have-{item}-{seat}" data-count={chart[item]}><Icon name={item} size="1.2em" />{chart[item]}</span>
  {/each}
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
</style>
