<script lang="ts">
  // The dev server's reload prompt (PROMPTS.md, prompt 30): shown once a change is waiting that Vite could not
  // apply in place; the player reloads when ready. Renders nothing in a production build.
  import { onMount } from 'svelte';
  import { installReloadPrompt, onReloadPending } from './reload-prompt';

  let pending = $state(false);
  onMount(() => {
    installReloadPrompt();
    return onReloadPending(() => (pending = true));
  });
</script>

{#if pending}
  <div class="prompt" data-testid="reload-prompt" role="status">
    <span>New code is ready</span>
    <button type="button" data-testid="reload-now" onclick={() => location.reload()}>Reload</button>
  </div>
{/if}

<style>
  .prompt {
    position: fixed;
    right: 16px;
    bottom: 16px;
    z-index: 1000;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    border-radius: 10px;
    background: #1c2a2e;
    color: #efe6cc;
    box-shadow: 0 4px 18px rgba(0, 0, 0, 0.45);
    font-family: 'Nile Sans', 'DejaVu Sans', sans-serif;
    font-size: 15px;
  }
  button {
    padding: 6px 12px;
    border: 0;
    border-radius: 6px;
    background: #e0b44c;
    color: #1c2a2e;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
  }
</style>
