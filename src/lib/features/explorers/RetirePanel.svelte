<script lang="ts">
  // Retiring an explorer (rules §12): confirmed at the player's edge, since every unpublished hex he alone visited is erased.
  interface Props {
    seat: string;
    where: string;
    /** Ending by consensus (RQ-10): this seat's vote, and the tally so far. */
    voted: boolean;
    votes: number;
    voters: number;
    onconfirm: () => void;
    oncancel: () => void;
    onvote: () => void;
  }
  let { seat, where, voted, votes, voters, onconfirm, oncancel, onvote }: Props = $props();
</script>

<div class="panel" data-testid="retire-panel-{seat}">
  <p class="text">Retire the explorer {where}? His markers come off, and every unpublished hex nobody else has visited is erased. Points already scored stay.</p>
  <div class="row">
    <button class="confirm" data-testid="retire-confirm-{seat}" aria-label="Confirm: retire the explorer" onclick={onconfirm}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>
    </button>
    <button class="cancel" data-testid="retire-cancel-{seat}" aria-label="Keep exploring" onclick={oncancel}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
    </button>
  </div>
  <p class="text">Or vote to end the game: when every seat has voted, all explorers retire, those in Europe publishing first, and the most points win. Votes so far: {votes} of {voters}.</p>
  <div class="row">
    <button class="vote" class:on={voted} data-testid="end-vote-{seat}" aria-pressed={voted} aria-label={voted ? 'Withdraw the vote to end the game' : 'Vote to end the game'} onclick={onvote}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4z" /><path d="M8 12l3 3 5-6" /></svg>
      <span class="tally" data-testid="end-votes-{seat}">{votes}/{voters}</span>
    </button>
  </div>
</div>

<style>
  .panel {
    display: grid;
    gap: calc(var(--gap) * 0.6);
    width: calc(var(--target) * 7);
    font-family: system-ui, sans-serif;
    color: var(--ink);
  }
  .text {
    margin: 0;
    font-size: calc(var(--target) * 0.3);
    line-height: 1.3;
  }
  .row {
    display: flex;
    gap: var(--gap);
    justify-content: center;
  }
  button {
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
  .confirm {
    background: var(--accent);
  }
  .vote {
    width: auto;
    padding: 0 calc(var(--target) * 0.3);
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    gap: 0.3em;
    font-size: calc(var(--target) * 0.3);
    font-weight: 700;
  }
  .vote.on {
    background: var(--accent);
  }
  svg {
    width: 60%;
    fill: none;
    stroke: currentColor;
    stroke-width: 2.2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
</style>
