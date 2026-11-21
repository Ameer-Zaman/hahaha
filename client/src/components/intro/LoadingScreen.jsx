import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { site } from '../../config/site'
import { playLoaderSound, prepareLoaderSound, primeLoaderSound } from '../../lib/loaderSound'
import { preloadHomeAssets, releasePreload, usePreloadProgress } from '../../lib/preload'
import { useSiteSettings } from '../../lib/siteSettings'
import './loading-screen.css'

/**
 * The loading screen shown when the homepage is opened, in three beats:
 *
 *   1. the community logo (Panel → Site settings) appears as a fine gold outline;
 *   2. a light runs round that outline and the logo glows, filling in gold as the homepage's
 *      videos, images and sounds download (a small percentage underneath);
 *   3. when it's ready, a short cut-scene style transition: film bars close in, the logo
 *      jolts with a colour split, a band of warm light sweeps across and light streaks burst
 *      out, while the screen opens through the logo: the black is cut away in the logo's
 *      shape, which grows past the edges of the screen, so the welcome screen is seen first
 *      through the logo and then all at once. The bars open again as it lands.
 *
 * The count sits in the lower right with a turning ring, the way games show loading.
 * The transition has its own sound (lib/loaderSound.js), when the browser allows sound.
 *
 * It ends as soon as everything is ready (but not before the logo has been drawn and filled,
 * MARK_MS, and never later than MAX_MS, after which anything unfinished streams as usual).
 * With no logo uploaded the site's initials stand in. Reduced motion: no running light, and a plain fade at the end.
 */
const MARK_MS = 1900 // the count takes at least this long from the logo appearing, so each beat is seen
const HOLD_MS = 550 // a moment on the finished logo before going through it (the welcome screen wakes underneath)
const MAX_MS = 12000
const EXIT_MS = 1500

/** A stand-in logo when none is uploaded: the site's initials in gold, as an SVG picture. */
function initialsLogo() {
  const letters = site.name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 3)
    .toUpperCase()
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="240" viewBox="0 0 600 240"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2c9"/><stop offset=".45" stop-color="#e3b55a"/><stop offset=".75" stop-color="#b5852f"/><stop offset="1" stop-color="#efcb7a"/></linearGradient></defs><text x="300" y="195" text-anchor="middle" font-family="Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif" font-size="210" letter-spacing="8" fill="url(#g)">${letters}</text></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/**
 * Reads the logo picture once and prepares everything the animation needs, so that nothing
 * heavy is drawn while it plays:
 *   - where the logo really is inside its picture (uploaded logos often sit in a wide empty
 *     margin), cropped out with a little room around it;
 *   - its outline, a fine line just outside its edge, and a soft blurred copy for the glow;
 *   - the point the exit zooms into: a spot deep inside a solid part of the logo, near its
 *     middle, so that when it fills the screen the screen is open, not black.
 * This needs to read the picture's pixels. If its host doesn't allow that, the whole picture is
 * used as it is, its silhouette stands in for the outline, and the exit zooms into its centre.
 */
const PAD = 0.05 // room around the cropped logo, as a share of its width, on every side

