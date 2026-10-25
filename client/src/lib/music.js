import { useSyncExternalStore } from 'react'

import { getAudioContext } from './introSound'

/**
 * Background music: an original dark cinematic loop in A minor (media.music in config/site.js,
 * default /assets/audio/music.mp3 — swap in any MP3; a seamless loop works best).
 *
 * After the welcome sound it fades in underneath the intro's tail and keeps looping quietly.
 * The header's music button turns it off / on, and the choice is remembered. Like all web
 * audio it only plays once the browser allows sound (after a click, tap or key press).
 */
const PREF_KEY = 'shyastha:music'
const VOLUME = 0.32

let url = null
let buffer = null
let loading = null
let voice = null // { source, gain }
let state = { playing: false }
const listeners = new Set()

const emit = (next) => {
  state = { ...state, ...next }
  listeners.forEach((fn) => fn())
}

const prefersOff = () => {
  try {
    return window.localStorage.getItem(PREF_KEY) === 'off'
  } catch {
    return false
  }
}
const remember = (on) => {
  try {
    window.localStorage.setItem(PREF_KEY, on ? 'on' : 'off')
  } catch {
    /* storage unavailable */
  }
}

export function configureMusic(musicUrl) {
  url = musicUrl
}

function load() {
  if (loading || !url) return loading
  const c = getAudioContext()
  if (!c) return null
  loading = fetch(url)
    .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject(new Error(String(res.status)))))
    .then((data) => c.decodeAudioData(data))
    .then((decoded) => (buffer = decoded))
    .catch(() => {
      loading = null
      return null
    })
  return loading
}

/** Fetch and decode the music early (used by the intro preloader). */
export const preloadMusic = () => load()

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** Starts the loop with a fade-in. `delay` and `fade` are in seconds. Quietly does nothing if audio isn't allowed. */
async function start({ delay = 0, fade = 4 } = {}) {
  const c = getAudioContext()
  if (!c || voice) return
  if (c.state !== 'running') {
    // a tap / key press may be about to unlock audio; give it a moment, then give up
    await Promise.race([c.resume().catch(() => {}), wait(800)])
    if (c.state !== 'running') return
  }
  if (!(await load()) || voice) return
  const source = c.createBufferSource()
  source.buffer = buffer
  source.loop = true
  const gain = c.createGain()
  const at = c.currentTime + delay
  gain.gain.setValueAtTime(0, c.currentTime)
  gain.gain.setValueAtTime(0, at)
  gain.gain.linearRampToValueAtTime(VOLUME, at + fade)
  source.connect(gain).connect(c.destination)
  source.start(at)
  voice = { source, gain }
  emit({ playing: true })
}

function stop(fade = 1.2) {
  const c = getAudioContext()
  if (!voice || !c) return
  const { source, gain } = voice
  const now = c.currentTime
  gain.gain.cancelScheduledValues(now)
  gain.gain.setValueAtTime(gain.gain.value, now)
  gain.gain.linearRampToValueAtTime(0, now + fade)
  source.stop(now + fade + 0.05)
  voice = null
  emit({ playing: false })
}

/** Called as the visitor enters through the welcome screen: the music blends in under the intro. */
export function startMusicAfterIntro() {
  if (prefersOff()) return
  load() // start downloading now, while the intro plays
  start({ delay: 2, fade: 4 })
}

/** The header button. Runs inside a click, so it can always unlock audio. */
export function toggleMusic() {
  const c = getAudioContext()
  if (state.playing) {
    remember(false)
    stop()
  } else {
    remember(true)
    c?.resume().catch(() => {})
    start({ delay: 0, fade: 1.5 })
  }
}

// Pause with the tab: nothing plays while the visitor is elsewhere.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    const c = getAudioContext()
    if (!c || !voice) return
    if (document.hidden) c.suspend().catch(() => {})
    else c.resume().catch(() => {})
  })
}

const subscribe = (fn) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function useMusic() {
  return useSyncExternalStore(subscribe, () => state)
}
