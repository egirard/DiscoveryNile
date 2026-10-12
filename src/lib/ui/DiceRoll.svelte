<script lang="ts">
  // Dice faces with pips: omnidirectional, so every seat reads a roll the same way.
  interface Props {
    values: number[];
    label: string;
    testid?: string;
    size?: string;
  }
  let { values, label, testid, size = 'calc(var(--target) * 0.7)' }: Props = $props();
  const total = $derived(values.reduce((a, b) => a + b, 0));
  const PIPS: Record<number, [number, number][]> = {
    1: [[12, 12]],
    2: [[6, 6], [18, 18]],
    3: [[6, 6], [12, 12], [18, 18]],
    4: [[6, 6], [18, 6], [6, 18], [18, 18]],
    5: [[6, 6], [18, 6], [12, 12], [6, 18], [18, 18]],
    6: [[6, 6], [18, 6], [6, 12], [18, 12], [6, 18], [18, 18]]
  };
</script>

<span class="dice" data-testid={testid} data-total={total} aria-label="{label}: rolled {values.join(', ')}, total {total}" style="--die:{size}">
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