function prepare(img, url) {
  const natW = img.naturalWidth || 600
  const natH = img.naturalHeight || 240
  const plain = { src: url, crop: url, ring: null, glow: null, ratio: natW / natH, fx: 0.5, fy: 0.5, pad: 0 }
  try {
    // 1. a small copy: the logo's box, and how deep inside the logo each pixel is
    const k = 160 / Math.max(natW, natH)
    const w = Math.max(1, Math.round(natW * k))
    const h = Math.max(1, Math.round(natH * k))
    const small = Object.assign(document.createElement('canvas'), { width: w, height: h }).getContext('2d', { willReadFrequently: true })
    small.drawImage(img, 0, 0, w, h)
    const px = small.getImageData(0, 0, w, h).data // throws if the host doesn't allow reading
    const d = new Float32Array(w * h)
    let x0 = w
    let y0 = h
    let x1 = -1
    let y1 = -1
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const solid = px[(y * w + x) * 4 + 3] > 60
        d[y * w + x] = solid ? 1e9 : 0
        if (solid) {
          x0 = Math.min(x0, x)
          y0 = Math.min(y0, y)
          x1 = Math.max(x1, x)
          y1 = Math.max(y1, y)
        }
      }
    if (x1 < 0) return plain
    // distance from each solid pixel to the nearest empty one (two-pass chamfer)
    const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d[y * w + x])
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x
        if (d[i]) d[i] = Math.min(d[i], at(x - 1, y) + 1, at(x, y - 1) + 1, at(x - 1, y - 1) + 1.4, at(x + 1, y - 1) + 1.4)
      }
    for (let y = h - 1; y >= 0; y--)
      for (let x = w - 1; x >= 0; x--) {
        const i = y * w + x
        if (d[i]) d[i] = Math.min(d[i], at(x + 1, y) + 1, at(x, y + 1) + 1, at(x + 1, y + 1) + 1.4, at(x - 1, y + 1) + 1.4)
      }
    const cx = (x0 + x1 + 1) / 2
    const cy = (y0 + y1 + 1) / 2
    let best = -Infinity
    let fx = cx
    let fy = cy
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const depth = d[y * w + x]
        if (!depth) continue
        const score = depth - 0.12 * Math.hypot(x + 0.5 - cx, y + 0.5 - cy)
        if (score > best) {
          best = score
          fx = x + 0.5
          fy = y + 0.5
        }
      }

    // 2. the crop, outline and glow, drawn sharp at up to 1000px wide
    const bx = (x0 / w) * natW
    const by = (y0 / h) * natH
    const bw = ((x1 + 1 - x0) / w) * natW
    const bh = ((y1 + 1 - y0) / h) * natH
    const z = Math.min(4, 1000 / bw)
    const pad = Math.round(bw * z * PAD)
    const cw = Math.round(bw * z) + pad * 2
    const ch = Math.round(bh * z) + pad * 2
    const canvas = () => {
      const c = Object.assign(document.createElement('canvas'), { width: cw, height: ch })
      return [c, c.getContext('2d')]
    }
    const place = (ctx, dx = 0, dy = 0) => ctx.drawImage(img, pad - bx * z + dx, pad - by * z + dy, natW * z, natH * z)

    const [cropC, crop] = canvas()
    place(crop)

    const [ringC, ring] = canvas()
    const r = Math.max(1.5, cw * 0.0035) // the outline's distance from the logo
    for (let i = 0; i < 24; i++) place(ring, r * Math.cos((i / 12) * Math.PI), r * Math.sin((i / 12) * Math.PI))
    ring.globalCompositeOperation = 'destination-out'
    place(ring)
    ring.globalCompositeOperation = 'source-in'
    ring.fillStyle = '#fff'
    ring.fillRect(0, 0, cw, ch)

    const [glowC, glow] = canvas()
    glow.filter = `blur(${Math.round(cw * 0.006)}px)`
    glow.drawImage(ringC, 0, 0)
    glow.drawImage(ringC, 0, 0)

    // for the exit, the finished look flattened into one picture (a soft gold halo, the gold
    // outline, the logo), and two colour-tinted copies for the jolt: plain pictures scale and
    // fade far more cheaply than the layered, masked logo used while loading
    const tint = (color, from) => {
      const [c, x] = canvas()
      x.drawImage(from, 0, 0)
      x.globalCompositeOperation = 'source-in'
      x.fillStyle = color
      x.fillRect(0, 0, cw, ch)
      return c
    }
    const [flatC, flat] = canvas()
    flat.filter = `blur(${Math.round(cw * 0.012)}px)`
    flat.globalAlpha = 0.55
    flat.drawImage(tint('#e3b55a', cropC), 0, 0)
    flat.filter = 'none'
    flat.globalAlpha = 0.85
    flat.drawImage(tint('#e3b55a', ringC), 0, 0)
    flat.globalAlpha = 1
    flat.drawImage(cropC, 0, 0)

    const ratio = bw / bh
    const fxs = ((fx / w) * natW - bx) / bw // the zoom point, as a share of the logo's box
    const fys = ((fy / h) * natH - by) / bh
    return {
      src: url,
      crop: cropC.toDataURL(),
      ring: ringC.toDataURL(),
      glow: glowC.toDataURL(),
      flat: flatC.toDataURL(),
      warm: tint('#ff5a3c', cropC).toDataURL(),
      cool: tint('#3cd8ff', cropC).toDataURL(),
      ratio,
      fx: fxs,
      fy: fys,
      pad: PAD,
    }
  } catch {
    return plain
  }
}

