import { useSyncExternalStore } from 'react'

import { getAudioContext } from './introSound'

/**
 * Background music: an original dark cinematic loop in A minor (media.music in config/site.js,
 * default /assets/audio/music.mp3 — swap in any MP3; a seamless loop works best).
 *
 * It plays on every visit: after the welcome sound it fades in underneath the intro's tail,
 * and on any other page it starts with the visitor's first click, tap or key press (browsers
 * only allow sound after one). The header's music button turns it off for the rest of that
 * visit; the next visit plays it again.
 */
const PREF_KEY = 'shyastha:music'
const TRACK_KEY = 'shyastha:track' // the song this visitor picked (kept between visits)
const VOLUME = 0.32

/*
 * The songs: the site's own theme by default, or the list staff keep in Panel → Music
 * (fetched at start-up). The visitor picks one from the header's music menu.
 */
let tracks = [] // [{ id, title, url }]
let current = null // id of the chosen song
const buffers = new Map() // url → Promise<AudioBuffer | null>
let voice = null // { source, gain, id }
let state = { playing: false, tracks: [], current: null }
const listeners = new Set()

const emit = (next) => {
  state = { ...state, ...next }
  listeners.forEach((fn) => fn())
}

// "off" lasts for this visit only (this tab), so every new visit starts with the music on
const prefersOff = () => {
  try {
    return window.sessionStorage.getItem(PREF_KEY) === 'off'
  } catch {
    return false
  }
}
const remember = (on) => {
  try {
    window.sessionStorage.setItem(PREF_KEY, on ? 'on' : 'off')
  } catch {
    /* storage unavailable */
  }
}
try {
  window.localStorage.removeItem(PREF_KEY) // the old "off for good" choice no longer applies
} catch {
  /* storage unavailable */
}

// while the welcome screen is up, the music waits for it (it fades in under the intro sound)
let heldForIntro = false
export function holdMusicForIntro() {
  heldForIntro = true
  return () => {
    heldForIntro = false
  }
}

const savedTrack = () => {
  try {
    return window.localStorage.getItem(TRACK_KEY)
  } catch {
    return null
  }
}
const track = () => tracks.find((t) => t.id === current) ?? tracks[0] ?? null

/** The site's own theme, used until (or unless) staff add songs. */
export function configureMusic(musicUrl) {
  tracks = musicUrl ? [{ id: 'theme', title: 'Rameirah theme', url: musicUrl }] : []
  current = tracks[0]?.id ?? null
  emit({ tracks, current })
}

/** Ask the server for the songs staff added; switch to the visitor's saved pick if it's there. */
export async function loadMusicTracks() {
  try {
    const res = await fetch('/api/public/music', { headers: { Accept: 'application/json' } })
    if (!res.ok) return
    const list = ((await res.json())?.tracks ?? []).filter((t) => t?.id && t.url)
    if (!list.length) return
    tracks = list
    const want = list.find((t) => t.id === savedTrack())?.id ?? list[0].id
    const was = voice?.id ?? null
    current = want
    emit({ tracks, current })
    // already playing the theme (the welcome screen started it): move over to the chosen song
    if (was && was !== want) crossfade()
  } catch {
    /* no list: keep the theme */
  }
}

function load(t = track()) {
  if (!t) return null
  if (buffers.has(t.url)) return buffers.get(t.url)
  const c = getAudioContext()
  if (!c) return null
  const pending = fetch(t.url)
    .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject(new Error(String(res.status)))))
    .then((data) => c.decodeAudioData(data))
    .catch(() => {
      buffers.delete(t.url)
      return null
    })
  buffers.set(t.url, pending)
  // keep at most three songs decoded in memory
  while (buffers.size > 3) buffers.delete(buffers.keys().next().value)
  return pending
}

/** Fetch and decode the music early (used by the intro preloader). */
export const preloadMusic = () => load()

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// a meter on the way out, so the header's waves can follow how loud the music is right now
let analyser = null
let samples = null
function meter(c) {
  if (!analyser || analyser.context !== c) {
    analyser = c.createAnalyser()
    analyser.fftSize = 1024
    analyser.smoothingTimeConstant = 0.5
    analyser.connect(c.destination)
    samples = new Float32Array(analyser.fftSize)
  }
  return analyser
}

