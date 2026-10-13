<script lang="ts">
  // This turn's rolls for one seat, shown at its rail: dice, the modifiers that applied, the outcome.
  import type { RollRecord } from '$lib/game/state';
  import DiceRoll from '$lib/ui/DiceRoll.svelte';
  import { card as cardOf } from '$features/cards/deck';

  interface Props {
    seat: string;
    log: RollRecord[];
    /** The full list of the turn is open at the seat's edge; "+" opens it and "−" in its place closes it. */
    expanded?: boolean;
    ontoggle?: () => void;
  }
  let { seat, log, expanded = false, ontoggle }: Props = $props();
  const mine = $derived(log.filter((r) => r.seat === seat));
  const lost = $derived(mine.some((r) => r.lost));
</script>

{#if mine.length}
  <span class="log" data-testid="roll-log-{seat}" data-lost={lost}>
    {#each mine as r, i (i)}
      {@const recent = i >= mine.length - 2}
      <span class="entry" data-testid="roll-{r.kind}-{seat}" data-outcome={r.outcome} data-lost={r.lost ?? false} data-total={r.total ?? ''} aria-label="{r.kind}: {r.rolls.map((x) => `${x.label} ${x.value}`).join(', ')}{r.modifiers?.length ? '; ' + r.modifiers.map((m) => `${m.label} ${m.value > 0 ? '+' : ''}${m.value}`).join(', ') : ''}; {r.outcome}">
        {#if r.kind === 'disaster' && r.card}
          <span class="chip" class:applies={r.applies} data-testid="disaster-card-{seat}" data-card={r.card} data-applies={r.applies}>
            <span class="number">{cardOf(r.card).number}</span>
            <span class="context">{r.applies ? cardOf(r.card).disaster.type.replace(/\s*\(.*$/, '') : 'no effect'}</span>
          </span>
        {/if}
        {#if r.rolls.length}
          <DiceRoll values={r.rolls.slice(0, 6).map((x) => x.value)} label={r.kind} size="calc(var(--target) * 0.45)" />
          {#if r.rolls.length > 6}<span class="more" aria-hidden="true">+{r.rolls.length - 6}</span>{/if}
        {/if}
        <!-- Only the two latest records spell out their note; older ones keep their dice (the note stays in the label). -->
        {#if recent && r.kind === 'disaster' && r.applies}
          <span class="note" data-testid="disaster-note-{seat}">{r.outcome}</span>
        {:else if recent && r.kind === 'hunting'}
          <span class="note" data-testid="meal-note-{seat}">{r.outcome}</span>
        {:else if recent && r.kind === 'natives'}
          <span class="note" data-testid="natives-note-{seat}">{r.outcome}</span>
        {:else if recent && (r.kind === 'reaction' || r.kind === 'combat' || r.kind === 'defeat' || r.kind === 'captivity' || r.kind === 'victory' || r.kind === 'loot' || r.kind === 'negotiation' || r.kind === 'poison' || r.kind === 'trade' || r.kind === 'specialty' || r.kind === 'cache' || r.kind === 'published' || r.kind === 'transit' || r.kind === 'party')}
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
  <!-- Beside the log rather than inside it, so a long turn's overflow never pushes the control off the table. -->
  {#if ontoggle}
    <button class="expand" data-testid="log-expand-{seat}" aria-pressed={expanded} aria-label={expanded ? 'Close the full list of this turn' : 'Show everything that happened this turn'} onclick={ontoggle}>{expanded ? '−' : '+'}</button>
  {/if}
{/if}

<style>
  .log {
    /* The turn's records wrap into rows so a long turn (natives, reaction, fight, spoils) stays on the rail. */
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    align-content: center;
    gap: calc(var(--gap) * 0.4) var(--gap);
    margin-left: var(--gap);
    max-width: calc(var(--target) * 12.5);
    max-height: calc(var(--rail-depth) - var(--gap));
  }
  .entry {
    display: inline-flex;
    align-items: center;
    gap: calc(var(--gap) * 0.4);
    flex-shrink: 0;
  }
  .mods,
  .outcome {
    font-family: 'Nile Sans', 'DejaVu Sans', sans-serif;
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
    font-family: 'Nile Sans', 'DejaVu Sans', sans-serif;
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
    font-family: 'Nile Sans', 'DejaVu Sans', sans-serif;
    font-size: calc(var(--target) * 0.22);
    color: var(--paper);
    width: max-content;
    max-width: calc(var(--target) * 3.5);
    line-height: 1.1;
  }
  .more {
    font-family: 'Nile Sans', 'DejaVu Sans', sans-serif;
    font-weight: 700;
    font-size: calc(var(--target) * 0.26);
    color: var(--paper);
  }
  .expand {
    margin-left: calc(var(--gap) * 0.5);
    width: var(--target);
    height: var(--target);
    border-radius: 50%;
    border: 2px solid var(--paper);
    background: transparent;
    color: var(--paper);
    font-family: 'Nile Sans', 'DejaVu Sans', sans-serif;
    font-weight: 700;
    font-size: calc(var(--target) * 0.5);
    line-height: 1;
    cursor: pointer;
    flex-shrink: 0;
  }
  .expand[aria-pressed='true'] {
    background: var(--paper);
    color: var(--ink);
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
    font-family: 'Nile Sans', 'DejaVu Sans', sans-serif;
    font-weight: 700;
    font-size: calc(var(--target) * 0.5);
  }
</style>
