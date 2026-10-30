import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

import Odometer from '../../../components/ui/Odometer'
import { gsap } from '../../../lib/gsap'
import { formatFileNumber } from '../gangsModel'
import GangPicker from './GangPicker'
import ReelCard from './ReelCard'

/*
 * Motion model (the same feel as a film reel):
 *  - `target` is where the reel is heading, in cards. Every frame it is pulled 10% of the way
 *    to the nearest whole card, so the reel always comes to rest on a card — small nudges
 *    spring back, bigger ones carry on to the next.
 *  - `pos` (what you see) eases 5% per frame towards `target` (9% on touch screens): a slow,
 *    heavy glide.
 *  - `speed` follows the input and decays; the smoothed speed blurs the reel while it moves.
 */
const PULL = 0.1 // per frame, target → nearest card
const EASE_DESKTOP = 0.05 // per frame, pos → target
const EASE_TOUCH = 0.09
const WHEEL = 0.0018 // cards per wheel pixel (a 3-notch scroll moves one card)
const WHEEL_HOLD = 140 // ms: while the wheel is turning, the pull to the nearest card waits
const DRAG = 0.005 // cards per dragged pixel (200 px = one card)
const INTRO_CARDS = 60 // the arrival spin runs through this many cards
const BLUR_MAX = 28 // px, cap for the motion blur

const mod = (n, m) => ((n % m) + m) % m
const lerp = (a, b, t) => a + (b - a) * t
/** Per-frame easing factor `k` (tuned at 60 fps), adjusted for the actual frame time. */
const frame = (k, dt) => 1 - (1 - k) ** (dt * 60)

/**
 * The gangs as an endless film reel: rounded cards stacked vertically, the neighbours
 * peeking in above and below, and after the last gang comes the first again.
 *
 * - On arrival the reel spins through the gangs at full speed, blurred, and eases out onto
 *   the first one.
 * - It doesn't scroll the page: the wheel, trackpad, touch, mouse drag and arrow keys turn
 *   the reel, which always settles on a card.
 * - While it moves fast everything blurs with the speed; pictures and text drift at
 *   different depths inside the cards.
 * - A ticket in the corner counts the gangs (rolling digits).
 * - Reduced motion: no spin, no loop — the cards are simply stacked and the page scrolls.
 */
