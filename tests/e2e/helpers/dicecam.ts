import { expect, type Page } from '@playwright/test';

/**
 * The dicecam's camera in E2E is Chromium's fake device playing tests/e2e/fixtures/dicecam-tray.y4m, a still
 * synthetic tray (playwright.config.ts), and its engine is a stand-in worker (static/dicecam-stub.worker.js,
 * docs/dicecam.md) that repeats to the table whatever the scenario posts on the 'dicecam-stub' broadcast channel:
 * the scenario speaks for the engine, in its protocol.
 */
export async function dicecamSays(page: Page, message: Record<string, unknown>) {
  await page.evaluate((m) => new BroadcastChannel('dicecam-stub').postMessage(m), message);
}
/** The synthetic tray: 640×360, four 72-pixel dice in a row, the tray's floor inside its rim. */
export const TRAY = { width: 640, height: 360, dice: [160, 280, 400, 520], y: 180, size: 72, floor: [{ x: 58, y: 58 }, { x: 582, y: 58 }, { x: 582, y: 302 }, { x: 58, y: 302 }] };
const PIPS: Record<number, [number, number][]> = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
/** One die of a reading, with the geometry of the i-th die of the tray so the overlay draws where the die is. */
export function seenDie(i: number, value: number, confidence = 0.92) {
  const cx = TRAY.dice[i];
  const half = TRAY.size / 2;
  const box = { x: cx - half, y: TRAY.y - half, width: TRAY.size, height: TRAY.size };
  const corners = [{ x: box.x, y: box.y }, { x: box.x + box.width, y: box.y }, { x: box.x + box.width, y: box.y + box.height }, { x: box.x, y: box.y + box.height }];
  const step = TRAY.size * 0.26;
  return { value, confidence, askew: false, position: { x: cx, y: TRAY.y }, normalizedPosition: { x: cx / TRAY.width, y: TRAY.y / TRAY.height }, boundingBox: box, contour: corners, face: corners.map((p) => ({ x: p.x + (p.x < cx ? 4 : -4), y: p.y + (p.y < TRAY.y ? 4 : -4) })), pips: PIPS[value].map(([px, py]) => ({ x: cx + px * step, y: TRAY.y + py * step })) };
}
let frameNumber = 0;
/** One settled reading of the tray as the engine posts it: the first `values.length` dice of the tray. */
export function settled(rollId: string, values: number[]) {
  return { type: 'settled', rollId, kind: 'initial', timestamp: 0, frameNumber: ++frameNumber, frame: { width: TRAY.width, height: TRAY.height }, processingTimeMs: 420, activePath: 'cpu', dice: values.map((v, i) => seenDie(i, v)) };
}
/** A throw as the dicecam reads it: every die sure, read twice over so the two readings agree. */
export async function dicecamReads(page: Page, rollId: string, values: number[]) {
  await dicecamSays(page, settled(rollId, values));
  await expect(page.locator('[data-testid^="dice-prompt-"]')).toHaveAttribute('data-seen', String(values.length));
  await dicecamSays(page, settled(rollId, values));
}
