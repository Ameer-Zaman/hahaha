import dns from 'node:dns/promises'
import net from 'node:net'

import { Settings } from '../models/Settings.js'

/**
 * How many players are in the city right now, read from the FiveM server itself.
 *
 * Panel → Site settings → City server holds the server's address: its cfx.re join code
 * (cfx.re/join/abc123) or its IP / host and port (play.example.com:30120). With no address the
 * website shows no indicator at all — it never shows a made-up count.
 *
 * A join code is read from the public FiveM server list; an address is read from the server's
 * own /dynamic.json (or /players.json when that is switched off). Only the count leaves this
 * file: player names and identifiers are never stored or sent to the website.
 *
 * Checked on demand and kept for 45 seconds, so any number of visitors cost one check a minute
 * at most, and nothing runs while nobody is looking.
 */

const FRESH_MS = 45_000
const TIMEOUT_MS = 6000
const MAX_BYTES = 2_000_000
const DEFAULT_PORT = 30120
const UA = 'RameirahEmpireWebsite/1.0 (+https://rameirahempire.com)'

/* ------------------------------------------------------------------ address */

const CFX_CODE = /^[a-z0-9]{4,10}$/i
const HOST = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i

/**
 * What the staff typed → where to read the count from, or null when it isn't a usable address.
 *   "abc123", "cfx.re/join/abc123", "https://cfx.re/join/abc123", "connect cfx.re/join/abc123"
 *   "203.0.113.7:30120", "play.example.com", "play.example.com:30120", "connect 203.0.113.7:30120"
 */
export function parseCityAddress(raw) {
  let s = String(raw ?? '')
    .trim()
    .replace(/^connect\s+/i, '')
    .replace(/^(https?|fivem):\/\//i, '')
    .replace(/\/+$/, '')
  if (!s) return null

  const join = s.match(/^(?:www\.)?cfx\.re\/join\/([a-z0-9]+)$/i)
  if (join) s = join[1]
  if (CFX_CODE.test(s) && !s.includes('.')) return { kind: 'cfx', code: s.toLowerCase(), label: `cfx.re/join/${s.toLowerCase()}` }

  const m = s.match(/^\[?([^\]\s/]+?)\]?(?::(\d{2,5}))?$/)
  if (!m) return null
  const host = m[1].toLowerCase()
  const port = m[2] ? Number(m[2]) : DEFAULT_PORT
  if (port < 1 || port > 65535) return null
  if (!net.isIP(host) && !HOST.test(host)) return null
  return { kind: 'direct', host, port, label: `${host}:${port}` }
}

/* ------------------------------------------------- only public servers, never our own network */

const PRIVATE = new net.BlockList()
for (const [net4, bits] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['224.0.0.0', 3],
])
  PRIVATE.addSubnet(net4, bits, 'ipv4')
for (const [net6, bits] of [
  ['::', 127],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
])
  PRIVATE.addSubnet(net6, bits, 'ipv6')

const isPrivate = (ip) => {
  const v4mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)
  if (v4mapped) return PRIVATE.check(v4mapped[1], 'ipv4')
  return PRIVATE.check(ip, net.isIPv6(ip) ? 'ipv6' : 'ipv4')
}

/** The public address to connect to, or an error when the name points inside a private network. */
async function publicIp(host) {
  const found = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true })
  if (!found.length) throw new Error('no address')
  if (found.some((a) => isPrivate(a.address))) throw Object.assign(new Error('private address'), { code: 'private' })
  return found[0].address
}

/* -------------------------------------------------------------------- reads */

async function getJson(url, headers = {}) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json', ...headers },
    redirect: 'manual',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (res.status === 404) return { notFound: true }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  if (Number(res.headers.get('content-length') ?? 0) > MAX_BYTES) throw new Error('too large')
  const text = await res.text()
  if (text.length > MAX_BYTES) throw new Error('too large')
  return { data: JSON.parse(text) }
}

const count = (v) => {
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null
}

async function readCfx(code) {
  const { data, notFound } = await getJson(`https://servers-frontend.fivem.net/api/servers/single/${encodeURIComponent(code)}`)
  // the list drops a server a few minutes after it stops answering
  if (notFound || !data?.Data) return { online: false }
  const d = data.Data
  return {
    online: true,
    players: count(d.clients ?? d.selfReportedClients ?? d.players?.length),
    max: count(d.sv_maxclients ?? d.svMaxclients ?? d.vars?.sv_maxClients),
  }
}

async function readDirect({ host, port }) {
  const ip = await publicIp(host)
  const base = `http://${net.isIPv6(ip) ? `[${ip}]` : ip}:${port}`
  try {
    const { data } = await getJson(`${base}/dynamic.json`)
    if (data && data.clients !== undefined) return { online: true, players: count(data.clients), max: count(data.sv_maxclients) }
  } catch (err) {
    if (err.name === 'TimeoutError' || err.cause?.code === 'ECONNREFUSED') throw err
  }
  // some servers switch dynamic.json off; players.json gives the count (names are dropped here)
  const { data } = await getJson(`${base}/players.json`)
  if (!Array.isArray(data)) throw new Error('not a FiveM server')
  return { online: true, players: data.length, max: null }
}

/* -------------------------------------------------------------------- cache */

let cache = { key: null, at: 0, status: { state: 'off' } }
let inflight = null
let misses = 0

/** Forget the last reading (the address was changed in the panel). */
export function resetCityStatus() {
  cache = { key: null, at: 0, status: { state: 'off' } }
  misses = 0
}

async function check(target) {
  try {
    const r = target.kind === 'cfx' ? await readCfx(target.code) : await readDirect(target)
    if (!r.online) {
      misses = 0
      return { state: 'offline', checkedAt: new Date().toISOString() }
    }
    misses = 0
    return { state: 'online', players: r.players ?? 0, max: r.max, checkedAt: new Date().toISOString() }
  } catch (err) {
    if (err.code === 'private') return { state: 'error', reason: 'private', checkedAt: new Date().toISOString() }
    // one failed read can be a hiccup: keep the last good reading once before saying "offline"
    misses += 1
    if (misses < 2 && cache.status.state === 'online') return { ...cache.status }
    return { state: 'offline', checkedAt: new Date().toISOString() }
  }
}

/**
 * { state: 'off' }                                      — no address set: show nothing
 * { state: 'online', players, max, checkedAt }          — max is null when the server doesn't say
 * { state: 'offline', checkedAt }                       — not answering / not on the server list
 * { state: 'error', reason: 'private', checkedAt }      — the address points inside a private network (panel only)
 */
export async function getCityStatus({ force = false } = {}) {
  const settings = await Settings.findOne({ key: 'main' }, { gameServer: 1 }).lean()
  const target = parseCityAddress(settings?.gameServer?.address)
  if (!target) return { state: 'off' }
  const key = target.label
  if (!force && cache.key === key && Date.now() - cache.at < FRESH_MS) return cache.status
  if (inflight?.key === key) return inflight.promise

  const promise = check(target)
    .then((status) => {
      cache = { key, at: Date.now(), status }
      return status
    })
    .finally(() => {
      if (inflight?.promise === promise) inflight = null
    })
  inflight = { key, promise }
  return promise
}
