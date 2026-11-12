<script lang="ts">
  // Trading with a satisfied chief (rules §8.5): the prices rolled this turn, buy with gifts, sell for gifts; and how
  // the expedition as it stands could move (PROMPTS.md, prompt 40), as the outfitting screen and the camp show it, so a
  // purchase is weighed against what the bearers can carry. Until Done trading is pressed every exchange can be taken
  // back (prompt 67): − hands back what was bought here this turn for what it cost, + takes back what was sold.
  import Icon from '$lib/ui/Icon.svelte';
  import MovementNotes from '$features/expedition/MovementNotes.svelte';
  import type { Chart, Item } from '$features/expedition/prices';
  import { SELLABLE } from './negotiation';
  interface Props {
    seat: string;
    prices: Partial<Record<Item, number>>;
    chart: Chart;
    /** What has been bought and sold here this turn and not taken back, in taps (prompt 67). */
    bought?: Partial<Record<Item, number>>;
    sold?: Partial<Record<Item, number>>;
    /** Specialties the chief's permission lets the explorer practise here, and which are still owed (rules §9). */
    works?: ('evangelism' | 'medicine')[];
    owed?: ('evangelism' | 'medicine')[];
    onwork?: (specialty: 'evangelism' | 'medicine') => void;
    ontrade: (item: Item, count: number, direction: 'buy' | 'sell') => void;
    ondone: () => void;
  }
  let { seat, prices, chart, bought = {}, sold = {}, works = [], owed = [], onwork, ontrade, ondone }: Props = $props();
  const rows = $derived(Object.entries(prices) as [Item, number][]);
  const canBuy = (item: Item, price: number) => (item === 'food' ? chart.gifts >= 1 : chart.gifts >= price && (item !== 'askaris' || chart.muskets >= 1));
  const canSell = (item: Item, price: number) => (SELLABLE.includes(item) || (bought[item] ?? 0) > 0) && (item === 'food' ? chart.food >= price : chart[item] >= 1);
  const one = (item: Item) => `one ${item.slice(0, -1)}`;
  const gifts = (n: number) => `${n} gift${n === 1 ? '' : 's'}`;
  const sellLabel = (item: Item, price: number) =>
    (bought[item] ?? 0) > 0
      ? item === 'food' ? `Hand back ${price} rations for the gift they cost` : `Hand back ${one(item)} for the ${gifts(price)}${item === 'askaris' ? ' and the musket' : ''} it cost`
      : item === 'food' ? `Sell ${price} rations for one gift` : `Sell ${one(item)} for ${gifts(price)}`;
  const buyLabel = (item: Item, price: number) =>
    (sold[item] ?? 0) > 0
      ? item === 'food' ? `Take back ${price} rations for the gift they fetched` : `Take back ${one(item)} for the ${gifts(price)} it fetched`
      : item === 'food' ? `Buy ${price} rations for one gift` : `Buy ${one(item)} for ${gifts(price)}${item === 'askaris' ? ' and a musket' : ''}`;
</script>

<div class="trade" data-testid="trade-panel-{seat}" role="group" aria-label="Trade with the tribe: gifts {chart.gifts}">
  <p class="heading"><Icon name="gifts" size="1em" /> {chart.gifts} gifts</p>
  <MovementNotes {chart} {seat} testid="trade-capacity" />
  {#each rows as [item, price] (item)}
    <div class="row" data-testid="trade-row-{item}-{seat}" data-bought={bought[item] ?? 0} data-sold={sold[item] ?? 0}>
      <span class="icon" aria-label={item}><Icon name={item} /></span>
      <span class="price" data-testid="trade-price-{item}-{seat}" data-price={price}>{item === 'food' ? `${price} rations / gift` : `${price} gift${price === 1 ? '' : 's'}${item === 'askaris' ? ' + musket' : ''}`}</span>
      <span class="have" data-testid="trade-have-{item}-{seat}" data-count={chart[item]}>{chart[item]}</span>
      <button data-testid="trade-sell-{item}-{seat}" aria-label={sellLabel(item, price)} disabled={!canSell(item, price)} onclick={() => ontrade(item, 1, 'sell')}>−</button>
      <button data-testid="trade-buy-{item}-{seat}" aria-label={buyLabel(item, price)} disabled={!canBuy(item, price)} onclick={() => ontrade(item, 1, 'buy')}>+</button>
    </div>
  {/each}
  {#each works as w (w)}
    <button class="work" data-testid="specialty-{w}-{seat}" disabled={!owed.includes(w)} onclick={() => onwork?.(w)}>
      <Icon name={w} size="1.2em" />
      <span class="text"><strong>{w === 'evangelism' ? 'Preach to the tribe' : 'Treat the tribe'}</strong><small>{owed.includes(w) ? 'One die: the tribe’s attitude, points, and perhaps poison' : 'Done here'}</small></span>
    </button>
  {/each}
  <button class="done" data-testid="trade-done-{seat}" disabled={owed.length > 0} onclick={ondone}><strong>Done trading</strong></button>
</div>

<style>
  .trade {
    display: grid;
    gap: calc(var(--gap) * 0.4);
    width: calc(var(--target) * 7.5);
    font-family: 'Nile Sans', 'DejaVu Sans', sans-serif;
    color: var(--ink);
  }
  .heading {
    margin: 0;
    display: flex;
    align-items: center;
    gap: calc(var(--gap) * 0.4);
    font-weight: 700;
    font-size: calc(var(--target) * 0.36);
  }
  .row {
    display: grid;
    grid-template-columns: var(--target) 1fr calc(var(--target) * 0.8) var(--target) var(--target);
    align-items: center;
    gap: calc(var(--gap) * 0.4);
  }
  .icon {
    display: grid;
    place-items: center;
  }
  .price {
    font-size: calc(var(--target) * 0.28);
  }
  .have {
    text-align: center;
    font-weight: 700;
    font-size: calc(var(--target) * 0.34);
  }
  .row button {
    width: var(--target);
    height: var(--target);
    border-radius: 50%;
    border: 2px solid var(--ink);
    background: var(--paper);
    color: var(--ink);
    font-weight: 700;
    font-size: calc(var(--target) * 0.4);
    cursor: pointer;
  }
  .row button:disabled {
    opacity: 0.4;
  }
  .work {
    display: flex;
    align-items: center;
    gap: calc(var(--gap) * 0.6);
    min-height: var(--target);
    padding: calc(var(--gap) * 0.3) calc(var(--gap) * 0.6);
    border: 2px solid var(--ink);
    border-radius: 8px;
    background: var(--paper);
    color: var(--ink);
    text-align: left;
    cursor: pointer;
  }
  .work:disabled,
  .done:disabled {
    opacity: 0.4;
  }
  .text {
    display: grid;
    line-height: 1.15;
  }
  small {
    font-size: calc(var(--target) * 0.22);
  }
  .done {
    min-height: var(--target);
    border: 2px solid var(--ink);
    border-radius: 8px;
    background: var(--paper);
    color: var(--ink);
    font-size: calc(var(--target) * 0.3);
    cursor: pointer;
  }
</style>
