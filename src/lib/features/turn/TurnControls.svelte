<script lang="ts">
  // The current seat's turn controls at its rail: a discard prompt while over the hand limit,
  // otherwise an end-turn control that asks for confirmation at the player's edge
  // (docs/tabletop-ux.md: consequential actions confirm at the edge).
  import type { Phase } from '$lib/game/state';

  interface Props {
    seat: string;
    phase: Phase;
    onend: () => void;
    /** Offered in Europe: opens the port chooser on the board. */
    onsail?: (() => void) | null;
    sailing?: boolean;
  }
  let { seat, phase, onend, onsail = null, sailing = false }: Props = $props();
  let confirming = $state(false);
  $effect(() => {
    if (phase !== 'act') confirming = false;
  });
</script>

<span class="controls" data-testid="turn-controls-{seat}" data-phase={phase}>
  {#if phase === 'discard'}
    <span class="prompt" data-testid="discard-prompt-{seat}" aria-label="Over the hand limit: tap a card to discard it">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="5" y="3" width="11" height="15" rx="2" />
        <path d="M8 21h11a2 2 0 0 0 2-2V8" />
        <path d="M13 8l-5 5M8 8l5 5" />
      </svg>
    </span>
  {:else if confirming}
    <button class="confirm" data-testid="confirm-end-turn-{seat}" aria-label="Confirm: end the turn" onclick={() => { confirming = false; onend(); }}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>
    </button>
    <button class="cancel" data-testid="cancel-end-turn-{seat}" aria-label="Keep playing" onclick={() => (confirming = false)}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
    </button>
  {:else}
    {#if onsail}
      <button class="sail" class:active={sailing} data-testid="sail-{seat}" aria-label={sailing ? 'Choose a port of entry on the map, or tap again to stay' : 'Sail to Africa'} aria-pressed={sailing} onclick={onsail}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17h18l-2 4H5z" /><path d="M12 3v14" /><path d="M12 3c4 2 6 5 6 9H12" /><path d="M12 6c-3 1-5 3-5 6h5" /></svg>
      </button>
    {/if}
    <button class="end" data-testid="end-turn-{seat}" aria-label="End the turn" onclick={() => (confirming = true)}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h12" /><path d="M12 6l6 6-6 6" /><path d="M20 5v14" /></svg>
    </button>
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
  }
  svg {
    width: 60%;
    fill: none;
    stroke: currentColor;
    stroke-width: 2.2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .confirm {
    background: var(--accent);
  }
  .sail.active {
    background: var(--accent);
  }
  .prompt {
    background: #e7b4a8;
    cursor: default;
  }
</style>