/** The logo, once it has loaded and been prepared (null until then). */
function useLogo() {
  const { logo } = useSiteSettings()
  const [mark, setMark] = useState(null)
  const src = logo || null
  useEffect(() => {
    let live = true
    const pick = (url, fallback, cors = true) => {
      const img = new Image()
      if (cors) img.crossOrigin = 'anonymous'
      img.onload = () => live && setMark(prepare(img, url))
      // a host that refuses to share the picture: show it anyway, unprepared
      img.onerror = () => live && (cors ? pick(url, fallback, false) : fallback && pick(fallback, null))
      img.src = url
    }
    // wait a moment for the site settings before settling for the initials
    const timer = setTimeout(() => !src && pick(initialsLogo(), null), src ? 0 : 700)
    if (src) pick(src, initialsLogo())
    return () => {
      live = false
      clearTimeout(timer)
    }
  }, [src])
  return mark
}

/**
 * The logo in four layers, all prepared pictures, so playing it costs almost nothing:
 * the fine gold outline; a light that runs round it (a turning beam, seen only through the
 * outline) with a soft glow; and the logo itself, rising into view from the bottom with the
 * load.
 */
function LogoMark({ mark, fill }) {
  const ring = mark.ring ?? mark.crop // without a prepared outline, the silhouette stands in
  const through = (url) => ({ WebkitMaskImage: `url("${url}")`, maskImage: `url("${url}")` })
  return (
    <div className={`lm ${mark.ring ? '' : 'lm--plain'} ${mark.flat ? 'lm--flat' : ''}`} aria-hidden="true">
      <span className="lm__layer lm__outline" style={through(ring)} />
      {mark.glow && (
        <span className="lm__layer lm__light lm__light--glow" style={through(mark.glow)}>
          <i />
        </span>
      )}
      <span className="lm__layer lm__light" style={through(ring)}>
        <i />
      </span>
      <span className="lm__layer lm__rise" style={{ transform: `translateY(${(1 - fill) * 100}%)` }}>
        <span style={{ transform: `translateY(${(fill - 1) * 100}%)` }}>
          <img src={mark.crop} alt="" draggable="false" />
        </span>
      </span>
      {/* the exit's pictures: the finished logo in one flat picture, and the colour split's
          tinted copies (all drawn ahead, nearly invisible, until the exit swaps them in) */}
      {mark.flat && (
        <>
          <img className="lm__layer lm__flat" src={mark.flat} alt="" draggable="false" />
          <img className="lm__layer lm__split lm__split--a" src={mark.warm} alt="" draggable="false" />
          <img className="lm__layer lm__split lm__split--b" src={mark.cool} alt="" draggable="false" />
        </>
      )}
    </div>
  )
}

