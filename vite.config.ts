import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type Plugin } from 'vite';
import { execSync } from 'node:child_process';

/** The running build's git id: `VITE_GIT_HASH` when the build names it (CI, E2E), else the checkout's own HEAD. */
function gitHash(): string {
  if (process.env.VITE_GIT_HASH) return process.env.VITE_GIT_HASH;
  try {
    return execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || 'local';
  } catch {
    return 'local';
  }
}

/**
 * On-demand reload for the dev server (PROMPTS.md, prompt 30; src/lib/dev/reload-prompt.ts). Vite applies CSS and
 * component changes in place, but a change it cannot hot-swap makes it reload the whole page, which interrupts a
 * game in play. Every such reload is sent through an environment's hot channel as `{ type: 'full-reload' }`; this
 * plugin turns that message into a `vite-update-available` event, which the page answers with a prompt, and the
 * player reloads when ready. Only the dev server has a hot channel; builds and `vite preview` are untouched.
 */
function onDemandReload(): Plugin {
  return {
    name: 'on-demand-reload',
    apply: 'serve',
    configureServer(server) {
      const hold = (channel: { send: (...args: unknown[]) => void }) => {
        const send = channel.send.bind(channel);
        channel.send = (...args: unknown[]) => {
          const payload = args[0] as { type?: string; path?: string } | undefined;
          if (payload && typeof payload === 'object' && payload.type === 'full-reload') {
            send({ type: 'custom', event: 'vite-update-available', data: { path: payload.path ?? null, at: Date.now() } });
            return;
          }
          send(...args);
        };
      };
      for (const environment of Object.values(server.environments)) hold(environment.hot);
      hold(server.hot);
    }
  };
}

export default defineConfig({
  plugins: [sveltekit(), onDemandReload()],
  define: {
    __GIT_HASH__: JSON.stringify(gitHash()),
    // When this build (or dev server) was made: `VITE_BUILD_DATE` pins it for E2E baselines (the status line, prompt 32).
    __BUILD_DATE__: JSON.stringify(process.env.VITE_BUILD_DATE ?? new Date().toISOString())
  }
});
