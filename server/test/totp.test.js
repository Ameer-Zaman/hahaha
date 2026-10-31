import assert from 'node:assert/strict'
import test from 'node:test'

import { base32Decode, base32Encode, hotp, newRecoveryCodes, newSecret, otpauthUrl, totp, verifyTotp } from '../src/services/totp.js'

/**
 * The sign-in path depends on these, so they are checked against the numbers published in
 * the RFCs rather than against our own output.
 */

// RFC 4648 §10 — the base32 examples.
test('base32 matches RFC 4648', () => {
  const cases = [
    ['', ''],
    ['f', 'MY'],
    ['fo', 'MZXQ'],
    ['foo', 'MZXW6'],
    ['foob', 'MZXW6YQ'],
    ['fooba', 'MZXW6YTB'],
    ['foobar', 'MZXW6YTBOI'],
  ]
  for (const [plain, encoded] of cases) {
    assert.equal(base32Encode(Buffer.from(plain)), encoded, `encode ${JSON.stringify(plain)}`)
    assert.equal(base32Decode(encoded).toString(), plain, `decode ${encoded}`)
  }
})

// RFC 4226 §D — the HOTP test values for the secret "12345678901234567890".
test('hotp matches RFC 4226', () => {
  const secret = base32Encode(Buffer.from('12345678901234567890'))
  const expected = ['755224', '287082', '359152', '969429', '338314', '254676', '287922', '162583', '399871', '520489']
  expected.forEach((code, counter) => assert.equal(hotp(secret, counter), code, `counter ${counter}`))
})

// RFC 6238 §B — the TOTP test values (SHA-1 column) for the same secret.
test('totp matches RFC 6238', () => {
  const secret = base32Encode(Buffer.from('12345678901234567890'))
  const cases = [
    [59, '94287082'],
    [1111111109, '07081804'],
    [1111111111, '14050471'],
    [1234567890, '89005924'],
    [2000000000, '69279037'],
    [20000000000, '65353130'],
  ]
  // the RFC prints eight digits; an authenticator app shows the last six
  for (const [seconds, eight] of cases) {
    assert.equal(totp(secret, seconds * 1000), eight.slice(-6), `at ${seconds}s`)
  }
})

test('a code is accepted a step either side, and not beyond', () => {
  const secret = newSecret()
  const now = 1_700_000_000_000
  assert.ok(verifyTotp(secret, totp(secret, now), { at: now }), 'this moment')
  assert.ok(verifyTotp(secret, totp(secret, now - 30_000), { at: now }), 'one step ago')
  assert.ok(verifyTotp(secret, totp(secret, now + 30_000), { at: now }), 'one step ahead')
  assert.equal(verifyTotp(secret, totp(secret, now - 90_000), { at: now }), null, 'three steps ago is too old')
  assert.equal(verifyTotp(secret, totp(secret, now + 90_000), { at: now }), null, 'three steps ahead is refused')
})

test('rubbish is refused rather than throwing', () => {
  const secret = newSecret()
  for (const bad of ['', '12345', '1234567', 'abcdef', null, undefined, '000000']) {
    const result = verifyTotp(secret, bad)
    assert.ok(result === null || typeof result === 'number')
  }
  assert.equal(verifyTotp(secret, '12345'), null)
})

test('the same code twice returns the same step, so it can be refused', () => {
  const secret = newSecret()
  const now = 1_700_000_000_000
  const code = totp(secret, now)
  assert.equal(verifyTotp(secret, code, { at: now }), verifyTotp(secret, code, { at: now }))
})

test('secrets and recovery codes look right', () => {
  const secret = newSecret()
  assert.match(secret, /^[A-Z2-7]{32}$/, 'base32, 160 bits')
  assert.notEqual(newSecret(), newSecret(), 'not the same twice')

  const codes = newRecoveryCodes()
  assert.equal(codes.length, 10)
  assert.equal(new Set(codes).size, 10, 'all different')
  codes.forEach((c) => assert.match(c, /^[0-9A-F]{5}-[0-9A-F]{5}$/))
})

test('the otpauth address carries what an app needs', () => {
  const url = otpauthUrl({ secret: 'ABCDEFGH', account: 'admin@example.com', issuer: 'Rameirah Empire' })
  assert.ok(url.startsWith('otpauth://totp/'))
  assert.match(url, /secret=ABCDEFGH/)
  assert.match(url, /issuer=Rameirah\+Empire/)
  assert.match(url, /digits=6/)
  assert.match(url, /period=30/)
})
