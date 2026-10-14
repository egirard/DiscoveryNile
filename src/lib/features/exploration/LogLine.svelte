<script lang="ts">
  // One line of the log, as the rail shows its latest and the open list shows the rest: what kind of
  // record, the disaster card if one was drawn, the dice, the modifiers that applied and the outcome.
  // Colours come from the container (paper on the rail's ink, ink on the panel's paper).
  import type { RollRecord } from '$lib/game/state';
  import DiceRoll from '$lib/ui/DiceRoll.svelte';
  import { card as cardOf } from '$features/cards/deck';

  interface Props {
    record: RollRecord;
    seat: string;
    /** At the rail: paper on ink, modifiers as bare numbers. The ids (`roll-{kind}-{seat}`, the notes, the card) are the same in the list. */
    rail?: boolean;
  }
  let { record: r, seat, rail = false }: Props = $props();
  const KIND: Record<string, string> = {
    'first-player': 'First player', 'lost-check': 'Lost check', terrain: 'Terrain', natives: 'Natives', disaster: 'Disaster card', hunting: 'Hunting', water: 'Water',
    reaction: 'Native reaction', combat: 'Fight', defeat: 'Defeat', captivity: 'Captivity', victory: 'Victory', loot: 'Loot', negotiation: 'Negotiation',
    poison: 'Poison', trade: 'Trade', sickness: 'Sickness', specialty: 'Specialty', cache: 'Cache', published: 'Published', transit: 'Transit', party: 'Joint expedition', river: 'River', oasis: 'Oasis'
  };
  const name = (kind: string) => KIND[kind] ?? kind.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
  /** The rail's note ids kept from the one-line log: `meal-note` for the hunt, `{kind}-note` otherwise. */
  const note = $derived(r.kind === 'hunting' ? 'meal' : r.kind);
  const label = $derived(`${name(r.kind)}: ${r.needed ? `needs ${r.needed}; ` : ''}${r.rolls.map((x) => `${x.label} ${x.value}`).join(', ')}${r.modifiers?.length ? '; ' + r.modifiers.map((m) => `${m.label} ${m.value > 0 ? '+' : ''}${m.value}`).join(', ') : ''}${r.total !== undefined && r.modifiers?.length ? ` = ${r.total}` : ''}; ${r.outcome}`);
</script>

<span class="line" class:rail data-testid="roll-{r.kind}-{seat}" data-kind={r.kind} data-outcome={r.outcome} data-lost={r.lost ?? false} data-total={r.total ?? ''} data-needed={r.needed ?? ''} aria-label={label}>
  {#if r.kind === 'action'}
    <span class="action" data-testid="action-note-{seat}">{r.outcome}</span>
  {:else}
    <span class="kind">{name(r.kind)}</span>
    {#if r.kind === 'disaster' && r.card}
      <span class="chip" class:applies={r.applies} data-testid="disaster-card-{seat}" data-card={r.card} data-applies={r.applies}>
        <span class="number">{cardOf(r.card).number}</span>
        <span class="context">{r.applies ? cardOf(r.card).disaster.type.replace(/\s*\(.*$/, '') : 'no effect'}</span>
      </span>
    {/if}
    {#if r.needed}
      <span class="needed" data-testid="{note}-needed-{seat}">needs {r.needed}</span>
    {/if}
    {#if r.rolls.length}
      <DiceRoll values={r.rolls.slice(0, 6).map((x) => x.value)} label={r.kind} size="calc(var(--target) * 0.4)" />
      {#if r.rolls.length > 6}<span class="more" aria-hidden="true">+{r.rolls.length - 6}</span>{/if}
    {/if}
    {#if r.modifiers?.length}
      <span class="mods">{rail ? r.modifiers.map((m) => (m.value > 0 ? `+${m.value}` : m.value === 0 ? '' : `${m.value}`)).filter(Boolean).join(' ') : r.modifiers.map((m) => `${m.label} ${m.value > 0 ? '+' : ''}${m.value}`).join(', ')}</span>
      {#if r.total !== undefined && r.rolls.length}<span class="total" data-testid="{note}-total-{seat}">= {r.total}</span>{/if}
    {/if}
    <span class="outcome" class:bad={r.lost} data-testid="{note}-note-{seat}">{r.outcome}</span>
  {/if}
</span>

<style>
  .line {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: calc(var(--gap) * 0.4) calc(var(--gap) * 0.6);
    font-family: 'Nile Sans', 'DejaVu Sans', sans-serif;
    font-size: calc(var(--target) * 0.26);
    line-height: 1.2;
  }
  .kind {
    font-weight: 700;
  }
  .mods {
    opacity: 0.8;
  }
  .needed {
    opacity: 0.8;
    font-style: italic;
  }
  .total {
    font-weight: 700;
  }
  .rail .mods {
    font-weight: 700;
    opacity: 1;
  }
  .outcome.bad {
    color: #a8372a;
    font-weight: 700;
  }
  .rail .outcome.bad {
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
  .more {
    font-weight: 700;
  }
</style>
