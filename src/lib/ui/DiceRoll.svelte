<script lang="ts">
  // Dice faces with pips: omnidirectional, so every seat reads a roll the same way. Given `ontap`, the dice are one
  // touch target (PROMPTS.md, prompt 37): a tap names the die nearest the finger, so a die in the log can be set right;
  // the target is a touch target tall and wide whatever the dice measure, without moving the line round it.
  interface Props {
    values: number[];
    label: string;
    testid?: string;
    size?: string;
    /** Many dice: let the row wrap. */
    wrap?: boolean;
    /** A tap on the dice, with the die tapped and where it is drawn. */
    ontap?: (index: number, anchor: DOMRect) => void;
    /** Dice whose face was set by hand (prompt 37), marked with a dot. */
    marks?: boolean[];
  }
  import { PIPS } from './pips';
  let { values, label, testid, size = 'calc(var(--target) * 0.7)', wrap = false, ontap, marks = [] }: Props = $props();
  const total = $derived(values.reduce((a, b) => a + b, 0));
  /** The die nearest the tap, by its drawn centre. */
  function pick(e: MouseEvent) {
    const dice = Array.from((e.currentTarget as HTMLElement).querySelectorAll<SVGElement>('.die'));
    if (dice.length === 0) return;
    let best = 0;
    let nearest = Infinity;
    dice.forEach((d, i) => {
      const r = d.getBoundingClientRect();
      const dist = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
      if (dist < nearest) {
        nearest = dist;
        best = i;
      }
    });
    ontap?.(best, dice[best].getBoundingClientRect());
  }
</script>

{#snippet faces()}
  {#each values as v, i (i)}
    <svg class="die" viewBox="0 0 24 24" data-value={v} data-corrected={marks[i] ? 'true' : undefined} aria-hidden="true">
      <rect x="1" y="1" width="22" height="22" rx="4" />
      {#each PIPS[v] ?? [] as [x, y], j (j)}
        <circle cx={x} cy={y} r="2.3" />
      {/each}
      {#if marks[i]}
        <circle class="mark" cx="20.5" cy="3.5" r="3.2" />
      {/if}
    </svg>
  {/each}
{/snippet}

{#if ontap}
  <button type="button" class="dice tap" class:wrap data-testid={testid} data-total={total} aria-label="{label}: rolled {values.join(', ')}, total {total}; tap a die to set its face" style="--die:{size}; --n:{values.length}" onclick={pick}>
    {@render faces()}
  </button>
{:else}
  <span class="dice" class:wrap data-testid={testid} data-total={total} aria-label="{label}: rolled {values.join(', ')}, total {total}" style="--die:{size}">
    {@render faces()}
  </span>
{/if}

<style>
  .dice {
    display: inline-flex;
    align-items: center;
    gap: calc(var(--die) * 0.12);
  }
  .wrap {
    flex-wrap: wrap;
    row-gap: calc(var(--die) * 0.2);
  }
  .die {
    width: var(--die);
    height: var(--die);
  }
  .die rect {
    fill: var(--paper);
    stroke: var(--ink);
    stroke-width: 1.5;
  }
  .die circle {
    fill: var(--ink);
  }
  .die .mark {
    fill: var(--accent, #c9a24a);
    stroke: var(--ink);
    stroke-width: 1;
  }
  /* The target: a touch target tall, at least one wide, its margins pulling the line back over the padding so the
     dice take the room they always did. */
  .tap {
    --natural: calc(var(--n) * var(--die) + (var(--n) - 1) * var(--die) * 0.12);
    justify-content: center;
    min-width: var(--target);
    height: var(--target);
    margin-inline: min(0px, calc((var(--natural) - var(--target)) / 2));
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    cursor: pointer;
    flex-shrink: 0;
  }
</style>
