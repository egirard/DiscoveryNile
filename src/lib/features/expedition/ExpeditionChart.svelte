<script lang="ts">
  // Outfitting at a port of entry: the Expedition Organization Chart as a purchase panel.
  // The port and three ready-made outfits (the rules' sample expeditions, scaled to the budget) at the
  // top; a named row per item with price and −/+ controls; a line that says how many people there are
  // and how the expedition could move (overland, by canoe, mounted); a ×1/×5/×10 step, the running
  // budget, and a done control that turns into a confirmation in place (rules §5, §7.1).
  import { BOARD, type PortId } from '$features/map/manifest';
  import Icon from '$lib/ui/Icon.svelte';
  import { ITEMS, NO_PURCHASES, PRICES, availableAt, cost, type Item, type Purchases } from './prices';
  import { ITEM_NAMES, mountSoldAt, movementOptions, outfitLike, type OutfitKind } from './outfit';

  interface Props {
    seat: string;
    port: PortId;
    budget: number;
    onconfirm: (purchases: Purchases) => void;
  }
  let { seat, port, budget, onconfirm }: Props = $props();

  let purchases = $state<Purchases>({ ...NO_PURCHASES });
  let step = $state<1 | 5 | 10>(1);
  let confirming = $state(false);
  let decide = $state<HTMLElement | null>(null);

  const STEPS = [1, 5, 10] as const;
  const spent = $derived(cost(purchases));
  const left = $derived(budget - spent);
  const mount = $derived(mountSoldAt(port));
  const moves = $derived(movementOptions({ ...purchases, water: 0, guideHomes: {} }));
  const portName = $derived(BOARD.ports[port].name);
  const outfits = $derived<{ kind: OutfitKind; icon: 'foot' | 'canoes' | 'horses' | 'camels'; label: string }[]>([
    { kind: 'foot', icon: 'foot', label: 'a foot expedition' },
    { kind: 'canoe', icon: 'canoes', label: 'a canoe-borne expedition' },
    ...(mount ? [{ kind: 'mounted' as const, icon: mount, label: `an expedition mounted on ${mount}` }] : [])
  ]);

  function change(item: Item, delta: number) {
    const next = Math.max(0, purchases[item] + delta);
    if (delta > 0 && cost({ ...purchases, [item]: next }) > budget) return;
    purchases = { ...purchases, [item]: next };
  }
  const canAfford = (item: Item) => cost({ ...purchases, [item]: purchases[item] + step }) <= budget;
  function spendAll(kind: OutfitKind) {
    purchases = outfitLike(kind, budget, port);
  }
  /** A tap anywhere but the confirmation itself takes the question back. */
  function outside(event: PointerEvent) {
    if (confirming && !(decide && event.target instanceof Node && decide.contains(event.target))) confirming = false;
  }

  const overlandLabel = $derived(
    moves.overlandCarry === null
      ? `Cannot move overland: the bearers cannot even carry the canoes (eight each)`
      : moves.overland
        ? `Can move overland: ${moves.load} units to carry, bearers and animals carry ${moves.overlandCarry}`
        : `Cannot move overland: ${moves.load} units to carry, bearers and animals carry only ${moves.overlandCarry}`
  );
  const canoeLabel = $derived(
    purchases.canoes === 0
      ? 'No canoes'
      : moves.canoeSeats
        ? `By canoe ${moves.canoeHexes} ${moves.canoeHexes === 1 ? 'hex' : 'hexes'} a turn on the water (${Math.floor(purchases.bearers / purchases.canoes)} paddlers a canoe)${moves.portage ? '; eight bearers can carry the canoes past a cataract' : '; fewer than eight bearers cannot pass a cataract'}`
        : `The canoes seat ${12 * purchases.canoes}, not ${moves.people}: they cannot carry everyone`
  );
  const mountedLabel = $derived(
    moves.mountedCarry === null
      ? purchases.canoes > 0
        ? 'Cannot ride: the canoes must be carried on foot'
        : `Cannot ride: ${purchases.horses + purchases.camels} mounts for ${moves.people} people`
      : moves.mounted
        ? `Can ride: every rider's mount carries 5, the spare mounts the bearers lead carry 20 each, ${moves.mountedCarry} in all for ${moves.load} units`
        : `Cannot ride: the mounts carry ${moves.mountedCarry} (5 each ridden, 20 each led), not ${moves.load} units`
  );
