import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import usePageTitle from '../../hooks/usePageTitle'
import { usePublic } from '../../lib/publicData'
import './gallery.css'

/*
 * Gallery — photos from the city, printed and scattered on a dark table. Pick one up and move
 * it (it swings around the point you hold, lifts off the table and casts a bigger shadow),
 * flick it to throw it (it slides, spins and bounces off the edges), tap it to see it full
 * size. "Shuffle" and "Tidy up" re-deal the table; "Grid" shows a plain wall of photos.
 * The photos come from Panel → Gallery.
 */

const VIEW_KEY = 'gallery:view'
const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const readView = () => {
  try {
    return localStorage.getItem(VIEW_KEY) === 'grid' ? 'grid' : 'table'
  } catch {
    return 'table'
  }
}

export default function GalleryPage() {
  usePageTitle('Gallery')
  const entry = usePublic('/gallery')
  const photos = entry.status === 'ok' ? (entry.data?.photos ?? []) : []
  const [view, setView] = useState(readView)
  const [viewer, setViewer] = useState(null) // { index, origin: { rect, rot } | null }
  const table = useRef(null)
  const returnFocus = useRef(null)

  const choose = (v) => {
    setView(v)
    try {
      localStorage.setItem(VIEW_KEY, v)
    } catch {
      /* private window: just for this visit */
    }
  }

  const open = useCallback((index, el, rot = 0) => {
    returnFocus.current = el
    const img = el?.querySelector('img')
    setViewer({ index, origin: img ? { rect: img.getBoundingClientRect(), rot } : null })
  }, [])

  const close = useCallback(() => {
    setViewer(null)
    returnFocus.current?.focus({ preventScroll: true })
  }, [])

  const has = photos.length > 0

  return (
    <>
      <section className="gal-body theme-black" aria-labelledby="gallery-title">
        <h1 id="gallery-title" className="visually-hidden">
          Gallery
        </h1>
        <div className="container container--wide">
          {has && (
            <div className="gal-bar">
              <p className="gal-bar__count">
                {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
              </p>
              <div className="gal-bar__tools">
                {view === 'table' && (
                  <>
                    <button type="button" className="gal-tool" onClick={() => table.current?.shuffle()} aria-label="Shuffle the photos">
                      <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
                        <path
                          d="M3 6h3.5c2 0 3.2 1 4.3 3l.4.8c1 2 2.3 3.2 4.3 3.2H17M14.5 4 17 6.2l-2.5 2.3M3 14h3.5c1.3 0 2.2-.4 3-1.2M12.7 7.2c.6-.8 1.5-1.2 2.8-1.2M14.5 11.5 17 13.8 14.5 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span className="gal-tool__label">Shuffle</span>
                    </button>
                    <button type="button" className="gal-tool" onClick={() => table.current?.tidy()} aria-label="Tidy up the photos">
                      <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
                        <rect x="3" y="3" width="6" height="6" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
                        <rect x="11" y="3" width="6" height="6" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
                        <rect x="3" y="11" width="6" height="6" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
                        <rect x="11" y="11" width="6" height="6" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
                      </svg>
                      <span className="gal-tool__label">Tidy up</span>
                    </button>
                  </>
                )}
                <div className="gal-switch" role="group" aria-label="Layout">
                  <button type="button" aria-pressed={view === 'table'} onClick={() => choose('table')}>
                    Table
                  </button>
                  <button type="button" aria-pressed={view === 'grid'} onClick={() => choose('grid')}>
                    Grid
                  </button>
                </div>
              </div>
            </div>
          )}

          {entry.status === 'loading' && <div className="gal-table gal-table--loading" aria-busy="true" aria-label="Loading the photos" />}
          {(entry.status === 'error' || entry.status === 'off') && (
            <div className="gal-table gal-table--empty">
              <div className="gal-empty">
                <p className="gal-empty__title">The photos can’t be loaded right now</p>
                <p className="gal-empty__text">The website couldn’t reach the server. It may be waking up — try again in a minute.</p>
              </div>
            </div>
          )}
          {(entry.status === 'missing' || (entry.status === 'ok' && !has)) && (
            <div className="gal-table gal-table--empty">
              <div className="gal-empty">
                <p className="gal-empty__title">The first photos are on their way</p>
                <p className="gal-empty__text">Photos from the city will be laid out on this table soon.</p>
              </div>
            </div>
          )}

          {has && view === 'table' && <PhotoTable ref={table} photos={photos} onOpen={open} />}
          {has && view === 'grid' && <PhotoGrid photos={photos} onOpen={open} />}
        </div>
      </section>

      {viewer && <Viewer photos={photos} start={viewer.index} origin={viewer.origin} onClose={close} />}
    </>
  )
}

/* ------------------------------------------------------------------ the table */

/** A small, repeatable random number source, so a layout looks the same until it's shuffled. */
function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const easeOut = (t) => 1 - Math.pow(1 - t, 3)

/** A print's size: a white border all round, a deeper one at the bottom, the photo in between. */
function printSize(pw, photo) {
  const pad = Math.max(6, Math.round(pw * 0.035))
  const bottom = Math.max(18, Math.round(pw * 0.1))
  const aspect = photo.width && photo.height ? clamp(photo.width / photo.height, 0.75, 1.8) : 4 / 3
  return { pad, bottom, aspect, w: pw, h: Math.round(pad + (pw - pad * 2) / aspect + bottom) }
}

/** Where every print lands: scattered across the table (or in neat rows when tidy). */
function plan(W, photos, seed, tidy) {
  const cols = W < 520 ? 2 : W < 860 ? 3 : W < 1180 ? 4 : 5
  const cell = W / cols
  const pw = Math.round(Math.min(360, cell * (tidy ? 0.84 : 0.8)))
  const sizes = photos.map((p) => printSize(pw, p))
  const tallest = Math.max(...sizes.map((s) => s.h))
  const rows = Math.ceil(photos.length / cols)
  const pad = 36
  const rowH = tidy ? tallest + 22 : tallest * 0.86
  let H = Math.max(rows * rowH + pad * 2 + (tidy ? 0 : tallest * 0.2), 440)
  // phones: a pile you dig through, so the page around it can still be scrolled
  const pile = !tidy && W < 520 && H > window.innerHeight * 0.85
  if (pile) H = Math.max(Math.round(window.innerHeight * 0.8), 440)
  const rand = rng(seed * 7919 + photos.length)
  const lastRow = rows - 1
  const inLast = photos.length - lastRow * cols
  const spots = photos.map((_, i) => {
    const row = Math.floor(i / cols)
    const s = sizes[i]
    // a short last row sits in the middle, not at the left
    const col = (i % cols) + (row === lastRow ? (cols - inLast) / 2 : 0)
    // keep the whole print on the table, even turned a little
    const mx = s.w * 0.56 + 10
    const my = s.h * 0.56 + 10
    if (tidy) return { x: cell * (col + 0.5), y: pad + rowH * row + rowH / 2, r: 0 }
    const x = cell * (col + 0.5) + (rand() - 0.5) * cell * 0.38
    const y = pile ? pad + s.h / 2 + rand() * (H - s.h - pad * 2) : pad + rowH * (row + 0.5) + (rand() - 0.5) * rowH * 0.42 + tallest * 0.1
    return { x: clamp(x, mx, W - mx), y: clamp(y, my, H - my), r: (rand() - 0.5) * 18 }
  })
  return { pw, H, sizes, spots }
}

function PhotoTable({ ref, photos, onOpen }) {
  const stage = useRef(null)
  const els = useRef([])
  const bodies = useRef([])
  const drag = useRef(null)
  const clickOk = useRef(false)
  const top = useRef(photos.length)
  const raf = useRef(0)
  const seed = useRef(1)
  const touched = useRef(false)
  const dealt = useRef(false)
  const [layout, setLayout] = useState(null) // { W, pw, H, sizes }
  const [hint, setHint] = useState(true)

  const apply = useCallback((i) => {
    const b = bodies.current[i]
    const el = els.current[i]
    if (!b || !el) return
    el.style.transform = `translate3d(${(b.x - b.w / 2).toFixed(2)}px, ${(b.y - b.h / 2).toFixed(2)}px, 0) rotate(${b.r.toFixed(2)}deg)`
    el.style.zIndex = String(b.z)
  }, [])

  // one animation loop for every print that is sliding, spinning or being dealt
  const tick = useCallback(() => {
    raf.current = 0
    const W = stage.current?.clientWidth ?? 0
    const H = stage.current?.clientHeight ?? 0
    const now = performance.now()
    let busy = false
    bodies.current.forEach((b, i) => {
      const dt = Math.min(34, now - (b.t ?? now))
      b.t = now
      if (b.tween) {
        const tw = b.tween
        const p = clamp((now - tw.start) / tw.dur, 0, 1)
        if (p > 0 && els.current[i]) els.current[i].style.opacity = '1'
        const k = easeOut(p)
        b.x = tw.from.x + (tw.to.x - tw.from.x) * k
        b.y = tw.from.y + (tw.to.y - tw.from.y) * k
        b.r = tw.from.r + (tw.to.r - tw.from.r) * k
        if (p >= 1) b.tween = null
        busy = true
        apply(i)
        return
      }
      if (b.held || (Math.abs(b.vx) + Math.abs(b.vy) < 0.004 && Math.abs(b.vr) < 0.003)) return
      b.x += b.vx * dt
      b.y += b.vy * dt
      b.r += b.vr * dt
      // the felt slows it down; spin dies a little faster
      b.vx *= Math.exp(-dt / 260)
      b.vy *= Math.exp(-dt / 260)
      b.vr *= Math.exp(-dt / 220)
      // the table's edge: bounce back, losing most of the speed and picking up a little spin
      const mx = b.w * 0.32
      const my = b.h * 0.32
      if (b.x < mx || b.x > W - mx) {
        b.x = clamp(b.x, mx, W - mx)
        b.vr += b.vy * 0.04 * Math.sign(b.vx)
        b.vx *= -0.42
      }
      if (b.y < my || b.y > H - my) {
        b.y = clamp(b.y, my, H - my)
        b.vr -= b.vx * 0.04 * Math.sign(b.vy)
        b.vy *= -0.42
      }
      busy = true
      apply(i)
    })
    if (busy) raf.current = requestAnimationFrame(tick)
  }, [apply])

  const kick = useCallback(() => {
    if (!raf.current) {
      const now = performance.now()
      bodies.current.forEach((b) => (b.t = now))
      raf.current = requestAnimationFrame(tick)
    }
  }, [tick])

  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  /** Lay the prints out for this width: fresh, or (once someone has moved them) keep them where they are. */
  const layOut = useCallback(
    (W, { tidy = false, animate = false } = {}) => {
      const next = plan(W, photos, seed.current, tidy)
      const old = bodies.current
      const prevW = layout?.W ?? W
      const instant = reduceMotion()
      bodies.current = photos.map((_, i) => {
        const s = next.sizes[i]
        const spot = next.spots[i]
        const b = old[i] ?? { x: spot.x, y: spot.y, r: spot.r, vx: 0, vy: 0, vr: 0, z: photos.length - i }
        const keep = touched.current && !animate && old[i]
        const body = { ...b, w: s.w, h: s.h, vx: 0, vy: 0, vr: 0, held: false, tween: null }
        if (keep) {
          body.x = clamp((b.x * W) / prevW, s.w * 0.32, W - s.w * 0.32)
          body.y = clamp(b.y, s.h * 0.32, next.H - s.h * 0.32)
        } else if (animate && !instant) {
          body.tween = { from: { x: b.x, y: b.y, r: b.r }, to: spot, start: performance.now() + i * 14, dur: 650 }
        } else {
          Object.assign(body, spot)
        }
        return body
      })
      if (animate) {
        // the original order again: the first photo on top
        bodies.current.forEach((b, i) => (b.z = ++top.current + photos.length - i))
      }
      setLayout({ W, pw: next.pw, H: next.H, sizes: next.sizes })
      if (animate) kick()
    },
    [photos, layout, kick],
  )

  // the table's width decides the layout; follow it when the window changes size
  const widthRef = useRef(0)
  useLayoutEffect(() => {
    const el = stage.current
    if (!el) return undefined
    const measure = () => {
      const W = Math.round(el.clientWidth)
      if (!W || Math.abs(W - widthRef.current) < 2) return
      widthRef.current = W
      layOut(W)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
    // layOut changes with the layout itself; the observer only needs to start once per photo set
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos])

  // after each layout: put every print where its body is
  useLayoutEffect(() => {
    bodies.current.forEach((_, i) => apply(i))
  }, [layout, apply])

  // the first time the table scrolls into view, the prints are dealt onto it from above
  useEffect(() => {
    const el = stage.current
    if (!el || !layout || dealt.current) return undefined
    if (reduceMotion()) {
      dealt.current = true
      els.current.forEach((p) => p && (p.style.opacity = '1'))
      return undefined
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting || dealt.current) return
        dealt.current = true
        io.disconnect()
        const rand = rng(97)
        const now = performance.now()
        bodies.current.forEach((b, i) => {
          const to = { x: b.x, y: b.y, r: b.r }
          const from = { x: b.x + (rand() - 0.5) * 260, y: b.y - 160 - rand() * 160, r: b.r + (rand() - 0.5) * 50 }
          b.x = from.x
          b.y = from.y
          b.r = from.r
          // dealt in reverse, so the first photo lands last, on top
          b.tween = { from, to, start: now + Math.min((photos.length - 1 - i) * 45, 1600), dur: 720 }
        })
        kick()
      },
      { threshold: 0.12 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [layout, photos.length, kick])

  // Shuffle and Tidy up, for the buttons above the table
  useEffect(() => {
    if (!ref) return
    const api = {
      shuffle: () => {
        seed.current += 1
        touched.current = false
        layOut(widthRef.current, { animate: true })
      },
      tidy: () => {
        touched.current = false
        layOut(widthRef.current, { tidy: true, animate: true })
      },
    }
    if (typeof ref === 'function') ref(api)
    else ref.current = api
  }, [ref, layOut])

  /* ---- picking a print up ---- */
  const local = (e) => {
    const r = stage.current.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  function down(e, i) {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    const b = bodies.current[i]
    if (!b) return
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* not a real pointer (some test tools): the moves still reach the print */
    }
    const p = local(e)
    const rad = (-b.r * Math.PI) / 180
    const dx = p.x - b.x
    const dy = p.y - b.y
    b.tween = null
    b.vx = b.vy = b.vr = 0
    b.held = true
    b.z = ++top.current
    drag.current = {
      i,
      id: e.pointerId,
      lx: dx * Math.cos(rad) - dy * Math.sin(rad),
      ly: dx * Math.sin(rad) + dy * Math.cos(rad),
      sx: e.clientX,
      sy: e.clientY,
      t0: performance.now(),
      moved: 0,
      last: { x: b.x, y: b.y, r: b.r, t: performance.now() },
      vx: 0,
      vy: 0,
      vr: 0,
    }
    clickOk.current = false
    els.current[i]?.classList.add('is-held')
    apply(i)
  }

  function moveTo(e) {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const b = bodies.current[d.i]
    const p = local(e)
    d.moved = Math.max(d.moved, Math.hypot(e.clientX - d.sx, e.clientY - d.sy))
    if (d.moved > 4 && hint) setHint(false)
    touched.current = true
    // the point you hold follows the pointer; the print swings around it like a real one
    let rad = (b.r * Math.PI) / 180
    const ax = d.lx * Math.cos(rad) - d.ly * Math.sin(rad)
    const ay = d.lx * Math.sin(rad) + d.ly * Math.cos(rad)
    const dx = p.x - (b.x + ax)
    const dy = p.y - (b.y + ay)
    const inertia = (b.w * b.w + b.h * b.h) / 3
    const turn = (ax * dy - ay * dx) / (ax * ax + ay * ay + inertia)
    b.r += clamp((turn * 180) / Math.PI, -6, 6)
    rad = (b.r * Math.PI) / 180
    b.x = p.x - (d.lx * Math.cos(rad) - d.ly * Math.sin(rad))
    b.y = p.y - (d.lx * Math.sin(rad) + d.ly * Math.cos(rad))
    const W = stage.current.clientWidth
    const H = stage.current.clientHeight
    b.x = clamp(b.x, b.w * 0.2, W - b.w * 0.2)
    b.y = clamp(b.y, b.h * 0.2, H - b.h * 0.2)
    // how fast it's moving, smoothed, for the throw and the tilt
    const now = performance.now()
    const dt = Math.max(1, now - d.last.t)
    d.vx = d.vx * 0.55 + ((b.x - d.last.x) / dt) * 0.45
    d.vy = d.vy * 0.55 + ((b.y - d.last.y) / dt) * 0.45
    d.vr = d.vr * 0.55 + ((b.r - d.last.r) / dt) * 0.45
    d.last = { x: b.x, y: b.y, r: b.r, t: now }
    const el = els.current[d.i]
    if (el) {
      el.style.setProperty('--tilt-x', `${clamp(-d.vy * 9, -12, 12).toFixed(1)}deg`)
      el.style.setProperty('--tilt-y', `${clamp(d.vx * 9, -12, 12).toFixed(1)}deg`)
    }
    apply(d.i)
  }

  function up(e) {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    drag.current = null
    const b = bodies.current[d.i]
    const el = els.current[d.i]
    el?.classList.remove('is-held')
    el?.style.setProperty('--tilt-x', '0deg')
    el?.style.setProperty('--tilt-y', '0deg')
    b.held = false
    clickOk.current = d.moved < 6 && performance.now() - d.t0 < 450
    // let go while still moving: it slides on; held still first: it stays put
    const still = performance.now() - d.last.t > 120 || reduceMotion()
    const speed = Math.hypot(d.vx, d.vy)
    const cap = speed > 2.6 ? 2.6 / speed : 1
    b.vx = still ? 0 : d.vx * cap
    b.vy = still ? 0 : d.vy * cap
    b.vr = still ? 0 : clamp(d.vr, -0.5, 0.5)
    kick()
  }

  function keys(e, i) {
    const step = e.shiftKey ? 60 : 20
    const move = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key]
    if (!move) return
    e.preventDefault()
    const b = bodies.current[i]
    const W = stage.current.clientWidth
    const H = stage.current.clientHeight
    b.tween = null
    b.x = clamp(b.x + move[0], b.w * 0.2, W - b.w * 0.2)
    b.y = clamp(b.y + move[1], b.h * 0.2, H - b.h * 0.2)
    b.z = ++top.current
    touched.current = true
    apply(i)
  }

  // the lamp over the table follows the mouse (moved, never repainted)
  const lamp = useRef(null)
  function light(e) {
    if (e.pointerType !== 'mouse' || !lamp.current) return
    const p = local(e)
    lamp.current.style.transform = `translate3d(${Math.round(p.x)}px, ${Math.round(p.y)}px, 0)`
  }

  return (
    <div className="gal-table-wrap">
      <div
        ref={stage}
        className="gal-table"
        style={{ height: layout ? `${layout.H}px` : undefined }}
        onPointerMove={light}
        role="group"
        aria-label="Photos on a table. Use the arrow keys to move the selected photo, Enter to open it."
      >
        <span className="gal-table__felt" aria-hidden="true" />
        <span className="gal-table__light" aria-hidden="true" />
        <span ref={lamp} className="gal-table__lamp" aria-hidden="true" />
        {layout &&
          photos.map((photo, i) => {
            const s = layout.sizes[i]
            return (
              <button
                key={photo.id}
                ref={(el) => (els.current[i] = el)}
                type="button"
                className="gal-print"
                style={{
                  width: `${s.w}px`,
                  '--pad': `${s.pad}px`,
                  '--bottom': `${s.bottom}px`,
                  '--aspect': s.aspect,
                  '--cap': `${clamp(s.w * 0.034, 9.5, 13)}px`,
                  opacity: dealt.current || reduceMotion() ? 1 : 0,
                }}
                aria-label={`${photo.caption || `Photo ${i + 1}`}${photo.credit ? `, ${photo.credit}` : ''}. Open full size`}
                onPointerDown={(e) => down(e, i)}
                onPointerMove={moveTo}
                onPointerUp={up}
                onPointerCancel={up}
                onLostPointerCapture={up}
                onKeyDown={(e) => keys(e, i)}
                onClick={(e) => {
                  // a tap opens it; a drag that ends on it doesn't. Keyboard (detail 0) always opens.
                  if (e.detail !== 0 && !clickOk.current) return
                  clickOk.current = false
                  onOpen(i, e.currentTarget, bodies.current[i]?.r ?? 0)
                }}
                onDragStart={(e) => e.preventDefault()}
              >
                <span className="gal-print__body">
                  <span className="gal-print__photo">
                    <img src={photo.src} alt="" loading="lazy" decoding="async" draggable={false} />
                    <span className="gal-print__sheen" aria-hidden="true" />
                  </span>
                  <span className="gal-print__cap">{photo.caption}</span>
                </span>
              </button>
            )
          })}
      </div>
      <p className={`gal-hint ${hint ? '' : 'is-gone'}`} aria-hidden="true">
        <span className="gal-hint__hand">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path
              d="M9 11V5.5a1.5 1.5 0 0 1 3 0V10m0-.5V4.5a1.5 1.5 0 0 1 3 0V10m0-1a1.5 1.5 0 0 1 3 0v5c0 3.9-2.6 7-6.5 7-2.6 0-4.1-1.1-5.4-3.1L3.9 14a1.5 1.5 0 0 1 2.4-1.8L9 15"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        Drag a photo to move it · flick to throw it · tap to open
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ the grid */

function PhotoGrid({ photos, onOpen }) {
  return (
    <ul role="list" className="gal-grid">
      {photos.map((photo, i) => (
        <li key={photo.id} className="gal-grid__item">
          <button
            type="button"
            className="gal-grid__btn"
            onClick={(e) => onOpen(i, e.currentTarget, 0)}
            aria-label={`${photo.caption || `Photo ${i + 1}`}. Open full size`}
          >
            <img
              src={photo.src}
              alt=""
              loading="lazy"
              decoding="async"
              width={photo.width ?? undefined}
              height={photo.height ?? undefined}
              style={photo.width ? undefined : { aspectRatio: '4 / 3' }}
            />
            {(photo.caption || photo.credit) && (
              <span className="gal-grid__cap">
                {photo.caption && <span>{photo.caption}</span>}
                {photo.credit && <span className="gal-grid__credit">{photo.credit}</span>}
              </span>
            )}
          </button>
        </li>
      ))}
    </ul>
  )
}

/* ------------------------------------------------------------------ full size */

function Viewer({ photos, start, origin, onClose }) {
  const [index, setIndex] = useState(start)
  const [dir, setDir] = useState(0)
  const [big, setBig] = useState({}) // index → the large picture has loaded
  const [leaving, setLeaving] = useState(false)
  const img = useRef(null)
  const closeBtn = useRef(null)
  const swipe = useRef(null)
  const flew = useRef(false)
  const photo = photos[index]
  const n = photos.length

  const go = useCallback(
    (step) => {
      if (n < 2) return
      setDir(step)
      setIndex((i) => (i + step + n) % n)
    },
    [n],
  )

  const shut = useCallback(() => {
    if (reduceMotion()) return onClose()
    setLeaving(true)
    window.setTimeout(onClose, 200)
  }, [onClose])

  // keys, no page scrolling behind it, focus inside
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') shut()
      else if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === 'Tab') {
        // keep focus on the viewer's own buttons
        const items = [...document.querySelectorAll('.gal-viewer button')]
        const at = items.indexOf(document.activeElement)
        if (e.shiftKey && at <= 0) {
          e.preventDefault()
          items[items.length - 1]?.focus()
        } else if (!e.shiftKey && at === items.length - 1) {
          e.preventDefault()
          items[0]?.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    const html = document.documentElement
    const before = html.style.overflow
    html.style.overflow = 'hidden'
    closeBtn.current?.focus({ preventScroll: true })
    return () => {
      document.removeEventListener('keydown', onKey)
      html.style.overflow = before
    }
  }, [go, shut])

  // load the large picture in the background, then swap it in
  useEffect(() => {
    if (!photo || big[index] || photo.full === photo.src) return undefined
    const pic = new Image()
    pic.onload = () => setBig((b) => ({ ...b, [index]: true }))
    pic.src = photo.full
    return () => (pic.onload = null)
  }, [index, photo, big])

  // open: the photo flies up off the table into place
  useLayoutEffect(() => {
    const el = img.current
    if (!el || flew.current || !origin || reduceMotion()) return
    flew.current = true
    const run = () => {
      const to = el.getBoundingClientRect()
      if (!to.width) return
      const s = origin.rect.width / to.width
      const dx = origin.rect.left + origin.rect.width / 2 - (to.left + to.width / 2)
      const dy = origin.rect.top + origin.rect.height / 2 - (to.top + to.height / 2)
      el.animate([{ transform: `translate(${dx}px, ${dy}px) rotate(${origin.rot}deg) scale(${s})` }, { transform: 'none' }], {
        duration: 560,
        easing: 'cubic-bezier(0.2, 0.85, 0.2, 1)',
      })
    }
    if (el.complete && el.naturalWidth) run()
    else el.decode?.().then(run, () => {})
  }, [origin])

  if (!photo) return null

  const onDown = (e) => {
    if (e.pointerType === 'mouse') return
    swipe.current = { x: e.clientX, y: e.clientY }
  }
  const onUp = (e) => {
    const s = swipe.current
    swipe.current = null
    if (!s) return
    const dx = e.clientX - s.x
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - s.y)) go(dx < 0 ? 1 : -1)
  }

  return createPortal(
    <div
      className={`gal-viewer ${leaving ? 'is-leaving' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={photo.caption || `Photo ${index + 1} of ${n}`}
    >
      <div className="gal-viewer__backdrop" onClick={shut} aria-hidden="true" />
      <div className="gal-viewer__top">
        <p className="gal-viewer__count">
          {index + 1} <span>/ {n}</span>
        </p>
        <button ref={closeBtn} type="button" className="gal-viewer__btn" onClick={shut} aria-label="Close">
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
            <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <figure
        className="gal-viewer__stage"
        onPointerDown={onDown}
        onPointerUp={onUp}
        onClick={(e) => e.target === e.currentTarget && shut()}
      >
        <img
          key={index}
          ref={img}
          className={`gal-viewer__img ${dir > 0 ? 'from-right' : dir < 0 ? 'from-left' : ''}`}
          src={big[index] ? photo.full : photo.src}
          alt={photo.caption || `Photo ${index + 1} of ${n}`}
          draggable={false}
        />
        {(photo.caption || photo.credit) && (
          <figcaption className="gal-viewer__cap">
            {photo.caption && <span className="gal-viewer__title">{photo.caption}</span>}
            {photo.credit && <span className="gal-viewer__credit">{photo.credit}</span>}
          </figcaption>
        )}
      </figure>

      {n > 1 && (
        <>
          <button
            type="button"
            className="gal-viewer__btn gal-viewer__nav gal-viewer__nav--prev"
            onClick={() => go(-1)}
            aria-label="Previous photo"
          >
            <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
              <path
                d="M12.5 4.5 7 10l5.5 5.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            className="gal-viewer__btn gal-viewer__nav gal-viewer__nav--next"
            onClick={() => go(1)}
            aria-label="Next photo"
          >
            <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
              <path
                d="M7.5 4.5 13 10l-5.5 5.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </>
      )}
    </div>,
    document.body,
  )
}
