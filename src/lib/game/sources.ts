// Which throw each die in the log came from (PROMPTS.md, prompt 37). With physical dice every die a rule reads comes
// from a stream's script, where `dice/rolled` put it (`DieSource`: the event and the die's place in it), and the
// generator notes each die as it is read (`RngObject.read`, in reading order). The log lines a rule writes carry the
// dice by value only, so once an event has run, its new lines are matched to the dice read: in order, each roll to
// the next die read with that value, a die rolled and not logged being skipped. A tap on a die in the log then knows
// the throw to correct.
import type { Asked, ReadDie, RngState } from './random';
import type { GameState, RollRecord } from './state';

/** The dice read since the last event settled, or none. */
export function readOf(rng: RngState | null): ReadDie[] {
  return typeof rng === 'object' && rng !== null && rng.read ? rng.read : [];
}

/** Tag the dice of `records` with the throws they were read from, matched in order by value. */
export function tagRolls(records: RollRecord[], read: ReadDie[]): RollRecord[] {
  if (read.length === 0) return records;
  let cursor = 0;
  return records.map((r) => {
    if (r.rolls.length === 0 || r.contenders) return r;
    let changed = false;
    const rolls = r.rolls.map((roll) => {
      const j = read.findIndex((d, k) => k >= cursor && d.value === roll.value);
      if (j < 0) return roll;
      cursor = j + 1;
      const from = read[j].from;
      if (!from) return roll;
      changed = true;
      return { ...roll, from };
    });
    return changed ? { ...r, rolls } : r;
  });
}

/** The asks answered since the last event settled, or none. */
export function askedOf(rng: RngState | null): Asked[] {
  return typeof rng === 'object' && rng !== null && rng.asked ? rng.asked : [];
}

/**
 * Give each line the asks its dice answered (PROMPTS.md, prompt 81): the dice of `read` belong to the asks of `asked`
 * in order, and a line's rolls are matched to the dice read as `tagRolls` matches them. An ask whose dice no line
 * shows (rolled and not logged) goes with the line of the next ask that is shown. `loose` are the asks after the
 * last one matched: answered, with no line yet to stand under.
 */
export function attachAsks(records: RollRecord[], read: ReadDie[], asked: Asked[]): { records: RollRecord[]; loose: Asked[] } {
  if (asked.length === 0) return { records, loose: [] };
  const askOf: number[] = [];
  asked.forEach((a, k) => a.values.forEach(() => askOf.push(k)));
  let cursor = 0;
  let taken = 0; // asks below this index are given out
  const out = records.map((r) => {
    if (r.rolls.length === 0 || r.contenders) return r;
    let upTo = taken;
    for (const roll of r.rolls) {
      const j = read.findIndex((d, k) => k >= cursor && d.value === roll.value);
      if (j < 0) continue;
      cursor = j + 1;
      if (askOf[j] !== undefined) upTo = Math.max(upTo, askOf[j] + 1);
    }
    if (upTo === taken) return r;
    const asks = asked.slice(taken, upTo);
    taken = upTo;
    return { ...r, asks };
  });
  return { records: out, loose: asked.slice(taken) };
}

/** Every line of the game so far, in order: the turns played, then the turn in progress. Append-only as the game goes on. */
export function allRecords(s: GameState): RollRecord[] {
  return [...s.history.flatMap((t) => t.log), ...(s.turn?.log ?? [])];
}
const records = allRecords;

/**
 * The lines `after` added to `before`, tagged with the dice the event between them read, put back where they lie:
 * the turn in progress, the history (a turn that ended with the event), an explorer's last meal.
 */
export function tagNew(before: GameState, after: GameState): GameState {
  const read = readOf(after.rng);
  if (read.length === 0) return after;
  const fresh = records(after).slice(records(before).length);
  if (fresh.length === 0) return after;
  // Each line also keeps the asks its dice answered (prompt 81); asks left over stand under the last line with dice.
  const withAsks = attachAsks(tagRolls(fresh, read), read, askedOf(after.rng));
  const last = withAsks.loose.length ? withAsks.records.findLastIndex((r) => r.rolls.length > 0 && !r.contenders) : -1;
  const tagged = last < 0 ? withAsks.records : withAsks.records.map((r, i) => (i === last ? { ...r, asks: [...(r.asks ?? []), ...withAsks.loose] } : r));
  const swap = new Map<RollRecord, RollRecord>();
  fresh.forEach((r, i) => {
    if (tagged[i] !== r) swap.set(r, tagged[i]);
  });
  if (swap.size === 0) return after;
  const swapped = (log: RollRecord[]) => (log.some((r) => swap.has(r)) ? log.map((r) => swap.get(r) ?? r) : log);
  return {
    ...after,
    history: after.history.map((t) => {
      const log = swapped(t.log);
      return log === t.log ? t : { ...t, log };
    }),
    turn: after.turn ? { ...after.turn, log: swapped(after.turn.log) } : after.turn,
    explorers: after.explorers.map((e) => (e.lastMeal && swap.has(e.lastMeal) ? { ...e, lastMeal: swap.get(e.lastMeal)! } : e))
  };
}
