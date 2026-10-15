<script lang="ts">
  // Dice faces with pips: omnidirectional, so every seat reads a roll the same way.
  interface Props {
    values: number[];
    label: string;
    testid?: string;
    size?: string;
    /** Many dice: let the row wrap. */
    wrap?: boolean;
  }
  import { PIPS } from './pips';
  let { values, label, testid, size = 'calc(var(--target) * 0.7)', wrap = false }: Props = $props();
  const total = $derived(values.reduce((a, b) => a + b, 0));
</script>

<span class="dice" class:wrap data-testid={testid} data-total={total} aria-label="{label}: rolled {values.join(', ')}, total {total}" style="--die:{size}">
  {#each values as v, i (i)}
    <svg class="die" viewBox="0 0 24 24" data-value={v} aria-hidden="true">
      <rect x="1" y="1" width="22" height="22" rx="4" />
      {#each PIPS[v] ?? [] as [x, y], j (j)}
        <circle cx={x} cy={y} r="2.3" />
      {/each}
    </svg>
  {/each}
</span>

<style>
  .dice {
    display: inline-flex;
    align-items: center;
    gap: calc(var(--die) * 0.12);
  }
  .wrap {
    flex-wrap: wrap;
    row-gap: calc(var(--die) * 0.2);
  }
  .die {
    width: var(--die);
    height: var(--die);
  }
  .die rect {
    fill: var(--paper);
    stroke: var(--ink);
    stroke-width: 1.5;
  }
  .die circle {
    fill: var(--ink);
  }
</style>
