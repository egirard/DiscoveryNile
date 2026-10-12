<script lang="ts">
  // An explorer: a coloured disc in the seat's colour with a badge per specialty.
  import type { ExplorerState } from '$lib/game/state';
  import Icon from '$lib/ui/Icon.svelte';
  import { colourFor } from './colours';

  interface Props {
    explorer: ExplorerState;
    size?: string;
  }
  let { explorer, size = 'var(--target)' }: Props = $props();
</script>

<div
  class="token"
  data-testid="explorer-token-{explorer.seat}"
  data-location={explorer.location.kind}
  aria-label="Explorer of seat {explorer.seat}: {explorer.specialties.length ? explorer.specialties.join(', ') : 'ordinary explorer'}, in {explorer.location.kind}"
  style="--colour:{colourFor(explorer.seat)}; --size:{size}"
>
  <span class="disc"><Icon name="explorer" /></span>
  <span class="badges">
    {#each explorer.specialties as s (s)}
      <span class="badge" data-testid="badge-{s}-{explorer.seat}" aria-label={s}><Icon name={s} size="1em" /></span>
    {/each}
  </span>
</div>

<style>
  .token {
    display: flex;
    align-items: center;
    gap: calc(var(--size) * 0.15);
  }
  .disc {
    width: var(--size);
    height: var(--size);
    border-radius: 50%;
    background: var(--colour);
    border: 3px solid var(--paper);
    color: var(--paper);
    display: grid;
    place-items: center;
  }
  .badges {
    display: flex;
    gap: calc(var(--size) * 0.1);
  }
  .badge {
    width: calc(var(--size) * 0.55);
    height: calc(var(--size) * 0.55);
    border-radius: 50%;
    background: var(--paper);
    color: var(--ink);
    display: grid;
    place-items: center;
    font-size: calc(var(--size) * 0.32);
  }
</style>
