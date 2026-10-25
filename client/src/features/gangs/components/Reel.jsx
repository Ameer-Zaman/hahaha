import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

import Odometer from '../../../components/ui/Odometer'
import { gsap } from '../../../lib/gsap'
import { formatFileNumber } from '../gangsModel'
import ReelCard from './ReelCard'

const LERP = 0.085 // how quickly the reel catches up with where it's heading (lower = heavier glide)
const INTRO_TURNS = 2 // full laps the reel spins through on arrival
const INTRO_SECONDS = 3.2

const mod = (n, m) => ((n % m) + m) % m

/**
 * The gangs as an endless film reel: rounded cards stacked vertically, the neighbours
 * peeking in above and below, and after the last gang comes the first again.
 *
 * - On arrival the reel spins through every gang and eases to a stop on the first one.
 * - It doesn't scroll the page: the wheel, trackpad, touch, mouse drag and arrow keys turn
 *   the reel. Movement glides with weight and each gesture settles on the next card.
 * - While it turns fast it leans with the speed; pictures drift inside their frames and the
 *   cards away from the centre shrink and dim.
 * - A ticket in the corner counts the gangs (rolling digits).
 * - Reduced motion: no spin, no loop — the cards are simply stacked and the page scrolls.
 */
export default function Reel({ files }) {
  const root = useRef(null)
  const stage = useRef(null)
  const trackRef = useRef(null)
  const slotEls = useRef([])
  const motion = useRef({ pos: 0, target: 0, spacing: 1, intro: null, last: 0 })
  const [active, setActive] = useState(0)
  const [reduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
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
    }))
    const trackEl = trackRef.current

    const measure = () => {
      const first = slots[0]?.slot
      if (!first) return
      // same gap as the CSS: clamp(1.5rem, 4.5svh, 3rem)
      const gap = Math.min(48, Math.max(24, window.innerHeight * 0.045))
      m.spacing = first.offsetHeight + gap
    }
    measure()
    window.addEventListener('resize', measure)

    // Arrival: spin through every gang and land on the first (or on the gang we came back to).
    const startAt = Math.max(0, files.findIndex((f) => f.slug === focusSlug))
    if (focusSlug) {
      m.pos = m.target = m.last = startAt
    } else {
      m.pos = m.target = m.last = -count * INTRO_TURNS
      m.intro = gsap.to(m, {
        pos: 0,
        duration: INTRO_SECONDS,
        ease: 'expo.inOut',
        onComplete: () => {
          m.target = 0
          m.intro = null
        },
      })
    }

    let activeIndex = -1
    const skewTo = gsap.quickTo(trackEl, 'skewY', { duration: 0.5, ease: 'power3.out' })

    const tick = () => {
      if (!m.intro) m.pos += (m.target - m.pos) * LERP
      const velocity = m.pos - m.last
      m.last = m.pos
      skewTo(gsap.utils.clamp(-1.6, 1.6, velocity * -9))

      slots.forEach(({ slot, media }, i) => {
        // offset from the centre, wrapped so the reel loops: range [-count/2, count/2)
        const o = mod(i - m.pos + count / 2, count) - count / 2
        // cards far from the centre stay in the page (so they can be reached with Tab) but invisible
        const far = Math.abs(o) >= 2
        const dist = Math.min(Math.abs(o), 1.2)
        slot.style.transform = `translate3d(0, ${o * m.spacing}px, 0) scale(${1 - dist * 0.09})`
        slot.style.opacity = far ? '0' : String(1 - Math.min(dist, 1) * 0.55)
        slot.style.zIndex = String(100 - Math.round(Math.abs(o) * 10))
        if (media) media.style.transform = `translate3d(0, ${o * -9}%, 0)`
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
      m.intro?.kill()
      m.intro = null
      window.removeEventListener('resize', measure)
      gsap.set(trackEl, { clearProps: 'transform' })
    }
    // runs once per visit; focusSlug/files are read at arrival only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, count])

  /* ---------- input: wheel, touch, drag, keys ---------- */
  useEffect(() => {
    if (reduced) return undefined
    const m = motion.current
    const el = stage.current

    const stopIntro = () => {
      if (m.intro) {
        m.intro.kill()
        m.intro = null
        m.target = m.pos
      }
    }

    // Settle on a card: the next one in the direction of travel, or back if it was a nudge.
    const settleToward = (dir) => {
      const near = Math.round(m.target)
      if (!dir || Math.abs(m.target - near) < 0.06) m.target = near
      else m.target = dir > 0 ? Math.ceil(m.target) : Math.floor(m.target)
    }

    // Wheel / trackpad: each gesture carries the reel on to the next card.
    let gesture = 0
    let timer = 0
    const onWheel = (event) => {
      event.preventDefault()
      stopIntro()
      const delta = event.deltaMode === 1 ? event.deltaY * 32 : event.deltaY
      gesture += delta
      // follow the wheel freely, but never more than ~1.6 cards past the nearest card
      const anchor = Math.round(m.pos)
      m.target = gsap.utils.clamp(anchor - 1.6, anchor + 1.6, m.target + (delta / m.spacing) * 1.1)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        settleToward(Math.sign(gesture))
        gesture = 0
      }, 120)
    }

    // Touch and mouse drag: the reel follows the hand; release settles (a flick goes on).
    let drag = null
    const onPointerDown = (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      stopIntro()
      drag = { startY: e.clientY, startTarget: m.target, lastY: e.clientY, lastT: performance.now(), v: 0, moved: false }
      el.classList.add('is-dragging')
    }
    const onPointerMove = (e) => {
      if (!drag) return
      const now = performance.now()
      drag.v = (e.clientY - drag.lastY) / Math.max(1, now - drag.lastT) // px per ms
      drag.lastY = e.clientY
      drag.lastT = now
      if (Math.abs(e.clientY - drag.startY) > 6) drag.moved = true
      m.target = drag.startTarget - ((e.clientY - drag.startY) / m.spacing) * 1.25
    }
    const onPointerUp = () => {
      if (!drag) return
      const { v, moved, startTarget } = drag
      drag = null
      el.classList.remove('is-dragging')
      if (!moved) return
      const pulled = Math.sign(m.target - startTarget)
      settleToward(Math.abs(v) > 0.5 ? -Math.sign(v) : pulled)
      // swallow the click that ends a drag, so a drag never opens a gang by accident
      const swallow = (event) => {
        event.preventDefault()
        event.stopPropagation()
      }
      el.addEventListener('click', swallow, { capture: true, once: true })
      window.setTimeout(() => el.removeEventListener('click', swallow, { capture: true }), 60)
    }

    // Keys: arrows, Page Up/Down and Space turn the reel one card.
    const onKey = (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      const next = ['ArrowDown', 'PageDown'].includes(event.key) || (event.key === ' ' && !event.shiftKey)
      const prev = ['ArrowUp', 'PageUp'].includes(event.key) || (event.key === ' ' && event.shiftKey)
      if (!next && !prev) return
      event.preventDefault()
      stopIntro()
      m.target = Math.round(m.target) + (next ? 1 : -1)
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
    window.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('wheel', onWheel)
      el.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
      window.removeEventListener('keydown', onKey)
    }
  }, [reduced])

  /** Keyboard users tabbing to a card's Explore link bring that card to the centre. */
  const onFocusCard = (i) => {
    if (reduced) return
    const m = motion.current
    m.intro?.kill()
    m.intro = null
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

      {/* Corner ticket: the gang counter */}
      <div className="reel__hud">
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
