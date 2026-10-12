// Seeded, versioned PRNG (mulberry32). All game randomness comes through here, keyed by a
// seed committed in an event, so every client derives the same outcome.
export const PRNG_VERSION = 1;

export type Random = () => number;

export function createRandom(seed: number): Random {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], random: Random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ---- Pure, serialisable form ------------------------------------------------------------------
// The reducer cannot hold a closure, so game state carries the PRNG's 32-bit state and every
// roll returns the next state. Same sequence as createRandom(seed).

/**
 * Either the bare 32-bit generator state, or that state plus a scripted sequence of die values
 * that `d6` consumes first (tests and scenarios drive specific outcomes with it; the sequence is
 * recorded in the test). Shuffles always use the generator.
 */
export type RngState = number | { state: number; script: number[]; next: number };

export function rngFromSeed(seed: number): RngState {
  return seed >>> 0;
}

/** A generator whose first dice are scripted; after the script it continues from the seed. */
export function rngScripted(seed: number, script: number[]): RngState {
  return { state: seed >>> 0, script: script.map((v) => Math.min(6, Math.max(1, Math.floor(v)))), next: 0 };
}

function raw(state: RngState): number {
  return typeof state === 'number' ? state : state.state;
}

function withRaw(state: RngState, next: number): RngState {
  return typeof state === 'number' ? next : { ...state, state: next };
}

export function nextRandom(state: RngState): { state: RngState; value: number } {
  const a = (raw(state) + 0x6d2b79f5) >>> 0;
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return { state: withRaw(state, a), value: ((t ^ (t >>> 14)) >>> 0) / 4294967296 };
}

/** One six-sided die: the next scripted value if any, else from the generator. */
export function d6(state: RngState): { state: RngState; value: number } {
  if (typeof state !== 'number' && state.next < state.script.length) {
    return { state: { ...state, next: state.next + 1 }, value: state.script[state.next] };
  }
  const r = nextRandom(state);
  return { state: r.state, value: 1 + Math.floor(r.value * 6) };
}

/** Several dice, in order. */
export function dice(state: RngState, count: number): { state: RngState; values: number[] } {
  const values: number[] = [];
  for (let i = 0; i < count; i++) {
    const r = d6(state);
    state = r.state;
    values.push(r.value);
  }
  return { state, values };
}

/** Fisher–Yates with the serialisable PRNG. */
export function shuffleWith<T>(items: readonly T[], state: RngState): { state: RngState; items: T[] } {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const r = nextRandom(state);
    state = r.state;
    const j = Math.floor(r.value * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return { state, items: out };
}
