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
 * Checked on demand and kept for 10 seconds, so the count is close to live while any number of
 * visitors cost one check every 10 seconds at most, and nothing runs while nobody is looking.
 */

const FRESH_MS = 10_000
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

/** A failed read, with a short reason the panel can explain (never shown to visitors). */
class ReadError extends Error {
  constructor(reason, detail = '') {
    super(detail || reason)
    this.reason = reason
    this.detail = detail
  }
}

/** Why a request didn't get through, in one word. */
function failure(err, where) {
  if (err instanceof ReadError) return err
  if (err.name === 'TimeoutError' || err.name === 'AbortError') return new ReadError('timeout', where)
  const code = err.cause?.code ?? err.code
  if (code === 'ECONNREFUSED') return new ReadError('refused', where)
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') return new ReadError('dns', where)
  if (err instanceof SyntaxError) return new ReadError('not-fivem', where)
  return new ReadError('network', `${where}: ${code || err.message}`)
}

async function getJson(url, headers = {}) {
  let res
  try {
    res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json', ...headers },
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (err) {
    throw failure(err, new URL(url).host)
  }
  if (res.status === 404) return { notFound: true }
  if (!res.ok) throw new ReadError(`http-${res.status}`, new URL(url).host)
  if (Number(res.headers.get('content-length') ?? 0) > MAX_BYTES) throw new ReadError('not-fivem', 'too large')
  const text = await res.text()
  if (text.length > MAX_BYTES) throw new ReadError('not-fivem', 'too large')
  try {
    return { data: JSON.parse(text) }
  } catch {
    throw new ReadError('not-fivem', `${new URL(url).host} did not answer with JSON`)
  }
}

const count = (v) => {
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null
}

/**
 * The FiveM server list, by join code. Cfx moved it to frontend.cfx-services.net in 2026;
 * the old servers-frontend.fivem.net address is tried second in case it comes back.
 */
const LIST_HOSTS = ['https://frontend.cfx-services.net', 'https://servers-frontend.fivem.net']

async function readCfx(code) {
  let last
  for (const host of LIST_HOSTS) {
    try {
      const { data, notFound } = await getJson(`${host}/api/servers/single/${encodeURIComponent(code)}`)
      // the list drops a server a few minutes after it stops answering
      if (notFound || !data?.Data) return { online: false, reason: 'not-listed' }
      const d = data.Data
      return {
        online: true,
        players: count(d.clients ?? d.selfReportedClients ?? d.players?.length),
        max: count(d.sv_maxclients ?? d.svMaxclients ?? d.vars?.sv_maxClients),
      }
    } catch (err) {
      last = failure(err, host)
    }
  }
  throw last
}

async function readDirect({ host, port }) {
  let ip
  try {
    ip = await publicIp(host)
  } catch (err) {
    if (err.code === 'private') throw err
    throw new ReadError('dns', host)
  }
  const base = `http://${net.isIPv6(ip) ? `[${ip}]` : ip}:${port}`
  let first
  try {
    const { data } = await getJson(`${base}/dynamic.json`)
    if (data && data.clients !== undefined) return { online: true, players: count(data.clients), max: count(data.sv_maxclients) }
  } catch (err) {
    first = failure(err, 'dynamic.json')
    // nothing listening at all: no point asking again
    if (first.reason === 'timeout' || first.reason === 'refused') throw first
  }
  // some servers switch dynamic.json off; players.json gives the count (names are dropped here)
  try {
    const { data, notFound } = await getJson(`${base}/players.json`)
    if (Array.isArray(data)) return { online: true, players: data.length, max: null }
    if (notFound) throw new ReadError('blocked', 'players.json')
    throw new ReadError('not-fivem', 'players.json')
  } catch (err) {
    const second = failure(err, 'players.json')
    // the server answered but keeps its player list to itself (e.g. sv_requestParanoia)
    if (/^http-4/.test(second.reason) || second.reason === 'blocked') throw new ReadError('blocked', second.detail)
    throw first && first.reason !== 'not-fivem' ? first : second
  }
}

/** One reading of a parsed address, for tests: { online, players, max } or a thrown ReadError. */
export const readCityServer = (target) => (target.kind === 'cfx' ? readCfx(target.code) : readDirect(target))

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
  const at = new Date().toISOString()
  try {
    const r = await readCityServer(target)
    misses = 0
    if (!r.online) return { state: 'offline', reason: r.reason, checkedAt: at }
    return { state: 'online', players: r.players ?? 0, max: r.max, checkedAt: at }
  } catch (err) {
    if (err.code === 'private') return { state: 'error', reason: 'private', checkedAt: at }
    const reason = err.reason ?? 'network'
    console.warn(`[city] ${target.label}: ${reason}${err.detail ? ` (${err.detail})` : ''}`)
    // one failed read can be a hiccup: keep the last good reading once before saying "offline"
    misses += 1
    if (misses < 2 && cache.status.state === 'online') return { ...cache.status }
    return { state: 'offline', reason, detail: err.detail || undefined, checkedAt: at }
  }
}

/**
 * { state: 'off' }                                      — no address set: show nothing
 * { state: 'online', players, max, checkedAt }          — max is null when the server doesn't say
 * { state: 'offline', reason, checkedAt }               — not answering / not on the server list; the
 *                                                         reason (timeout, refused, blocked, http-403,
 *                                                         not-listed…) is for the panel only
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
