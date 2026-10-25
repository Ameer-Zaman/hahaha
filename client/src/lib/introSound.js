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
/**
 * Which sound plays on entering:
 *   'motif'     — melodic logo: three gold plucks rising into an 808 slide
 *   'signature' — inhale, heartbeat, strike with a gold ring and brass bloom
 *   'cinematic' — the first one: knock, boom and a dark swell
 */
const VARIANT = 'motif'

let ctx = null
let played = false

function getContext() {
  if (ctx) return ctx
  const AudioCtx = window.AudioContext || window.webkitAudioContext
  if (!AudioCtx) return null
  ctx = new AudioCtx()
  return ctx
}

/** Call inside a click / tap / key handler: lets the browser start audio. */
export function primeIntroSound() {
  const c = getContext()
  if (c && c.state !== 'running') c.resume().catch(() => {})
}

/** Plays the entrance hit once, if sound is on and the browser allows audio right now. */
export function playIntroSound() {
  if (played || document.hidden) return
  const c = getContext()
  if (!c) return
  const askedAt = performance.now()
  const go = () => {
    if (played || c.state !== 'running' || performance.now() - askedAt > 500) return
    played = true
    if (VARIANT === 'motif') renderMotif(c)
    else if (VARIANT === 'signature') renderSignature(c)
    else render(c)
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

/* ------------------------------------------------- the Shyastha sound logo */

/** Shared output: master compression + a big hall. Returns { bus, reverb }. */
function chain(c, { level = 0.62, wetLevel = 0.5, hallSeconds = 4.5 } = {}) {
  const master = c.createGain()
  master.gain.value = level
  const comp = c.createDynamicsCompressor()
  comp.threshold.value = -15
  comp.ratio.value = 4
  comp.attack.value = 0.002
  comp.release.value = 0.35
  master.connect(comp).connect(c.destination)
  const reverb = c.createConvolver()
  reverb.buffer = hall(c, hallSeconds, 2.2)
  const wet = c.createGain()
  wet.gain.value = wetLevel
  reverb.connect(wet).connect(master)
  const bus = c.createGain()
  bus.connect(master)
  bus.connect(reverb)
  return { bus, reverb }
}

/** A gold metallic ring: inharmonic bell partials that die away at different speeds. */
function goldRing(c, out, t, base) {
  const partials = [
    [1, 0.5, 2.6],
    [2.01, 0.28, 1.9],
    [2.76, 0.22, 1.5],
    [5.4, 0.12, 0.9],
    [8.93, 0.06, 0.5],
  ]
  for (const [ratio, level, decay] of partials) {
    const osc = c.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = base * ratio
    const g = c.createGain()
    envelope(g.gain, t, level * 0.16, 0.004, decay)
    osc.connect(g).connect(out)
    osc.start(t)
    osc.stop(t + decay + 0.1)
  }
  // a short bright "shing" of air on the strike
  const air = c.createBufferSource()
  air.buffer = noise(c, 0.6)
  const hp = c.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 6500
  const g = c.createGain()
  envelope(g.gain, t, 0.09, 0.003, 0.5)
  air.connect(hp).connect(g).connect(out)
  air.start(t)
}

function renderSignature(c) {
  const t = c.currentTime + 0.03
  const strike = t + 1.25
  const { bus, reverb } = chain(c)

  // 1 · the inhale: a rising, opening whoosh that cuts off right before the strike
  const whoosh = c.createBufferSource()
  whoosh.buffer = noise(c, 1.4)
  const bp = c.createBiquadFilter()
  bp.type = 'bandpass'
  bp.Q.value = 1.4
  bp.frequency.setValueAtTime(260, t)
  bp.frequency.exponentialRampToValueAtTime(3200, strike - 0.02)
  const wg = c.createGain()
  wg.gain.setValueAtTime(0.0001, t)
  wg.gain.exponentialRampToValueAtTime(0.22, strike - 0.06)
  wg.gain.exponentialRampToValueAtTime(0.0001, strike)
  whoosh.connect(bp).connect(wg).connect(bus)
  whoosh.start(t)
  whoosh.stop(strike + 0.05)

  // 2 · lub-dub: two heartbeat thumps
  hit(c, bus, t + 0.55, { from: 90, to: 48, level: 0.45, length: 0.32 })
  hit(c, bus, t + 0.8, { from: 96, to: 50, level: 0.62, length: 0.38 })

  // 3 · the strike: deep boom + gold ring
  hit(c, bus, strike, { from: 78, to: 30, level: 1, length: 3.4 })
  goldRing(c, bus, strike, 587.33) // D5

  // 4 · the bloom: a wide dark D-minor (add 9) brass chord opening up, then settling
  const filter = c.createBiquadFilter()
  filter.type = 'lowpass'
  filter.Q.value = 0.9
  filter.frequency.setValueAtTime(180, strike)
  filter.frequency.exponentialRampToValueAtTime(1500, strike + 0.9)
  filter.frequency.exponentialRampToValueAtTime(260, strike + 4.2)
  const chordGain = c.createGain()
  chordGain.gain.setValueAtTime(0.0001, strike)
  chordGain.gain.exponentialRampToValueAtTime(0.3, strike + 0.45)
  chordGain.gain.setValueAtTime(0.3, strike + 1.3)
  chordGain.gain.exponentialRampToValueAtTime(0.0001, strike + 4.6)
  filter.connect(chordGain).connect(bus)
  const chord = [73.42, 110, 146.83, 174.61, 220, 329.63] // D2 A2 D3 F3 A3 E4
  chord.forEach((freq, i) => {
    for (const detune of [-9, 0, 8]) {
      const osc = c.createOscillator()
      osc.type = 'sawtooth'
      osc.frequency.value = freq
      osc.detune.value = detune
      const g = c.createGain()
      g.gain.value = 0.15 / (1 + i * 0.55)
      osc.connect(g).connect(filter)
      osc.start(strike)
      osc.stop(strike + 4.8)
    }
  })

  // 5 · the gold tail: the ring's top note held softly in the hall
  const tail = c.createOscillator()
  tail.type = 'sine'
  tail.frequency.value = 1174.66 // D6
  const tg = c.createGain()
  tg.gain.setValueAtTime(0.0001, strike + 0.3)
  tg.gain.exponentialRampToValueAtTime(0.02, strike + 1.2)
  tg.gain.exponentialRampToValueAtTime(0.0001, strike + 4.4)
  tail.connect(tg).connect(reverb)
  tail.start(strike + 0.3)
  tail.stop(strike + 4.6)
}

/* ------------------------------------------------------ the melodic logo */

/** A gold pluck: bright attack, quick decay, a touch of detune for width. */
function pluck(c, out, t, freq, level, length = 1.4) {
  const g = c.createGain()
  envelope(g.gain, t, level, 0.005, length)
  const tone = c.createBiquadFilter()
  tone.type = 'lowpass'
  tone.frequency.setValueAtTime(freq * 9, t)
  tone.frequency.exponentialRampToValueAtTime(freq * 2, t + length * 0.5)
  tone.connect(g).connect(out)
  for (const [type, detune, mix] of [['triangle', 0, 1], ['sine', 1200, 0.35], ['sawtooth', 6, 0.18]]) {
    const osc = c.createOscillator()
    osc.type = type
    osc.frequency.value = freq
    osc.detune.value = detune
    const m = c.createGain()
    m.gain.value = mix
    osc.connect(m).connect(tone)
    osc.start(t)
    osc.stop(t + length + 0.1)
  }
}

/** Soft saturation, for the 808's grit. */
function drive(c, amount) {
  const shaper = c.createWaveShaper()
  const curve = new Float32Array(1024)
  for (let i = 0; i < curve.length; i += 1) {
    const x = (i / (curve.length - 1)) * 2 - 1
    curve[i] = Math.tanh(x * amount) / Math.tanh(amount)
  }
  shaper.curve = curve
  shaper.oversample = '2x'
  return shaper
}

function renderMotif(c) {
  const t = c.currentTime + 0.03
  const land = t + 0.62
  const { bus, reverb } = chain(c, { level: 0.4, wetLevel: 0.42, hallSeconds: 3.6 })

  // ping-pong echo for the plucks
  const echoIn = c.createGain()
  const left = c.createDelay(1)
  const right = c.createDelay(1)
  left.delayTime.value = 0.23
  right.delayTime.value = 0.23
  const fb = c.createGain()
  fb.gain.value = 0.38
  const damp = c.createBiquadFilter()
  damp.type = 'lowpass'
  damp.frequency.value = 3200
  const panL = c.createStereoPanner()
  panL.pan.value = -0.7
  const panR = c.createStereoPanner()
  panR.pan.value = 0.7
  const echoOut = c.createGain()
  echoOut.gain.value = 0.32
  echoIn.connect(left)
  left.connect(panL).connect(echoOut)
  left.connect(right)
  right.connect(panR).connect(echoOut)
  right.connect(damp).connect(fb).connect(left)
  echoOut.connect(bus)

  const plucks = c.createGain()
  plucks.connect(bus)
  plucks.connect(echoIn)

  // 1 · a short airy lift into the first note
  const air = c.createBufferSource()
  air.buffer = noise(c, 0.7)
  const hp = c.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.setValueAtTime(1500, t - 0.02)
  hp.frequency.exponentialRampToValueAtTime(7000, land)
  const ag = c.createGain()
  ag.gain.setValueAtTime(0.0001, t)
  ag.gain.exponentialRampToValueAtTime(0.05, land - 0.03)
  ag.gain.exponentialRampToValueAtTime(0.0001, land)
  air.connect(hp).connect(ag).connect(bus)
  air.start(t)

  // 2 · ta-ta-ta: D4 F4 A4, climbing
  pluck(c, plucks, t, 293.66, 0.32, 0.9)
  pluck(c, plucks, t + 0.2, 349.23, 0.32, 0.9)
  pluck(c, plucks, t + 0.4, 440, 0.34, 0.9)

  // 3 · DUM: the landing note (D5 over D4) with an 808 sliding down beneath it
  pluck(c, plucks, land, 587.33, 0.42, 2.4)
  pluck(c, plucks, land, 293.66, 0.24, 2.4)

  const bass = c.createOscillator()
  bass.type = 'sine'
  bass.frequency.setValueAtTime(98, land)
  bass.frequency.exponentialRampToValueAtTime(36.7, land + 0.7) // slides down to D1
  const bassDrive = drive(c, 2.4)
  const bassGain = c.createGain()
  bassGain.gain.setValueAtTime(0.0001, land)
  bassGain.gain.exponentialRampToValueAtTime(0.55, land + 0.01)
  bassGain.gain.setValueAtTime(0.42, land + 0.9)
  bassGain.gain.exponentialRampToValueAtTime(0.0001, land + 2.6)
  bass.connect(bassDrive).connect(bassGain).connect(bus)
  bass.start(land)
  bass.stop(land + 2.7)
  hit(c, bus, land, { from: 120, to: 50, level: 0.55, length: 0.35 }) // the punch on top

  // 4 · a soft dark shimmer (D minor 9) breathing under the tail
  const pad = c.createBiquadFilter()
  pad.type = 'bandpass'
  pad.frequency.value = 900
  pad.Q.value = 0.6
  const padGain = c.createGain()
  padGain.gain.setValueAtTime(0.0001, land + 0.1)
  padGain.gain.exponentialRampToValueAtTime(0.07, land + 1)
  padGain.gain.exponentialRampToValueAtTime(0.0001, land + 3.6)
  pad.connect(padGain).connect(reverb)
  ;[293.66, 349.23, 440, 523.25, 659.25].forEach((freq) => {
    for (const detune of [-10, 10]) {
      const osc = c.createOscillator()
      osc.type = 'sawtooth'
      osc.frequency.value = freq
      osc.detune.value = detune
      const g = c.createGain()
      g.gain.value = 0.12
      osc.connect(g).connect(pad)
      osc.start(land + 0.1)
      osc.stop(land + 3.7)
    }
  })
}
