<script lang="ts">
  // The turn's disaster card, shown in full at the player's edge before anything happens (PROMPTS.md, prompt 34):
  // the card's number, the kind of disaster, where it applies and its text; one control applies it, or discards
  // it when its context is not where the expedition is camped. The dice it needs are asked for after the tap.
  import { card as lookup, type CardId } from '$features/cards/deck';

  interface Props {
    seat: string;
    card: CardId;
    /** The card's context matches the camp: it will take its toll. */
    applies: boolean;
    onface: () => void;
  }
  let { seat, card, applies, onface }: Props = $props();
  const c = $derived(lookup(card));
</script>

<div class="disaster" data-testid="disaster-panel-{seat}" data-card={card} data-applies={applies} role="group" aria-label="Disaster card {c.number}: {c.disaster.type}, {c.disaster.context}. {c.disaster.text}">
  <p class="heading">Disaster card</p>
  <div class="card" class:faded={!applies}>
    <div class="top">
      <span class="number" data-testid="disaster-number-{seat}">{c.number}</span>
      <span class="kind">
        <span class="type" data-testid="disaster-type-{seat}">{c.disaster.type}</span>
        <span class="context" data-testid="disaster-context-{seat}">{c.disaster.context}</span>
      </span>
    </div>
    <p class="text" data-testid="disaster-text-{seat}">{c.disaster.text}</p>
  </div>
  <button class="face" data-testid="face-disaster-{seat}" aria-label={applies ? 'Apply the card' : 'The card does not apply here: discard it'} onclick={onface}>{applies ? 'Apply it' : 'No effect here: discard it'}</button>
</div>

<style>
  .disaster {
    display: grid;
    gap: calc(var(--gap) * 0.6);
    width: calc(var(--target) * 8);
    font-family: 'Nile Sans', 'DejaVu Sans', sans-serif;
    color: var(--ink);
  }
  .heading {
    margin: 0;
    font-size: calc(var(--target) * 0.3);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    opacity: 0.8;
  }
  .card {
    display: grid;
    gap: calc(var(--gap) * 0.5);
    padding: calc(var(--gap) * 0.8);
    border: 3px solid #a8372a;
    border-radius: 10px;
    background: var(--paper);
  }
  .card.faded {
    border-color: var(--ink);
    opacity: 0.8;
  }
  .top {
    display: flex;
    align-items: center;
    gap: calc(var(--gap) * 0.8);
  }
  .number {
    font-size: calc(var(--target) * 0.9);
    font-weight: 700;
    line-height: 1;
  }
  .kind {
    display: grid;
    gap: 0.15em;
  }
  .type {
    font-size: calc(var(--target) * 0.36);
    font-weight: 700;
  }
  .context {
    font-size: calc(var(--target) * 0.24);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    opacity: 0.8;
  }
  .text {
    margin: 0;
    font-size: calc(var(--target) * 0.32);
    line-height: 1.3;
  }
  .face {
    min-height: var(--target);
    padding: 0 var(--gap);
    border: 3px solid var(--ink);
    border-radius: 999px;
    background: var(--accent);
    color: var(--ink);
    font: inherit;
    font-size: calc(var(--target) * 0.32);
    font-weight: 700;
    cursor: pointer;
  }
</style>
