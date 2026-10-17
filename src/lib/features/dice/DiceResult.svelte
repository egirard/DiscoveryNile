<script lang="ts">
  // What the dice just decided (PROMPTS.md, prompts 54 and 55): once the last die of the hunt, of the natives' nerve
  // or of a fight is in, the ask stays at the seat's edge for a moment with the lines it made, every number in them
  // (the die and its modifiers, the rate a hunter, the rations and the stores; the nerve against the warriors), so the
  // result is read before the table moves on. "Carry on" dismisses it sooner. The dice can be tapped to be set right.
  import LogLine from '$features/exploration/LogLine.svelte';
  import type { RollRecord } from '$lib/game/state';
  import type { Roll } from '$features/map/generate';
  import { resultTitle } from './linger';

  interface Props {
    seat: string;
    /** The ask the last throw answered. */
    prompt: string;
    lines: RollRecord[];
    ondone: () => void;
    oncorrect?: (roll: Roll, anchor: DOMRect) => void;
  }
  let { seat, prompt, lines, ondone, oncorrect }: Props = $props();
</script>

<div class="result" data-testid="dice-result-{seat}" data-lines={lines.length} role="status" aria-label="{resultTitle(prompt)}: what the dice decided">
  <p class="title" data-testid="dice-result-title-{seat}">{resultTitle(prompt)}</p>
  <ul class="lines" aria-label="What the dice decided">
    {#each lines as r, i (i)}
      <li><LogLine record={r} {seat} idPrefix="result-" {oncorrect} /></li>
    {/each}
  </ul>
  <button type="button" class="carry-on" data-testid="dice-result-ok-{seat}" onclick={ondone}>Carry on</button>
</div>

<style>
  .result {
    display: grid;
    gap: calc(var(--gap) * 0.6);
    width: calc(var(--target) * 10);
    font-family: 'Nile Sans', 'DejaVu Sans', sans-serif;
  }
  .title {
    margin: 0;
    font-size: calc(var(--target) * 0.42);
    font-weight: 700;
    line-height: 1.2;
  }
  .lines {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: calc(var(--gap) * 0.4);
  }
  .carry-on {
    justify-self: end;
    height: var(--target);
    padding: 0 calc(var(--gap) * 1.2);
    border: 2px solid var(--ink);
    border-radius: 8px;
    background: var(--accent);
    color: var(--ink);
    font: inherit;
    font-size: calc(var(--target) * 0.3);
    font-weight: 700;
    cursor: pointer;
  }
</style>
