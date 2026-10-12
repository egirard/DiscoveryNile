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
  <span class="disc"><Icon name="explorer" />
    {#if explorer.location.kind === 'voyage'}
      <span class="where" data-testid="at-sea-{explorer.seat}" aria-label="At sea, bound for {explorer.location.port}"><Icon name="ship" size="1em" /></span>
    {:else if explorer.location.kind === 'port'}
      <span class="where" data-testid="in-port-{explorer.seat}" aria-label="At the port of {explorer.location.port}"><Icon name="anchor" size="1em" /></span>
    {:else if explorer.location.kind === 'captive'}
      <span class="where" data-testid="captive-{explorer.seat}" aria-label="Held prisoner by tribe {explorer.location.tribe}">
        <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M5 3v18M12 3v18M19 3v18" /></svg>
      </span>
    {/if}
  </span>
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
    position: relative;
    width: var(--size);
    height: var(--size);
    border-radius: 50%;
    background: var(--colour);
    border: 3px solid var(--paper);
    color: var(--paper);
    display: grid;
    place-items: center;
  }
  .where {
    position: absolute;
    right: -0.35em;
    bottom: -0.35em;
    width: 1.3em;
    height: 1.3em;
    border-radius: 50%;
    background: var(--paper);
    color: var(--ink);
    display: grid;
    place-items: center;
    font-size: calc(var(--size) * 0.32);
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
