<script lang="ts">
  // Negotiating with a calm chief (rules §8.5): offer gifts, give everything, or decline.
  import Icon from '$lib/ui/Icon.svelte';
  interface Props {
    seat: string;
    tribe: number;
    warriors: number;
    gifts: number;
    onoffer: (gifts: number) => void;
    oneverything: () => void;
    ondecline: () => void;
  }
  let { seat, tribe, warriors, gifts, onoffer, oneverything, ondecline }: Props = $props();
  let offer = $state(0);
  let step = $state(1);
</script>

<div class="chooser" data-testid="negotiation-panel-{seat}" data-tribe={tribe} role="group" aria-label="Tribe {tribe}, {warriors} warriors: the chief awaits gifts">
  <p class="heading"><span class="marker">{tribe}</span> {warriors} warriors · <Icon name="gifts" size="1em" /> {gifts}</p>
  <div class="offer">
    <button class="round" data-testid="offer-less-{seat}" aria-label="Offer {step} fewer" disabled={offer === 0} onclick={() => (offer = Math.max(0, offer - step))}>−</button>
    <span class="count" data-testid="offer-count-{seat}" data-count={offer}>{offer}</span>
    <button class="round" data-testid="offer-more-{seat}" aria-label="Offer {step} more" disabled={offer + step > gifts} onclick={() => (offer = Math.min(gifts, offer + step))}>+</button>
    <button class="round step" data-testid="offer-step-{seat}" aria-label="Change the offer {step} at a time; tap to switch" aria-pressed={step === 10} onclick={() => (step = step === 1 ? 10 : 1)}>×{step}</button>
    <button class="confirm" data-testid="offer-confirm-{seat}" onclick={() => onoffer(offer)}>
      <span class="text"><strong>Offer {offer} gift{offer === 1 ? '' : 's'}</strong><small>Gifts × the larger of two dice must reach the warriors</small></span>
    </button>
  </div>
  <button data-testid="offer-everything-{seat}" onclick={oneverything}>
    <span class="text"><strong>Give everything</strong><small>All goods and animals but the men; the chief returns three dice of gifts</small></span>
  </button>
  <button data-testid="offer-decline-{seat}" onclick={ondecline}>
    <span class="text"><strong>Do not negotiate</strong><small>Carry on with the turn</small></span>
  </button>
</div>

<style>
  .chooser {
    display: grid;
    gap: calc(var(--gap) * 0.5);
    width: calc(var(--target) * 7.5);
    font-family: 'Nile Sans', 'DejaVu Sans', sans-serif;
    color: var(--ink);
  }
  .heading {
    margin: 0;
    display: flex;
    align-items: center;
    gap: calc(var(--gap) * 0.4);
    font-weight: 700;
    font-size: calc(var(--target) * 0.36);
  }
  .marker {
    width: calc(var(--target) * 0.7);
    height: calc(var(--target) * 0.7);
    border-radius: 50%;
    background: var(--ink);
    color: var(--paper);
    display: grid;
    place-items: center;
    font-size: calc(var(--target) * 0.34);
  }
  .offer {
    display: flex;
    align-items: center;
    gap: calc(var(--gap) * 0.4);
  }
  .count {
    min-width: calc(var(--target) * 0.8);
    text-align: center;
    font-weight: 700;
    font-size: calc(var(--target) * 0.4);
  }
  button {
    display: flex;
    align-items: center;
    min-height: var(--target);
    padding: calc(var(--gap) * 0.3) calc(var(--gap) * 0.6);
    border: 2px solid var(--ink);
    border-radius: 8px;
    background: var(--paper);
    color: var(--ink);
    text-align: left;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.4;
  }
  .round {
    width: var(--target);
    height: var(--target);
    padding: 0;
    border-radius: 50%;
    justify-content: center;
    font-weight: 700;
    font-size: calc(var(--target) * 0.4);
  }
  .step {
    font-size: calc(var(--target) * 0.3);
  }
  .step[aria-pressed='true'] {
    background: var(--ink);
    color: var(--paper);
  }
  .confirm {
    flex: 1;
  }
  .text {
    display: grid;
    line-height: 1.15;
  }
  strong {
    font-size: calc(var(--target) * 0.3);
  }
  small {
    font-size: calc(var(--target) * 0.22);
  }
</style>
