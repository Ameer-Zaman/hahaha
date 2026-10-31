import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

/**
 * Time-based one-time passwords (RFC 6238) — the six digits an authenticator app shows.
 *
 * Written here rather than pulled from a package: it is forty lines, it never changes, and
 * the sign-in path should not depend on code we have not read. It is checked against the
 * test vectors published in the RFC (see server/test/totp.test.js).
 *
 * Authenticator apps all assume SHA-1, 6 digits and a 30-second step, so those are fixed.
 */
const STEP_SECONDS = 30
const DIGITS = 6
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

/** A new shared secret, as the base32 text an authenticator app expects. */
export function newSecret(bytes = 20) {
  return base32Encode(randomBytes(bytes))
}

export function base32Encode(buffer) {
  let bits = 0
  let value = 0
  let out = ''
  for (const byte of buffer) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31]
  return out
}

export function base32Decode(text) {
  const clean = String(text).toUpperCase().replace(/[=\s]/g, '')
  let bits = 0
  let value = 0
  const out = []
  for (const ch of clean) {
    const index = BASE32.indexOf(ch)
    if (index === -1) throw new Error('Not a valid secret.')
    value = (value << 5) | index
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return Buffer.from(out)
}

/** The code for one 30-second step (counter = seconds / 30). */
export function hotp(secret, counter) {
  const key = typeof secret === 'string' ? base32Decode(secret) : secret
  const message = Buffer.alloc(8)
  message.writeBigUInt64BE(BigInt(counter))
  const digest = createHmac('sha1', key).update(message).digest()
  const offset = digest[digest.length - 1] & 0x0f
  const binary =
    ((digest[offset] & 0x7f) << 24) | ((digest[offset + 1] & 0xff) << 16) | ((digest[offset + 2] & 0xff) << 8) | (digest[offset + 3] & 0xff)
  return String(binary % 10 ** DIGITS).padStart(DIGITS, '0')
}

/** The code showing right now. */
export function totp(secret, at = Date.now()) {
  return hotp(secret, Math.floor(at / 1000 / STEP_SECONDS))
}

/**
 * Is `code` right for this secret? One step either side is accepted, because phone clocks
 * drift and because a code typed as it expires should still work.
 *
 * Returns the step it matched (so a used code can be refused next time), or null.
 */
export function verifyTotp(secret, code, { at = Date.now(), window = 1 } = {}) {
  const clean = String(code ?? '').replace(/\D/g, '')
  if (clean.length !== DIGITS) return null
  const now = Math.floor(at / 1000 / STEP_SECONDS)
  for (let drift = -window; drift <= window; drift++) {
    const expected = hotp(secret, now + drift)
    const a = Buffer.from(expected)
    const b = Buffer.from(clean)
    if (a.length === b.length && timingSafeEqual(a, b)) return now + drift
  }
  return null
}

/** The otpauth:// address an authenticator app reads from a QR code. */
export function otpauthUrl({ secret, account, issuer }) {
  const label = encodeURIComponent(`${issuer}:${account}`)
  const params = new URLSearchParams({ secret, issuer, algorithm: 'SHA1', digits: String(DIGITS), period: String(STEP_SECONDS) })
  return `otpauth://totp/${label}?${params.toString()}`
}

/**
 * Recovery codes, for when the phone is lost. Shown once; only their hashes are kept, the
 * same way passwords are.
 */
export function newRecoveryCodes(count = 10) {
  return Array.from({ length: count }, () => {
    const raw = randomBytes(5).toString('hex').toUpperCase() // 10 characters
    return `${raw.slice(0, 5)}-${raw.slice(5)}`
  })
}
