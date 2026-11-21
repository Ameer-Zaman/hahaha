import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { site } from '../../config/site'
import { preloadHomeAssets, releasePreload, usePreloadProgress } from '../../lib/preload'
import { useSiteSettings } from '../../lib/siteSettings'
import './loading-screen.css'

/**
 * The loading screen shown when the homepage is opened: just the community logo (Panel → Site
 * settings), glowing, on black. It appears as a fine gold outline, a light runs round that
 * outline, and the logo rises into view as the homepage's videos, images and sounds download.
 * When it's ready the logo glows brighter and the screen fades into the welcome screen.
 *
 * It ends as soon as everything is ready (but not before the logo has been drawn and filled,
 * MARK_MS, and never later than MAX_MS, after which anything unfinished streams as usual).
 * With no logo uploaded the site's initials stand in. Reduced motion: no running light.
 */
const MARK_MS = 1900 // the logo takes at least this long to fill, so the glow is seen
const HOLD_MS = 450 // a moment on the finished logo before fading (the welcome screen wakes underneath)
const MAX_MS = 12000
const EXIT_MS = 800

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
 * Reads the logo picture once and prepares what the animation needs, so that nothing heavy is
 * drawn while it plays: where the logo really is inside its picture (uploaded logos often sit
 * in a wide empty margin), cropped out with a little room around it; its outline, a fine line
 * just outside its edge; and a soft blurred copy of the outline for the glow.
 * This needs to read the picture's pixels. If its host doesn't allow that, the whole picture is
 * used as it is and its silhouette stands in for the outline.
 */
const PAD = 0.05 // room around the cropped logo, as a share of its width, on every side

function prepare(img, url) {
  const natW = img.naturalWidth || 600
  const natH = img.naturalHeight || 240
  const plain = { src: url, crop: url, ring: null, glow: null, ratio: natW / natH, pad: 0 }
  try {
    // 1. a small copy, to find the logo's box
    const k = 160 / Math.max(natW, natH)
    const w = Math.max(1, Math.round(natW * k))
    const h = Math.max(1, Math.round(natH * k))
    const small = Object.assign(document.createElement('canvas'), { width: w, height: h }).getContext('2d', { willReadFrequently: true })
    small.drawImage(img, 0, 0, w, h)
    const px = small.getImageData(0, 0, w, h).data // throws if the host doesn't allow reading
    let x0 = w
    let y0 = h
    let x1 = -1
    let y1 = -1
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const solid = px[(y * w + x) * 4 + 3] > 60
        if (solid) {
          x0 = Math.min(x0, x)
          y0 = Math.min(y0, y)
          x1 = Math.max(x1, x)
          y1 = Math.max(y1, y)
        }
      }
    if (x1 < 0) return plain
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

    const ratio = bw / bh
    return {
      src: url,
      crop: cropC.toDataURL(),
      ring: ringC.toDataURL(),
      glow: glowC.toDataURL(),
      ratio,
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
 * The logo in layers, all prepared pictures, so playing it costs almost nothing: the fine gold
 * outline; a light that runs round it (a turning beam, seen only through the outline) with a
 * soft glow; and the logo itself, rising into view from the bottom with the load.
 */
function LogoMark({ mark, fill }) {
  const ring = mark.ring ?? mark.crop // without a prepared outline, the silhouette stands in
  const through = (url) => ({ WebkitMaskImage: `url("${url}")`, maskImage: `url("${url}")` })
  return (
    <div className={`lm ${mark.ring ? '' : 'lm--plain'}`} aria-hidden="true">
      <span className="lm__layer lm__outline" style={through(ring)} />
      {mark.glow && (
        <span className="lm__layer lm__light lm__light--glow" style={through(mark.glow)}>
          <i />
        </span>
      )}
      <span className="lm__layer lm__light" style={through(ring)}>
        <i />
      </span>
      {/* the logo rises into view: a window sliding up while the picture slides back down in it */}
      <span className="lm__layer lm__rise" style={{ transform: `translateY(${(1 - fill) * 100}%)` }}>
        <span style={{ transform: `translateY(${(fill - 1) * 100}%)` }}>
          <img src={mark.crop} alt="" draggable="false" />
        </span>
      </span>
    </div>
  )
}

export default function LoadingScreen({ onLeave, onDone }) {
  const { progress, done } = usePreloadProgress()
  const mark = useLogo()
  const [shown, setShown] = useState(0) // how far along, easing towards `progress`
  const [leaving, setLeaving] = useState(false)
  const target = useRef(progress)
  const markAt = useRef(0) // when the logo appeared
  const onDoneRef = useRef(onDone)
  const onLeaveRef = useRef(onLeave)

  useEffect(() => {
    target.current = done ? 1 : progress
  }, [progress, done])
  useEffect(() => {
    if (mark && !markAt.current) markAt.current = performance.now()
  }, [mark])
  useEffect(() => {
    onDoneRef.current = onDone
    onLeaveRef.current = onLeave
  }, [onDone, onLeave])

  useEffect(() => {
    preloadHomeAssets()
    // a smooth climb, timed by the clock (not by frames, which slow down on busy phones): it
    // closes most of the gap quickly and never jumps or runs backwards, and it waits for the
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
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(giveUp)
    }
  }, [])

  // everything downloaded and the logo is full: the welcome screen starts its entrance
  // underneath (still covered), and after a moment on the glowing logo the screen fades to it
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
    const timer = setTimeout(() => onDoneRef.current?.(), EXIT_MS)
    return () => clearTimeout(timer)
  }, [leaving])

  const pct = Math.round(shown * 100)
  // the logo rises into view over most of the load, once the outline has been seen
  const fill = Math.max(0, Math.min(1, (shown - 0.3) / 0.7))

  return createPortal(
    <div
      className={`loader ${leaving ? 'is-leaving' : ''}`}
      style={mark ? { '--ratio': mark.ratio, '--pad': mark.pad } : undefined}
      role="progressbar"
      aria-label={`Loading ${site.name}`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
    >
      <div className="loader__mark">
        {mark && (
          <>
            <span className="loader__glow" />
            <LogoMark mark={mark} fill={fill} />
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
