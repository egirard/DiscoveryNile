<script lang="ts">
  // Everything that happened this turn for one seat, opened from the "+" at the end of the rail's
  // roll log (PROMPTS.md, prompts 13 and 16): every record in order with its dice, modifiers and
  // outcome, and a plain line for each action that rolled nothing, in a short list that scrolls
  // when the turn was eventful.
  import type { RollRecord } from '$lib/game/state';
  import DiceRoll from '$lib/ui/DiceRoll.svelte';
  import { card as cardOf } from '$features/cards/deck';

  interface Props {
    seat: string;
    log: RollRecord[];
    onclose: () => void;
  }
  let { seat, log, onclose }: Props = $props();
  const mine = $derived(log.filter((r) => r.seat === seat));
  const KIND: Record<string, string> = {
    'lost-check': 'Lost check', terrain: 'Terrain', natives: 'Natives', disaster: 'Disaster card', hunting: 'Hunting', water: 'Water',
    reaction: 'Native reaction', combat: 'Fight', defeat: 'Defeat', captivity: 'Captivity', victory: 'Victory', loot: 'Loot', negotiation: 'Negotiation',
    poison: 'Poison', trade: 'Trade', sickness: 'Sickness', specialty: 'Specialty', cache: 'Cache', published: 'Published', transit: 'Transit', party: 'Joint expedition', river: 'River', oasis: 'Oasis'
  };
  const name = (kind: string) => KIND[kind] ?? kind.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
</script>

<div class="turn-log" data-testid="turn-log-{seat}" data-count={mine.length}>
  <div class="head">
    <h3>This turn</h3>
    <button class="close" data-testid="turn-log-close-{seat}" aria-label="Close the turn's log" onclick={onclose}>−</button>
  </div>
  <ol class="entries" data-testid="turn-log-entries-{seat}">
    {#each mine as r, i (i)}
      <li class="entry" data-testid="turn-log-entry-{i}-{seat}" data-kind={r.kind}>
        {#if r.kind === 'action'}
          <span class="action">{r.outcome}</span>
        {:else}
        <span class="kind">{name(r.kind)}{#if r.kind === 'disaster' && r.card} {cardOf(r.card).number}{/if}</span>
        {#if r.rolls.length}
          <DiceRoll values={r.rolls.map((x) => x.value)} label={r.kind} size="calc(var(--target) * 0.4)" />
        {/if}
        {#if r.modifiers?.length}
          <span class="mods">{r.modifiers.map((m) => `${m.label} ${m.value > 0 ? '+' : ''}${m.value}`).join(', ')}</span>
        {/if}
        <span class="outcome" class:bad={r.lost}>{r.outcome}</span>
        {/if}
      </li>
    {/each}
  </ol>
</div>

<style>
  .turn-log {
    width: calc(var(--target) * 9);
    font-family: 'Nile Sans', 'DejaVu Sans', sans-serif;
  }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--gap);
  }
  h3 {
    margin: 0;
    font-size: calc(var(--target) * 0.34);
  }
  .close {
    width: var(--target);
    height: var(--target);
    border-radius: 50%;
    border: 2px solid var(--ink);
    background: var(--ink);
    color: var(--paper);
    font: inherit;
    font-weight: 700;
    font-size: calc(var(--target) * 0.5);
    cursor: pointer;
  }
  .entries {
    /* A short list; an eventful turn scrolls here rather than growing over the board. */
    margin: calc(var(--gap) * 0.5) 0 0;
    padding: 0 calc(var(--gap) * 0.5) 0 0;
    list-style: none;
    display: grid;
    gap: calc(var(--gap) * 0.5);
    max-height: calc(var(--target) * 4.5);
    overflow-y: auto;
  }
  .entry {
    display: grid;
    grid-template-columns: auto auto 1fr;
    align-items: center;
    column-gap: calc(var(--gap) * 0.6);
    row-gap: 2px;
    font-size: calc(var(--target) * 0.26);
    line-height: 1.2;
  }
  .kind {
    font-weight: 700;
  }
  .action {
    grid-column: 1 / -1;
  }
  .mods {
    grid-column: 1 / -1;
    opacity: 0.75;
  }
  .outcome {
    grid-column: 1 / -1;
  }
  .outcome.bad {
    color: #a8372a;
    font-weight: 700;
  }
</style>