export default function LoadingScreen({ onLeave, onDone }) {
  const { progress, done } = usePreloadProgress()
  const mark = useLogo()
  const [shown, setShown] = useState(0) // the number on screen, easing towards `progress`
  const [leaving, setLeaving] = useState(false)
  const target = useRef(progress)
  const markAt = useRef(0) // when the logo appeared
  const onDoneRef = useRef(onDone)
  const onLeaveRef = useRef(onLeave)

  useEffect(() => {
    target.current = done ? 1 : progress
  }, [progress, done])
  useEffect(() => {
    if (mark && !markAt.current) {
      markAt.current = performance.now()
      prepareLoaderSound()
    }
  }, [mark])
  useEffect(() => {
    onDoneRef.current = onDone
    onLeaveRef.current = onLeave
  }, [onDone, onLeave])

  useEffect(() => {
    preloadHomeAssets()
    // a smooth count up, timed by the clock (not by frames, which slow down on busy phones):
    // it closes most of the gap quickly and never jumps or runs backwards, and it waits for the
    // logo, then goes no faster than MARK_MS from there, however fast the download was
    let raf = 0
    let value = 0
    let last = performance.now()
    const tick = () => {
      const now = performance.now() // the same clock as markAt
      const dt = Math.min(100, now - last) / 1000
      last = now
      const gap = target.current - value
      const cap = markAt.current ? (now - markAt.current) / MARK_MS : 0
      value = Math.max(value, Math.min(target.current, cap, value + gap * dt * 4 + dt * 0.25))
      setShown(value)
      if (value < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    const giveUp = setTimeout(() => setLeaving(true), MAX_MS)
    // a click, tap or key press while it loads lets the transition's sound play
    const prime = () => primeLoaderSound()
    const opts = { capture: true, passive: true }
    window.addEventListener('pointerdown', prime, opts)
    window.addEventListener('keydown', prime, opts)
    window.addEventListener('touchend', prime, opts)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(giveUp)
      window.removeEventListener('pointerdown', prime, opts)
      window.removeEventListener('keydown', prime, opts)
      window.removeEventListener('touchend', prime, opts)
    }
  }, [])

  // everything downloaded and the counter has reached 100: the welcome screen starts its
  // entrance underneath (still covered), and after a moment on the full logo we go through it,
  // so what's seen through the logo is the welcome screen already lit
  const woke = useRef(false)
  const wake = () => {
    if (woke.current) return
    woke.current = true
    onLeaveRef.current?.()
  }
  useEffect(() => {
    if (!done || shown < 1 || leaving) return undefined
    wake()
    const timer = setTimeout(() => setLeaving(true), HOLD_MS)
    return () => clearTimeout(timer)
  }, [done, shown, leaving])

  useEffect(() => {
    if (!leaving) return undefined
    releasePreload() // anything still downloading streams normally from here
    wake() // (when giving up at MAX_MS)
    playLoaderSound()
    const timer = setTimeout(() => onDoneRef.current?.(), EXIT_MS)
    return () => clearTimeout(timer)
  }, [leaving])

  const pct = Math.round(shown * 100)
  // the logo rises into view over most of the load, once the outline has been seen
  const fill = Math.max(0, Math.min(1, (shown - 0.3) / 0.7))
  const vars = mark && {
    '--ratio': mark.ratio,
    '--mark': `url("${mark.crop}")`,
    '--fx': mark.fx,
    '--fy': mark.fy,
    '--pad': mark.pad,
  }

  return createPortal(
    <div
      className={`loader ${leaving ? 'is-leaving' : ''} ${mark ? 'has-mark' : ''}`}
      style={vars || undefined}
      role="progressbar"
      aria-label={`Loading ${site.name}`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
    >
      <div className="loader__black" />
      <div className="loader__zoom">
        {mark && (
          <>
            <span className="loader__hole" />
            <span className="loader__frame loader__frame--top" />
            <span className="loader__frame loader__frame--bottom" />
            <span className="loader__frame loader__frame--left" />
            <span className="loader__frame loader__frame--right" />
          </>
        )}
      </div>
      {/* the logo zooms with the cut-out but only until it has faded (a smaller zoom is
          cheaper to draw); it sits in its own box, lined up with the cut-out */}
      <div className="loader__zoom loader__zoom--logo">
        {mark && (
          <>
            <span className="loader__glow" />
            <LogoMark mark={mark} fill={fill} />
          </>
        )}
      </div>
      <div className="loader__fx" aria-hidden="true">
        <span className="loader__rays" />
        <span className="loader__sweep" />
        <span className="loader__bar loader__bar--top" />
        <span className="loader__bar loader__bar--bottom" />
        <span className="loader__grain" />
      </div>
      <p className="loader__pct" aria-hidden="true">
        <span className="loader__spin" />
        <span className="loader__word">Loading</span>
        <b>{String(pct).padStart(3, '0')}</b>
      </p>
    </div>,
    document.body,
  )
}
