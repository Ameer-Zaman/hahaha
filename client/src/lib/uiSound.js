import { getAudioContext } from './introSound'
import { isSoundOn } from './music'

/*
 * Interface sounds: a soft tick when the pointer reaches something you can click, a short
 * click when you press it, an airy whoosh when something opens and a lower one when the page
 * changes. All made here with the Web Audio API (no sound files), very quiet, and only while
 * the sound is on — the header's sound button turns music and these on and off together.
 */

let noise = null
let master = null
let lastHover = 0

function ready() {
  if (!isSoundOn() || document.hidden) return null
  const c = getAudioContext()
  if (!c || c.state !== 'running') return null
  if (!master) {
    master = c.createGain()
    master.gain.value = 0.9
    master.connect(c.destination)
  }
  return c
}

function noiseBuffer(c) {
  if (noise) return noise
  noise = c.createBuffer(1, c.sampleRate * 0.6, c.sampleRate)
  const data = noise.getChannelData(0)
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1
  return noise
}

/** One short tone with a quick attack and an exponential tail. */
function tone(c, { type = 'sine', from, to = from, at = 0, length, volume }) {
  const t = c.currentTime + at
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(from, t)
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, t + length)
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.004)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + length)
  osc.connect(gain).connect(master)
  osc.start(t)
  osc.stop(t + length + 0.02)
}

/** Filtered noise swept between two pitches: the "air" of a whoosh. */
function sweep(c, { from, to, length, volume, q = 1.2 }) {
  const t = c.currentTime
  const src = c.createBufferSource()
  src.buffer = noiseBuffer(c)
  const band = c.createBiquadFilter()
  band.type = 'bandpass'
  band.Q.value = q
  band.frequency.setValueAtTime(from, t)
  band.frequency.exponentialRampToValueAtTime(to, t + length)
  const gain = c.createGain()
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(volume, t + length * 0.35)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + length)
  src.connect(band).connect(gain).connect(master)
  src.start(t)
  src.stop(t + length + 0.02)
}

const jitter = (n, spread = 0.06) => n * (1 + (Math.random() * 2 - 1) * spread)

/** Pointer reaches something clickable. Throttled so sweeping across a menu isn't a rattle. */
export function hoverSound() {
  const now = performance.now()
  if (now - lastHover < 70) return
  const c = ready()
  if (!c) return
  lastHover = now
  tone(c, { from: jitter(2400), to: jitter(1700), length: 0.045, volume: 0.022 })
}

/** A press: a crisp tick over a soft low knock. */
export function clickSound() {
  const c = ready()
  if (!c) return
  tone(c, { type: 'triangle', from: 1300, to: 700, length: 0.06, volume: 0.05 })
  tone(c, { from: 180, to: 90, length: 0.09, volume: 0.07 })
}

/** Something opens (a menu, a list, a pop-up): a short rising whoosh with a bright tip. */
export function openSound() {
  const c = ready()
  if (!c) return
  sweep(c, { from: 500, to: 2600, length: 0.32, volume: 0.05 })
  tone(c, { from: 1500, to: 2100, at: 0.06, length: 0.12, volume: 0.018 })
}

/** Something closes: the same whoosh, falling. */
export function closeSound() {
  const c = ready()
  if (!c) return
  sweep(c, { from: 2200, to: 450, length: 0.26, volume: 0.04 })
}

/** Moving to another page: a longer, lower sweep. */
export function pageSound() {
  const c = ready()
  if (!c) return
  sweep(c, { from: 1800, to: 240, length: 0.6, volume: 0.06, q: 0.8 })
  tone(c, { from: 110, to: 70, at: 0.05, length: 0.4, volume: 0.05 })
}
