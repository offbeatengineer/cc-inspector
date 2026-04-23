// 64-bit FNV-1a over UTF-8 bytes. Must match internal/api/highlight.go:fnv1a64.
// Safe arithmetic using 16-bit pieces + Math.floor carry propagation (all
// intermediates stay well under 2^53).
const utf8 = new TextEncoder();

const PRIME_0 = 0x01b3;
const PRIME_1 = 0x0000;
const PRIME_2 = 0x0100;
const PRIME_3 = 0x0000;

export function fnv1a64(bytes: Uint8Array): string {
  let lo = 0x84222325 >>> 0;
  let hi = 0xcbf29ce4 >>> 0;

  for (let i = 0; i < bytes.length; i++) {
    lo = (lo ^ bytes[i]) >>> 0;

    const a0 = lo & 0xffff;
    const a1 = (lo >>> 16) & 0xffff;
    const a2 = hi & 0xffff;
    const a3 = (hi >>> 16) & 0xffff;

    // Cross products of 16-bit pieces. Each is <= 0xffff * 0xffff < 2^32.
    let r0 = a0 * PRIME_0;
    let r1 = a1 * PRIME_0 + a0 * PRIME_1;
    let r2 = a2 * PRIME_0 + a1 * PRIME_1 + a0 * PRIME_2;
    let r3 = a3 * PRIME_0 + a2 * PRIME_1 + a1 * PRIME_2 + a0 * PRIME_3;

    // Propagate carries. Math.floor(x / 65536) handles values up to ~2^53.
    r1 += Math.floor(r0 / 65536);
    r0 &= 0xffff;
    r2 += Math.floor(r1 / 65536);
    r1 &= 0xffff;
    r3 += Math.floor(r2 / 65536);
    r2 &= 0xffff;
    r3 &= 0xffff;

    lo = ((r1 * 0x10000) + r0) >>> 0;
    hi = ((r3 * 0x10000) + r2) >>> 0;
  }

  return hi.toString(16).padStart(8, "0") + lo.toString(16).padStart(8, "0");
}

export function hashKey(lang: string, code: string): string {
  return fnv1a64(utf8.encode(lang + "\x00" + code));
}
