import assert from 'node:assert/strict'
import { test } from 'node:test'

import { parseCityAddress, readCityServer } from '../src/services/cityStatus.js'
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

/* ---- reading the server, with the network stood in for ---- */

function withFetch(handler, fn) {
  const real = globalThis.fetch
  const calls = []
  globalThis.fetch = async (url, init) => {
    calls.push(String(url))
    return handler(String(url), init)
  }
  return fn(calls).finally(() => {
    globalThis.fetch = real
  })
}
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
const refused = () => {
  throw Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNREFUSED' } })
}

test('city server: a join code is read from the current cfx list first', () =>
  withFetch(
    (url) => (url.startsWith('https://frontend.cfx-services.net/') ? json({ Data: { clients: 42, sv_maxclients: 128 } }) : refused()),
    async (calls) => {
      assert.deepEqual(await readCityServer(parseCityAddress('cfx.re/join/abc123')), { online: true, players: 42, max: 128 })
      assert.equal(calls[0], 'https://frontend.cfx-services.net/api/servers/single/abc123')
    },
  ))

test('city server: the old list address is the fallback', () =>
  withFetch(
    (url) =>
      url.startsWith('https://servers-frontend.fivem.net/') ? json({ Data: { clients: 3, vars: { sv_maxClients: '64' } } }) : refused(),
    async () => assert.deepEqual(await readCityServer(parseCityAddress('abc123')), { online: true, players: 3, max: 64 }),
  ))

test('city server: a code the list does not have is offline, not an error', () =>
  withFetch(
    () => json({ error: 'not found' }, 404),
    async () => assert.deepEqual(await readCityServer(parseCityAddress('abc123')), { online: false, reason: 'not-listed' }),
  ))

test('city server: a list that refuses says so', () =>
  withFetch(
    () => json({}, 403),
    async () => assert.equal((await readCityServer(parseCityAddress('abc123')).catch((e) => e)).reason, 'http-403'),
  ))

test('city server: an IP is read from dynamic.json, then players.json', () =>
  withFetch(
    (url) => (url.endsWith('/dynamic.json') ? json({}, 404) : json([{ name: 'TEST' }, { name: 'TEST 2' }])),
    async (calls) => {
      assert.deepEqual(await readCityServer(parseCityAddress('203.0.113.7:30120')), { online: true, players: 2, max: null })
      assert.deepEqual(calls, ['http://203.0.113.7:30120/dynamic.json', 'http://203.0.113.7:30120/players.json'])
    },
  ))

test('city server: a server that hides its player list is "blocked"; nothing listening is "refused"', async () => {
  await withFetch(
    () => json({}, 403),
    async () => assert.equal((await readCityServer(parseCityAddress('203.0.113.7:30120')).catch((e) => e)).reason, 'blocked'),
  )
  await withFetch(refused, async () =>
    assert.equal((await readCityServer(parseCityAddress('203.0.113.7:30120')).catch((e) => e)).reason, 'refused'),
  )
})

test('city server: private addresses are never read', () =>
  withFetch(
    () => json({ clients: 1 }),
    async (calls) => {
      assert.equal((await readCityServer(parseCityAddress('127.0.0.1:30120')).catch((e) => e)).code, 'private')
      assert.equal(calls.length, 0)
    },
  ))
