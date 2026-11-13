<script lang="ts">
  // What the dice just decided (PROMPTS.md, prompts 54 and 55): once the last die of the hunt, of the natives' nerve
  // or of a fight is in, the ask stays at the seat's edge for a moment with the lines it made, every number in them
  // (the die and its modifiers, the rate a hunter, the rations and the stores; the nerve against the warriors), so the
  // result is read before the table moves on. "Carry on" dismisses it sooner. The dice can be tapped to be set right.
  // A hex explored with moves left (prompt 65) keeps its result instead: "Explored a jungle hex", then the prompt to
  // move (prompt 74: "You have 2 MP: pick a hex to move into, or END TURN", the last words the control), the lines at
  // the foot; the next step on the board takes it away.
  import LogLine from '$features/exploration/LogLine.svelte';
  import type { RollRecord } from '$lib/game/state';
  import type { Roll } from '$features/map/generate';
  import { resultTitle } from './linger';
  import { movePromptText } from '$features/turn/move-prompt';

  interface Props {
    seat: string;
    /** The ask the last throw answered. */
    prompt: string;
    lines: RollRecord[];
    /** A hex explored with moves left (prompt 65): the result stays, offering the next step or the end of the turn. */
    explored?: { hex: string; terrain: string | null } | null;
    /** Movement points left for the next step (prompt 74), named in the explored hex's prompt. */
    left?: number | null;
    ondone: () => void;
    /** End the turn from the panel (an explored hex). */
    onend?: () => void;
    oncorrect?: (roll: Roll, anchor: DOMRect) => void;
  }
  let { seat, prompt, lines, explored = null, left = null, ondone, onend, oncorrect }: Props = $props();
  const terrainWords = $derived(explored?.terrain ? explored.terrain.replace(/-/g, ' ') : 'new');
  const heading = $derived(explored ? `Explored a ${terrainWords} hex` : resultTitle(prompt));
</script>

<div class="result" data-testid="dice-result-{seat}" data-lines={lines.length} data-explored={explored?.hex ?? ''} role="status" aria-label="{heading}: what the dice decided">
  <p class="title" data-testid="dice-result-title-{seat}">{heading}</p>
  {#if explored}
    <!-- The hex is explored and moves are left (prompt 65): the next step is picked on the board, or the turn ends here. -->
    <p class="next" data-testid="dice-result-next-{seat}">
      <span data-testid="dice-result-next-text-{seat}">{movePromptText(left)}</span>
      <button type="button" class="end" data-testid="dice-result-end-{seat}" aria-label="End the turn" onclick={onend}>END TURN</button>
    </p>
  {/if}
  <!-- The newest line on top (prompt 72), as in the ask's panel: the lost check lowest, what was decided last first. -->
  <ul class="lines" data-order="newest-first" aria-label="What the dice decided, the newest first">
    {#each [...lines].reverse() as r, i (lines.length - 1 - i)}
      <li><LogLine record={r} {seat} idPrefix="result-" {oncorrect} /></li>
    {/each}
  </ul>
  {#if !explored}
    <button type="button" class="carry-on" data-testid="dice-result-ok-{seat}" onclick={ondone}>Carry on</button>
  {/if}
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
  .next {
    margin: 0;
    display: flex;
    align-items: center;
    gap: var(--gap);
    font-size: calc(var(--target) * 0.3);
    font-weight: 700;
  }
  .next .end {
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
