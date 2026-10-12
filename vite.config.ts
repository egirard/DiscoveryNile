import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  define: {
    __GIT_HASH__: JSON.stringify(process.env.VITE_GIT_HASH ?? 'local')
  }
});
