import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import Plate from '../../../components/media/Plate'
import Arrow from '../../../components/ui/Arrow'
import Odometer from '../../../components/ui/Odometer'
import { gsap, MOTION_OK, ScrollTrigger, useGSAP } from '../../../lib/gsap'
import { formatFileNumber } from '../gangsModel'

const AUTO_MS = 6000 // idle time before the showcase moves on to the next file

/**
 * The archive showcase — one gang per screen, scroll-driven, in the manner of a film
 * foundation's immersive index.
 *
 * - The stage pins while scrolling moves through the files; each new file rises from below
 *   (clip reveal) while its image drifts into place, and the file underneath slides away
 *   slower and dims — layered parallax. Each file snaps into place.
 * - A rolling counter, a quick-navigation rail and progress segments sit above the stage.
 * - When the visitor stops, it moves on by itself after a few seconds (with a visible
 *   countdown and a Pause control). Any scroll, drag, key or click resets the countdown.
 * - Mouse users can hold and drag to move through the files.
 * - With reduced motion: no pinning, no autoplay — the files are simply stacked.
 */
export default function Showcase({ files }) {
  const root = useRef(null)
  const stage = useRef(null)
  const trigger = useRef(null)
  const activeRef = useRef(0)
  const lastInput = useRef(0)
  const glide = useRef(null) // the running autoplay / rail-jump tween
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const [interacted, setInteracted] = useState(false)
  const [reduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const count = files.length

  /* ---------- the scroll-driven stage ---------- */
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MOTION_OK, () => {
        const slides = gsap.utils.toArray('.show__slide', root.current)
        const parts = slides.map((slide) => ({
          slide,
          media: slide.querySelector('.show__media'),
          dim: slide.querySelector('.show__dim'),
          copy: slide.querySelector('.show__copy'),
        }))

        // p runs 0 → count-1 across the pinned scroll; o = how far each file is from "current".
        const render = (p) => {
          parts.forEach(({ slide, media, dim, copy }, i) => {
            const o = p - i
            if (o <= -1) {
              slide.style.visibility = 'hidden'
              return
            }
            slide.style.visibility = o >= 1.02 && i < count - 1 ? 'hidden' : 'visible'
            if (o < 0) {
              // incoming: revealed from the bottom edge, image rising into place
              const t = -o
              slide.style.clipPath = `inset(${t * 100}% 0 0 0)`
              media.style.transform = `translate3d(0, ${t * 28}%, 0) scale(1.06)`
              copy.style.transform = `translate3d(0, ${t * 22}vh, 0)`
              copy.style.opacity = String(Math.max(0, 1 - t * 1.4))
              dim.style.opacity = '0'
            } else {
              // current / outgoing: slides away slower than the page and darkens
              slide.style.clipPath = 'inset(0 0 0 0)'
              media.style.transform = `translate3d(0, ${-o * 14}%, 0) scale(${1 + o * 0.06})`
              copy.style.transform = `translate3d(0, ${-o * 12}vh, 0)`
              copy.style.opacity = String(Math.max(0, 1 - o * 1.8))
              dim.style.opacity = String(Math.min(0.75, o * 0.75))
            }
          })
          const index = Math.round(p)
          if (index !== activeRef.current) {
            activeRef.current = index
            setActive(index)
          }
        }

        // The site sets `scroll-behavior: smooth` on <html>; it fights snapping (every
        // programmatic step gets smoothed again), so it is switched off while this page is up.
        const html = document.documentElement
        const previousBehavior = html.style.scrollBehavior
        html.style.scrollBehavior = 'auto'

        trigger.current = ScrollTrigger.create({
          trigger: root.current,
          start: 'top top',
          end: () => `+=${(count - 1) * window.innerHeight}`,
          pin: stage.current,
          anticipatePin: 1,
          onUpdate: (self) => render(self.progress * (count - 1)),
          snap: count > 1 ? { snapTo: 1 / (count - 1), duration: { min: 0.35, max: 0.9 }, ease: 'power2.inOut', delay: 0.08 } : false,
          invalidateOnRefresh: true,
        })
        render(0)
        return () => {
          trigger.current = null
          html.style.scrollBehavior = previousBehavior
        }
      })
      return () => mm.revert()
    },
    { scope: root },
  )

  /* ---------- navigation helpers ---------- */
  const goTo = (index) => {
    const st = trigger.current
    lastInput.current = performance.now()
    if (!st) {
      document.getElementById(`file-${index + 1}`)?.scrollIntoView({ behavior: 'smooth' })
      return
    }
    const target = Math.round(st.start + (index / Math.max(1, count - 1)) * (st.end - st.start))
    // A GSAP-driven glide (rather than native smooth scroll) gives the same ease every time
    // and can be cancelled the moment the visitor scrolls themselves.
    glide.current?.kill()
    const proxy = { y: window.scrollY }
    glide.current = gsap.to(proxy, {
      y: target,
      duration: Math.min(1.6, 0.7 + Math.abs(target - proxy.y) / window.innerHeight / 2.5),
      ease: 'power3.inOut',
      onUpdate: () => window.scrollTo(0, proxy.y),
      onComplete: () => {
        glide.current = null
        lastInput.current = performance.now() // the countdown starts once the file has landed
      },
    })
  }

  /* ---------- autoplay with countdown (pauses on any input, stops at the last file) ---------- */
  const ringRef = useRef(null)
  useEffect(() => {
    if (reduced || count < 2) return undefined
    const mark = () => {
      lastInput.current = performance.now()
      glide.current?.kill()
      glide.current = null
      setInteracted(true)
    }
    const opts = { passive: true }
    window.addEventListener('wheel', mark, opts)
    window.addEventListener('touchstart', mark, opts)
    window.addEventListener('keydown', mark)
    lastInput.current = performance.now()

    let raf = 0
    const tick = () => {
      const st = trigger.current
      const live = st?.isActive && !paused && !glide.current && activeRef.current < count - 1
      const elapsed = performance.now() - lastInput.current
      const t = live ? Math.min(1, elapsed / AUTO_MS) : 0
      ringRef.current?.style.setProperty('--auto', String(t))
      if (live && elapsed >= AUTO_MS) goTo(activeRef.current + 1)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('wheel', mark, opts)
      window.removeEventListener('touchstart', mark, opts)
      window.removeEventListener('keydown', mark)
    }
    // goTo only reads refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, reduced, count])

  /* ---------- hold and drag (mouse): the page follows the hand, release settles a file ---------- */
  const drag = useRef(null)
  const onPointerDown = (event) => {
    if (reduced || event.pointerType !== 'mouse' || event.button !== 0) return
    if (event.target.closest('a, button')) return
    if (!trigger.current?.isActive) return
    glide.current?.kill()
    glide.current = null
    drag.current = { x: event.clientX, y: event.clientY, total: 0, from: activeRef.current }
    stage.current?.classList.add('is-dragging')
    setInteracted(true)
  }
  const onPointerMove = (event) => {
    const d = drag.current
    if (!d) return
    const delta = -(event.clientY - d.y + (event.clientX - d.x)) * 1.6
    d.x = event.clientX
    d.y = event.clientY
    d.total += delta
    lastInput.current = performance.now()
    window.scrollBy(0, delta)
  }
  const endDrag = () => {
    const d = drag.current
    if (!d) return
    drag.current = null
    stage.current?.classList.remove('is-dragging')
    // A deliberate pull moves one file in that direction; a nudge settles back.
    const step = Math.abs(d.total) > 60 ? Math.sign(d.total) : 0
    goTo(Math.max(0, Math.min(count - 1, d.from + step)))
  }

  return (
    <section
      ref={root}
      className={`show ${reduced ? 'is-static' : ''}`}
      aria-roledescription="carousel"
      aria-label="Gang files"
    >
      <div
        ref={stage}
        className="show__stage theme-black"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        {files.map((file, i) => (
          <article
            key={file.key}
            id={`file-${file.number}`}
            className={`show__slide show__slide--${file.scene.tint} ${file.reserved ? 'is-reserved' : ''}`}
            style={{ zIndex: i + 1 }}
            aria-roledescription="slide"
            aria-label={`File ${formatFileNumber(file.number)} of ${formatFileNumber(count)}: ${file.title}`}
            aria-hidden={!reduced && i !== active}
          >
            <div className="show__media">
              <Plate image={file.image} seed={file.scene.seed} horizon={file.scene.horizon} />
            </div>
            <div className="show__tint" aria-hidden="true" />
            <div className="show__shade" aria-hidden="true" />
            <div className="show__dim" aria-hidden="true" />

            <div className="show__copy container">
              <p className="show__meta">
                <span>File {formatFileNumber(file.number)}</span>
                <span>{file.type}</span>
                <span className={`status ${file.reserved ? 'status--pending' : ''}`}>
                  {file.reserved ? 'Awaiting confirmation' : file.verified ? 'Confirmed' : 'Unverified'}
                </span>
              </p>
              <h2 className="show__title">{file.title}</h2>
              {file.headline && (
                <div className="show__headline">
                  <span className="show__label">Headline</span>
                  <p>{file.headline}</p>
                </div>
              )}
              <dl className="show__credits">
                <div>
                  <dt className="show__label">Leader</dt>
                  <dd>{file.leader}</dd>
                </div>
                <div>
                  <dt className="show__label">Territory</dt>
                  <dd>{file.territory}</dd>
                </div>
                <div>
                  <dt className="show__label">Established</dt>
                  <dd>{file.established}</dd>
                </div>
              </dl>
              <Link to="/apply" className="btn btn--primary show__cta" tabIndex={!reduced && i !== active ? -1 : undefined}>
                {file.reserved ? 'Apply to the city' : 'Apply now'} <Arrow />
              </Link>
            </div>
          </article>
        ))}

        {/* ---- overlay: rail, counter, progress, autoplay ---- */}
        {!reduced && (
          <div className="show__hud">
            <nav className="show__rail" aria-label="Jump to a file">
              <ol role="list">
                {files.map((file, i) => (
                  <li key={file.key}>
                    <button
                      type="button"
                      className={`show__rail-item ${i === active ? 'is-active' : ''}`}
                      aria-current={i === active ? 'true' : undefined}
                      onClick={() => goTo(i)}
                    >
                      <span className="show__rail-num">{formatFileNumber(file.number)}</span>
                      <span className="show__rail-name">{file.title}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </nav>

            <div className="show__counter">
              <Odometer value={active + 1} width={2} className="show__count" label="File" />
              <span className="show__of">/ {formatFileNumber(count)}</span>
            </div>

            <div className="show__progress" aria-hidden="true">
              {files.map((file, i) => (
                <span key={file.key} className={i <= active ? 'is-done' : ''} />
              ))}
            </div>

            <button
              ref={ringRef}
              type="button"
              className="show__auto"
              aria-pressed={!paused}
              onClick={() => setPaused((v) => !v)}
            >
              <svg viewBox="0 0 36 36" aria-hidden="true">
                <circle cx="18" cy="18" r="16" className="show__auto-track" />
                <circle cx="18" cy="18" r="16" className="show__auto-fill" pathLength="1" />
              </svg>
              <span className="show__auto-label">{paused ? 'Play' : 'Pause'}</span>
            </button>

            <p className={`show__hint ${interacted ? 'is-hidden' : ''}`} aria-hidden="true">
              Scroll, or hold and drag
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
