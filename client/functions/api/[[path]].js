/**
 * Cloudflare Pages Function: everything under /api on the website is forwarded to the API
 * server on Render, so the admin login cookie stays on the website's own address.
 *
 * Public data (/api/public/*) and media (/api/media/*) are cached at Cloudflare's edge:
 * however many visitors arrive at once, the API only answers about once per refresh period
 * per Cloudflare location (10–30 s, as the API's Cache-Control says). While a fresh copy is
 * being fetched, visitors get the last one ("stale-while-revalidate"), and if the API is
 * asleep or down, the last good copy keeps being served for up to a day.
 *
 * Settings (Cloudflare → Pages project → Settings → Variables): API_ORIGIN, the API's address
 * (default below).
 */
const DEFAULT_API_ORIGIN = 'https://shyastha-api.onrender.com'
const CACHEABLE = /^\/api\/(public|media)\//
const KEEP_STALE_SECONDS = 24 * 60 * 60 // serve the last good copy this long if the API is unreachable
const MEMORY_MAX_ENTRIES = 200
const MEMORY_MAX_BYTES = 1024 * 1024

// Per-isolate helpers: a small memory cache (works even where the Cache API is unavailable)
// and one shared in-flight request per URL, so a rush of visitors triggers a single API call.
const memory = new Map()
const inflight = new Map()

export async function onRequest(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const origin = (env.API_ORIGIN || DEFAULT_API_ORIGIN).replace(/\/$/, '')
  const target = origin + url.pathname + url.search

  const cacheable = (request.method === 'GET' || request.method === 'HEAD') && CACHEABLE.test(url.pathname)
  if (!cacheable) return forward(request, target, url)

  const key = target // public responses don't depend on cookies, so the address is the key
  const cached = await readCache(key)
  if (cached) {
    const age = (Date.now() - cached.fetchedAt) / 1000
    if (age <= cached.maxAge) return respond(cached, 'HIT')
    // stale: answer now, refresh in the background (once)
    context.waitUntil(refresh(key, request, target, url).catch(() => {}))
    return respond(cached, 'STALE')
  }
  try {
    const fresh = await refresh(key, request, target, url)
    return respond(fresh, fresh.cacheable ? 'MISS' : 'BYPASS')
  } catch {
    const last = await readCache(key, { allowExpired: true })
    return last ? respond(last, 'STALE') : json(502, { message: 'The server could not be reached.' })
  }
}

/** Fetches from the API once per key at a time; stores it if it may be cached. */
function refresh(key, request, target, url) {
  if (inflight.has(key)) return inflight.get(key)
  const job = (async () => {
    const res = await forward(new Request(request.url, { method: 'GET', headers: request.headers }), target, url)
    const entry = await toEntry(res)
    if (entry.cacheable) await writeCache(key, entry)
    else if (entry.status >= 500) {
      // the API is struggling: keep serving the last good copy if there is one
      const last = await readCache(key, { allowExpired: true })
      if (last) return last
    }
    return entry
  })().finally(() => inflight.delete(key))
  inflight.set(key, job)
  return job
}

async function toEntry(res) {
  const body = await res.arrayBuffer()
  const headers = [...res.headers].filter(([k]) => !['set-cookie', 'content-encoding', 'content-length', 'transfer-encoding'].includes(k))
  const cc = res.headers.get('cache-control') || ''
  const maxAge = Number(/max-age=(\d+)/.exec(cc)?.[1] ?? 0)
  const cacheable =
    [200, 301, 302, 404].includes(res.status) && /\bpublic\b/.test(cc) && maxAge > 0 && !res.headers.has('set-cookie')
  return { status: res.status, headers, body, maxAge: res.status === 404 ? Math.min(maxAge, 10) : maxAge, fetchedAt: Date.now(), cacheable }
}

function respond(entry, state) {
  const headers = new Headers(entry.headers)
  headers.set('x-edge-cache', state)
  return new Response(entry.status === 304 ? null : entry.body.slice(0), { status: entry.status, headers })
}

/* ---------- cache: Cloudflare's Cache API (per location), plus a small memory cache ---------- */

async function readCache(key, { allowExpired = false } = {}) {
  const now = Date.now()
  const mem = memory.get(key)
  if (mem && (allowExpired || now - mem.fetchedAt < (mem.maxAge + KEEP_STALE_SECONDS) * 1000)) return mem
  try {
    const hit = await caches.default.match(new Request(key))
    if (!hit) return null
    const meta = JSON.parse(hit.headers.get('x-edge-meta') || '{}')
    const headers = [...hit.headers].filter(([k]) => !['x-edge-meta', 'cache-control', 'content-length'].includes(k))
    headers.push(['cache-control', meta.cc || 'public, max-age=0'])
    const entry = { status: meta.status ?? hit.status, headers, body: await hit.arrayBuffer(), maxAge: meta.maxAge ?? 0, fetchedAt: meta.fetchedAt ?? 0, cacheable: true }
    remember(key, entry)
    return entry
  } catch {
    return null // Cache API not available here: the memory cache still helps
  }
}

async function writeCache(key, entry) {
  remember(key, entry)
  try {
    const headers = new Headers(entry.headers)
    const cc = headers.get('cache-control')
    headers.set('x-edge-meta', JSON.stringify({ status: entry.status, maxAge: entry.maxAge, fetchedAt: entry.fetchedAt, cc }))
    // kept at the edge well past its freshness, so it can be served stale while refreshing or during an outage
    headers.set('cache-control', `public, max-age=${entry.maxAge + KEEP_STALE_SECONDS}`)
    // the Cache API only stores 200s; other statuses (redirects, 404) live in memory only
    if (entry.status === 200) await caches.default.put(new Request(key), new Response(entry.body.slice(0), { status: 200, headers }))
  } catch {
    /* Cache API unavailable: memory only */
  }
}

function remember(key, entry) {
  if (entry.body.byteLength > MEMORY_MAX_BYTES) return
  memory.delete(key)
  memory.set(key, entry)
  while (memory.size > MEMORY_MAX_ENTRIES) memory.delete(memory.keys().next().value)
}

/* ---------- forwarding ---------- */

const DROP = new Set(['host', 'x-forwarded-for', 'x-forwarded-host', 'x-forwarded-proto', 'x-real-ip', 'cf-connecting-ip', 'cf-ipcountry', 'cf-ray', 'cf-visitor', 'cdn-loop'])

async function forward(request, target, url) {
  const headers = new Headers()
  for (const [k, v] of request.headers) if (!DROP.has(k.toLowerCase())) headers.set(k, v)
  // the visitor's real address (set by Cloudflare, can't be faked by the visitor), so the
  // API's sign-in rate limits apply per person
  const ip = request.headers.get('cf-connecting-ip')
  if (ip) headers.set('x-forwarded-for', ip)
  headers.set('x-forwarded-proto', 'https')
  headers.set('x-forwarded-host', url.host)
  const init = { method: request.method, headers, redirect: 'manual' }
  if (!['GET', 'HEAD'].includes(request.method)) init.body = request.body
  return fetch(target, init)
}

function json(status, data) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })
}
