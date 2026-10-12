export const ROOM_CODE_LENGTH = 5;
export const ROOM_CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

type RandomBytes = (length: number) => Uint8Array;

const browserRandomBytes: RandomBytes = (length) => crypto.getRandomValues(new Uint8Array(length));

/** Five uppercase letters, unbiased via rejection sampling. */
export function generateRoomCode(randomBytes: RandomBytes = browserRandomBytes): string {
  const limit = Math.floor(256 / ROOM_CODE_ALPHABET.length) * ROOM_CODE_ALPHABET.length;
  let code = '';
  while (code.length < ROOM_CODE_LENGTH) {
    for (const byte of randomBytes(ROOM_CODE_LENGTH - code.length)) {
      if (byte >= limit) continue;
      code += ROOM_CODE_ALPHABET[byte % ROOM_CODE_ALPHABET.length];
      if (code.length === ROOM_CODE_LENGTH) break;
    }
  }
  return code;
}

export function normalizeRoomCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, ROOM_CODE_LENGTH);
}

export function isRoomCode(value: string): boolean {
  return new RegExp(`^[A-Z]{${ROOM_CODE_LENGTH}}$`).test(value);
}
