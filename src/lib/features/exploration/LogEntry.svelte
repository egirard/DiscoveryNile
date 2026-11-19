<script lang="ts">
  // One entry of the log (PROMPTS.md, prompt 90): the brief line, and behind a control at its end the complete
  // version, every line of the operation with its dice. At the rail the brief line stands alone on one line.
  import type { Roll } from '$features/map/generate';
  import LogLine from './LogLine.svelte';
  import { hasMore, type LogEntryData } from './entries';

  interface Props {
    entry: LogEntryData;
    seat: string;
    /** At the rail: one line, cut with an ellipsis, with no control of its own. */
    rail?: boolean;
    /** Put before the ids of the controls, where the entry is shown twice (the rail's latest and the list). */
    idPrefix?: string;
    oncorrect?: (roll: Roll, anchor: DOMRect) => void;
  }
  let { entry, seat, rail = false, idPrefix = '', oncorrect }: Props = $props();
  let open = $state(false);
  const last = $derived(entry.lines.at(-1)!);
  const lost = $derived(entry.lines.some((r) => r.lost));
  const more = $derived(!rail && hasMore(entry));
</script>

<span class="entry" class:rail data-testid="{idPrefix}log-entry-{entry.index}-{seat}" data-open={open} data-lines={entry.lines.length} data-summary={entry.summary ?? ''}>
  <span class="brief">
    {#if entry.summary !== null}
      <span class="summary" data-testid="{idPrefix}log-summary-{entry.index}-{seat}" data-lost={lost}>
        <span class="outcome" class:bad={lost}>{entry.summary}</span>
      </span>
    {:else}
      <LogLine record={last} {seat} {rail} oncorrect={rail ? undefined : oncorrect} />
    {/if}
    {#if more}
      <button type="button" class="more" data-testid="{idPrefix}log-more-{entry.index}-{seat}" aria-expanded={open} aria-label={open ? 'Show the brief line only' : 'Show every line of this entry'} onclick={() => (open = !open)}>{open ? '▾' : '▸'}</button>
    {/if}
  </span>
  <!-- The complete version: every line of the operation with its dice, or the asks a single line's dice answered.
       It is kept in the page while shut, so what a line holds can be read without opening it. -->
  {#if entry.summary !== null || hasMore(entry)}
    <span class="complete" hidden={!open} data-testid="{idPrefix}log-lines-{entry.index}-{seat}">
      {#each entry.lines as r, i (i)}
        <LogLine record={r} {seat} idPrefix={entry.summary === null ? 'full-' : ''} asks {oncorrect} />
      {/each}
    </span>
  {/if}
</span>

<style>
  .entry {
    display: grid;
    gap: calc(var(--gap) * 0.4);
    min-width: 0;
    font-family: 'Nile Sans', 'DejaVu Sans', sans-serif;
    font-size: calc(var(--target) * 0.26);
    line-height: 1.2;
  }
  .brief {
    display: flex;
    align-items: center;
    gap: calc(var(--gap) * 0.5);
    min-width: 0;
  }
  .summary {
    min-width: 0;
    font-weight: 700;
  }
  .rail .summary {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .outcome.bad {
    color: #e7b4a8;
  }
  .more {
    flex-shrink: 0;
    width: var(--target);
    height: var(--target);
    border-radius: 50%;
    border: 2px solid currentColor;
    background: transparent;
    color: inherit;
    font-size: calc(var(--target) * 0.42);
    line-height: 1;
    cursor: pointer;
  }
  .complete[hidden] {
    display: none;
  }
  .complete {
    display: grid;
    gap: calc(var(--gap) * 0.4);
    padding-left: calc(var(--gap) * 0.8);
    border-left: 2px solid rgba(255, 255, 255, 0.35);
  }
</style>
