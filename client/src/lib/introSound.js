/**
 * The welcome screen's entrance sound: an original, dark cinematic "hit" — a soft knock, a
 * deep sub-bass boom, a slow dark brass-like A-minor swell and a long hall echo — synthesised
 * with the Web Audio API, so there is no file to download and it starts instantly.
 *
 * Browsers only allow audio after the visitor clicks, taps or presses a key. `primeIntroSound()`
 * is called from those gestures to unlock audio; `playIntroSound()` plays the hit if audio is
 * allowed (or becomes allowed within half a second, e.g. when a finger lifts after a swipe).
 * A mouse-wheel scroll alone never unlocks audio, so that path is silent by design.
 */
const KEY = 'shyastha:sound'
let ctx = null
let played = false

export function isSoundOn() {
  try {
    return window.localStorage.getItem(KEY) !== 'off'
  } catch {
    return true
  }
}

export function setSoundOn(on) {
  try {
    window.localStorage.setItem(KEY, on ? 'on' : 'off')
  } catch {
    /* storage unavailable: the choice lasts for this visit only */
  }
  if (!on) ctx?.suspend().catch(() => {})
}

function getContext() {
  if (ctx) return ctx
  const AudioCtx = window.AudioContext || window.webkitAudioContext
  if (!AudioCtx) return null
  ctx = new AudioCtx()
  return ctx
}

/** Call inside a click / tap / key handler: lets the browser start audio. */
export function primeIntroSound() {
  if (!isSoundOn()) return
  const c = getContext()
  if (c && c.state !== 'running') c.resume().catch(() => {})
}

/** Plays the entrance hit once, if sound is on and the browser allows audio right now. */
export function playIntroSound() {
  if (played || !isSoundOn() || document.hidden) return
  const c = getContext()
  if (!c) return
  const askedAt = performance.now()
  const go = () => {
    if (played || c.state !== 'running' || performance.now() - askedAt > 500) return
    played = true
    render(c)
  }
  if (c.state === 'running') go()
  else c.resume().then(go).catch(() => {})
}

/* ------------------------------------------------------------------ synthesis */

/** A stereo hall reverb: decaying noise. */
function hall(c, seconds, decay) {
  const length = Math.floor(c.sampleRate * seconds)
  const buffer = c.createBuffer(2, length, c.sampleRate)
  for (let ch = 0; ch < 2; ch += 1) {
    const data = buffer.getChannelData(ch)
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** decay
  }
  return buffer
}

function noise(c, seconds) {
  const buffer = c.createBuffer(1, Math.floor(c.sampleRate * seconds), c.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1
  return buffer
}

/** Gain envelope helper: silence → peak at `attack` → silence at `end` (seconds from t). */
function envelope(param, t, peak, attack, end) {
  param.setValueAtTime(0.0001, t)
  param.exponentialRampToValueAtTime(peak, t + attack)
  param.exponentialRampToValueAtTime(0.0001, t + end)
}

/** One low hit: a falling sine plus a muffled noise thump. */
function hit(c, out, t, { from, to, level, length }) {
  const sub = c.createOscillator()
  sub.type = 'sine'
  sub.frequency.setValueAtTime(from, t)
  sub.frequency.exponentialRampToValueAtTime(to, t + length * 0.6)
  const subGain = c.createGain()
  envelope(subGain.gain, t, level, 0.012, length)
  sub.connect(subGain).connect(out)
  sub.start(t)
  sub.stop(t + length + 0.1)

  const thump = c.createBufferSource()
  thump.buffer = noise(c, 0.5)
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 160
  const thumpGain = c.createGain()
  envelope(thumpGain.gain, t, level * 0.7, 0.005, 0.45)
  thump.connect(lp).connect(thumpGain).connect(out)
  thump.start(t)
}

function render(c) {
  const t = c.currentTime + 0.03

  // master chain: gentle compression so it is big but never harsh
  const master = c.createGain()
  master.gain.value = 0.6
  const comp = c.createDynamicsCompressor()
  comp.threshold.value = -16
  comp.ratio.value = 4
  comp.attack.value = 0.003
  comp.release.value = 0.4
  master.connect(comp).connect(c.destination)

  const reverb = c.createConvolver()
  reverb.buffer = hall(c, 4.2, 2.4)
  const wet = c.createGain()
  wet.gain.value = 0.5
  reverb.connect(wet).connect(master)

  const bus = c.createGain()
  bus.connect(master)
  bus.connect(reverb)

  // 1 · two hits: a soft knock, then the big boom
  hit(c, bus, t, { from: 110, to: 60, level: 0.35, length: 0.5 })
  hit(c, bus, t + 0.34, { from: 72, to: 33, level: 1, length: 3.2 })

  // 2 · dark swell: A-minor stack of detuned saws through an opening low-pass filter
  const swellStart = t + 0.34
  const filter = c.createBiquadFilter()
  filter.type = 'lowpass'
  filter.Q.value = 0.8
  filter.frequency.setValueAtTime(120, swellStart)
  filter.frequency.exponentialRampToValueAtTime(950, swellStart + 1.9)
  filter.frequency.exponentialRampToValueAtTime(200, swellStart + 5)
  const swellGain = c.createGain()
  swellGain.gain.setValueAtTime(0.0001, swellStart)
  swellGain.gain.exponentialRampToValueAtTime(0.26, swellStart + 1.7)
  swellGain.gain.setValueAtTime(0.26, swellStart + 2.4)
  swellGain.gain.exponentialRampToValueAtTime(0.0001, swellStart + 5.6)
  filter.connect(swellGain).connect(bus)

  const notes = [55, 82.41, 110, 130.81, 164.81] // A1 E2 A2 C3 E3
  notes.forEach((freq, i) => {
    for (const detune of [-8, 7]) {
      const osc = c.createOscillator()
      osc.type = 'sawtooth'
      osc.frequency.value = freq
      osc.detune.value = detune
      const g = c.createGain()
      g.gain.value = 0.22 / (1 + i * 0.6)
      osc.connect(g).connect(filter)
      osc.start(swellStart)
      osc.stop(swellStart + 5.8)
    }
  })

  // 3 · a faint high shimmer over the top
  ;[880, 1318.5].forEach((freq) => {
    const osc = c.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = freq
    const g = c.createGain()
    g.gain.setValueAtTime(0.0001, t + 0.9)
    g.gain.exponentialRampToValueAtTime(0.018, t + 2.2)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 5.2)
    osc.connect(g).connect(reverb)
    osc.start(t + 0.9)
    osc.stop(t + 5.4)
  })
}
