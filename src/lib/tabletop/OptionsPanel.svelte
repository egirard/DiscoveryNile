<script lang="ts">
  // The options screen (PROMPTS.md, prompt 12): opened from a gear at the north-west or south-east
  // corner, so a player at any edge can reach one; turned toward the corner it was opened from. It
  // holds what is not part of play: the screen size (the diagonal that sizes everything physical),
  // the QR codes for joining or rejoining any seat from a phone, and ending the game by agreement.
  import type { Seat } from './seats';

  interface Props {
    seats: Seat[];
    qr: Record<string, { url: string; image: string }>;
    diagonal: number;
    mmPerPx: number;
    /** A game is under way, so it can be ended. */
    running: boolean;
    /** The dice are rolled at the table and read by the dicecam (PROMPTS.md, prompt 18). */
    physical: boolean;
    /** 0 for the south-east gear (facing the bottom edge), 180 for the north-west one. */
    rotation: 0 | 180;
    onclose: () => void;
    ondiagonal: (inches: number) => void;
    ontoggledice: (on: boolean) => void;
    onend: () => void;
  }
  let { seats, qr, diagonal, mmPerPx, running, physical, rotation, onclose, ondiagonal, ontoggledice, onend }: Props = $props();
  let confirming = $state(false);
  const set = (inches: number) => ondiagonal(Math.min(120, Math.max(5, Math.round(inches * 2) / 2)));
  // An ISO ID-1 card (85.6 × 54.0 mm) at the configured size: hold a bank card against it to check the diagonal.
  const cardW = $derived(85.6 / mmPerPx);
  const cardH = $derived(54 / mmPerPx);
</script>

