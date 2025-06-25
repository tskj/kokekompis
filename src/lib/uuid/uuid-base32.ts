import { validate as validateUuid } from 'uuid';

// Crockford Base32 alphabet: 0123456789ABCDEFGHJKMNPQRSTVWXYZ
const CROCKFORD_BASE32_CHARS = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const CROCKFORD_BASE32_MAP: Record<string, number> = {};

// Build the reverse mapping
for (let i = 0; i < CROCKFORD_BASE32_CHARS.length; i++) {
  CROCKFORD_BASE32_MAP[CROCKFORD_BASE32_CHARS[i]] = i;
}

// Also accept lowercase
for (let i = 0; i < CROCKFORD_BASE32_CHARS.length; i++) {
  CROCKFORD_BASE32_MAP[CROCKFORD_BASE32_CHARS[i].toLowerCase()] = i;
}


/**
 * Encode buffer to Crockford Base32
 */
function encodeCrockfordBase32(buffer: Buffer): string {
  let result = '';
  let bits = 0;
  let value = 0;

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      result += CROCKFORD_BASE32_CHARS[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    result += CROCKFORD_BASE32_CHARS[(value << (5 - bits)) & 31];
  }

  return result;
}

/**
 * Decode Crockford Base32 to buffer
 */
function decodeCrockfordBase32(input: string): Buffer {
  let value = 0;
  let bits = 0;
  const result: number[] = [];

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (!(char in CROCKFORD_BASE32_MAP)) throw new Error(`Invalid character in Base32 string: ${char}`);

    value = (value << 5) | CROCKFORD_BASE32_MAP[char];
    bits += 5;

    if (bits >= 8) {
      result.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(result);
}

/**
 * Encodes a UUID to Crockford Base32
 */
export function encodeUuidToBase32(uuid: string): string {
  if (!validateUuid(uuid)) throw new Error('Invalid UUID provided for encoding');

  // Remove hyphens and convert to buffer
  const cleanUuid = uuid.replace(/-/g, '');
  const buffer = Buffer.from(cleanUuid, 'hex');

  return encodeCrockfordBase32(buffer).toLowerCase();
}

/**
 * Decodes a Crockford Base32 string to UUID
 */
export function decodeBase32ToUuid(base32String: string): string {
  try {
    const buffer = decodeCrockfordBase32(base32String.toUpperCase());
    const hex = buffer.toString('hex');

    // Add hyphens to make it a proper UUID format
    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20, 32)
    ].join('-');
  } catch {
    throw new Error('Invalid Base32 string provided for decoding');
  }
}

/**
 * Converts a UUID or Base32 string to a valid UUID
 * Returns null if neither format is valid
 */
export function parseUuidParam(param: string): string | null {
  // First, try as UUID
  if (validateUuid(param)) return param;

  // Then, try as Base32
  try {
    const decoded = decodeBase32ToUuid(param);
    if (validateUuid(decoded)) return decoded;
  } catch {
    // Ignore decoding errors, fall through to return null
  }

  return null;
}