/** How loud the music is at this moment, 0 (silent or off) to about 1. Cheap: call it every frame. */
export function musicLevel() {
  if (!analyser || !voice) return 0
  analyser.getFloatTimeDomainData(samples)
  let sum = 0
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i]
  // the loop plays quietly underneath the site; scale its level up to fill the meter
  return Math.min(1, Math.sqrt(sum / samples.length) * 9)
}

/** Starts the loop with a fade-in. `delay` and `fade` are in seconds. Quietly does nothing if audio isn't allowed. */
async function start({ delay = 0, fade = 4 } = {}) {
  const c = getAudioContext()
  if (!c || voice) return
  if (c.state !== 'running') {
    // a tap / key press may be about to unlock audio; give it a moment, then give up
    await Promise.race([c.resume().catch(() => {}), wait(800)])
    if (c.state !== 'running') return
  }
  const t = track()
  const buffer = await load(t)
  // nothing to play, something already started, or the visitor picked another song meanwhile
  if (!buffer || voice || track() !== t) return
  const source = c.createBufferSource()
  source.buffer = buffer
  source.loop = true
  const gain = c.createGain()
  const at = c.currentTime + delay
  gain.gain.setValueAtTime(0, c.currentTime)
  gain.gain.setValueAtTime(0, at)
  gain.gain.linearRampToValueAtTime(VOLUME, at + fade)
  source.connect(gain).connect(meter(c))
  source.start(at)
  voice = { source, gain, id: t.id }
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

/** Swap the playing song for the chosen one: the old fades out as the new fades in. */
function crossfade() {
  if (!voice) return
  stop(0.9)
  start({ delay: 0, fade: 1.4 })
}

/**
 * The music menu: play this song. Remembered for next time. Runs inside a click, so it can
 * always unlock audio; picking a song also turns the music on.
 */
export function selectTrack(id) {
  if (!tracks.some((t) => t.id === id)) return
  try {
    window.localStorage.setItem(TRACK_KEY, id)
  } catch {
    /* storage unavailable */
  }
  const same = id === current
  current = id
  emit({ current })
  if (state.playing) {
    if (!same) crossfade()
    return
  }
  remember(true)
  getAudioContext()
    ?.resume()
    .catch(() => {})
  start({ delay: 0, fade: 1.2 })
}

/** Called as the visitor enters through the welcome screen: the music blends in under the intro. */
export function startMusicAfterIntro() {
  heldForIntro = false
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

/**
 * Every visit: try to start straight away (some browsers allow it), and otherwise on the first
 * click, tap or key press anywhere on the page. Called once when the site loads.
 */
// never in the admin panel: it's a place to work, not part of the visit
const inPanel = () => typeof window !== 'undefined' && /^\/panel(\/|$)/.test(window.location.pathname)
let armed = false

export function armMusic() {
  if (typeof window === 'undefined' || armed) return
  armed = true
  const events = ['pointerdown', 'keydown', 'touchend']
  const done = () => {
    armed = false
    events.forEach((e) => window.removeEventListener(e, wake, true))
  }
  function wake() {
    if (state.playing) return done()
    if (heldForIntro || prefersOff() || inPanel()) return
    const c = getAudioContext()
    c?.resume().catch(() => {}) // inside the gesture: this is what unlocks sound
    start({ delay: 0, fade: 2.5 }).then(() => state.playing && done())
  }
  events.forEach((e) => window.addEventListener(e, wake, { capture: true, passive: true }))
  if (!prefersOff() && !inPanel()) {
    load()
    setTimeout(() => {
      if (!heldForIntro && !prefersOff() && !inPanel()) start({ delay: 0, fade: 2.5 }).then(() => state.playing && done())
    }, 600)
  }
}

/**
 * The admin panel: the music fades out while it's open (and doesn't start there). Leaving the
 * panel for the website arms it again, so it comes back with the next click.
 */
export function silenceMusicInPanel() {
  stop(0.6)
  return () => armMusic()
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
