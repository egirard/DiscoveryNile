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
//
// Rolls are drawn from named streams, each its own generator derived from the seed: 'main'
// (the roll-off, the deck, exploration and disasters) and one per later rule (hunting, …). A
// rule added later never shifts the rolls of an earlier one, so a scenario's story survives.

/** The stream a roll belongs to. */
export type Stream = 'main' | 'hunting' | 'water';

export interface RngObject {
  seed: number;
  /** The main stream's generator state. */
  state: number;
  /** Other streams' generator states, created on first use. */
  streams: Partial<Record<Stream, number>>;
  /** Scripted die values per stream, consumed by `d6` before the generator (tests and scenarios). */
  scripts: Partial<Record<Stream, number[]>>;
  next: Partial<Record<Stream, number>>;
}

/** Either the bare 32-bit state of the main stream, or the full form with streams and scripts. */
export type RngState = number | RngObject;

export function rngFromSeed(seed: number): RngState {
  return seed >>> 0;
}

/** A generator whose first dice are scripted per stream (a bare list scripts 'main'); after the script it continues from the seed. */
export function rngScripted(seed: number, script: number[] | Partial<Record<Stream, number[]>>): RngState {
  const clamp = (values: number[]) => values.map((v) => Math.min(6, Math.max(1, Math.floor(v))));
  const scripts: Partial<Record<Stream, number[]>> = {};
  if (Array.isArray(script)) scripts.main = clamp(script);
  else for (const [k, v] of Object.entries(script)) if (v?.length) scripts[k as Stream] = clamp(v);
  return { seed: seed >>> 0, state: seed >>> 0, streams: {}, scripts, next: {} };
}

/** FNV-1a of the stream name folded into the seed: a stream's own starting state. */
function derive(seed: number, stream: Stream): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < stream.length; i++) h = Math.imul(h ^ stream.charCodeAt(i), 0x01000193);
  return (seed ^ h) >>> 0;
}

function raw(state: RngState, stream: Stream): number {
  if (typeof state === 'number') return stream === 'main' ? state : derive(state, stream);
  if (stream === 'main') return state.state;
  return state.streams[stream] ?? derive(state.seed, stream);
}

function withRaw(state: RngState, stream: Stream, next: number): RngState {
  if (typeof state === 'number') {
    if (stream === 'main') return next;
    return { seed: state, state, streams: { [stream]: next }, scripts: {}, next: {} };
  }
  if (stream === 'main') return { ...state, state: next };
  return { ...state, streams: { ...state.streams, [stream]: next } };
}

export function nextRandom(state: RngState, stream: Stream = 'main'): { state: RngState; value: number } {
  const a = (raw(state, stream) + 0x6d2b79f5) >>> 0;
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return { state: withRaw(state, stream, a), value: ((t ^ (t >>> 14)) >>> 0) / 4294967296 };
}

/** One six-sided die from a stream: the next scripted value for that stream if any, else from its generator. */
export function d6(state: RngState, stream: Stream = 'main'): { state: RngState; value: number } {
  if (typeof state !== 'number') {
    const script = state.scripts[stream];
    const i = state.next[stream] ?? 0;
    if (script && i < script.length) return { state: { ...state, next: { ...state.next, [stream]: i + 1 } }, value: script[i] };
  }
  const r = nextRandom(state, stream);
  return { state: r.state, value: 1 + Math.floor(r.value * 6) };
}

/** Several dice, in order. */
export function dice(state: RngState, count: number, stream: Stream = 'main'): { state: RngState; values: number[] } {
  const values: number[] = [];
  for (let i = 0; i < count; i++) {
    const r = d6(state, stream);
    state = r.state;
    values.push(r.value);
  }
  return { state, values };
}

/** Fisher–Yates with the serialisable PRNG, always on the main stream. */
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
