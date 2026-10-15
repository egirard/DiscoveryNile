<script lang="ts">
  // How the expedition on a chart could move (rules §7.1), as the outfitting screen shows it and, since
  // prompt 34, the camp panel too: the people, the load against what is carried overland, and a pill per
  // mode (foot, canoe with its hexes a turn and a cataract mark for portage, mounted) ticked or crossed.
  import Icon from '$lib/ui/Icon.svelte';
  import { movementOptions } from './outfit';
  import type { Chart } from './prices';

  interface Props {
    chart: Chart;
    seat: string;
    /** The ids' prefix: `chart-capacity-{seat}` on the outfitting screen, `camp-capacity-{seat}` at the camp. */
    testid?: string;
    /** The mount sold at this port (outfitting): the mounted pill shows even before one is bought. */
    mount?: 'horses' | 'camels' | null;
  }
  let { chart, seat, testid = 'chart-capacity', mount = null }: Props = $props();
  const moves = $derived(movementOptions(chart));
  const overlandLabel = $derived(
    moves.overlandCarry === null
      ? `Cannot move overland: the bearers cannot even carry the canoes (eight each)`
      : moves.overland
        ? `Can move overland: ${moves.load} units to carry, bearers and animals carry ${moves.overlandCarry}`
        : `Cannot move overland: ${moves.load} units to carry, bearers and animals carry only ${moves.overlandCarry}`
  );
  const canoeLabel = $derived(
    chart.canoes === 0
      ? 'No canoes'
      : moves.canoeSeats
        ? `By canoe ${moves.canoeHexes} ${moves.canoeHexes === 1 ? 'hex' : 'hexes'} a turn on the water (${Math.floor(chart.bearers / chart.canoes)} paddlers a canoe)${moves.portage ? '; eight bearers can carry the canoes past a cataract' : '; fewer than eight bearers cannot pass a cataract'}`
        : `The canoes seat ${12 * chart.canoes}, not ${moves.people}: they cannot carry everyone`
  );
  const mountedLabel = $derived(
    moves.mountedCarry === null
      ? chart.canoes > 0
        ? 'Cannot ride: the canoes must be carried on foot'
        : `Cannot ride: ${chart.horses + chart.camels} mounts for ${moves.people} people`
      : moves.mounted
        ? `Can ride: every rider's mount carries 5, the spare mounts the bearers lead carry 20 each, ${moves.mountedCarry} in all for ${moves.load} units`
        : `Cannot ride: the mounts carry ${moves.mountedCarry} (5 each ridden, 20 each led), not ${moves.load} units`
  );
</script>

<div
  class="moves"
  data-testid="{testid}-{seat}"
  data-people={moves.people}
  data-load={moves.load}
  data-carry={moves.overlandCarry ?? 'none'}
  data-overland={moves.overland}
  data-canoe-hexes={moves.canoeHexes}
  data-canoe-seats={12 * chart.canoes}
  data-portage={moves.portage}
  data-mounted={moves.mounted}
  data-mount={mount ?? 'none'}
>
  <span class="stat" aria-label="{moves.people} {moves.people === 1 ? 'person' : 'people'}"><Icon name="people" size="1.1em" /> {moves.people}</span>
  <span class="stat" aria-label="{moves.load} units to carry; {moves.overlandCarry ?? 0} carried overland"><Icon name="food" size="1.1em" /> {moves.load}/{moves.overlandCarry ?? 0}</span>
  <span class="mode" data-testid="mode-foot-{seat}" data-ok={moves.overland} aria-label={overlandLabel}><Icon name="foot" size="1.1em" /><span class="mark">{moves.overland ? '✓' : '✗'}</span></span>
  <span class="mode" data-testid="mode-canoe-{seat}" data-ok={moves.canoeSeats} aria-label={canoeLabel}>
    <Icon name="canoes" size="1.1em" />{#if chart.canoes > 0}<span class="hexes">{moves.canoeHexes}</span>{/if}{#if chart.canoes > 0 && moves.portage}<Icon name="cataract" size="0.9em" />{/if}<span class="mark">{moves.canoeSeats ? '✓' : '✗'}</span>
  </span>
  {#if mount || chart.horses + chart.camels > 0}
    <span class="mode" data-testid="mode-mounted-{seat}" data-ok={moves.mounted} aria-label={mountedLabel}><Icon name={mount ?? (chart.camels > 0 ? 'camels' : 'horses')} size="1.1em" /><span class="mark">{moves.mounted ? '✓' : '✗'}</span></span>
  {/if}
</div>

<style>
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
</style>
