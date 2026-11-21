import { envelope, getAudioContext, hall, hit, noise } from './introSound'

/**
 * The loading screen's transition sound, made in the browser (no file): a bold cinematic hit,
 * timed to the picture (LoadingScreen's exit, 1.5s):
 *
 *   0–300 ms   the pull: a reversed swell sucking in towards the hit, under a low thud as the
 *              film bars close
 *   300 ms     the hit, as the screen starts opening through the logo: a distorted, detuned
 *              brass-like low chord, a deep 808 drop and a crack, in a big dark hall
 *   250–750    a heavy whoosh travelling left to right with the band of light
 *   1150 ms    a second, deeper 808 as the welcome screen lands, then the tail rings out
 *
 * Browsers only allow sound after the visitor has clicked, tapped or pressed a key on the site.
 * On a first visit that usually hasn't happened yet while the loading screen is up, so the
 * sound plays only when the browser already allows it (or the visitor touched the screen while
 * it loaded); otherwise the transition simply runs silent. Nothing is ever forced.
 */

const LEVEL = 0.7

/** Call from a click / tap / key press while the loading screen is up: lets the sound play. */
export function primeLoaderSound() {
  const c = getAudioContext()
  if (c && c.state !== 'running') c.resume().catch(() => {})
}

/** Plays the transition, if the browser allows sound right now. */
export function playLoaderSound() {
  if (document.hidden) return
  const c = getAudioContext()
  if (!c) return
  if (c.state === 'running') renderLoaderSound(c)
  else
    c.resume()
      .then(() => c.state === 'running' && renderLoaderSound(c))
      .catch(() => {})
}

/** Soft clipping, for weight and grit. */
function drive(c, amount) {
  const shaper = c.createWaveShaper()
  const curve = new Float32Array(2048)
  for (let i = 0; i < curve.length; i += 1) {
    const x = (i / (curve.length - 1)) * 2 - 1
    curve[i] = Math.tanh(x * amount) / Math.tanh(amount)
  }
  shaper.curve = curve
  shaper.oversample = '4x'
  return shaper
}

/** An 808: a sine that drops in pitch, driven for growl, with a long tail. */
function eightOhEight(c, out, t, { from, to, level, length }) {
  const osc = c.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(from, t)
  osc.frequency.exponentialRampToValueAtTime(to, t + 0.22)
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(level, t + 0.006)
  g.gain.setTargetAtTime(level * 0.55, t + 0.08, 0.25)
  g.gain.setTargetAtTime(0.0001, t + length * 0.55, length * 0.2)
  osc.connect(drive(c, 3)).connect(g).connect(out)
  osc.start(t)
  osc.stop(t + length + 0.2)
}

