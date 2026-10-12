<script lang="ts">
  // The outfitted expedition at the rail: an icon and a count per item that is present.
  import Icon from '$lib/ui/Icon.svelte';
  import { ITEMS, type Chart } from './prices';
  import type { Sickness } from '$lib/game/state';
  import { sickCarried } from '$features/rations/rations';

  interface Props {
    seat: string;
    chart: Chart;
    sick?: Sickness;
    specimens?: { zoology: number; geology: number };
  }
  let { seat, chart, sick, specimens }: Props = $props();
  const present = $derived([...ITEMS, 'water' as const].filter((i) => chart[i] > 0));
  const sickCount = $derived(sick ? sick.guides + sick.bearers + sick.askaris + sick.animals + (sick.explorer ? 1 : 0) : 0);
</script>

<span class="summary" data-testid="chart-summary-{seat}" aria-label="Expedition: {present.map((i) => `${chart[i]} ${i}`).join(', ')}">
  {#each present as item (item)}
    <span class="item" data-testid="have-{item}-{seat}" data-count={chart[item]}><Icon name={item} size="1.2em" />{chart[item]}</span>
  {/each}
  {#if specimens}
    {#each ['zoology', 'geology'] as const as sp (sp)}
      {#if specimens[sp] > 0}
        <span class="item" data-testid="specimens-{sp}-{seat}" data-count={specimens[sp]} aria-label="{specimens[sp]} {sp} specimens"><Icon name={sp} size="1.2em" />{specimens[sp]}</span>
      {/if}
    {/each}
  {/if}
  {#if sickCount}
    <span class="item sick" data-testid="sick-{seat}" data-count={sickCount} data-explorer={sick!.explorer} aria-label="{sickCount} sick"><Icon name="medicine" size="1.2em" />{sickCount}</span>
    {#if sickCarried(chart, sick!).halted}
      <span class="item halt" data-testid="sick-halt-{seat}" aria-label="The sick cannot all be carried: the expedition cannot move">
        <svg viewBox="0 0 24 24" width="1.2em" height="1.2em" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M5 5v14M19 5v14M9 12h6" /><path d="M12 9v6" /></svg>
      </span>
    {/if}
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
  .sick,
  .halt {
    color: #e7b4a8;
  }
</style>
