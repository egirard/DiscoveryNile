<script lang="ts">
  // Outfitting at a port of entry: the Expedition Organization Chart as a purchase panel.
  // Rows per item with price and −/+ controls, a step toggle (×1/×10), the running budget, the
  // carrying summary, and a confirm that forfeits whatever is unspent (rules §5).
  import type { PortId } from '$features/map/manifest';
  import Icon from '$lib/ui/Icon.svelte';
  import { ITEMS, NO_PURCHASES, PRICES, availableAt, capacity, cost, type Item, type Purchases } from './prices';

  interface Props {
    seat: string;
    port: PortId;
    budget: number;
    onconfirm: (purchases: Purchases) => void;
  }
  let { seat, port, budget, onconfirm }: Props = $props();

  let purchases = $state<Purchases>({ ...NO_PURCHASES });
  let step = $state<1 | 10>(1);
  let confirming = $state(false);

  const spent = $derived(cost(purchases));
  const left = $derived(budget - spent);
  const summary = $derived(capacity({ ...purchases, water: 0, guideHomes: {} }));

  function change(item: Item, delta: number) {
    const next = Math.max(0, purchases[item] + delta);
    if (delta > 0 && cost({ ...purchases, [item]: next }) > budget) return;
    purchases = { ...purchases, [item]: next };
  }
  const canAfford = (item: Item) => cost({ ...purchases, [item]: purchases[item] + step }) <= budget;
</script>

<div class="chart" data-testid="expedition-chart-{seat}" data-port={port} role="group" aria-label="Outfit the expedition at {port}">
  <div class="rows">
    {#each ITEMS as item (item)}
      {@const sold = availableAt(item, port)}
      <div class="row" class:unavailable={!sold} data-testid="row-{item}-{seat}" data-available={sold}>
        <span class="icon" aria-label={item}><Icon name={item} /></span>
        <span class="price">${PRICES[item]}</span>
        <button data-testid="sell-{item}-{seat}" aria-label="{item}: fewer" disabled={!sold || purchases[item] === 0} onclick={() => change(item, -step)}>−</button>
        <span class="count" data-testid="count-{item}-{seat}">{purchases[item]}</span>
        <button data-testid="buy-{item}-{seat}" aria-label="{item}: more" disabled={!sold || !canAfford(item)} onclick={() => change(item, step)}>+</button>
      </div>
    {/each}
  </div>
  <div class="footer">
    <button class="step" data-testid="chart-step-{seat}" aria-label="Buy and sell {step} at a time; tap to switch" aria-pressed={step === 10} onclick={() => (step = step === 1 ? 10 : 1)}>×{step}</button>
    <span class="budget" data-testid="chart-budget-{seat}" data-left={left} aria-label="Budget left">${left}</span>
    <span
      class="capacity"
      data-testid="chart-capacity-{seat}"
      data-men={summary.men}
      data-load={summary.load}
      data-carry={summary.carry}
      data-canoe-seats={summary.canoeSeats}
      data-on-foot={summary.onFoot}
      aria-label="{summary.men} men; load {summary.load} of {summary.carry} carried{summary.canoeSeats ? `; canoes seat ${summary.canoeSeats}` : ''}{summary.onFoot ? '; moves on foot' : ''}"
    >
      <Icon name="men" size="1.1em" /> {summary.men}
      <Icon name="food" size="1.1em" /> {summary.load}/{summary.carry}
      {#if summary.canoeSeats}<Icon name="canoes" size="1.1em" /> {summary.canoeSeats}{/if}
      {#if summary.onFoot}<span class="warn" aria-label="Cannot carry everything: moves on foot">⚠</span>{/if}
    </span>
    {#if confirming}
      <button class="confirm" data-testid="confirm-outfit-yes-{seat}" aria-label="Confirm: set out with this expedition; ${left} unspent is lost" onclick={() => onconfirm(purchases)}>✓</button>
      <button class="cancel" data-testid="confirm-outfit-no-{seat}" aria-label="Keep outfitting" onclick={() => (confirming = false)}>✕</button>
    {:else}
      <button class="confirm" data-testid="confirm-outfit-{seat}" aria-label="Done outfitting" onclick={() => (confirming = true)}><Icon name="explorer" /></button>
    {/if}
  </div>
</div>

<style>
  .chart {
    display: grid;
    gap: var(--gap);
    font-family: 'Nile Sans', 'DejaVu Sans', sans-serif;
    font-size: calc(var(--target) * 0.36);
  }
  .rows {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: calc(var(--gap) * 0.5) calc(var(--gap) * 2);
  }
  .row {
    display: grid;
    grid-template-columns: 1.6em 2.6em var(--target) 2.2em var(--target);
    align-items: center;
    gap: calc(var(--gap) * 0.4);
  }
  .row.unavailable {
    opacity: 0.35;
  }
  .price {
    opacity: 0.7;
    font-size: 0.8em;
  }
  .count {
    text-align: center;
    font-weight: 700;
  }
  button {
    width: var(--target);
    height: var(--target);
    border-radius: 50%;
    border: 2px solid var(--ink);
    background: var(--paper);
    color: var(--ink);
    font-size: 1.2em;
    cursor: pointer;
    display: grid;
    place-items: center;
  }
  button:disabled {
    opacity: 0.3;
    cursor: default;
  }
  .footer {
    display: flex;
    align-items: center;
    gap: var(--gap);
  }
  .step {
    border-radius: 999px;
    width: auto;
    min-width: var(--target);
    padding: 0 0.6em;
    font-size: 0.9em;
  }
  .step[aria-pressed='true'] {
    background: var(--accent);
  }
  .budget {
    font-weight: 700;
    padding: 0.15em 0.5em;
    border-radius: 999px;
    background: var(--ink);
    color: var(--paper);
  }
  .capacity {
    display: inline-flex;
    align-items: center;
    gap: 0.3em;
    font-size: 0.8em;
    margin-right: auto;
  }
  .warn {
    color: #a8372a;
  }
  .confirm {
    background: var(--accent);
  }
</style>
