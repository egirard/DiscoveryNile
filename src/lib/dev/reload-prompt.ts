// On-demand reload for the dev server (PROMPTS.md, prompt 30). Vite applies CSS and component changes in place,
// but a change it cannot hot-swap makes it reload the whole page, which interrupts a game in play on
// localhost:3000. The plugin in vite.config.ts holds those reloads back on the server: every `full-reload`
// message becomes a `vite-update-available` event, which this module turns into a prompt (ReloadPrompt.svelte)
// so the player reloads when ready. (Vite's client cannot be stopped from the page: since Vite 6 it settles
// its `vite:beforeFullReload` listeners and reloads whatever they throw, so the hold is server-side.) A production
// build has no `import.meta.hot` and nothing here runs.

const listeners = new Set<() => void>();
let pending = false;
let installed = false;

/** True once a change is waiting for a reload. */
export const isReloadPending = () => pending;

/** Called when a change starts waiting (at most once per page life). */
export function onReloadPending(cb: () => void): () => void {
  listeners.add(cb);
  if (pending) cb();
  return () => listeners.delete(cb);
}

function flag() {
  if (pending) return;
  pending = true;
  for (const cb of listeners) cb();
}

/** Hook Vite's client, once; a no-op without HMR (production, tests). */
export function installReloadPrompt(): void {
  if (installed || !import.meta.hot) return;
  installed = true;
  import.meta.hot.on('vite-update-available', flag);
}
