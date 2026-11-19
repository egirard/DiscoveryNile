<script lang="ts">
  // An ask answered (PROMPTS.md, prompts 81 and 89; docs/sample-turn-text.md): the ask's line in the record becomes
  // its result, one line: what it was about, the dice rolled and what they meant.
  import DiceRoll from '$lib/ui/DiceRoll.svelte';
  import type { Asked } from '$lib/game/random';
  import type { Roll } from '$features/map/generate';

  interface Props {
    asked: Asked;
    /** The id every part carries: `{testid}`, `{testid}-text`, `{testid}-result`. */
    testid: string;
    /** The line's own rolls these dice are (prompt 85), when the line leaves its dice to its asks: a die tapped is set right. */
    rolls?: Roll[];
    oncorrect?: (roll: Roll, anchor: DOMRect) => void;
  }
  let { asked, testid, rolls, oncorrect }: Props = $props();
  const tappable = $derived(Boolean(oncorrect) && Boolean(rolls?.some((x) => x.from)));
</script>

<!-- One line (prompt 89): the label, the dice and what they meant, "Lost? [4] (−1 for veldt) => Not lost"; it stands where the ask stood. -->
<span class="asked" data-testid={testid} data-values={asked.values.join(' ')} data-result={asked.result} data-label={asked.label ?? ''}>
  {#if asked.label}<span class="label" data-testid="{testid}-label">{asked.label}</span>{/if}
  <DiceRoll values={asked.values.slice(0, 8)} label="rolled" size="calc(var(--target) * 0.34)" marks={rolls?.slice(0, 8).map((x) => x.from?.corrected === true)} testid={tappable ? `${testid}-dice` : undefined} ontap={tappable ? (i, anchor) => { const roll = rolls?.[i]; if (roll?.from) oncorrect?.(roll, anchor); } : undefined} />
  {#if asked.values.length > 8}<span class="more" aria-hidden="true">+{asked.values.length - 8}</span>{/if}
  {#if asked.result}<span class="meaning" data-testid="{testid}-result">{asked.result}</span>{/if}
</span>

<style>
  .asked {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: calc(var(--gap) * 0.2) calc(var(--gap) * 0.4);
    font-family: 'Nile Sans', 'DejaVu Sans', sans-serif;
    font-size: calc(var(--target) * 0.26);
    line-height: 1.2;
  }
  .label {
    font-weight: 700;
  }
</style>
