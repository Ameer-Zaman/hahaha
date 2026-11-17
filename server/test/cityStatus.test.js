import assert from 'node:assert/strict'
import { test } from 'node:test'

import { parseCityAddress } from '../src/services/cityStatus.js'
import { settingsGameServerSchema } from '../src/validation/schemas.js'

test('city server address: cfx.re join links and codes', () => {
  for (const raw of ['abc123', 'cfx.re/join/abc123', 'https://cfx.re/join/ABC123', 'connect cfx.re/join/abc123', ' cfx.re/join/abc123/ ']) {
    assert.deepEqual(parseCityAddress(raw), { kind: 'cfx', code: 'abc123', label: 'cfx.re/join/abc123' }, raw)
  }
})

test('city server address: host or IP with a port', () => {
  assert.deepEqual(parseCityAddress('203.0.113.7:30120'), { kind: 'direct', host: '203.0.113.7', port: 30120, label: '203.0.113.7:30120' })
  assert.deepEqual(parseCityAddress('connect play.example.com'), {
    kind: 'direct',
    host: 'play.example.com',
    port: 30120,
    label: 'play.example.com:30120',
  })
  assert.equal(parseCityAddress('play.example.com:30130').port, 30130)
})

test('city server address: rejects anything else', () => {
  for (const raw of ['', 'http://exa mple.com', 'example.com:99999', 'example.com/path', 'not an address', 'javascript:alert(1)', 'a.b']) {
    assert.equal(parseCityAddress(raw), null, raw)
  }
})

test('city server setting: empty clears, bad input is refused', () => {
  assert.equal(settingsGameServerSchema.safeParse({ address: '' }).success, true)
  assert.equal(settingsGameServerSchema.safeParse({ address: 'cfx.re/join/abc123' }).success, true)
  assert.equal(settingsGameServerSchema.safeParse({ address: 'not an address' }).success, false)
})
