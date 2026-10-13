<script lang="ts">
  // The log opened from the "+" at the rail (PROMPTS.md, prompts 13, 16 and 17): every line of every
  // turn the seat has played, round by round, but the latest, which stays on the rail directly below
  // this list. A short list that scrolls, kept at its end where the newest lines are.
  import type { LoggedTurn, RollRecord } from '$lib/game/state';
  import LogLine from './LogLine.svelte';

  interface Props {
    seat: string;
    /** The seat's turns, oldest first, each holding only this seat's lines. */
    turns: LoggedTurn[];
    onclose: () => void;
  }
  let { seat, turns, onclose }: Props = $props();
  const groups = $derived.by(() => {
    const flat = turns.flatMap((t) => t.log.map((r) => ({ round: t.round, r })));
    const listed = flat.slice(0, -1); // the latest line is the rail's
    const out: { round: number; entries: { r: RollRecord; i: number }[] }[] = [];
    listed.forEach((e, i) => {
      const g = out.at(-1);
      if (g && g.round === e.round) g.entries.push({ r: e.r, i });
      else out.push({ round: e.round, entries: [{ r: e.r, i }] });
    });
    return out;
  });
  const count = $derived(groups.reduce((n, g) => n + g.entries.length, 0));
  let list: HTMLElement | undefined = $state();
  $effect(() => {
    // The newest lines are at the end: keep the list scrolled there as it opens and as lines arrive.
    void count;
    if (list) list.scrollTop = list.scrollHeight;
  });
</script>

<div class="turn-log" data-testid="turn-log-{seat}" data-count={count}>
  <div class="head">
    <h3>The log</h3>
    <button class="close" data-testid="turn-log-close-{seat}" aria-label="Close the log" onclick={onclose}>−</button>
  </div>
  <ol class="entries" bind:this={list} data-testid="turn-log-entries-{seat}">
    {#if count === 0}
      <li class="empty">Nothing before the line below.</li>
    {/if}
    {#each groups as g, k (k)}
      <li class="round" data-testid="turn-log-round-{g.round}-{seat}">{g.round === 0 ? 'First player' : `Round ${g.round}`}</li>
      {#each g.entries as e (e.i)}
        <li class="entry" data-testid="turn-log-entry-{e.i}-{seat}" data-kind={e.r.kind} data-outcome={e.r.outcome} data-lost={e.r.lost ?? false} data-total={e.r.total ?? ''}>
          <LogLine record={e.r} {seat} />
        </li>
      {/each}
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
    /* A short list; a long game scrolls here rather than growing over the board. */
    margin: calc(var(--gap) * 0.5) 0 0;
    padding: 0 calc(var(--gap) * 0.5) 0 0;
    list-style: none;
    display: grid;
    gap: calc(var(--gap) * 0.5);
    max-height: calc(var(--target) * 4.5);
    overflow-y: auto;
  }
  .round {
    font-size: calc(var(--target) * 0.22);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    opacity: 0.6;
    margin-top: calc(var(--gap) * 0.3);
  }
  .round:first-child {
    margin-top: 0;
  }
  .empty {
    font-size: calc(var(--target) * 0.26);
    opacity: 0.6;
  }
</style>
