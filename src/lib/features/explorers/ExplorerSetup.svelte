<script lang="ts">
  // Choosing an explorer's specialties at the player's rail: four toggles and a confirm.
  import type { Specialty } from '$lib/game/state';
  import Icon from '$lib/ui/Icon.svelte';
  import { SPECIALTIES } from './reducer';

  interface Props {
    seat: string;
    oncommission: (specialties: Specialty[]) => void;
  }
  let { seat, oncommission }: Props = $props();
  let chosen = $state<Specialty[]>([]);

  function toggle(s: Specialty) {
    chosen = chosen.includes(s) ? chosen.filter((x) => x !== s) : [...chosen, s];
  }
</script>

<div class="setup" data-testid="explorer-setup-{seat}" role="group" aria-label="Choose the explorer's specialties">
  {#each SPECIALTIES as s (s)}
    <button
      class="toggle"
      class:on={chosen.includes(s)}
      data-testid="specialty-{s}-{seat}"
      aria-pressed={chosen.includes(s)}
      aria-label={s}
      onclick={() => toggle(s)}
    >
      <Icon name={s} />
    </button>
  {/each}
  <button class="confirm" data-testid="commission-{seat}" aria-label="Commission this explorer" onclick={() => oncommission(chosen)}>
    <Icon name="explorer" />
  </button>
</div>

<style>
  .setup {
    display: flex;
    align-items: center;
    gap: var(--gap);
  }
  button {
    width: var(--target);
    height: var(--target);
    border-radius: 50%;
    border: 3px solid var(--ink);
    background: var(--paper);
    color: var(--ink);
    display: grid;
    place-items: center;
    cursor: pointer;
    opacity: 0.55;
  }
  .toggle.on {
    opacity: 1;
    background: var(--accent);
  }
  .confirm {
    opacity: 1;
    margin-left: var(--gap);
    border-style: double;
    border-width: 5px;
  }
</style>
