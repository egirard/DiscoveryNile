<script lang="ts">
  // Inline SVG icons. Every icon is direction-agnostic and carries no text.
  interface Props { name: 'sit' | 'player' | 'table'; size?: string }
  let { name, size = '1.6em' }: Props = $props();
</script>

<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  {#if name === 'sit'}
    <circle cx="12" cy="7" r="3" /><path d="M6 21v-5a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v5" />
  {:else if name === 'player'}
    <circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" />
  {:else if name === 'table'}
    <rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="12" cy="12" r="4" />
  {/if}
</svg>
