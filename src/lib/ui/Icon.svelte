<script lang="ts">
  // Inline SVG icons. Every icon is direction-agnostic and carries no text. Original drawings.
  interface Props {
    name: 'sit' | 'player' | 'table' | 'explorer' | 'evangelism' | 'medicine' | 'zoology' | 'geology' | 'ship' | 'anchor' | 'guides' | 'bearers' | 'askaris' | 'camels' | 'horses' | 'canoes' | 'muskets' | 'food' | 'gifts' | 'water' | 'people' | 'foot' | 'cataract' | 'cache';
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
  {:else if name === 'guides'}
    <!-- compass -->
    <circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2 5-5 2 2-5z" />
  {:else if name === 'bearers'}
    <!-- head-load bundle -->
    <circle cx="12" cy="13" r="3" /><path d="M6 21a6 6 0 0 1 12 0" /><path d="M5 6h14l-1 3H6z" />
  {:else if name === 'askaris'}
    <!-- musket and a man -->
    <circle cx="9" cy="7" r="3" /><path d="M3 21a6 6 0 0 1 12 0" /><path d="M17 3v18" /><path d="M15 6h4" />
  {:else if name === 'camels'}
    <path d="M3 18h18" /><path d="M5 18v-6c0-3 2-5 4-5s3 2 4 2 2-2 4-2 3 3 3 5v6" /><path d="M8 18v-3M16 18v-3" />
  {:else if name === 'horses'}
    <path d="M4 20v-7l3-5h7l3-4 3 1-2 5v10" /><path d="M9 20v-5M15 20v-5" />
  {:else if name === 'canoes'}
    <path d="M2 13c3 4 7 6 10 6s7-2 10-6c-3 1-7 2-10 2S5 14 2 13z" /><path d="M8 5l4 8M16 7l-3 6" />
  {:else if name === 'muskets'}
    <path d="M3 20l12-12" /><path d="M13 6l5-3 3 3-3 5" /><path d="M6 17l1 1" />
  {:else if name === 'food'}
    <!-- sack of rations -->
    <path d="M9 4h6l-1 3h-4z" /><path d="M7 7h10c2 4 2 8 0 13H7c-2-5-2-9 0-13z" />
  {:else if name === 'gifts'}
    <rect x="4" y="9" width="16" height="11" rx="1" /><path d="M4 13h16M12 9v11" /><path d="M12 9c-3 0-5-2-4-4s4 0 4 4c0-4 3-6 4-4s-1 4-4 4z" />
  {:else if name === 'water'}
    <path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z" />
  {:else if name === 'people'}
    <circle cx="8" cy="7" r="3" /><circle cx="16" cy="7" r="3" /><path d="M2 21a6 6 0 0 1 12 0" /><path d="M10 21a6 6 0 0 1 12 0" />
  {:else if name === 'foot'}
    <!-- two footprints -->
    <path d="M7 3c2 0 3 2 3 5s-1 5-3 5-3-2-3-5 1-5 3-5z" /><path d="M5.5 15h3l-.5 4h-2z" />
    <path d="M17 9c2 0 3 2 3 5s-1 5-3 5-3-2-3-5 1-5 3-5z" /><path d="M15.5 21h3" />
  {:else if name === 'cataract'}
    <!-- the map's cataract mark: a ring with two bars -->
    <circle cx="12" cy="12" r="8" /><path d="M8 10h8M8 14h8" />
  {:else if name === 'cache'}
    <!-- a cache: a cairn, round stones piled up three, two and one (prompt 35) -->
    <ellipse cx="6" cy="18.5" rx="3.6" ry="2.6" /><ellipse cx="12.2" cy="18.6" rx="3.4" ry="2.5" /><ellipse cx="18.2" cy="18.4" rx="3.5" ry="2.7" />
    <ellipse cx="9" cy="13.4" rx="3.5" ry="2.6" /><ellipse cx="15.2" cy="13.5" rx="3.6" ry="2.5" />
    <ellipse cx="12" cy="8.3" rx="3.4" ry="2.6" />
  {:else if name === 'geology'}
    <!-- crystal -->
    <path d="M12 3l6 6-6 12-6-12z" /><path d="M6 9h12" /><path d="M12 3v18" />
  {/if}
</svg>
