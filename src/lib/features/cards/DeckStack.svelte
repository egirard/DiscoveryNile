<script lang="ts">
  // The draw pile and the discard pile on the shared board: stacks whose thickness and tally marks
  // can be read from any seat; the exact count is also given as a small number.
  import type { DeckState } from '$lib/game/state';

  interface Props {
    deck: DeckState;
  }
  let { deck }: Props = $props();
  const layers = (n: number) => Math.min(6, Math.ceil(n / 8));
</script>

<div class="piles" data-testid="deck" aria-label="Draw pile {deck.draw.length} cards, discard pile {deck.discard.length} cards">
  <div class="pile draw" data-testid="deck-draw" data-count={deck.draw.length}>
    {#each Array(layers(deck.draw.length)) as _, i (i)}
      <span class="layer" style="--i:{i}"></span>
    {/each}
    <span class="count">{deck.draw.length}</span>
  </div>
  <div class="pile discard" data-testid="deck-discard" data-count={deck.discard.length}>
    {#each Array(layers(deck.discard.length)) as _, i (i)}
      <span class="layer" style="--i:{i}"></span>
    {/each}
    <span class="count">{deck.discard.length}</span>
  </div>
</div>

<style>
  .piles {
    display: flex;
    gap: calc(var(--target) * 0.5);
  }
  .pile {
    position: relative;
    width: calc(var(--target) * 1.15);
    height: calc(var(--target) * 1.6);
  }
  .layer {
    position: absolute;
    inset: 0;
    translate: calc(var(--i) * -2px) calc(var(--i) * -2px);
    border-radius: 6px;
    border: 2px solid var(--ink);
    background: var(--paper);
    box-sizing: border-box;
  }
  .draw .layer {
    background: #c9a24a;
  }
  .discard .layer {
    background: #b9b09a;
  }
  .count {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    font-family: 'Nile Sans', 'DejaVu Sans', sans-serif;
    font-weight: 700;
    font-size: calc(var(--target) * 0.35);
    color: var(--ink);
    translate: -5px -5px;
  }
</style>
