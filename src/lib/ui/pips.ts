/** Pip positions on a 24×24 die face, for the dice the table shows and the faces a player taps. */
export const PIPS: Record<number, [number, number][]> = {
  1: [[12, 12]],
  2: [[6, 6], [18, 18]],
  3: [[6, 6], [12, 12], [18, 18]],
  4: [[6, 6], [18, 6], [6, 18], [18, 18]],
  5: [[6, 6], [18, 6], [12, 12], [6, 18], [18, 18]],
  6: [[6, 6], [18, 6], [6, 12], [18, 12], [6, 18], [18, 18]]
};
