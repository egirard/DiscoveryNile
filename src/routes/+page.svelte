<script lang="ts">
  import { base } from '$app/paths';
  import Icon from '$lib/ui/Icon.svelte';
</script>

<main data-e2e-layout data-testid="lobby">
  <a class="enter" href="{base}/table/" data-testid="enter-table" aria-label="Open the table">
    <Icon name="table" size="6rem" />
  </a>
  <a class="fresh" href="{base}/table/?new=1" data-testid="new-table" aria-label="Start a new table">+</a>
  <p class="build" data-testid="build-marker">{__GIT_HASH__.slice(0, 7)}</p>
</main>

<style>
  :global(body) {
    margin: 0;
    background: #1c2a2e;
    color: #e8d8b0;
    font-family: system-ui, sans-serif;
  }
  main {
    height: 100vh;
    display: grid;
    place-items: center;
    grid-template-rows: 1fr auto auto;
  }
  .enter {
    color: inherit;
    padding: 2rem;
    border: 3px solid currentColor;
    border-radius: 24px;
  }
  .fresh {
    color: inherit;
    font-size: 2rem;
    text-decoration: none;
    padding: 0.5rem 1.5rem;
  }
  .build {
    opacity: 0.5;
    font-size: 0.75rem;
    margin: 1rem;
  }
</style>
