// The dicecam's overlay (PROMPTS.md, prompt 19): the engine's last reading drawn over the camera frame the way
// WebCamTool's /yahtzee draws its DiceOverlay (its `overlayRenderer`): the tray in orange, each die's outline in blue,
// its box in red, its top face in green, the pips in magenta, a confidence bar along the bottom and the value above.
// Everything is drawn in frame pixels under one transform, so it scales with the feed.
import type { Point, Roi, SeenDie } from './dicecam';

/** Where the frame sits in the canvas: letterboxed, as `object-fit: contain` would place it. */
export interface Fit {
  x: number;
  y: number;
  scale: number;
}

export function fitFrame(frameW: number, frameH: number, canvasW: number, canvasH: number): Fit {
  const scale = Math.min(canvasW / frameW, canvasH / frameH);
  return { x: (canvasW - frameW * scale) / 2, y: (canvasH - frameH * scale) / 2, scale };
}

const TRAY = '#f97316';
const CONTOUR = '#3b82f6';
const BOX = '#ef4444';
const FACE = '#22c55e';
const PIP = '#d946ef';
const ASKEW = '#f97316';
const LABEL_BG = 'rgba(0, 0, 0, 0.85)';
const LABEL = '#ffffff';
export const FONT = "'Nile Sans', 'DejaVu Sans', sans-serif";

function polygon(ctx: CanvasRenderingContext2D, points: Point[]) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.closePath();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

function confidenceColour(confidence: number): string {
  return confidence >= 0.8 ? FACE : confidence >= 0.6 ? '#eab308' : BOX;
}

export function drawTray(ctx: CanvasRenderingContext2D, roi: Roi) {
  if (!roi.detected || roi.polygon.length < 3) return;
  polygon(ctx, roi.polygon);
  ctx.fillStyle = 'rgba(249, 115, 22, 0.1)';
  ctx.fill();
  ctx.strokeStyle = TRAY;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 4]);
  ctx.stroke();
  ctx.setLineDash([]);
}

export function drawDie(ctx: CanvasRenderingContext2D, die: SeenDie) {
  const { x, y, width, height } = die.boundingBox;
  if (die.contour.length >= 3) {
    polygon(ctx, die.contour);
    ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
    ctx.fill();
    ctx.strokeStyle = CONTOUR;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.strokeStyle = BOX;
  ctx.lineWidth = 2;
  ctx.strokeRect(Math.floor(x), Math.floor(y), Math.floor(width), Math.floor(height));
  if (die.face.length >= 3) {
    polygon(ctx, die.face);
    ctx.fillStyle = 'rgba(34, 197, 94, 0.2)';
    ctx.fill();
    ctx.strokeStyle = FACE;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  const pipRadius = Math.max(4, Math.min(width, height) * 0.08);
  ctx.fillStyle = PIP;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  for (const pip of die.pips) {
    ctx.beginPath();
    ctx.arc(pip.x, pip.y, pipRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  // The confidence bar along the bottom of the box.
  const barH = 4;
  const barX = Math.floor(x + 2);
  const barY = Math.floor(y + height - barH - 2);
  const barW = Math.floor(width - 4);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(barX, barY, barW, barH);
  ctx.fillStyle = confidenceColour(die.confidence);
  ctx.fillRect(barX, barY, Math.floor(barW * die.confidence), barH);
  // The value above the die, or below it when the die touches the top.
  const size = Math.min(Math.max(width * 0.4, 16), 48);
  const pad = 4;
  ctx.font = `bold ${size}px ${FONT}`;
  ctx.textBaseline = 'bottom';
  ctx.textAlign = 'center';
  const text = String(die.value);
  const bgW = ctx.measureText(text).width + pad * 2;
  const bgH = size + pad;
  const cx = x + width / 2;
  let labelY = y - 8;
  if (labelY - bgH < 0) labelY = y + height + size + 8;
  ctx.fillStyle = LABEL_BG;
  roundRect(ctx, Math.floor(cx - bgW / 2), Math.floor(labelY - bgH), Math.ceil(bgW), Math.ceil(bgH), 4);
  ctx.fillStyle = die.askew ? ASKEW : LABEL;
  ctx.fillText(text, Math.floor(cx), Math.floor(labelY - pad / 2));
}

/** Draw the tray and the dice of the last reading over the frame placed at `fit`. */
export function drawOverlay(ctx: CanvasRenderingContext2D, dice: SeenDie[] | null, roi: Roi | null, fit: Fit) {
  ctx.save();
  ctx.setTransform(fit.scale, 0, 0, fit.scale, fit.x, fit.y);
  if (roi) drawTray(ctx, roi);
  if (dice) for (const die of dice) drawDie(ctx, die);
  ctx.restore();
}
