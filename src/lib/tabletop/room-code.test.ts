import { describe, expect, it } from 'vitest';
import { generateRoomCode, isRoomCode, normalizeRoomCode, ROOM_CODE_ALPHABET } from './room-code';

describe('generateRoomCode', () => {
  it('produces five letters from the alphabet', () => {
    const code = generateRoomCode();
    expect(code).toHaveLength(5);
    for (const c of code) expect(ROOM_CODE_ALPHABET).toContain(c);
  });
  it('skips bytes that would bias the distribution', () => {
    // 255 is rejected (>= 234), so the first accepted byte is 0 → 'A'.
    const bytes = [255, 0, 1, 2, 3, 4];
    const code = generateRoomCode((n) => Uint8Array.from(bytes.splice(0, n)));
    expect(code).toBe('ABCDE');
  });
});

describe('normalizeRoomCode / isRoomCode', () => {
  it('uppercases, strips, and truncates', () => expect(normalizeRoomCode(' ab-cd e fg ')).toBe('ABCDE'));
  it('validates length and alphabet', () => {
    expect(isRoomCode('ABCDE')).toBe(true);
    expect(isRoomCode('ABCD')).toBe(false);
    expect(isRoomCode('abcde')).toBe(false);
  });
});
