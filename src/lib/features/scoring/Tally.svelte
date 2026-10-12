<script lang="ts">
  // A seat's score as countable marks: gates of five, four strokes and a bar, then the remainder.
  // Nothing is drawn until the first point is scored, so an empty rail stays as it was.
  interface Props {
    seat: string;
    points: number;
  }
  let { seat, points }: Props = $props();
  const gates = $derived(Math.floor(points / 5));
  const rest = $derived(points % 5);
</script>

{#if points > 0}
  <span class="tally" data-testid="score-{seat}" data-points={points} aria-label="{points} point{points === 1 ? '' : 's'}">
    {#each Array(gates) as _, i (i)}
      <svg class="gate" viewBox="0 0 24 20" aria-hidden="true"><path d="M4 2v16M9 2v16M14 2v16M19 2v16" /><path d="M1 16L23 4" /></svg>
    {/each}
    {#if rest}
      <svg class="gate" viewBox="0 0 {rest * 5 + 2} 20" aria-hidden="true">
        {#each Array(rest) as _, i (i)}<path d="M{i * 5 + 3} 2v16" />{/each}
      </svg>
    {/if}
  </span>
{/if}

<style>
  .tally {
    display: inline-flex;
    align-items: center;
    gap: 0.2em;
    margin-left: var(--gap);
    height: calc(var(--target) * 0.5);
    color: var(--accent);
  }
  .gate {
    height: 100%;
    width: auto;
    fill: none;
    stroke: currentColor;
    stroke-width: 2.2;
    stroke-linecap: round;
  }
</style>
