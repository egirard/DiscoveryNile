<script lang="ts">
  // Manual dice (PROMPTS.md, prompt 66): a tray in the dicecam's place for a table without a camera, or a developer
  // without the patience for one. A tap on the tray throws the dice the table is asking for; "one die" tosses a
  // single die in. The dice are made up from a seeded generator and the tray speaks for the dicecam's engine, in its
  // protocol: `rolling` as the dice leave the hand, then two settled readings that agree, each die with its place and
  // geometry, so the table judges and records the throw exactly as it does a camera's (docs/dicecam.md).
  import { createRandom, type Random } from '$lib/game/random';
  import { PIPS } from '$lib/ui/pips';
  import type { EngineMessage, Point } from './dicecam';
  import { AGREE_MS, DIE, FLOOR, FRAME, ROLL_MS, manualThrow, settled, tapText, throwDice, type Placed } from './manual';

  interface Props {
    /** Dice the table wants now; 0 when nothing is asked. */
    wanted: number;
    /** Names the ask: when it changes, the dice in the tray are from before it. */
    ask: string;
    /** Seeds the dice, asked at the first throw. */
    seed: () => number;
    /** Where the table knows dice to lie (a fraction of the frame): a thrown die never lands there. */
    lying: () => Point[];
    onmessage: (message: EngineMessage) => void;
  }
  let { wanted, ask, seed, lying, onmessage }: Props = $props();

  let tray = $state<Placed[]>([]);
  let rolling = $state(false);
  /** The dice in the tray were thrown before the ask now open. */
  let stale = false;
  let throws = 0;
  let random: Random | null = null;
  let timers: ReturnType<typeof setTimeout>[] = [];
  $effect(() => {
    void ask;
    stale = true;
  });
  $effect(() => () => timers.forEach(clearTimeout));

  function roll(one: boolean) {
    if (rolling) return;
    random ??= createRandom(seed());
    const { kept, count } = manualThrow(tray, wanted, one, stale);
    const avoid = [...tray, ...lying().map((p) => ({ x: p.x * FRAME.width, y: p.y * FRAME.height }))];
    const next = [...kept, ...throwDice(random, kept, avoid, count)];
    const rollId = `manual-${++throws}`;
    stale = false;
    rolling = true;
    tray = kept;
    onmessage({ type: 'rolling' });
    timers = [
      setTimeout(() => {
        tray = next;
        rolling = false;
        onmessage(settled(rollId, next, 'initial'));
      }, ROLL_MS),
      setTimeout(() => onmessage(settled(rollId, next, 'update')), ROLL_MS + AGREE_MS)
    ];
  }
  const scale = DIE / 24;
</script>

<div class="dock" data-testid="manual-dice" data-rolling={rolling} data-wanted={wanted} data-dice={[...tray].sort((a, b) => a.x - b.x || a.y - b.y).map((d) => d.value).join(' ')} data-e2e-fit>
  <button class="tray" type="button" data-testid="manual-dice-roll" aria-label={tapText(wanted, tray.length).replace('Tap to roll', 'Roll')} onclick={() => roll(false)}>
    <svg viewBox="0 0 {FRAME.width} {FRAME.height}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <rect class="rim" x="8" y="8" width={FRAME.width - 16} height={FRAME.height - 16} rx="26" />
      <rect class="felt" x={FLOOR.x} y={FLOOR.y} width={FLOOR.width} height={FLOOR.height} rx="14" />
      {#each tray as d, i (i)}
        <g class="die" data-testid="manual-die-{i}" data-value={d.value} transform="translate({d.x} {d.y}) rotate({d.turn})">
          <rect class="shadow" x={-DIE / 2 + 3} y={-DIE / 2 + 4} width={DIE} height={DIE} rx="9" />
          <rect class="body" x={-DIE / 2} y={-DIE / 2} width={DIE} height={DIE} rx="9" />
          {#each PIPS[d.value] as [px, py], j (j)}
            <circle cx={(px - 12) * scale} cy={(py - 12) * scale} r="5.4" />
          {/each}
        </g>
      {/each}
    </svg>
    <span class="hint" data-testid="manual-dice-hint">{rolling ? 'Rolling…' : tapText(wanted, tray.length)}</span>
  </button>
  <button class="one" type="button" data-testid="manual-dice-one" aria-label="Roll one die" onclick={() => roll(true)}>
    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4" /><circle cx="12" cy="12" r="2.4" /></svg>
  </button>
  <span class="label" aria-hidden="true">manual dice</span>
</div>

<style>
  .dock {
    position: relative;
    width: 100%;
    height: 100%;
    border: 3px solid var(--paper);
    border-radius: 10px;
    overflow: hidden;
    background: #0a0a0a;
    box-shadow: 0 4px 18px rgba(0, 0, 0, 0.4);
    font-family: 'Nile Sans', 'DejaVu Sans', sans-serif;
  }
  .tray {
    display: block;
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: pointer;
  }
  .tray > svg {
    display: block;
    width: 100%;
    height: 100%;
  }
  .rim {
    fill: #6b4a2b;
  }
  .felt {
    fill: #1f5c44;
  }
  .shadow {
    fill: rgba(0, 0, 0, 0.35);
  }
  .body {
    fill: #fffaf0;
    stroke: #1c2a2e;
    stroke-width: 2;
  }
  .die circle {
    fill: #1c2a2e;
  }
  .hint {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    padding: 2px 8px;
    font-size: calc(var(--target) * 0.24);
    font-weight: 700;
    text-align: center;
    background: rgba(28, 42, 46, 0.8);
    color: var(--paper);
    pointer-events: none;
  }
  .one {
    position: absolute;
    right: calc(var(--target) * 0.12);
    bottom: calc(var(--target) * 0.12);
    width: var(--target);
    height: var(--target);
    padding: 0;
    border: 2px solid var(--ink);
    border-radius: 8px;
    background: var(--accent);
    color: var(--ink);
    cursor: pointer;
    display: grid;
    place-items: center;
  }
  .one svg {
    width: 70%;
    height: 70%;
  }
  .one rect {
    fill: var(--paper);
    stroke: currentColor;
    stroke-width: 1.6;
  }
  .one circle {
    fill: currentColor;
  }
  .label {
    position: absolute;
    left: 0;
    bottom: 0;
    padding: 1px 6px;
    font-size: calc(var(--target) * 0.22);
    background: rgba(28, 42, 46, 0.8);
    color: var(--paper);
    border-top-right-radius: 6px;
    pointer-events: none;
  }
</style>
