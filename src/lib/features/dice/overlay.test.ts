import { describe, expect, it } from 'vitest';
import { fitFrame } from './overlay';

describe('placing the camera frame in the dicecam', () => {
  it('letterboxes the frame, centred, as object-fit: contain would', () => {
    expect(fitFrame(640, 360, 1280, 720)).toEqual({ x: 0, y: 0, scale: 2 });
    expect(fitFrame(640, 360, 700, 470)).toEqual({ x: 0, y: (470 - 360 * (700 / 640)) / 2, scale: 700 / 640 });
    expect(fitFrame(640, 360, 1000, 300)).toEqual({ x: (1000 - 640 * (300 / 360)) / 2, y: 0, scale: 300 / 360 });
  });
});
