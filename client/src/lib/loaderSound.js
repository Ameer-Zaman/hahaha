import { envelope, getAudioContext, goldRing, hall, hit, noise } from './introSound'

/**
 * The loading screen's transition sound, made in the browser (no file), timed to the picture
 * (LoadingScreen's exit, 1.5s):
 *
 *   0 ms      the jolt: a low thud as the film bars close, with a short digital stutter for
 *             the colour split
 *   250 ms    the sweep: a whoosh that pans from left to right with the band of light
 *   300 ms    the zoom: a rising swell, pulled forward through the logo
 *   1100 ms   the landing: a deep boom and a gold ring that rings out over the welcome screen
 *
 * Browsers only allow sound after the visitor has clicked, tapped or pressed a key on the site.
 * On a first visit that usually hasn't happened yet while the loading screen is up, so the
 * sound plays only when the browser already allows it (or the visitor touched the screen while
 * it loaded); otherwise the transition simply runs silent. Nothing is ever forced.
 */

const LEVEL = 0.5

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

/** Builds the sound on any audio context (also an offline one, to render it to a file). */
export function renderLoaderSound(c) {
  const t = c.currentTime + 0.02

  // output: gentle compression and a hall, so it's big but never harsh
  const master = c.createGain()
  master.gain.value = LEVEL
  const comp = c.createDynamicsCompressor()
  comp.threshold.value = -14
  comp.ratio.value = 4
  comp.attack.value = 0.002
  comp.release.value = 0.3
  master.connect(comp).connect(c.destination)
  const reverb = c.createConvolver()
  reverb.buffer = hall(c, 2.8, 2.4)
  const wet = c.createGain()
  wet.gain.value = 0.35
  reverb.connect(wet).connect(master)
  const bus = c.createGain()
  bus.connect(master)
  bus.connect(reverb)

  // 1 · the jolt: a short thud, and a three-step digital stutter
  hit(c, bus, t, { from: 130, to: 55, level: 0.8, length: 0.3 })
  ;[0, 0.07, 0.15].forEach((dt, i) => {
    const osc = c.createOscillator()
    osc.type = 'square'
    osc.frequency.value = [1320, 880, 1760][i]
    const crush = c.createBiquadFilter()
    crush.type = 'bandpass'
    crush.frequency.value = 2200
    crush.Q.value = 2
    const g = c.createGain()
    envelope(g.gain, t + dt, 0.16, 0.002, 0.045)
    osc.connect(crush).connect(g).connect(bus)
    osc.start(t + dt)
    osc.stop(t + dt + 0.06)
  })

  // 2 · the sweep: a whoosh travelling left to right with the light
  const sweepAt = t + 0.25
  const whoosh = c.createBufferSource()
  whoosh.buffer = noise(c, 0.7)
  const bp = c.createBiquadFilter()
  bp.type = 'bandpass'
  bp.Q.value = 0.9
  bp.frequency.setValueAtTime(500, sweepAt)
  bp.frequency.exponentialRampToValueAtTime(4200, sweepAt + 0.3)
  bp.frequency.exponentialRampToValueAtTime(1200, sweepAt + 0.55)
  const pan = c.createStereoPanner ? c.createStereoPanner() : null
  const wg = c.createGain()
  envelope(wg.gain, sweepAt, 1.1, 0.22, 0.55)
  if (pan) {
    pan.pan.setValueAtTime(-0.85, sweepAt)
    pan.pan.linearRampToValueAtTime(0.85, sweepAt + 0.5)
    whoosh.connect(bp).connect(wg).connect(pan).connect(bus)
  } else whoosh.connect(bp).connect(wg).connect(bus)
  whoosh.start(sweepAt)
  whoosh.stop(sweepAt + 0.6)

  // 3 · the zoom: a swell that rises and tightens, cut off right at the landing
  const zoomAt = t + 0.3
  const land = t + 1.1
  const swell = c.createBufferSource()
  swell.buffer = noise(c, 0.9)
  const sweepUp = c.createBiquadFilter()
  sweepUp.type = 'lowpass'
  sweepUp.Q.value = 6
  sweepUp.frequency.setValueAtTime(220, zoomAt)
  sweepUp.frequency.exponentialRampToValueAtTime(6000, land)
  const sg = c.createGain()
  sg.gain.setValueAtTime(0.0001, zoomAt)
  sg.gain.exponentialRampToValueAtTime(0.7, land - 0.04)
  sg.gain.exponentialRampToValueAtTime(0.0001, land + 0.01)
  swell.connect(sweepUp).connect(sg).connect(bus)
  swell.start(zoomAt)
  swell.stop(land + 0.05)

  const rise = c.createOscillator()
  rise.type = 'sawtooth'
  rise.frequency.setValueAtTime(110, zoomAt)
  rise.frequency.exponentialRampToValueAtTime(440, land)
  const riseTone = c.createBiquadFilter()
  riseTone.type = 'lowpass'
  riseTone.frequency.value = 1400
  const rg = c.createGain()
  rg.gain.setValueAtTime(0.0001, zoomAt)
  rg.gain.exponentialRampToValueAtTime(0.1, land - 0.05)
  rg.gain.exponentialRampToValueAtTime(0.0001, land + 0.01)
  rise.connect(riseTone).connect(rg).connect(bus)
  rise.start(zoomAt)
  rise.stop(land + 0.05)

  // 4 · the landing: a deep boom and a gold ring over the welcome screen
  hit(c, bus, land, { from: 80, to: 32, level: 0.9, length: 2.2 })
  goldRing(c, bus, land, 587.33) // D5
}
