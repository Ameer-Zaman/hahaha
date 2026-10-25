import { useSyncExternalStore } from 'react'

import { media } from '../config/site'
import { loadIntroSound } from './introSound'
import { preloadMusic } from './music'
import { loadPublic } from './publicData'

/**
 * Keeps the homepage's videos ready to play instantly, every time.
 *
 * - On the homepage, the "hello" intro waits while they download.
 * - On any other page, they download quietly in the background once the page has settled,
 *   so arriving at the homepage later is instant too.
 * - Each video is also saved in the browser (Cache Storage), so a returning visitor plays
 *   it straight from disk. One tiny request checks it hasn't been replaced; if it has, the
 *   new file is downloaded and saved instead.
 *
 * Videos play from memory (a blob: address). A video that is very large, or still
 * downloading when the intro ends, streams as usual — and is saved in the background for
 * next time.
 */
const MAX_VIDEO_BYTES = 80 * 1024 * 1024 // above this, stream instead of holding it in memory
const CACHE_NAME = 'shyastha-media-v1'

const state = { started: false, listed: false, progress: 0, done: false }
const videos = new Map() // url → { status: 'loading' | 'ready' | 'stream', blobUrl?, controller? }
const listeners = new Set()
const emit = () => listeners.forEach((fn) => fn())
const subscribe = (fn) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** The source a <video> should use for `url`: null while it's being preloaded. */
export function getVideoSource(url) {
  // the preloader is still finding out which videos the homepage uses: wait a moment
  // rather than start a second, parallel download
  if (url && state.started && !state.listed) return null
  const entry = url ? videos.get(url) : null
  if (!entry) return url
  if (entry.status === 'loading') return null
  return entry.status === 'ready' ? entry.blobUrl : url
}

export function useVideoSource(url) {
  return useSyncExternalStore(subscribe, () => getVideoSource(url))
}

/* ------------------------------------------------------------ the saved copies */

async function openCache() {
  try {
    return typeof caches !== 'undefined' ? await caches.open(CACHE_NAME) : null
  } catch {
    return null // private mode, blocked storage …
  }
}

async function saveCopy(cache, url, blob, res) {
  if (!cache) return
  const headers = { 'content-type': blob.type }
  const etag = res?.headers.get('etag')
  const modified = res?.headers.get('last-modified')
  if (etag) headers['x-etag'] = etag
  if (modified) headers['x-last-modified'] = modified
  try {
    await cache.put(url, new Response(blob, { headers }))
  } catch {
    /* storage full or unavailable: it simply downloads next time */
  }
}

/** Downloads `res`'s body with progress; null when it's too big to hold in memory. */
async function readBody(res, onFraction, controller) {
  const total = Number(res.headers.get('content-length')) || 0
  if (total > MAX_VIDEO_BYTES || !res.body) return null
  const reader = res.body.getReader()
  const chunks = []
  let received = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    received += value.length
    if (received > MAX_VIDEO_BYTES) {
      controller.abort()
      return null
    }
    if (total) onFraction(received / total)
  }
  return new Blob(chunks, { type: res.headers.get('content-type') || 'video/mp4' })
}

/** Is the saved copy still the current file? (true when the server can't be asked) */
async function stillCurrent(url, saved, signal) {
  const headers = {}
  const etag = saved.headers.get('x-etag')
  const modified = saved.headers.get('x-last-modified')
  if (etag) headers['If-None-Match'] = etag
  else if (modified) headers['If-Modified-Since'] = modified
  else return { current: true }
  try {
    const res = await fetch(url, { headers, signal, cache: 'no-store' })
    if (res.status === 304) return { current: true }
    if (res.ok) return { current: false, res } // replaced: here is the new file
    return { current: false, res: null }
  } catch {
    return { current: true } // offline, or the host won't answer the check
  }
}

async function fetchVideo(url, onFraction) {
  const controller = new AbortController()
  videos.set(url, { status: 'loading', controller })
  emit()
  // only settle the entry if the intro hasn't already handed this video over to streaming
  const settle = (entry) => {
    if (videos.get(url)?.controller === controller) videos.set(url, entry)
  }
  const cache = await openCache()
  try {
    const saved = cache ? await cache.match(url) : null
    let res = null
    if (saved) {
      const check = await stillCurrent(url, saved, controller.signal)
      if (check.current) {
        const blob = await saved.blob()
        settle({ status: 'ready', blobUrl: URL.createObjectURL(blob) })
        return
      }
      await cache.delete(url)
      res = check.res
      if (!res) throw new Error('gone')
    }
    res = res ?? (await fetch(url, { signal: controller.signal }))
    const type = res.headers.get('content-type') ?? ''
    if (!res.ok || !type.startsWith('video/')) throw new Error('not a video')
    const blob = await readBody(res, onFraction, controller)
    if (!blob) throw new Error('stream it')
    saveCopy(cache, url, blob, res)
    settle({ status: 'ready', blobUrl: URL.createObjectURL(blob) })
  } catch {
    settle({ status: 'stream' })
  } finally {
    onFraction(1)
    emit()
  }
}

