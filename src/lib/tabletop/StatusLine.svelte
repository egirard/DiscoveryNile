<script lang="ts">
  // The table's status line (PROMPTS.md, prompt 32), beside the north-west gear: whether the diagnostics
  // capture answers, the running build's short git id and date, and an update waiting for a reload (the dev
  // server holds full reloads back, src/lib/dev/reload-prompt.ts). Icons first; each carries its words as a label.
  import { onMount } from 'svelte';
  import { probeDiagnostics } from '$lib/diagnostics/diag';
  import { installReloadPrompt, onReloadPending } from '$lib/dev/reload-prompt';

  interface Props {
    left: number;
    top: number;
    height: number;
  }
  let { left, top, height }: Props = $props();
  let diag = $state<'off' | 'up' | 'down' | 'probing'>('probing');
  let updateReady = $state(false);
  const version = __GIT_HASH__.slice(0, 7);
  const built = __BUILD_DATE__.slice(0, 10);
  onMount(() => {
    void probeDiagnostics().then((s) => (diag = s));
    installReloadPrompt();
    return onReloadPending(() => (updateReady = true));
  });
  const diagWords = $derived(diag === 'up' ? 'Diagnostics capture connected' : diag === 'down' ? 'Diagnostics capture not answering' : diag === 'off' ? 'No diagnostics capture' : 'Checking the diagnostics capture');
</script>

<div class="status" data-testid="status-line" style="left:{left}px; top:{top}px; height:{height}px" role="status">
  <span class="item" data-testid="status-diag" data-state={diag} aria-label={diagWords}>
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h4l2-5 4 10 2-5h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" /></svg>
  </span>
  <span class="item text" data-testid="status-version" aria-label="Running build {version}">
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.5" fill="none" stroke="currentColor" stroke-width="2" /><path d="M12 2v6.5M12 15.5V22" stroke="currentColor" stroke-width="2" /></svg>{version}</span>
  <span class="item text" data-testid="status-build" aria-label="Built {built}">
    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2" /><path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" stroke-width="2" /></svg>{built}</span>
  {#if updateReady}
    <button class="item update" type="button" data-testid="status-update" aria-label="New code is ready: reload" onclick={() => location.reload()}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.3-5.7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" /><path d="M20 4v5h-5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" /></svg>
    </button>
  {/if}
</div>

<style>
  .status {
    position: absolute;
    display: flex;
    align-items: center;
    gap: calc(var(--gap) * 0.8);
    font-family: 'Nile Sans', 'DejaVu Sans', sans-serif;
    font-size: calc(var(--target) * 0.22);
    color: var(--paper);
    opacity: 0.75;
  }
  .item {
    display: inline-flex;
    align-items: center;
    gap: 0.25em;
  }
  .item svg {
    width: calc(var(--target) * 0.36);
    height: calc(var(--target) * 0.36);
  }
  .text {
    letter-spacing: 0.03em;
  }
  [data-state='up'] {
    color: #9bd77a;
  }
  [data-state='down'] {
    color: #e08b6a;
  }
  [data-state='off'],
  [data-state='probing'] {
    opacity: 0.5;
  }
  .update {
    width: calc(var(--target) * 0.7);
    height: calc(var(--target) * 0.7);
    border-radius: 50%;
    border: 3px solid var(--ink);
    background: var(--accent);
    color: var(--ink);
    display: grid;
    place-items: center;
    cursor: pointer;
    opacity: 1;
  }
  .update svg {
    width: 60%;
    height: 60%;
  }
</style>
