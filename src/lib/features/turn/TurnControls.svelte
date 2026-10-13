<script lang="ts">
  // The current seat's turn controls at its rail: a discard prompt while over the hand limit, otherwise
  // the hourglass that ends the turn and, in Europe, the ship that sails. Each asks for confirmation in
  // its own place (PROMPTS.md, prompt 17; docs/tabletop-ux.md: consequential actions confirm): the tapped
  // control takes a check mark and the other becomes the "✕" that takes it back.
  import type { Phase } from '$lib/game/state';

  interface Props {
    seat: string;
    phase: Phase;
    onend: () => void;
    /** Offered in Europe: opens the port chooser on the board. */
    onsail?: (() => void) | null;
    /** The chooser is open: the ship carries the check mark, the hourglass's place holds the "✕". */
    sailing?: boolean;
    /** A port has been tapped on the board, so the check mark books passage there. */
    portChosen?: boolean;
    onbook?: () => void;
    onstay?: () => void;
    /** Offered while the last action of the turn can still be taken back (no dice rolled, no card drawn). */
    onundo?: (() => void) | null;
  }
  let { seat, phase, onend, onsail = null, sailing = false, portChosen = false, onbook, onstay, onundo = null }: Props = $props();
  let confirming = $state(false);
  $effect(() => {
    if (phase !== 'act' || sailing) confirming = false;
  });
</script>

{#snippet hourglass()}
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12" /><path d="M6 21h12" /><path d="M7.5 3c0 5 4.5 6.5 4.5 9s-4.5 4-4.5 9" /><path d="M16.5 3c0 5-4.5 6.5-4.5 9s4.5 4 4.5 9" /><path d="M9.5 18.5h5" /></svg>
{/snippet}
{#snippet ship()}
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17h18l-2 4H5z" /><path d="M12 3v14" /><path d="M12 3c4 2 6 5 6 9H12" /><path d="M12 6c-3 1-5 3-5 6h5" /></svg>
{/snippet}
{#snippet cross()}
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
{/snippet}

<span class="controls" data-testid="turn-controls-{seat}" data-phase={phase}>
  {#if onundo && !confirming && !sailing}
    <button class="undo" data-testid="undo-{seat}" aria-label="Take back the last action" onclick={onundo}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14L4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-3" /></svg>
    </button>
  {/if}
  {#if phase === 'discard'}
    <span class="prompt" data-testid="discard-prompt-{seat}" aria-label="Over the hand limit: tap a card to discard it">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="5" y="3" width="11" height="15" rx="2" />
        <path d="M8 21h11a2 2 0 0 0 2-2V8" />
        <path d="M13 8l-5 5M8 8l5 5" />
      </svg>
    </span>
  {:else if phase === 'natives'}
    <span class="prompt" data-testid="policy-prompt-{seat}" aria-label="Natives in the hex: choose a policy on the panel">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="7" r="3" /><path d="M5 21v-3a7 7 0 0 1 14 0v3" /><path d="M12 11v4" /></svg>
    </span>
  {:else if phase === 'spoils'}
    <span class="prompt" data-testid="spoils-prompt-{seat}" aria-label="The village is found: deal with the prisoners on the panel">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V9l8-5 8 5v11" /><path d="M10 20v-6h4v6" /></svg>
    </span>
  {:else if phase === 'negotiate' || phase === 'trade'}
    <span class="prompt" data-testid="{phase}-prompt-{seat}" aria-label={phase === 'negotiate' ? 'The chief awaits gifts: negotiate on the panel' : 'Trade on the panel, then finish'}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h18" /><path d="M7 8l-4 4 4 4" /><path d="M17 8l4 4-4 4" /></svg>
    </span>
  {:else if confirming}
    <!-- The "✕" to the left, where the ship stands in Europe; the hourglass keeps its place under the check mark. -->
    <button class="cancel" data-testid="cancel-end-turn-{seat}" aria-label="Keep playing" onclick={() => (confirming = false)}>{@render cross()}</button>
    <button class="confirm sure" data-testid="confirm-end-turn-{seat}" aria-label="Confirm: end the turn" onclick={() => { confirming = false; onend(); }}>
      {@render hourglass()}<span class="tick" aria-hidden="true">✓</span>
    </button>
  {:else if sailing}
    <!-- The ship keeps its place under the check mark; the "✕" takes the hourglass's, to the right. -->
    <button class="confirm" class:sure={portChosen} data-testid="confirm-sail-{seat}" aria-disabled={!portChosen} aria-label={portChosen ? 'Confirm: sail to the chosen port' : 'Choose a port of entry on the map, then confirm here'} onclick={() => portChosen && onbook?.()}>
      {@render ship()}<span class="tick" aria-hidden="true">✓</span>
    </button>
    <button class="cancel" data-testid="cancel-sail-{seat}" aria-label="Stay in Europe" onclick={onstay}>{@render cross()}</button>
  {:else}
    {#if onsail}
      <button class="sail" data-testid="sail-{seat}" aria-label="Sail to Africa" onclick={onsail}>{@render ship()}</button>
    {/if}
    <button class="end" data-testid="end-turn-{seat}" aria-label={onsail ? 'Wait: end the turn in Europe' : 'End the turn'} onclick={() => (confirming = true)}>{@render hourglass()}</button>
  {/if}
</span>

<style>
  .controls {
    display: inline-flex;
    align-items: center;
    gap: var(--gap);
    margin-left: var(--gap);
  }
  button,
  .prompt {
    width: var(--target);
    height: var(--target);
    border-radius: 50%;
    border: 3px solid var(--ink);
    background: var(--paper);
    color: var(--ink);
    display: grid;
    place-items: center;
    cursor: pointer;
    position: relative;
  }
  svg {
    width: 60%;
    fill: none;
    stroke: currentColor;
    stroke-width: 2.2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .confirm.sure {
    background: var(--accent);
  }
  .confirm[aria-disabled='true'] {
    cursor: default;
  }
  .confirm[aria-disabled='true'] .tick {
    opacity: 0.35;
  }
  .tick {
    position: absolute;
    right: -0.15em;
    bottom: -0.15em;
    width: 1.1em;
    height: 1.1em;
    border-radius: 50%;
    background: var(--ink);
    color: var(--paper);
    font-family: 'Nile Sans', 'DejaVu Sans', sans-serif;
    font-weight: 700;
    font-size: 0.8em;
    line-height: 1.1em;
    text-align: center;
  }
  .prompt {
    background: #e7b4a8;
    cursor: default;
  }
  .undo {
    background: var(--paper);
    border-style: dashed;
  }
</style>
