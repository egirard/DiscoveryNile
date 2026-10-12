<script lang="ts">
  // After a victory, the village found (rules §8.4): release the prisoners, or keep them as bearers and loot.
  interface Props {
    seat: string;
    prisoners: number;
    onchoose: (choice: 'release' | 'keep') => void;
  }
  let { seat, prisoners, onchoose }: Props = $props();
</script>

<div class="chooser" data-testid="spoils-panel-{seat}" data-prisoners={prisoners} role="group" aria-label="The village is found. {prisoners} prisoners: release them, or keep them and loot">
  <p class="heading">The village is found · {prisoners} prisoner{prisoners === 1 ? '' : 's'}</p>
  <button data-testid="spoils-release-{seat}" onclick={() => onchoose('release')}>
    <span class="text"><strong>Release the prisoners</strong><small>Leave the village alone; the tribe remembers your mercy</small></span>
  </button>
  <button data-testid="spoils-keep-{seat}" onclick={() => onchoose('keep')}>
    <span class="text"><strong>Keep them as bearers and loot</strong><small>A die per warrior met: rations, gifts, a camel or canoe</small></span>
  </button>
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
    font-weight: 700;
    font-size: calc(var(--target) * 0.34);
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
