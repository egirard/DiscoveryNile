<script lang="ts">
  // A donation card, face up at its owner's rail. Money shows its amount; a free ticket shows a
  // ticket and its port; a card with no donation shows nothing. The disaster face is for Africa.
  import { card as lookup, type CardId } from './deck';
  import { BOARD } from '$features/map/manifest';

  interface Props {
    id: CardId;
    seat: string;
  }
  let { id, seat }: Props = $props();
  const c = $derived(lookup(id));
  const donation = $derived(c.donation);
  const port = $derived(donation.kind === 'ticket' ? BOARD.ports[donation.port].name : '');
</script>

<div
  class="card {donation.kind}"
  data-testid="card-{id}-{seat}"
  data-card={id}
  data-kind={donation.kind}
  aria-label={donation.kind === 'money' ? `$${donation.amount} donation` : donation.kind === 'ticket' ? `Free ticket to ${port}` : 'No donation'}
>
  {#if donation.kind === 'money'}
    <span class="amount">${donation.amount}</span>
  {:else if donation.kind === 'ticket'}
    <svg class="ticket" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4z" />
      <path d="M9 6v12" stroke-dasharray="2 2" />
    </svg>
    <span class="port">{port}</span>
  {:else}
    <span class="dash">–</span>
  {/if}
  <span class="number">{c.number}</span>
</div>

<style>
  .card {
    position: relative;
    width: calc(var(--target) * 1.15);
    height: calc(var(--target) * 1.6);
    border-radius: 6px;
    background: var(--paper);
    color: var(--ink);
    border: 2px solid var(--ink);
    display: grid;
    place-items: center;
    align-content: center;
    gap: 2px;
    font-family: system-ui, sans-serif;
    box-sizing: border-box;
  }
  .card.ticket {
    background: #d7e6c4;
  }
  .amount {
    font-weight: 700;
    font-size: calc(var(--target) * 0.34);
  }
  .ticket {
    width: 55%;
    fill: none;
    stroke: var(--ink);
    stroke-width: 1.8;
    stroke-linejoin: round;
  }
  .port {
    font-size: calc(var(--target) * 0.2);
    line-height: 1;
    text-align: center;
    padding: 0 2px;
  }
  .dash {
    font-size: calc(var(--target) * 0.5);
    opacity: 0.5;
  }
  .number {
    position: absolute;
    right: 3px;
    bottom: 1px;
    font-size: calc(var(--target) * 0.18);
    opacity: 0.5;
  }
</style>
