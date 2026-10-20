<script lang="ts">
  // The log section of a seat's rail (PROMPTS.md, prompts 13, 16, 17, 20 and 35): an outlined box inward of the
  // status row holding the log's latest line, the lost mark when the expedition was lost in its latest turn (a
  // lost check ends the turn there and then, so the mark outlives the turn until the seat's next), and the "+"
  // that opens the rest of the log inside the box, which grows inward to hold a few lines above the latest;
  // the "−" in the "+"'s place collapses it again. Open, the box is shaded with the rail's ink, since it reaches over
  // the board and the lines were unreadable on the map (prompt 62).
  import type { LoggedTurn } from '$lib/game/state';
  import type { Roll } from '$features/map/generate';
  import LogLine from './LogLine.svelte';
  import TurnLog from './TurnLog.svelte';

  interface Props {
    seat: string;
    /** The seat's turns, oldest first, each holding only this seat's lines; the current turn last when it is the seat's. */
    turns: LoggedTurn[];
    /** It is this seat's turn: the last of `turns` is the turn in progress. */
    current?: boolean;
    /** The rest of the log is open in the box above the latest line; "+" opens it and "−" in its place closes it. */
    expanded?: boolean;
    ontoggle?: () => void;
    /** A die in the log was tapped, to set its face (prompt 37): the roll and where the die is drawn. */
    oncorrect?: (roll: Roll, anchor: DOMRect) => void;
  }
  let { seat, turns, expanded = false, ontoggle, oncorrect }: Props = $props();
  const all = $derived(turns.flatMap((t) => t.log));
  const latest = $derived(all.at(-1));
  /** The seat's latest turn: the one in progress when it is the seat's, else the last it played. */
  const latestTurn = $derived(turns.at(-1)?.log ?? []);
  /** Dice rolled in that turn; an action that rolled nothing is not counted. */
  const rolls = $derived(latestTurn.filter((r) => r.kind !== 'action').length);
  const lost = $derived(latestTurn.some((r) => r.lost));
</script>

{#if latest}
  <div class="box" class:expanded data-testid="log-box-{seat}" data-expanded={expanded}>
    {#if ontoggle && expanded}
      <!-- The earlier lines, above the latest so the lines read in order; the latest stays the box's last line. -->
      <TurnLog {seat} {turns} {oncorrect} />
    {/if}
    <span class="latest">
      <span class="log" data-testid="roll-log-{seat}" data-lost={lost} data-rolls={rolls} data-records={all.length} data-turns={turns.length}>
        <LogLine record={latest} {seat} rail {oncorrect} />
        {#if lost}
          <span class="badge" data-testid="lost-badge-{seat}" aria-label="The expedition is lost this turn">?</span>
        {/if}
      </span>
      {#if ontoggle}
        <button class="expand" data-testid="log-expand-{seat}" aria-pressed={expanded} aria-label={expanded ? 'Collapse the log' : 'Open the log'} onclick={ontoggle}>{expanded ? '−' : '+'}</button>
      {/if}
    </span>
  </div>
{/if}

<style>
  .box {
    /* The outline: a pill round the one line, a rounded box round the few lines when open. */
    display: flex;
    flex-direction: column;
    align-items: stretch;
    max-width: 100%;
    min-width: 0;
    border: 2px solid var(--paper);
    border-radius: calc(var(--target) * 0.6);
    padding: 2px calc(var(--gap) * 0.4) 2px var(--gap);
    color: var(--paper);
  }
  .box.expanded {
    /* Open, the box reaches over the board: the rail's ink behind the lines keeps them readable (prompt 62). */
    padding-top: calc(var(--gap) * 0.5);
    background: rgba(28, 42, 46, 0.9);
  }
  .latest {
    display: flex;
    align-items: center;
    gap: calc(var(--gap) * 0.6);
    min-height: var(--target);
    min-width: 0;
  }
  .box.expanded .latest {
    margin-top: calc(var(--gap) * 0.4);
    padding-top: calc(var(--gap) * 0.3);
    border-top: 1px solid rgba(255, 255, 255, 0.35);
  }
  .log {
    display: inline-flex;
    align-items: center;
    gap: calc(var(--gap) * 0.6);
    max-width: calc(var(--target) * 18);
    min-width: 0;
    flex: 1 1 auto;
  }
  .expand {
    margin-left: calc(var(--gap) * 0.3);
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
    flex-shrink: 0;
  }
</style>
