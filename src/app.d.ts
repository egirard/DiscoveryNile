import type { TabletopDebug } from '$lib/game/debug';

declare global {
  const __GIT_HASH__: string;
  interface Window {
    __TABLETOP__?: TabletopDebug;
  }
  namespace App {
    // interface Error {}
    // interface Locals {}
    // interface PageData {}
  }
}

export {};
