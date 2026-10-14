<script lang="ts">
  // The log at a seat's rail (PROMPTS.md, prompts 13, 16, 17 and 20): its latest line, the lost mark when the
  // expedition was lost in its latest turn (a lost check ends the turn there and then, so the mark outlives
  // the turn until the seat's next), and the "+" that opens the rest of the log directly above, where the
  // list's "−" sits in line with the "−" that takes the "+"'s place.
  import type { LoggedTurn } from '$lib/game/state';
  import LogLine from './LogLine.svelte';
  import TurnLog from './TurnLog.svelte';

  interface Props {
    seat: string;
    /** The seat's turns, oldest first, each holding only this seat's lines; the current turn last when it is the seat's. */
    turns: LoggedTurn[];
    /** It is this seat's turn: the last of `turns` is the turn in progress. */
    current?: boolean;
    /** The rest of the log is open above the rail; "+" opens it and "−" in its place closes it. */
    expanded?: boolean;
    ontoggle?: () => void;
  }
  let { seat, turns, current = false, expanded = false, ontoggle }: Props = $props();
  const all = $derived(turns.flatMap((t) => t.log));
  const latest = $derived(all.at(-1));
  /** The seat's latest turn: the one in progress when it is the seat's, else the last it played. */
  const latestTurn = $derived(turns.at(-1)?.log ?? []);
  /** Dice rolled in that turn; an action that rolled nothing is not counted. */
  const rolls = $derived(latestTurn.filter((r) => r.kind !== 'action').length);
  const lost = $derived(latestTurn.some((r) => r.lost));
  void current;
</script>

{#if latest}
  <span class="log-area">
    {#if ontoggle && expanded}
      <!-- Directly above the line, its right edge on the "−" below it, so the list reads as the lines before the rail's; first in the document so the lines read in order. -->
      <div class="panel" data-testid="turn-log-edge-{seat}" data-seat={seat} data-e2e-fit>
        <TurnLog {seat} {turns} onclose={ontoggle} />
      </div>
    {/if}
    <span class="log" data-testid="roll-log-{seat}" data-lost={lost} data-rolls={rolls} data-records={all.length} data-turns={turns.length}>
      <LogLine record={latest} {seat} rail />
      {#if lost}
        <span class="badge" data-testid="lost-badge-{seat}" aria-label="The expedition is lost this turn">?</span>
      {/if}
    </span>
    {#if ontoggle}
      <button class="expand" data-testid="log-expand-{seat}" aria-pressed={expanded} aria-label={expanded ? 'Close the log' : 'Show the log'} onclick={ontoggle}>{expanded ? '−' : '+'}</button>
    {/if}
  </span>
{/if}

<style>
  .log-area {
    position: relative;
    display: inline-flex;
    align-items: center;
    margin-left: var(--gap);
    --panel-pad: calc(var(--gap) * 1.2);
  }
  .log {
    display: inline-flex;
    align-items: center;
    gap: calc(var(--gap) * 0.6);
    max-width: calc(var(--target) * 12.5);
    max-height: calc(var(--rail-depth) - var(--gap));
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
  .panel {
    position: absolute;
    bottom: calc(100% + var(--gap) * 0.6);
    right: calc(-1 * var(--panel-pad) - 3px);
    background: var(--paper);
    color: var(--ink);
    border: 3px solid var(--ink);
    border-radius: 12px;
    padding: var(--panel-pad);
    box-shadow: 0 4px 18px rgba(0, 0, 0, 0.4);
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
    flex-shrink: 0;
  }
</style>