<div class="options" data-testid="options-panel" data-rotation={rotation} data-diagonal={diagonal} data-e2e-fit style="--rotation:{rotation}deg">
  <div class="head">
    <h2 class="title">Options</h2>
    <button class="close" data-testid="options-close" aria-label="Close the options" onclick={onclose}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
    </button>
  </div>

  <section class="screen" data-testid="options-screen">
    <h3>Screen size</h3>
    <div class="row">
      <button data-testid="diagonal-less" aria-label="Screen one inch smaller" onclick={() => set(diagonal - 1)}>−</button>
      <span class="readout" data-testid="diagonal-readout" aria-label="Screen diagonal {diagonal} inches">{diagonal}"</span>
      <button data-testid="diagonal-more" aria-label="Screen one inch larger" onclick={() => set(diagonal + 1)}>+</button>
      <button class="preset" data-testid="diagonal-27" aria-pressed={diagonal === 27} aria-label="A 27 inch screen" onclick={() => set(27)}>27"</button>
      <button class="preset" data-testid="diagonal-55" aria-pressed={diagonal === 55} aria-label="A 55 inch screen" onclick={() => set(55)}>55"</button>
    </div>
    <div class="card" data-testid="calibration-card" aria-label="The outline of a bank card at the configured size: hold one against it" style="width:{cardW}px; height:{cardH}px">
      <span>bank card</span>
    </div>
  </section>

  <section class="phones" data-testid="options-phones">
    <h3>Join from a phone</h3>
    <div class="grid">
      {#each seats as seat (seat.id)}
        {#if qr[seat.id]}
          <a class="qr" href={qr[seat.id].url} data-testid="options-qr-{seat.id}" aria-label="Join or rejoin seat {seat.id} from a phone">
            <img src={qr[seat.id].image} alt="" />
            <span class="seat">{seat.id}</span>
          </a>
        {/if}
      {/each}
    </div>
  </section>

  <section class="dice" data-testid="options-dice">
    <h3>Dice</h3>
    <div class="row">
      <button class="toggle" data-testid="physical-dice" aria-pressed={physical} aria-label="Physical dice: {physical ? 'on, the table asks for every roll' : 'off, the table rolls for you'}" onclick={() => ontoggledice(!physical)}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3" /><circle class="pip" cx="8" cy="8" r="1.6" /><circle class="pip" cx="16" cy="8" r="1.6" /><circle class="pip" cx="12" cy="12" r="1.6" /><circle class="pip" cx="8" cy="16" r="1.6" /><circle class="pip" cx="16" cy="16" r="1.6" /></svg>
        <span>Physical dice</span>
      </button>
      <span class="state" data-testid="physical-dice-state">{physical ? 'on' : 'off'}</span>
    </div>
    <p class="note">{physical ? 'The table asks for every roll: the dicecam reads the tray, or tap the face you rolled.' : 'The table rolls the dice itself.'}</p>
  </section>

  <section class="end" data-testid="options-end">
    <h3>End this game</h3>
    {#if !running}
      <p class="note">No game is under way.</p>
    {:else if confirming}
      <p class="note">All players agree? Everyone retires, those in Europe publishing first, and the most points win.</p>
      <div class="row">
        <button class="confirm" data-testid="end-game-yes" aria-label="Confirm: end the game by agreement" onclick={() => { confirming = false; onend(); }}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>
        </button>
        <button class="cancel" data-testid="end-game-no" aria-label="Keep playing" onclick={() => (confirming = false)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>
    {:else}
      <button class="end-game" data-testid="end-game" aria-label="End this game by agreement of all players" onclick={() => (confirming = true)}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4z" /><path d="M8 12l3 3 5-6" /></svg>
        <span>End this game</span>
      </button>
    {/if}
  </section>
</div>

<style>
  .options {
    position: absolute;
    left: 50%;
    top: 50%;
    translate: -50% -50%;
    rotate: var(--rotation);
    width: calc(var(--target) * 9);
    max-height: calc(100vh - var(--target) * 2);
    overflow: hidden;
    display: grid;
    gap: calc(var(--gap) * 0.8);
    padding: var(--gap) calc(var(--gap) * 1.5);
    border-radius: calc(var(--target) * 0.4);
    border: 4px solid var(--accent);
    background: var(--ink);
    color: var(--paper);
    font-family: 'Nile Sans', 'DejaVu Sans', sans-serif;
    box-shadow: 0 0 calc(var(--target) * 0.6) rgba(0, 0, 0, 0.6);
  }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .title {
    margin: 0;
    font-size: calc(var(--target) * 0.45);
  }
  h3 {
    margin: 0 0 calc(var(--gap) * 0.4);
    font-size: calc(var(--target) * 0.32);
    font-weight: 700;
    color: var(--accent);
  }
  .row {
    display: flex;
    align-items: center;
    gap: calc(var(--gap) * 0.6);
  }
  button {
    min-width: var(--target);
    height: var(--target);
    border-radius: 999px;
    border: 2px solid var(--paper);
    background: var(--paper);
    color: var(--ink);
    font: inherit;
    font-weight: 700;
    font-size: calc(var(--target) * 0.36);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.3em;
    padding: 0 0.5em;
  }
  button svg {
    width: calc(var(--target) * 0.55);
    height: calc(var(--target) * 0.55);
    fill: none;
    stroke: currentColor;
    stroke-width: 2.2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .close {
    background: transparent;
    color: var(--paper);
    width: var(--target);
    padding: 0;
  }
  .preset[aria-pressed='true'],
  .toggle[aria-pressed='true'] {
    background: var(--accent);
  }
  .toggle svg .pip {
    fill: currentColor;
    stroke: none;
  }
  .state {
    font-size: calc(var(--target) * 0.3);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .readout {
    min-width: 2.4em;
    text-align: center;
    font-size: calc(var(--target) * 0.4);
    font-weight: 700;
  }
  .card {
    margin-top: calc(var(--gap) * 0.6);
    max-width: 100%;
    box-sizing: border-box;
    border: 2px dashed var(--paper);
    border-radius: 6px;
    display: grid;
    place-items: center;
    font-size: calc(var(--target) * 0.26);
    opacity: 0.8;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: calc(var(--gap) * 0.6);
  }
  .qr {
    display: grid;
    justify-items: center;
    gap: 2px;
    color: var(--paper);
    text-decoration: none;
    font-size: calc(var(--target) * 0.26);
  }
  .qr img {
    width: var(--qr);
    height: var(--qr);
    background: var(--paper);
    border-radius: 6px;
    padding: 4px;
    box-sizing: border-box;
  }
  .note {
    margin: 0 0 calc(var(--gap) * 0.5);
    font-size: calc(var(--target) * 0.3);
    line-height: 1.25;
  }
  .confirm {
    background: var(--accent);
  }
  .cancel {
    background: transparent;
    color: var(--paper);
  }
  .end-game {
    background: #a8372a;
    color: var(--paper);
    border-color: var(--paper);
  }
</style>