</script>

<svelte:document onpointerdown={outside} />

<div class="chart" data-testid="expedition-chart-{seat}" data-port={port} role="group" aria-label="Outfit the expedition at {portName}">
  <div class="head">
    <span class="port" data-testid="outfit-port-{seat}"><Icon name="anchor" size="1.1em" /> {portName}</span>
    <span class="outfits" role="group" aria-label="Spend the whole budget on a ready-made outfit">
      {#each outfits as o (o.kind)}
        <button class="outfit" data-testid="outfit-like-{o.kind}-{seat}" aria-label="Spend the whole budget on {o.label}, as in the rules' sample" onclick={() => spendAll(o.kind)}><Icon name={o.icon} /></button>
      {/each}
    </span>
  </div>
  <div class="rows">
    {#each ITEMS as item (item)}
      {@const sold = availableAt(item, port)}
      <div class="row" class:unavailable={!sold} data-testid="row-{item}-{seat}" data-available={sold}>
        <span class="item" aria-label="{ITEM_NAMES[item]}, ${PRICES[item]} each{sold ? '' : ', not sold here'}">
          <span class="name" data-testid="name-{item}-{seat}">{ITEM_NAMES[item]}</span>
          <span class="tag"><Icon name={item} size="1.1em" /> <span class="price">${PRICES[item]}</span></span>
        </span>
        <button data-testid="sell-{item}-{seat}" aria-label="{ITEM_NAMES[item]}: fewer" disabled={!sold || purchases[item] === 0} onclick={() => change(item, -step)}>−</button>
        <span class="count" data-testid="count-{item}-{seat}">{purchases[item]}</span>
        <button data-testid="buy-{item}-{seat}" aria-label="{ITEM_NAMES[item]}: more" disabled={!sold || !canAfford(item)} onclick={() => change(item, step)}>+</button>
      </div>
    {/each}
  </div>
  <div
    class="moves"
    data-testid="chart-capacity-{seat}"
    data-people={moves.people}
    data-load={moves.load}
    data-carry={moves.overlandCarry ?? 'none'}
    data-overland={moves.overland}
    data-canoe-hexes={moves.canoeHexes}
    data-canoe-seats={12 * purchases.canoes}
    data-portage={moves.portage}
    data-mounted={moves.mounted}
    data-mount={mount ?? 'none'}
  >
    <span class="stat" aria-label="{moves.people} {moves.people === 1 ? 'person' : 'people'}"><Icon name="people" size="1.1em" /> {moves.people}</span>
    <span class="stat" aria-label="{moves.load} units to carry; {moves.overlandCarry ?? 0} carried overland"><Icon name="food" size="1.1em" /> {moves.load}/{moves.overlandCarry ?? 0}</span>
    <span class="mode" data-testid="mode-foot-{seat}" data-ok={moves.overland} aria-label={overlandLabel}><Icon name="foot" size="1.1em" /><span class="mark">{moves.overland ? '✓' : '✗'}</span></span>
    <span class="mode" data-testid="mode-canoe-{seat}" data-ok={moves.canoeSeats} aria-label={canoeLabel}>
      <Icon name="canoes" size="1.1em" />{#if purchases.canoes > 0}<span class="hexes">{moves.canoeHexes}</span>{/if}{#if purchases.canoes > 0 && moves.portage}<Icon name="cataract" size="0.9em" />{/if}<span class="mark">{moves.canoeSeats ? '✓' : '✗'}</span>
    </span>
    {#if mount || purchases.horses + purchases.camels > 0}
      <span class="mode" data-testid="mode-mounted-{seat}" data-ok={moves.mounted} aria-label={mountedLabel}><Icon name={mount ?? (purchases.camels > 0 ? 'camels' : 'horses')} size="1.1em" /><span class="mark">{moves.mounted ? '✓' : '✗'}</span></span>
    {/if}
  </div>
  <div class="footer">
    <span class="steps" role="group" aria-label="How many to buy or sell at a tap">
      {#each STEPS as n (n)}
        <button class="step" data-testid="chart-step-{n}-{seat}" aria-label="Buy and sell {n} at a time" aria-pressed={step === n} onclick={() => (step = n)}>×{n}</button>
      {/each}
    </span>
    <span class="budget" data-testid="chart-budget-{seat}" data-left={left} aria-label="Budget left">${left}</span>
    <span class="decide" bind:this={decide}>
      {#if confirming}
        <button class="cancel" data-testid="confirm-outfit-no-{seat}" aria-label="Keep outfitting" onclick={() => (confirming = false)}>✕</button>
        <button class="confirm sure" data-testid="confirm-outfit-yes-{seat}" aria-label="Confirm: set out with this expedition; ${left} unspent is lost" onclick={() => onconfirm(purchases)}>
          <Icon name="explorer" /><span class="tick" aria-hidden="true">✓</span>
        </button>
      {:else}
        <button class="confirm" data-testid="confirm-outfit-{seat}" aria-label="Done outfitting" onclick={() => (confirming = true)}><Icon name="explorer" /></button>
      {/if}
    </span>
  </div>
</div>

<style>
  .chart {
    display: grid;
    gap: var(--gap);
    font-family: 'Nile Sans', 'DejaVu Sans', sans-serif;
    font-size: calc(var(--target) * 0.36);
  }
  .head {
    display: flex;
    align-items: center;
    gap: var(--gap);
  }
  .port {
    display: inline-flex;
    align-items: center;
    gap: 0.3em;
    font-weight: 700;
    font-size: 1.1em;
    margin-right: auto;
  }
  .outfits,
  .steps,
  .decide {
    display: inline-flex;
    gap: calc(var(--gap) * 0.5);
  }
  .rows {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: calc(var(--gap) * 0.5) calc(var(--gap) * 2);
  }
  .row {
    display: grid;
    grid-template-columns: 4.8em var(--target) 2.2em var(--target);
    align-items: center;
    gap: calc(var(--gap) * 0.4);
  }
  .row.unavailable {
    opacity: 0.35;
  }
  .item {
    display: grid;
    line-height: 1.15;
  }
  .name {
    font-size: 0.78em;
    font-weight: 700;
  }
  .tag {
    display: inline-flex;
    align-items: center;
    gap: 0.25em;
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
  .moves {
    display: flex;
    align-items: center;
    gap: var(--gap);
    font-size: 0.8em;
  }
  .stat,
  .mode {
    display: inline-flex;
    align-items: center;
    gap: 0.3em;
  }
  .mode {
    padding: 0.15em 0.45em;
    border-radius: 999px;
    border: 1.5px solid var(--ink);
  }
  .mode[data-ok='true'] {
    background: var(--accent);
  }
  .mode[data-ok='false'] {
    opacity: 0.55;
  }
  .hexes {
    font-weight: 700;
  }
  .mark {
    font-weight: 700;
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
    padding: 0 0.5em;
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
    margin-right: auto;
  }
  .confirm {
    background: var(--accent);
    position: relative;
  }
  .tick {
    position: absolute;
    right: -0.15em;
    bottom: -0.15em;
    width: 1.1em;
    height: 1.1em;
    border-radius: 50%;
    background: var(--ink);
    color: var(--paper);
    font-size: 0.8em;
    line-height: 1.1em;
    text-align: center;
  }
</style>