/** Builds the sound on any audio context (also an offline one, to render it to a file). */
export function renderLoaderSound(c) {
  const t = c.currentTime + 0.02
  const hitAt = t + 0.3
  const land = t + 1.15

  // output: glue compression, and a big dark hall
  const master = c.createGain()
  master.gain.value = LEVEL
  const comp = c.createDynamicsCompressor()
  comp.threshold.value = -18
  comp.knee.value = 6
  comp.ratio.value = 6
  comp.attack.value = 0.003
  comp.release.value = 0.25
  master.connect(comp).connect(c.destination)
  const reverb = c.createConvolver()
  reverb.buffer = hall(c, 3.6, 2.2)
  const dark = c.createBiquadFilter()
  dark.type = 'lowpass'
  dark.frequency.value = 2600
  const wet = c.createGain()
  wet.gain.value = 0.42
  reverb.connect(dark).connect(wet).connect(master)
  const bus = c.createGain()
  bus.connect(master)
  bus.connect(reverb)

  // 1 · the pull: a reversed swell into the hit, and a thud as the bars close
  const pull = c.createBufferSource()
  pull.buffer = noise(c, 0.4)
  const pullTone = c.createBiquadFilter()
  pullTone.type = 'lowpass'
  pullTone.Q.value = 1.2
  pullTone.frequency.setValueAtTime(400, t)
  pullTone.frequency.exponentialRampToValueAtTime(7000, hitAt)
  const pg = c.createGain()
  pg.gain.setValueAtTime(0.0001, t)
  pg.gain.exponentialRampToValueAtTime(0.55, hitAt - 0.01)
  pg.gain.linearRampToValueAtTime(0, hitAt)
  pull.connect(pullTone).connect(pg).connect(bus)
  pull.start(t)
  pull.stop(hitAt + 0.02)
  hit(c, bus, t, { from: 95, to: 45, level: 0.5, length: 0.35 })

  // 2 · the hit: a detuned low chord (D minor) through distortion, its filter slamming open and
  //     closing slowly, the whole chord sagging a little in pitch as it dies
  const brass = c.createBiquadFilter()
  brass.type = 'lowpass'
  brass.Q.value = 1.1
  brass.frequency.setValueAtTime(180, hitAt)
  brass.frequency.exponentialRampToValueAtTime(2400, hitAt + 0.09)
  brass.frequency.exponentialRampToValueAtTime(260, hitAt + 2.6)
  const bg = c.createGain()
  bg.gain.setValueAtTime(0.0001, hitAt)
  bg.gain.exponentialRampToValueAtTime(0.5, hitAt + 0.035)
  bg.gain.setTargetAtTime(0.2, hitAt + 0.2, 0.35)
  bg.gain.setTargetAtTime(0.0001, hitAt + 1.1, 0.4)
  const grit = drive(c, 2.2)
  brass.connect(grit).connect(bg).connect(bus)
  ;[36.71, 73.42, 110, 146.83, 174.61].forEach((freq, i) => {
    for (const detune of [-14, 0, 13]) {
      const osc = c.createOscillator()
      osc.type = 'sawtooth'
      osc.frequency.value = freq
      osc.detune.setValueAtTime(detune, hitAt)
      osc.detune.linearRampToValueAtTime(detune - 70, hitAt + 3)
      const g = c.createGain()
      g.gain.value = 0.2 / (1 + i * 0.45)
      osc.connect(g).connect(brass)
      osc.start(hitAt)
      osc.stop(hitAt + 3.2)
    }
  })
  eightOhEight(c, bus, hitAt, { from: 150, to: 41, level: 0.9, length: 2 })

  // the crack on top of the hit
  const crack = c.createBufferSource()
  crack.buffer = noise(c, 0.5)
  const crackTone = c.createBiquadFilter()
  crackTone.type = 'bandpass'
  crackTone.frequency.value = 1800
  crackTone.Q.value = 0.7
  const cg = c.createGain()
  envelope(cg.gain, hitAt, 0.6, 0.002, 0.28)
  crack.connect(crackTone).connect(cg).connect(bus)
  crack.start(hitAt)

  // 3 · the whoosh: heavy, left to right with the light
  const sweepAt = t + 0.25
  const whoosh = c.createBufferSource()
  whoosh.buffer = noise(c, 0.8)
  const wTone = c.createBiquadFilter()
  wTone.type = 'lowpass'
  wTone.Q.value = 2
  wTone.frequency.setValueAtTime(300, sweepAt)
  wTone.frequency.exponentialRampToValueAtTime(2200, sweepAt + 0.3)
  wTone.frequency.exponentialRampToValueAtTime(400, sweepAt + 0.6)
  const wg = c.createGain()
  envelope(wg.gain, sweepAt, 0.7, 0.25, 0.62)
  const pan = c.createStereoPanner ? c.createStereoPanner() : null
  if (pan) {
    pan.pan.setValueAtTime(-0.9, sweepAt)
    pan.pan.linearRampToValueAtTime(0.9, sweepAt + 0.55)
    whoosh.connect(wTone).connect(wg).connect(pan).connect(bus)
  } else whoosh.connect(wTone).connect(wg).connect(bus)
  whoosh.start(sweepAt)
  whoosh.stop(sweepAt + 0.7)

  // 4 · the landing: a second, deeper 808 as the welcome screen arrives
  eightOhEight(c, bus, land, { from: 110, to: 36.7, level: 0.75, length: 2.4 })
}