export default function Reel({ files }) {
  const root = useRef(null)
  const stage = useRef(null)
  const trackRef = useRef(null)
  const cursorRef = useRef(null)
  const slotEls = useRef([])
  const motion = useRef({ pos: 0, target: 0, speed: 0, lspeed: 0, spacing: 1, dragging: false, holdUntil: 0 })
  const [active, setActive] = useState(0)
  const [reduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [touch] = useState(() => window.matchMedia('(pointer: coarse)').matches)
  const count = files.length
  const location = useLocation()
  const focusSlug = location.state?.focus ?? null

  /* ---------- the render loop ---------- */
  useEffect(() => {
    if (reduced) return undefined
    const m = motion.current
    const slots = slotEls.current.filter(Boolean).map((slot) => ({
      slot,
      media: slot.querySelector('.reel-card__media'),
      left: slot.querySelector('.reel-card__left'),
      top: slot.querySelector('.reel-card__topline'),
    }))
    const trackEl = trackRef.current
    const ease = touch ? EASE_TOUCH : EASE_DESKTOP

    let drawnPos = NaN // where the cards were last drawn: skip the work while nothing moves
    const measure = () => {
      // one card every 85% of the screen height
      m.spacing = window.innerHeight * 0.85
      drawnPos = NaN // redraw at the new size
    }
    measure()
    window.addEventListener('resize', measure)

    // Arrival: a fast, blurred spin through the reel that eases out onto the first gang
    // (or straight onto the gang we came back to).
    const startAt = Math.max(0, files.findIndex((f) => f.slug === focusSlug))
    if (focusSlug) {
      m.pos = m.target = startAt
    } else {
      m.pos = 0
      m.target = Math.max(1, Math.round(INTRO_CARDS / count)) * count // lands on card 0
      if (!touch) m.speed = m.lspeed = 10
    }

    let activeIndex = -1
    let lastBlur = -1
    let last = performance.now()

    const tick = () => {
      const now = performance.now()
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now

      if (!m.dragging && now > m.holdUntil) m.target = lerp(m.target, Math.round(m.target), frame(PULL, dt))
      m.pos = lerp(m.pos, m.target, frame(ease, dt))
      m.speed *= 0.85 ** (dt * 60)
      m.lspeed = lerp(m.lspeed, Math.abs(m.speed), frame(0.1, dt))

      // motion blur while the reel moves (not on phones, to keep them smooth)
      if (!touch) {
        const blur = Math.min(BLUR_MAX, m.lspeed * 10)
        const rounded = blur < 0.25 ? 0 : Math.round(blur * 4) / 4
        if (rounded !== lastBlur) {
          trackEl.style.filter = rounded ? `blur(${rounded}px)` : ''
          lastBlur = rounded
        }
      }

      // at rest (same spot, no blur left): nothing to redraw this frame
      if (Math.abs(m.pos - drawnPos) < 0.0002 && lastBlur <= 0) return
      drawnPos = m.pos

      slots.forEach(({ slot, media, left, top }, i) => {
        // offset from the centre in cards, wrapped so the reel loops: [-count/2, count/2)
        const o = mod(i - m.pos + count / 2, count) - count / 2
        // cards far from the centre stay in the page (so they can be reached with Tab) but invisible
        const far = Math.abs(o) >= 2
        slot.style.transform = `translate3d(0, ${o * m.spacing}px, 0)`
        slot.style.opacity = far ? '0' : '1'
        // depth: the picture and the text drift at different speeds inside the card
        if (media) media.style.transform = `translate3d(0, ${o * -9}%, 0)`
        if (left) left.style.transform = `translate3d(0, ${o * 14}%, 0)`
        if (top) top.style.transform = `translate3d(0, ${o * 22}%, 0)`
      })

      const idx = mod(Math.round(m.pos), count)
      if (idx !== activeIndex) {
        activeIndex = idx
        setActive(idx)
      }
    }
    gsap.ticker.add(tick)
    tick()

    return () => {
      gsap.ticker.remove(tick)
      window.removeEventListener('resize', measure)
      trackEl.style.filter = ''
    }
    // runs once per visit; focusSlug/files are read at arrival only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, count, touch])

  /* ---------- input: wheel, touch, drag, keys ---------- */
  useEffect(() => {
    if (reduced) return undefined
    const m = motion.current
    const el = stage.current

    // Wheel / trackpad: the reel follows the wheel; the pull to the nearest card does the rest.
    const onWheel = (event) => {
      if (event.target.closest?.('.gpick__list')) return // scrolling the gang list, not the reel
      event.preventDefault()
      const delta = event.deltaMode === 1 ? event.deltaY * 30 : event.deltaMode === 2 ? event.deltaY * window.innerHeight : event.deltaY
      m.target += delta * WHEEL
      m.speed += delta * 0.0005
      m.holdUntil = performance.now() + WHEEL_HOLD
    }

    // Touch and mouse drag: the reel follows the hand (200 px = one card); release settles.
    let drag = null
    const onPointerDown = (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      if (e.target.closest?.('.gpick')) return // the gang dropdown is not a drag handle
      drag = { startY: e.clientY, startTarget: m.target, lastY: e.clientY, moved: false }
      m.dragging = true
      el.classList.add('is-dragging')
    }
    const onPointerMove = (e) => {
      if (!drag) return
      const dy = e.clientY - drag.startY
      if (Math.abs(dy) > 6) drag.moved = true
      m.speed += Math.abs(e.clientY - drag.lastY) * 0.0002
      drag.lastY = e.clientY
      m.target = drag.startTarget - dy * DRAG
    }
    const onPointerUp = () => {
      if (!drag) return
      const { moved } = drag
      drag = null
      m.dragging = false
      el.classList.remove('is-dragging')
      if (!moved) return
      // swallow the click that ends a drag, so a drag never opens a gang by accident
      const swallow = (event) => {
        event.preventDefault()
        event.stopPropagation()
      }
      el.addEventListener('click', swallow, { capture: true, once: true })
      window.setTimeout(() => el.removeEventListener('click', swallow, { capture: true }), 60)
    }

    // Keys: arrows, Page Up/Down and Space turn the reel one card (at most every 200 ms).
    let lastKey = 0
    const onKey = (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (document.activeElement?.closest?.('.gpick')) return // the gang dropdown has its own keys
      const next = ['ArrowDown', 'PageDown'].includes(event.key) || (event.key === ' ' && !event.shiftKey)
      const prev = ['ArrowUp', 'PageUp'].includes(event.key) || (event.key === ' ' && event.shiftKey)
      if (!next && !prev) return
      event.preventDefault()
      const now = performance.now()
      if (now - lastKey < 200) return
      lastKey = now
      m.target = Math.round(m.target) + (next ? 1 : -1)
      m.speed += 0.5
    }

    // Cursor ring that trails the mouse (fine pointers only)
    const cursor = cursorRef.current
    let cx = -100
    let cy = -100
    let tx = -100
    let ty = -100
    let raf = 0
    const follow = () => {
      cx = lerp(cx, tx, 0.2)
      cy = lerp(cy, ty, 0.2)
      if (cursor) cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`
      raf = Math.abs(cx - tx) + Math.abs(cy - ty) > 0.2 ? requestAnimationFrame(follow) : 0
    }
    const onMouse = (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return
      tx = e.clientX
      ty = e.clientY
      if (cursor) {
        cursor.classList.add('is-on')
        cursor.classList.toggle('is-link', Boolean(e.target.closest?.('a, button')))
      }
      if (!raf) raf = requestAnimationFrame(follow)
    }
    const onLeave = () => cursor?.classList.remove('is-on')

    window.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointermove', onMouse)
    document.documentElement.addEventListener('mouseleave', onLeave)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('wheel', onWheel)
      el.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointermove', onMouse)
      document.documentElement.removeEventListener('mouseleave', onLeave)
    }
  }, [reduced])

  /** The gang dropdown: turn the reel to that gang the shortest way round (or scroll to it). */
  const goTo = (i) => {
    if (reduced) {
      slotEls.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    const m = motion.current
    const base = Math.round(m.target)
    const steps = mod(i - base + count / 2, count) - count / 2
    m.dragging = false
    m.holdUntil = 0
    m.target = base + steps
    m.speed += Math.min(4, Math.abs(steps) * 0.8)
  }

  /** Keyboard users tabbing to a card's Explore link bring that card to the centre. */
  const onFocusCard = (i) => {
    if (reduced) return
    const m = motion.current
    const base = Math.round(m.target)
    m.target = base + (mod(i - base + count / 2, count) - count / 2) // shortest way round
  }

  return (
    <section
      ref={root}
      className={`reel ${reduced ? 'is-static' : 'is-loop'}`}
      aria-labelledby="gangs-title"
    >
      <h1 id="gangs-title" className="visually-hidden">
        Gangs of the city
      </h1>

      <div className="reel__grain" aria-hidden="true" />
      {!reduced && !touch && (
        <div ref={cursorRef} className="reel__cursor" aria-hidden="true">
          <span className="reel__cursor-ring" />
          <svg className="reel__cursor-arrow" viewBox="0 0 12 8" width="12" height="8">
            <path d="M1 1.5 6 6.5l5-5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}

      {/* Corner ticket: the gang counter, and the dropdown to choose a gang */}
      <div className="reel__hud">
        {count > 1 && <GangPicker files={files} active={active} onPick={goTo} />}
        {/* HUD counter: a slanted black plate with the gang number and one pip per gang */}
        <div className="hud" role="group" aria-label="Gang counter">
          <span className="hud__label">Gang file</span>
          <span className="hud__count">
            <Odometer value={active + 1} width={2} className="hud__odo" label="Gang" />
            <span className="hud__of">/{formatFileNumber(count)}</span>
          </span>
          <span className="hud__pips" aria-hidden="true">
            {files.map((file, i) => (
              <i key={file.key} className={i === active ? 'is-on' : ''} />
            ))}
          </span>
        </div>
      </div>

      <div ref={stage} className="reel__stage">
        <div ref={trackRef} className="reel__track">
          {files.map((file, i) => (
            <div
              key={file.key}
              ref={(el) => {
                slotEls.current[i] = el
              }}
              className="reel__slot"
              onFocusCapture={() => onFocusCard(i)}
            >
              <ReelCard file={file} active={i === active} total={count} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
