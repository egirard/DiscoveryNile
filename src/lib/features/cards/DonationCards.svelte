<script lang="ts">
  // The cards a seat has not yet looked at (PROMPTS.md, prompt 44), shown in full at the player's edge as the
  // disaster card is: the hand dealt at the start of the game, and later the card each turn in Europe draws or a hex
  // published earns. Each card shows its donation face large (the money, or the free ticket and its port) with the
  // disaster it would be in Africa beneath; one control, a check mark, takes the cards, and acting takes them too. The
  // panel is as wide as the cards it holds, three to a row at most (PROMPTS.md, prompt 47): one card, one column.
  import { card as lookup, type CardId } from './deck';
  import { BOARD } from '$features/map/manifest';

  interface Props {
    seat: string;
    ids: CardId[];
    ontake: () => void;
  }
  let { seat, ids, ontake }: Props = $props();
  const cards = $derived(ids.map((id) => ({ id, c: lookup(id) })));
  const words = (id: CardId) => {
    const d = lookup(id).donation;
    if (d.kind === 'money') return `$${d.amount}${d.note ? ` (${d.note})` : ''}`;
    if (d.kind === 'ticket') return `a free ticket to ${BOARD.ports[d.port].name}`;
    return 'no donation';
  };
</script>

<div class="donations" data-testid="donations-{seat}" data-count={ids.length} role="group" aria-label="{ids.length === 1 ? 'A donation' : `${ids.length} donations`}: {ids.map(words).join(', ')}">
  <p class="heading">{ids.length === 1 ? 'A donation' : 'Donations'}</p>
  <ul class="cards" style="--columns:{Math.min(ids.length, 3)}">
    {#each cards as { id, c } (id)}
      {@const d = c.donation}
      <li class="card {d.kind}" data-testid="donation-card-{id}-{seat}" data-card={id} data-kind={d.kind} aria-label={words(id)}>
        <span class="number">{c.number}</span>
        <span class="face">
          {#if d.kind === 'money'}
            <span class="amount">${d.amount}</span>
            {#if d.note}<span class="note">{d.note}</span>{/if}
          {:else if d.kind === 'ticket'}
            <svg class="art" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4z" />
              <path d="M9 6v12" stroke-dasharray="2 2" />
            </svg>
            <span class="port">Free ticket to {BOARD.ports[d.port].name}</span>
          {:else}
            <span class="none">No donation</span>
          {/if}
        </span>
        <span class="disaster">
          <span class="type">{c.disaster.type}</span>
          <span class="context">{c.disaster.context}</span>
          <span class="text">{c.disaster.text}</span>
        </span>
      </li>
    {/each}
  </ul>
  <button class="take" data-testid="take-cards-{seat}" data-icon="check" aria-label={ids.length === 1 ? 'Take the card' : 'Take the cards'} onclick={ontake}>
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7" /></svg>
  </button>
</div>

<style>
  .donations {
    display: grid;
    gap: calc(var(--gap) * 0.6);
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
  .cards {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    grid-template-columns: repeat(var(--columns, 3), calc(var(--target) * 2.6));
    gap: calc(var(--gap) * 0.6);
  }
  .card {
    position: relative;
    display: grid;
    grid-template-rows: auto 1fr auto;
    gap: calc(var(--gap) * 0.3);
    min-height: calc(var(--target) * 3.4);
    padding: calc(var(--gap) * 0.5);
    border: 2px solid var(--ink);
    border-radius: 8px;
    background: var(--paper);
    box-sizing: border-box;
  }
  .card.ticket {
    background: #d7e6c4;
  }
  .number {
    font-size: calc(var(--target) * 0.22);
    font-weight: 700;
    opacity: 0.7;
  }
  .face {
    display: grid;
    place-items: center;
    align-content: center;
    gap: 2px;
    text-align: center;
  }
  .amount {
    font-size: calc(var(--target) * 0.5);
    font-weight: 700;
  }
  .note,
  .port,
  .none {
    font-size: calc(var(--target) * 0.22);
    line-height: 1.2;
  }
  .port {
    font-weight: 700;
  }
  .none {
    opacity: 0.6;
  }
  .art {
    width: 45%;
    fill: none;
    stroke: var(--ink);
    stroke-width: 1.8;
    stroke-linejoin: round;
  }
  .disaster {
    display: grid;
    gap: 1px;
    padding-top: calc(var(--gap) * 0.3);
    border-top: 1px solid rgba(28, 42, 46, 0.3);
    font-size: calc(var(--target) * 0.17);
    line-height: 1.2;
  }
  .type {
    font-weight: 700;
    color: #a8372a;
  }
  .context {
    font-style: italic;
    opacity: 0.8;
  }
  .text {
    opacity: 0.85;
  }
  .take {
    justify-self: end;
    width: var(--target);
    height: var(--target);
    padding: 0;
    border: 3px solid var(--ink);
    border-radius: 50%;
    background: var(--accent);
    color: var(--ink);
    display: grid;
    place-items: center;
    cursor: pointer;
  }
  .take svg {
    width: 60%;
    fill: none;
    stroke: currentColor;
    stroke-width: 2.2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
</style>
