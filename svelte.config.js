import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({ fallback: 'index.html' }),
    paths: { base: process.env.PUBLIC_BASE_PATH ?? '' },
    alias: { $features: 'src/lib/features' }
  }
};

export default config;
