<script lang="ts">
  import { onMount } from 'svelte';
  import { reduce } from '$lib/game/reduce';
  import { initialState, type GameState } from '$lib/game/state';
  import { relayUrlFromEnvironment, type RelayMessage } from '$lib/repository/relay';
  import { parseSeatId } from '$lib/tabletop/seats';
  import { isDebugBuild } from '$lib/game/debug';
  import Icon from '$lib/ui/Icon.svelte';

  let session = $state('');
  let seat = $state('');
  let name = $state('');
  let uid = $state('');
  let status = $state<'connecting' | 'syncing' | 'synced' | 'offline' | 'error'>('connecting');
  let message = $state('');
  let gameState = $state<GameState>(initialState());
  let ws: WebSocket | null = null;

  const mine = $derived(gameState.seats.find((s) => s.id === seat));
  const seated = $derived(Boolean(mine?.uid && mine.uid === uid));

  function send(m: RelayMessage) {
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(m));
  }
  function take() {
    localStorage.setItem(`tabletop:hand:${session}:name`, name);
    send({ type: 'action', action: 'seat/take', uid, name });
  }

  onMount(() => {
    const q = new URLSearchParams(location.search);
    session = q.get('session') ?? '';
    seat = q.get('seat') ?? '';
    const url = relayUrlFromEnvironment();
    if (!session || !parseSeatId(seat) || !url) {
      status = 'error';
      message = 'This link is incomplete. Scan the code on the table again.';
      return;
    }
    const uidKey = 'tabletop:hand:uid';
    uid = localStorage.getItem(uidKey) ?? `phone-${crypto.randomUUID().slice(0, 8)}`;
    localStorage.setItem(uidKey, uid);
    name = localStorage.getItem(`tabletop:hand:${session}:name`) ?? '';
    if (isDebugBuild && q.get('name')) name = q.get('name')!.slice(0, 32);

    ws = new WebSocket(url);
    ws.onopen = () => {
      status = 'syncing';
      send({ type: 'join', session, role: 'viewer', seat });
      if (isDebugBuild && q.get('auto') === '1') take();
    };
    ws.onmessage = (raw) => {
      const m = JSON.parse(String(raw.data)) as RelayMessage;
      if (m.type === 'state' && m.state?.events) {
        gameState = reduce(m.state.events);
        status = 'synced';
      }
    };
    ws.onclose = () => (status = 'offline');
    return () => ws?.close();
  });
</script>

<main data-e2e-layout data-testid="hand" data-seat={seat}>
  <div class="status" role="status" data-status={status}>{message}</div>
  {#if status === 'error'}
    <Icon name="table" size="4rem" />
  {:else if seated}
    <section class="private" data-e2e-private data-testid="hand-private">
      <Icon name="player" size="5rem" />
      <p class="name" data-testid="hand-name">{mine?.name}</p>
    </section>
  {:else}
    <form class="join" onsubmit={(e) => { e.preventDefault(); take(); }}>
      <input data-testid="hand-name-input" bind:value={name} maxlength="32" placeholder="Name" aria-label="Your name" />
      <button data-testid="hand-take" type="submit" aria-label={`Take seat ${seat}`}><Icon name="sit" size="2.5rem" /></button>
    </form>
  {/if}
</main>

<style>
  :global(body) { margin: 0; background: #1c2a2e; color: #e8d8b0; font-family: 'Nile Sans', 'DejaVu Sans', sans-serif; }
  main { height: 100vh; display: grid; place-items: center; align-content: center; gap: 1.5rem; padding: env(safe-area-inset-top) 1rem env(safe-area-inset-bottom); }
  .status { min-height: 1.5rem; text-align: center; }
  .join { display: grid; gap: 1rem; }
  input { font-size: 1.5rem; padding: 0.75rem; border-radius: 12px; border: 2px solid #e8d8b0; background: transparent; color: inherit; text-align: center; }
  button { font-size: 1.5rem; padding: 0.75rem; border-radius: 12px; border: 2px solid #e8d8b0; background: #e8d8b0; color: #1c2a2e; }
  .private { display: grid; place-items: center; gap: 0.5rem; }
  .name { font-size: 2rem; margin: 0; }
</style>
