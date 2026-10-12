<script lang="ts">
  // This turn's rolls for one seat, shown at its rail: dice, the modifiers that applied, the outcome.
  import type { RollRecord } from '$lib/game/state';
  import DiceRoll from '$lib/ui/DiceRoll.svelte';

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
        {#if r.rolls.length}
          <DiceRoll values={r.rolls.map((x) => x.value)} label={r.kind} size="calc(var(--target) * 0.55)" />
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
