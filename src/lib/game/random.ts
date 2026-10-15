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
export type Stream = 'main' | 'hunting' | 'water' | 'natives' | 'combat' | 'sickness' | 'specialty' | 'cache';

/**
 * What a roll is for, in the words the table uses to ask for it when the dice are physical
 * (PROMPTS.md, prompt 18): "Roll a D6 {what}; {hint}". `seat` names the roller when it is not
 * the seat that sent the event (the roll for first player, a disaster at the start of a turn).
 */
export interface DiceAsk {
  what: string;
  hint?: string;
  seat?: string;
}

/**
 * Thrown by `d6` and `dice` when the game's dice are physical and no value has been rolled yet:
 * the reducer holds the event and the table asks the seat to roll. Nothing has been changed when
 * it is thrown, the reducers being pure, so the event is simply applied again once the dice are in.
 */
export class DiceNeeded extends Error {
  constructor(
    public readonly stream: Stream,
    public readonly count: number,
    public readonly ask: DiceAsk,
    /** Where in the stream's script the throw is read: the dice rolled go in there (`withRolled`). */
    public readonly at = 0
  ) {
    super(`${count} physical ${count === 1 ? 'die' : 'dice'} needed on the ${stream} stream ${ask.what}`);
    this.name = 'DiceNeeded';
  }
}

export interface RngObject {
  seed: number;
  /** The main stream's generator state. */
  state: number;
  /** Other streams' generator states, created on first use. */
  streams: Partial<Record<Stream, number>>;
  /** Scripted die values per stream, consumed by `d6` before the generator (tests and scenarios), and the physical dice as they are rolled. */
  scripts: Partial<Record<Stream, number[]>>;
  next: Partial<Record<Stream, number>>;
  /** The dice are rolled at the table: a roll with no value scripted asks for one instead of drawing from the generator. */
  physical?: boolean;
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

const UNNAMED: DiceAsk = { what: 'for the game' };

/** Scripted values not yet consumed on a stream. */
function scriptedLeft(state: RngState, stream: Stream): number {
  if (typeof state === 'number') return 0;
  return (state.scripts[stream]?.length ?? 0) - (state.next[stream] ?? 0);
}

/**
 * One six-sided die from a stream: the next scripted value for that stream if any, else from its generator.
 * With physical dice (`physical`), a stream with nothing scripted asks the table instead (`DiceNeeded`).
 */
export function d6(state: RngState, stream: Stream = 'main', ask: DiceAsk = UNNAMED): { state: RngState; value: number } {
  if (typeof state !== 'number') {
    const script = state.scripts[stream];
    const i = state.next[stream] ?? 0;
    if (script && i < script.length) return { state: { ...state, next: { ...state.next, [stream]: i + 1 } }, value: script[i] };
    if (state.physical) throw new DiceNeeded(stream, 1, ask, i);
  }
  const r = nextRandom(state, stream);
  return { state: r.state, value: 1 + Math.floor(r.value * 6) };
}

/** Several dice, in order; with physical dice they are asked for together, as one throw. */
export function dice(state: RngState, count: number, stream: Stream = 'main', ask: DiceAsk = UNNAMED): { state: RngState; values: number[] } {
  if (typeof state !== 'number' && state.physical && scriptedLeft(state, stream) < count) throw new DiceNeeded(stream, count, ask, state.next[stream] ?? 0);
  const values: number[] = [];
  for (let i = 0; i < count; i++) {
    const r = d6(state, stream, ask);
    state = r.state;
    values.push(r.value);
  }
  return { state, values };
}

// ---- Physical dice ---------------------------------------------------------------------------

function asObject(state: RngState): RngObject {
  return typeof state === 'number' ? { seed: state, state, streams: {}, scripts: {}, next: {} } : state;
}

/** Whether the game's dice are rolled at the table. */
export function isPhysical(state: RngState | null): boolean {
  return typeof state === 'object' && state !== null && state.physical === true;
}

/** Turn physical dice on or off; the generator keeps its place either way. */
export function withPhysical(state: RngState, on: boolean): RngState {
  const o = asObject(state);
  if (on) return { ...o, physical: true };
  const { physical: _off, ...rest } = o;
  void _off;
  return rest;
}

/**
 * Add dice rolled at the table to a stream's script at `at`, where the held event reads the throw (`DiceNeeded.at`,
 * plus the dice of the throw already in): after whatever the event reads before it, and ahead of anything a
 * scenario scripted for later, so a game scripted up to a point can turn physical dice on there and still find
 * its later script in place. Without `at` they go at the end.
 */
export function withRolled(state: RngState, stream: Stream, values: number[], at?: number): RngState {
  const o = asObject(state);
  const script = o.scripts[stream] ?? [];
  const i = Math.min(at ?? script.length, script.length);
  return { ...o, scripts: { ...o.scripts, [stream]: [...script.slice(0, i), ...values, ...script.slice(i)] } };
}

/** Dice from a stream's generator whatever is scripted and whether the dice are physical: the table rolling the rest of a throw (PROMPTS.md, prompt 33). */
export function generated(state: RngState, count: number, stream: Stream = 'main'): { state: RngState; values: number[] } {
  const values: number[] = [];
  for (let i = 0; i < count; i++) {
    const r = nextRandom(state, stream);
    state = r.state;
    values.push(1 + Math.floor(r.value * 6));
  }
  return { state, values };
}

/** Drop the physical dice a finished event consumed, so the state does not carry every roll of the game. */
export function settled(state: RngState): RngState {
  if (typeof state === 'number' || !state.physical) return state;
  const used = Object.entries(state.next).filter(([, n]) => (n ?? 0) > 0);
  if (used.length === 0) return state;
  const scripts = { ...state.scripts };
  for (const [stream, n] of used) scripts[stream as Stream] = (scripts[stream as Stream] ?? []).slice(n);
  return { ...state, scripts, next: {} };
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
