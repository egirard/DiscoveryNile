<script lang="ts">
  // This turn's rolls for one seat, shown at its rail: dice, the modifiers that applied, the outcome.
  import type { RollRecord } from '$lib/game/state';
  import DiceRoll from '$lib/ui/DiceRoll.svelte';
  import { card as cardOf } from '$features/cards/deck';

  interface Props {
    seat: string;
    log: RollRecord[];
  }
  let { seat, log }: Props = $props();
  const mine = $derived(log.filter((r) => r.seat === seat));
  const lost = $derived(mine.some((r) => r.lost));
</script>

{#if mine.length}
  <span class="log" data-testid="roll-log-{seat}" data-lost={lost}>
    {#each mine as r, i (i)}
      <span class="entry" data-testid="roll-{r.kind}-{seat}" data-outcome={r.outcome} data-lost={r.lost ?? false} data-total={r.total ?? ''} aria-label="{r.kind}: {r.rolls.map((x) => `${x.label} ${x.value}`).join(', ')}{r.modifiers?.length ? '; ' + r.modifiers.map((m) => `${m.label} ${m.value > 0 ? '+' : ''}${m.value}`).join(', ') : ''}; {r.outcome}">
        {#if r.kind === 'disaster' && r.card}
          <span class="chip" class:applies={r.applies} data-testid="disaster-card-{seat}" data-card={r.card} data-applies={r.applies}>
            <span class="number">{cardOf(r.card).number}</span>
            <span class="context">{r.applies ? cardOf(r.card).disaster.type.replace(/\s*\(.*$/, '') : 'no effect'}</span>
          </span>
        {/if}
        {#if r.rolls.length}
          <DiceRoll values={r.rolls.map((x) => x.value)} label={r.kind} size="calc(var(--target) * 0.55)" />
        {/if}
        {#if r.kind === 'disaster' && r.applies}
          <span class="note" data-testid="disaster-note-{seat}">{r.outcome}</span>
        {:else if r.kind === 'hunting'}
          <span class="note" data-testid="meal-note-{seat}">{r.outcome}</span>
        {:else if r.kind === 'natives'}
          <span class="note" data-testid="natives-note-{seat}">{r.outcome}</span>
        {:else if r.kind === 'reaction' || r.kind === 'combat'}
          <span class="note" data-testid="{r.kind}-note-{seat}">{r.outcome}</span>
        {/if}
        {#if r.modifiers?.length}
          <span class="mods">{r.modifiers.map((m) => (m.value > 0 ? `+${m.value}` : m.value === 0 ? '' : `${m.value}`)).filter(Boolean).join(' ')}</span>
        {/if}
        {#if r.kind === 'lost-check'}
          <span class="outcome" class:bad={r.lost} aria-hidden="true">{r.lost ? '?' : '→'}</span>
        {/if}
      </span>
    {/each}
    {#if lost}
      <span class="badge" data-testid="lost-badge-{seat}" aria-label="The expedition is lost this turn">?</span>
    {/if}
  </span>
{/if}

<style>
  .log {
    display: inline-flex;
    align-items: center;
    gap: var(--gap);
    margin-left: var(--gap);
  }
  .entry {
    display: inline-flex;
    align-items: center;
    gap: calc(var(--gap) * 0.4);
    flex-shrink: 0;
  }
  .mods,
  .outcome {
    font-family: system-ui, sans-serif;
    font-weight: 700;
    font-size: calc(var(--target) * 0.34);
    color: var(--paper);
  }
  .outcome.bad {
    color: #e7b4a8;
  }
  .chip {
    display: inline-grid;
    place-items: center;
    width: calc(var(--target) * 0.8);
    height: calc(var(--target) * 1.05);
    border-radius: 4px;
    background: var(--paper);
    color: var(--ink);
    border: 2px solid var(--ink);
    font-family: system-ui, sans-serif;
    font-weight: 700;
    line-height: 1;
    opacity: 0.7;
  }
  .chip.applies {
    opacity: 1;
    border-color: #a8372a;
  }
  .chip .number {
    font-size: calc(var(--target) * 0.34);
  }
  .chip .context {
    font-size: calc(var(--target) * 0.16);
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }
  .note {
    font-family: system-ui, sans-serif;
    font-size: calc(var(--target) * 0.26);
    color: var(--paper);
    width: max-content;
    max-width: calc(var(--target) * 5);
    line-height: 1.1;
  }
  .badge {
    width: var(--target);
    height: var(--target);
    border-radius: 50%;
    background: #a8372a;
    color: var(--paper);
    border: 3px solid var(--paper);
    display: grid;
    place-items: center;
    font-family: system-ui, sans-serif;
    font-weight: 700;
    font-size: calc(var(--target) * 0.5);
  }
</style>
