<script lang="ts">
  // Inline SVG icons. Every icon is direction-agnostic and carries no text. Original drawings.
  interface Props {
    name: 'sit' | 'player' | 'table' | 'explorer' | 'evangelism' | 'medicine' | 'zoology' | 'geology' | 'ship' | 'anchor';
    size?: string;
  }
  let { name, size = '1.6em' }: Props = $props();
</script>

<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  {#if name === 'sit'}
    <circle cx="12" cy="7" r="3" /><path d="M6 21v-5a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v5" />
  {:else if name === 'player'}
    <circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" />
  {:else if name === 'table'}
    <rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="12" cy="12" r="4" />
  {:else if name === 'explorer'}
    <!-- pith helmet -->
    <path d="M4 15h16" /><path d="M6 15a6 6 0 0 1 12 0" /><path d="M2 15c2 2 5 3 10 3s8-1 10-3" />
  {:else if name === 'evangelism'}
    <!-- open book -->
    <path d="M12 6v14" /><path d="M12 6c-2-2-5-2-8-1v13c3-1 6-1 8 1" /><path d="M12 6c2-2 5-2 8-1v13c-3-1-6-1-8 1" />
  {:else if name === 'medicine'}
    <!-- medical bottle with a cross -->
    <path d="M9 3h6" /><path d="M10 3v4l-3 4v8a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-8l-3-4V3" /><path d="M12 12v6M9 15h6" />
  {:else if name === 'zoology'}
    <!-- paw -->
    <circle cx="7" cy="9" r="2" /><circle cx="17" cy="9" r="2" /><circle cx="10" cy="5" r="1.8" /><circle cx="14" cy="5" r="1.8" /><path d="M8 18c0-3 2-5 4-5s4 2 4 5c0 2-2 3-4 3s-4-1-4-3z" />
  {:else if name === 'ship'}
    <path d="M3 17h18l-2 4H5z" /><path d="M12 3v14" /><path d="M12 3c4 2 6 5 6 9H12" /><path d="M12 6c-3 1-5 3-5 6h5" />
  {:else if name === 'anchor'}
    <circle cx="12" cy="5" r="3" /><line x1="12" y1="22" x2="12" y2="8" /><path d="M5 12H2a10 10 0 0 0 20 0h-3" />
  {:else if name === 'geology'}
    <!-- crystal -->
    <path d="M12 3l6 6-6 12-6-12z" /><path d="M6 9h12" /><path d="M12 3v18" />
  {/if}
</svg>
