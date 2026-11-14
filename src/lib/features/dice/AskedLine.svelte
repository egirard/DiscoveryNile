<script lang="ts">
  // An ask answered (PROMPTS.md, prompt 81): the words the table asked in stay in the record, "Roll 2 D6 for
  // surprise; 4+ and the expedition is ready", with the dice rolled and what they meant beside them, "Result: 6 4,
  // 10: ready". The roll is read before it is made and after.
  import DiceRoll from '$lib/ui/DiceRoll.svelte';
  import type { Asked } from '$lib/game/random';

  interface Props {
    asked: Asked;
    /** The id every part carries: `{testid}`, `{testid}-text`, `{testid}-result`. */
    testid: string;
  }
  let { asked, testid }: Props = $props();
</script>

<span class="asked" data-testid={testid} data-values={asked.values.join(' ')} data-result={asked.result}>
  <span class="text" data-testid="{testid}-text">{asked.prompt}</span>
  <span class="result">
    <span class="label">Result:</span>
    <DiceRoll values={asked.values.slice(0, 8)} label="rolled" size="calc(var(--target) * 0.34)" />
    {#if asked.values.length > 8}<span class="more" aria-hidden="true">+{asked.values.length - 8}</span>{/if}
    {#if asked.result}<span class="meaning" data-testid="{testid}-result">{asked.result}</span>{/if}
  </span>
</span>

<style>
  .asked {
    display: grid;
    gap: calc(var(--gap) * 0.15);
    padding-left: calc(var(--gap) * 0.8);
    border-left: 3px solid rgba(28, 42, 46, 0.25);
    font-family: 'Nile Sans', 'DejaVu Sans', sans-serif;
    font-size: calc(var(--target) * 0.24);
    line-height: 1.2;
  }
  .text {
    font-style: italic;
    opacity: 0.85;
  }
  .result {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: calc(var(--gap) * 0.4);
  }
  .label,
  .meaning {
    font-weight: 700;
  }
</style>
