import { useSyncExternalStore } from 'react'

import { media } from '../config/site'
import { loadIntroSound } from './introSound'
import { preloadMusic } from './music'
import { loadPublic } from './publicData'

/**
 * Downloads the homepage's videos, images and sounds while the "hello" intro plays, so the
 * page is ready the moment the visitor enters.
 *
 * Videos are downloaded whole and played from memory (instant, no buffering). A video that
 * is very large, or still downloading when the intro ends, is handed back to the browser to
 * stream as usual, so nothing ever waits on it.
 */
const MAX_VIDEO_BYTES = 80 * 1024 * 1024 // above this, stream instead of holding it in memory

const state = { started: false, progress: 0, done: false }
const videos = new Map() // url → { status: 'loading' | 'ready' | 'stream', blobUrl, controller }
const listeners = new Set()
const emit = () => listeners.forEach((fn) => fn())
const subscribe = (fn) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** The source a <video> should use for `url`: null while it's being preloaded. */
export function getVideoSource(url) {
  const entry = url ? videos.get(url) : null
  if (!entry) return url
  if (entry.status === 'loading') return null
  return entry.status === 'ready' ? entry.blobUrl : url
}

export function useVideoSource(url) {
  return useSyncExternalStore(subscribe, () => getVideoSource(url))
}

async function fetchVideo(url, onFraction) {
  const controller = new AbortController()
  videos.set(url, { status: 'loading', controller })
  emit()
  try {
    const res = await fetch(url, { signal: controller.signal })
    const type = res.headers.get('content-type') ?? ''
    if (!res.ok || !type.startsWith('video/')) throw new Error('not a video')
    const total = Number(res.headers.get('content-length')) || 0
    if (total > MAX_VIDEO_BYTES || !res.body) {
      controller.abort()
      throw new Error('stream it')
    }
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
        throw new Error('stream it')
      }
      if (total) onFraction(received / total)
    }
    const blobUrl = URL.createObjectURL(new Blob(chunks, { type }))
    videos.set(url, { status: 'ready', blobUrl })
  } catch {
    videos.set(url, { status: 'stream' })
  }
  onFraction(1)
  emit()
}

function loadImage(url) {
  return new Promise((resolve) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = img.onerror = () => resolve()
    img.src = url
  })
}

/** Starts downloading everything the homepage shows. Safe to call more than once. */
export function preloadHomeAssets() {
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
    const track = (promise) => {
      const i = fractions.push(0) - 1
      tasks.push(Promise.resolve(promise).finally(() => update(i, 1)))
      return (f) => update(i, f)
    }
    const update = (i, f) => {
      fractions[i] = Math.max(fractions[i], f)
      state.progress = fractions.reduce((a, b) => a + b, 0) / fractions.length
      emit()
    }

    for (const url of videoUrls) {
      let report = () => {}
      const p = fetchVideo(url, (f) => report(f))
      report = track(p)
    }
    imageUrls.forEach((url) => track(loadImage(url)))
    track(loadIntroSound(media.introSound))
    track(preloadMusic())
    track(document.fonts?.ready)

    Promise.allSettled(tasks).then(() => {
      state.done = true
      state.progress = 1
      emit()
    })
  })
}

/** The intro is over: anything still downloading streams normally from here on. */
export function releasePreload() {
  for (const [url, entry] of videos) {
    if (entry.status === 'loading') {
      entry.controller?.abort()
      videos.set(url, { status: 'stream' })
    }
  }
  emit()
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
