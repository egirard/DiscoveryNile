<script lang="ts">
  // The table asks for a throw of physical dice (PROMPTS.md, prompt 18): what to roll and why, in the rules'
  // words; the throws already made for the same action; what the dicecam sees; and the six faces, for a
  // table without a camera or a reading the camera misses. Shown at the rolling seat's edge, facing him.
  // A throw of more dice than the tray holds (the loot of a village, a die a warrior) is gathered over several
  // throws (prompt 33): the dice in so far are shown, each throw or tapped face adds to them, and a button has
  // the table roll the rest.
  import DiceRoll from '$lib/ui/DiceRoll.svelte';
  import { PIPS } from '$lib/ui/pips';
  import { DICE_AT_HAND, statusText, type DicecamStatus } from './dicecam';

  interface Props {
    seat: string;
    /** "Roll a D6 to see if you are lost; 4+ means you're okay". */
    prompt: string;
    count: number;
    rolled: { prompt: string; values: number[] }[];
    /** The dice of this throw already in, when it is gathered over several throws. */
    have?: number[];
    status: DicecamStatus;
    /** Dice the dicecam sees in the tray, or null before it has said. */
    seen: number | null;
    /** What it sees is the tray as it already lay, not a throw. */
    stale?: boolean;
    /** A dicecam is set up on this table. */
    configured: boolean;
    onroll: (values: number[]) => void;
    /** The table rolls the rest of a gathered throw. */
    onauto?: () => void;
  }
  let { seat, prompt, count, rolled, have = [], status, seen, stale = false, configured, onroll, onauto }: Props = $props();
  const gathered = $derived(count > DICE_AT_HAND);
  const remaining = $derived(count - have.length);
  /** Faces tapped so far for a throw of several dice. */
  let taps = $state<number[]>([]);
  const reset = () => (taps = []);
  $effect(() => {
    void prompt;
    void rolled.length;
    reset();
  });
  function tap(value: number) {
    if (gathered) {
      onroll([value]);
      return;
    }
    const next = [...taps, value];
    if (next.length < count) {
      taps = next;
      return;
    }
    taps = [];
    onroll(next);
  }
  /** "for first player" out of "Roll 4 D6 for first player; the highest total goes first". */
  const what = (p: string) => p.replace(/^Roll (a|\d+) D6 /, '').split(';')[0];
  const faces = [1, 2, 3, 4, 5, 6];
</script>

<div class="prompt" data-testid="dice-prompt-{seat}" data-count={count} data-have={have.length} data-status={status} data-seen={seen ?? ''} data-stale={stale}>
  <p class="ask" data-testid="dice-ask-{seat}">{prompt}</p>
  {#if rolled.length}
    <ul class="so-far" data-testid="dice-so-far-{seat}" aria-label="Already rolled for this action">
      {#each rolled as r, i (i)}
        <li><span class="what">{what(r.prompt)}</span> <DiceRoll values={r.values} label={what(r.prompt)} size="calc(var(--target) * 0.45)" /></li>
      {/each}
    </ul>
  {/if}
  {#if gathered}
    <div class="gathered" data-testid="dice-gathered-{seat}" data-have={have.length} aria-label="{have.length} of {count} dice in">
      <span class="tally">{have.length} of {count} in</span>
      {#if have.length}<DiceRoll values={have} label="rolled so far" size="calc(var(--target) * 0.36)" wrap />{/if}
    </div>
  {/if}
  <p class="status" data-testid="dicecam-status-{seat}">{statusText(status, remaining, seen, configured, stale, gathered)}</p>
  <div class="faces" role="group" aria-label={gathered ? 'Or tap each face as it is rolled' : `Or tap the face you rolled${count > 1 ? `, ${count} times in order` : ''}`}>
    {#each faces as v (v)}
      <button class="face" data-testid="die-face-{v}-{seat}" aria-label="Rolled a {v}" onclick={() => tap(v)}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="1" y="1" width="22" height="22" rx="4" />
          {#each PIPS[v] as [x, y], j (j)}
            <circle cx={x} cy={y} r="2.3" />
          {/each}
        </svg>
      </button>
    {/each}
    {#if gathered}
      <button class="auto" type="button" data-testid="dice-auto-{seat}" aria-label="Let the table roll the {remaining} dice still wanted" onclick={() => onauto?.()}>Roll the rest</button>
    {:else if count > 1}
      <span class="taps" data-testid="dice-taps-{seat}" data-count={taps.length} aria-label="{taps.length} of {count} faces tapped">
        {#if taps.length}<DiceRoll values={taps} label="tapped so far" size="calc(var(--target) * 0.5)" />{:else}<span class="hint">{count} faces, in order</span>{/if}
      </span>
      <button class="clear" data-testid="dice-clear-{seat}" aria-label="Start the faces again" disabled={taps.length === 0} onclick={reset}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
    {/if}
  </div>
</div>

<style>
  .prompt {
    display: grid;
    gap: calc(var(--gap) * 0.6);
    width: calc(var(--target) * 10);
    font-family: 'Nile Sans', 'DejaVu Sans', sans-serif;
  }
  .ask {
    margin: 0;
    font-size: calc(var(--target) * 0.42);
    font-weight: 700;
    line-height: 1.2;
  }
  .so-far {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: calc(var(--gap) * 0.3);
    font-size: calc(var(--target) * 0.26);
  }
  .so-far li {
    display: flex;
    align-items: center;
    gap: calc(var(--gap) * 0.5);
  }
  .what {
    opacity: 0.8;
  }
  .gathered {
    display: flex;
    align-items: flex-start;
    gap: calc(var(--gap) * 0.5);
    font-size: calc(var(--target) * 0.28);
  }
  .tally {
    flex: none;
    font-weight: 700;
    line-height: calc(var(--target) * 0.36);
  }
  .auto {
    margin-left: calc(var(--gap) * 0.6);
    height: var(--target);
    padding: 0 calc(var(--gap) * 0.8);
    border: 2px solid var(--ink);
    border-radius: 8px;
    background: var(--accent);
    color: var(--ink);
    font: inherit;
    font-size: calc(var(--target) * 0.28);
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
  }
  .status {
    margin: 0;
    font-size: calc(var(--target) * 0.28);
    opacity: 0.85;
  }
  .faces {
    display: flex;
    align-items: center;
    gap: calc(var(--gap) * 0.4);
  }
  .face,
  .clear {
    width: var(--target);
    height: var(--target);
    padding: 0;
    border: 2px solid var(--ink);
    border-radius: 8px;
    background: var(--paper);
    color: var(--ink);
    cursor: pointer;
    display: grid;
    place-items: center;
  }
  .face svg {
    width: 90%;
    height: 90%;
  }
  .face rect {
    fill: var(--paper);
    stroke: var(--ink);
    stroke-width: 1.5;
  }
  .face circle {
    fill: var(--ink);
  }
  .taps {
    margin-left: calc(var(--gap) * 0.4);
    min-width: calc(var(--target) * 1.2);
    font-size: calc(var(--target) * 0.24);
    opacity: 0.8;
  }
  .clear {
    border-radius: 50%;
    background: transparent;
  }
  .clear:disabled {
    opacity: 0.3;
    cursor: default;
  }
  .clear svg {
    width: 50%;
    height: 50%;
    fill: none;
    stroke: currentColor;
    stroke-width: 2.2;
    stroke-linecap: round;
  }
</style>
