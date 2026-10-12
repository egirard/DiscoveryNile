<script lang="ts">
  // Leaving a joint expedition (rules §13): the leaver picks his agreed share of the party's chart at the edge.
  import Icon from '$lib/ui/Icon.svelte';
  import { ITEMS, type Chart, type Item } from './prices';

  interface Props {
    seat: string;
    chart: Chart;
    onsplit: (take: Partial<Record<Item | 'water', number>>) => void;
    onclose: () => void;
  }
  let { seat, chart, onsplit, onclose }: Props = $props();
  let take = $state<Partial<Record<Item | 'water', number>>>({});
  const present = $derived([...ITEMS, 'water' as const].filter((i) => chart[i] > 0));
  const n = (item: Item | 'water') => take[item] ?? 0;
  function more(item: Item | 'water', by: number) {
    take = { ...take, [item]: Math.max(0, Math.min(chart[item], n(item) + by)) };
  }
</script>

<div class="panel" data-testid="split-panel-{seat}">
  <p class="text">Leave the joint expedition with a share of its chart; the rest stays with your companions.</p>
  {#each present as item (item)}
    <div class="row" data-testid="split-row-{item}-{seat}">
      <span class="icon"><Icon name={item} size="1.4em" /></span>
      <span class="have">{chart[item]}</span>
      <button data-testid="split-less-{item}-{seat}" aria-label="Take one {item} less" onclick={() => more(item, -1)}>−</button>
      <span class="count" data-testid="split-take-{item}-{seat}" data-count={n(item)}>{n(item)}</span>
      <button data-testid="split-more-{item}-{seat}" aria-label="Take one more of {item}" onclick={() => more(item, 1)}>+</button>
      <button data-testid="split-more5-{item}-{seat}" aria-label="Take five more of {item}" onclick={() => more(item, 5)}>+5</button>
    </div>
  {/each}
  <div class="actions">
    <button class="confirm" data-testid="split-confirm-{seat}" aria-label="Leave with this share" onclick={() => onsplit(take)}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>
    </button>
    <button class="cancel" data-testid="split-cancel-{seat}" aria-label="Stay together" onclick={onclose}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
    </button>
  </div>
</div>

<style>
  .panel {
    display: grid;
    gap: calc(var(--gap) * 0.35);
    width: calc(var(--target) * 7.5);
    font-family: system-ui, sans-serif;
    color: var(--ink);
  }
  .text {
    margin: 0 0 calc(var(--gap) * 0.3);
    font-size: calc(var(--target) * 0.28);
    line-height: 1.3;
  }
  .row {
    display: grid;
    grid-template-columns: 1.6em 2em auto 2.2em auto auto;
    align-items: center;
    gap: calc(var(--gap) * 0.4);
    font-size: calc(var(--target) * 0.32);
    font-weight: 700;
  }
  .have {
    opacity: 0.6;
  }
  .count {
    text-align: center;
  }
  .row button {
    min-width: calc(var(--target) * 0.8);
    height: calc(var(--target) * 0.8);
    border-radius: 999px;
    border: 2px solid var(--ink);
    background: var(--paper);
    color: var(--ink);
    font: inherit;
    cursor: pointer;
  }
  .actions {
    display: flex;
    gap: var(--gap);
    justify-content: center;
    margin-top: calc(var(--gap) * 0.3);
  }
  .actions button {
    width: var(--target);
    height: var(--target);
    border-radius: 50%;
    border: 3px solid var(--ink);
    background: var(--paper);
    color: var(--ink);
    display: grid;
    place-items: center;
    cursor: pointer;
  }
  .confirm {
    background: var(--accent);
  }
  .actions svg {
    width: 60%;
    fill: none;
    stroke: currentColor;
    stroke-width: 2.2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
</style>
