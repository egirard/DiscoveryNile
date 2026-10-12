<script lang="ts">
  // The game's end (rules: Description of Game): the standings in the middle of the table, the winner first, and the
  // offer of a new game that continues on the same map.
  import type { GameEnd } from '$lib/game/state';
  import { colourFor } from '$features/explorers/colours';
  import { fmtPoints } from '$features/scoring/transits';

  interface Props {
    ended: GameEnd;
    game: number;
    oncontinue: () => void;
  }
  let { ended, game, oncontinue }: Props = $props();
</script>

<div class="over" data-testid="game-over" data-round={ended.round} data-reason={ended.reason} data-winners={ended.winners.join(',')} data-e2e-fit>
  <p class="title">Game {game} over after {ended.round} round{ended.round === 1 ? '' : 's'}</p>
  <ol class="standings">
    {#each ended.standings as s (s.seat)}
      <li data-testid="standing-{s.seat}" data-points={fmtPoints(s.points)} class:winner={ended.winners.includes(s.seat)}>
        <span class="disc" style="--colour:{colourFor(s.seat)}"></span>
        <span class="points">{fmtPoints(s.points)}</span>
        {#if ended.winners.includes(s.seat)}<span class="laurel" aria-label="Winner">★</span>{/if}
      </li>
    {/each}
  </ol>
  <button class="continue" data-testid="continue-game" aria-label="Start a new game on this map" onclick={oncontinue}>
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 1 2.3 5.7" /><path d="M4 18v-6h6" /></svg>
  </button>
</div>

<style>
  .over {
    position: absolute;
    left: 50%;
    top: 50%;
    translate: -50% -50%;
    display: grid;
    justify-items: center;
    gap: var(--gap);
    padding: var(--gap) calc(var(--gap) * 2);
    border-radius: calc(var(--target) * 0.4);
    border: 4px solid var(--accent);
    background: var(--ink);
    color: var(--paper);
    font-family: system-ui, sans-serif;
    box-shadow: 0 0 calc(var(--target) * 0.6) rgba(0, 0, 0, 0.6);
  }
  .title {
    margin: 0;
    font-size: calc(var(--target) * 0.4);
    font-weight: 700;
  }
  .standings {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: calc(var(--gap) * 0.5);
  }
  .standings li {
    display: flex;
    align-items: center;
    gap: calc(var(--gap) * 0.6);
    font-size: calc(var(--target) * 0.45);
    font-weight: 700;
    opacity: 0.75;
  }
  .standings li.winner {
    opacity: 1;
    color: var(--accent);
  }
  .disc {
    width: calc(var(--target) * 0.6);
    height: calc(var(--target) * 0.6);
    border-radius: 50%;
    background: var(--colour);
    border: 3px solid var(--paper);
  }
  .continue {
    width: calc(var(--target) * 1.4);
    height: calc(var(--target) * 1.4);
    border-radius: 50%;
    border: 4px solid var(--paper);
    background: var(--accent);
    color: var(--ink);
    display: grid;
    place-items: center;
    cursor: pointer;
  }
  .continue svg {
    width: 60%;
    fill: none;
    stroke: currentColor;
    stroke-width: 2.4;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
</style>