/** Saves a video for next time without touching what's playing now. */
async function saveForNextTime(url) {
  const cache = await openCache()
  if (!cache || (await cache.match(url))) return
  try {
    const controller = new AbortController()
    const res = await fetch(url)
    if (!res.ok || !(res.headers.get('content-type') ?? '').startsWith('video/')) return
    const blob = await readBody(res, () => {}, controller)
    if (blob) await saveCopy(cache, url, blob, res)
  } catch {
    /* next time, then */
  }
}

/** Drops saved videos the homepage no longer uses. */
async function pruneCache(keep) {
  const cache = await openCache()
  if (!cache) return
  for (const req of await cache.keys()) if (!keep.has(new URL(req.url).pathname) && !keep.has(req.url)) cache.delete(req)
}

function loadImage(url) {
  return new Promise((resolve) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = img.onerror = () => resolve()
    img.src = url
  })
}

/* ------------------------------------------------------------ public API */

/**
 * Starts downloading everything the homepage shows. Safe to call more than once.
 * `audio: false` (background mode) leaves out the welcome sound and music: they load
 * when the welcome screen opens anyway, and are the heaviest part for a visitor who may
 * never go to the homepage.
 */
export function preloadHomeAssets({ audio = true } = {}) {
  if (state.started) return
  state.started = true

  // the files chosen in the panel replace the built-in ones; give the API a moment to say
  const site = loadPublic('/site').then((entry) => (entry.status === 'ok' ? (entry.data?.media ?? {}) : {}))
  const timeout = new Promise((resolve) => setTimeout(() => resolve({}), 1500))

  Promise.race([site, timeout]).then((picked) => {
    const videoUrls = [...new Set([picked.heroVideo ?? media.hero.video, picked.welcomeVideo ?? media.trailer.video].filter(Boolean))]
    const imageUrls = [
      media.hero.image,
      media.hero.videoPoster,
      picked.posterAdministration ?? media.features.administration,
      picked.posterGangs ?? media.features.gangs,
      picked.posterWars ?? media.features.wars,
      picked.posterRules ?? media.features.rules,
      picked.joinImage ?? media.join.image,
    ].filter(Boolean)

    const tasks = []
    const fractions = []
    const update = (i, f) => {
      fractions[i] = Math.max(fractions[i], f)
      state.progress = fractions.reduce((a, b) => a + b, 0) / fractions.length
      emit()
    }
    const track = (promise) => {
      const i = fractions.push(0) - 1
      tasks.push(Promise.resolve(promise).finally(() => update(i, 1)))
      return (f) => update(i, f)
    }

    for (const url of videoUrls) {
      let report = () => {}
      const p = fetchVideo(url, (f) => report(f))
      report = track(p)
    }
    state.listed = true
    emit()
    imageUrls.forEach((url) => track(loadImage(url)))
    if (audio) {
      track(loadIntroSound(media.introSound))
      track(preloadMusic())
    }
    track(document.fonts?.ready)

    Promise.allSettled(tasks).then(() => {
      state.done = true
      state.progress = 1
      emit()
      pruneCache(new Set(videoUrls))
    })
  })
}

/**
 * On pages other than the homepage: preload it quietly once this page has settled
 * (skipped when the visitor has asked to save data).
 */
export function preloadHomeInBackground() {
  if (state.started || navigator.connection?.saveData) return
  const run = () => preloadHomeAssets({ audio: false })
  const idle = window.requestIdleCallback ?? ((fn) => setTimeout(fn, 1500))
  if (document.readyState === 'complete') idle(run, { timeout: 4000 })
  else window.addEventListener('load', () => idle(run, { timeout: 4000 }), { once: true })
}

/** The intro is over: anything still downloading streams now, and is saved for next time. */
export function releasePreload() {
  const late = []
  for (const [url, entry] of videos) {
    if (entry.status === 'loading') {
      videos.set(url, { status: 'stream' })
      entry.controller?.abort()
      late.push(url)
    }
  }
  emit()
  if (late.length) setTimeout(() => late.forEach((url) => saveForNextTime(url)), 12_000)
}

let snapshot = { progress: 0, done: false }
const getSnapshot = () => {
  if (snapshot.progress !== state.progress || snapshot.done !== state.done) snapshot = { progress: state.progress, done: state.done }
  return snapshot
}

/** { progress: 0…1, done } for the intro screen. */
export function usePreloadProgress() {
  return useSyncExternalStore(subscribe, getSnapshot)
}
