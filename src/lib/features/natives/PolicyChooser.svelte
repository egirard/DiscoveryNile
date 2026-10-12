<script lang="ts">
  // The explorer's policy towards natives in the hex (rules §8.1): five choices, each with its
  // consequence in a line, on a panel at the player's edge.
  interface Props {
    seat: string;
    warriors: number;
    tribe: number;
    /** The tribe's attitude towards everyone, and its regard for this explorer alone (rules §8.6). */
    attitude?: number;
    regard?: number;
    onchoose: (policy: number) => void;
  }
  let { seat, warriors, tribe, attitude = 0, regard = 0, onchoose }: Props = $props();
  const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);
  const POLICIES = [
    { n: 1, name: 'Defensive stand', note: 'Stay put on guard: no hunting, research or trade, no leaving until next turn' },
    { n: 2, name: 'Retreat', note: 'Back to the hex you came from; your marker here is removed' },
    { n: 3, name: 'Show of force', note: 'Approach warily, muskets ready' },
    { n: 4, name: 'Ignore them', note: 'Carry on as if they were not there' },
    { n: 5, name: 'Friendly approach', note: 'Open hands and gifts' }
  ];
</script>

<div class="chooser" data-testid="policy-panel-{seat}" data-tribe={tribe} data-attitude={attitude} data-regard={regard} role="group" aria-label="Natives: tribe {tribe}, {warriors} warriors, attitude {signed(attitude)}{regard ? `, regard for you ${signed(regard)}` : ''}. Choose a policy">
  <p class="heading"><span class="marker">{tribe}</span> {warriors} warriors
    {#if attitude || regard}
      <span class="attitude" data-testid="tribe-attitude-{seat}">· attitude {signed(attitude)}{regard ? ` (${signed(regard)} for you)` : ''}</span>
    {/if}
  </p>
  {#each POLICIES as p (p.n)}
    <button data-testid="policy-{p.n}-{seat}" onclick={() => onchoose(p.n)}>
      <span class="n">{p.n}</span>
      <span class="text"><strong>{p.name}</strong><small>{p.note}</small></span>
    </button>
  {/each}
</div>

<style>
  .chooser {
    display: grid;
    gap: calc(var(--gap) * 0.5);
    width: calc(var(--target) * 7.5);
    font-family: system-ui, sans-serif;
    color: var(--ink);
  }
  .heading {
    margin: 0;
    display: flex;
    align-items: center;
    gap: calc(var(--gap) * 0.5);
    font-weight: 700;
    font-size: calc(var(--target) * 0.38);
  }
  .attitude {
    font-weight: 400;
    font-size: calc(var(--target) * 0.28);
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
  button {
    display: flex;
    align-items: center;
    gap: calc(var(--gap) * 0.6);
    min-height: var(--target);
    padding: calc(var(--gap) * 0.3) calc(var(--gap) * 0.6);
    border: 2px solid var(--ink);
    border-radius: 8px;
    background: var(--paper);
    color: var(--ink);
    text-align: left;
    cursor: pointer;
  }
  .n {
    width: calc(var(--target) * 0.6);
    height: calc(var(--target) * 0.6);
    border-radius: 50%;
    background: var(--ink);
    color: var(--paper);
    display: grid;
    place-items: center;
    font-weight: 700;
    font-size: calc(var(--target) * 0.3);
    flex: none;
  }
  .text {
    display: grid;
    line-height: 1.15;
  }
  strong {
    font-size: calc(var(--target) * 0.32);
  }
  small {
    font-size: calc(var(--target) * 0.24);
  }
</style>
