<script lang="ts">
  // A seat's roll for first player, shown in front of its own station as it comes (PROMPTS.md, prompt 27): the
  // four dice and the total, large; once every seat has rolled, the winner's glows and the game begins a few
  // seconds later. Placed by the page in an EdgePanel, turned toward the seat.
  import DiceRoll from '$lib/ui/DiceRoll.svelte';

  interface Props {
    seat: string;
    values: number[];
    /** The first player is decided: this seat's roll won. */
    winner?: boolean;
    /** The first player is decided (so a roll that did not win is shown as beaten). */
    decided?: boolean;
  }
  let { seat, values, winner = false, decided = false }: Props = $props();
  const total = $derived(values.reduce((a, b) => a + b, 0));
</script>

<div class="roll" data-testid="first-player-roll-{seat}" data-total={total} data-winner={winner} data-decided={decided} aria-label="{seat} rolled {values.join(', ')} for first player, total {total}{winner ? ': first player' : ''}">
  <span class="what">{winner ? 'First player' : 'For first player'}</span>
  <DiceRoll {values} label="for first player" size="calc(var(--target) * 0.5)" />
  <span class="total">{total}</span>
</div>

<style>
  .roll {
    display: flex;
    align-items: center;
    gap: calc(var(--gap) * 1.2);
    padding: calc(var(--gap) * 0.6) calc(var(--gap) * 1.4);
    border-radius: 12px;
    font-family: 'Nile Sans', 'DejaVu Sans', sans-serif;
    color: var(--ink);
  }
  .what {
    font-size: calc(var(--target) * 0.3);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    opacity: 0.8;
  }
  .total {
    font-size: calc(var(--target) * 0.9);
    font-weight: 700;
    line-height: 1;
    min-width: 1.4em;
    text-align: right;
  }
  .roll[data-decided='true'][data-winner='false'] {
    opacity: 0.55;
  }
  .roll[data-winner='true'] {
    background: #f6ecc8;
    box-shadow:
      0 0 0 4px #e0b44c,
      0 0 28px 10px rgba(240, 190, 70, 0.85),
      0 0 60px 24px rgba(240, 190, 70, 0.45);
    animation: glow 1.6s ease-in-out infinite alternate;
  }
  .roll[data-winner='true'] .what {
    opacity: 1;
    color: #8a5a00;
  }
  @keyframes glow {
    from {
      box-shadow:
        0 0 0 4px #e0b44c,
        0 0 28px 10px rgba(240, 190, 70, 0.85),
        0 0 60px 24px rgba(240, 190, 70, 0.45);
    }
    to {
      box-shadow:
        0 0 0 4px #e0b44c,
        0 0 40px 16px rgba(240, 190, 70, 0.95),
        0 0 90px 36px rgba(240, 190, 70, 0.6);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .roll[data-winner='true'] {
      animation: none;
    }
  }
</style>
