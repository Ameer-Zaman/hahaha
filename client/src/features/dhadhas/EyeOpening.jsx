import { useRef } from 'react'

import Plate from '../../components/media/Plate'
import { gsap, MOTION_OK, ScrollTrigger, useGSAP } from '../../lib/gsap'

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const lerp = (a, b, t) => a + (b - a) * t
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)

/**
 * The eye's outline for a w × h screen at openness `o` (0 = shut, 1 = fully open).
 * Two curves meeting at the corners of the eye. Up to OPEN_AT the eye opens like an eye
 * (the lids part); after that it keeps widening until the picture fills the screen.
 */
const OPEN_AT = 0.55
function eyePath(w, h, o) {
  const cx = w / 2
  const cy = h / 2
  const eyeHalf = (w < 640 ? 0.46 : 0.36) * w // half the width of the eye at rest
  const lids = easeInOut(clamp01(o / OPEN_AT)) // 0 → 1: the lids part
  const fill = easeInOut(clamp01((o - OPEN_AT) / (1 - OPEN_AT))) // 0 → 1: grows past the screen
  const half = lerp(eyeHalf, w * 1.25, fill)
  // the curve's control point: a slit at first, an almond when open, then past the screen's edges
  const pull = lerp(lerp(h * 0.004, eyeHalf * 0.5, lids), h * 1.5, fill)
  const l = cx - half
  const r = cx + half
  return `M${l} ${cy} Q${cx} ${cy - pull} ${r} ${cy} Q${cx} ${cy + pull} ${l} ${cy} Z`
}

/**
 * The opening of the Dhadhas page: a closed eye, a thin gold line. Scrolling opens it —
 * the lids part, the picture inside comes into focus, and the eye widens until the
 * picture fills the screen. With reduced motion the picture is simply shown.
 */
export default function EyeOpening({ image }) {
  const root = useRef(null)
  const lid = useRef(null)
  const outline = useRef(null)
  const svg = useRef(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MOTION_OK, () => {
        const state = { o: 0 }
        const draw = () => {
          const w = lid.current.clientWidth
          const h = lid.current.clientHeight
          const d = eyePath(w, h, state.o)
          lid.current.style.clipPath = `path('${d}')`
          svg.current.setAttribute('viewBox', `0 0 ${w} ${h}`)
          outline.current.setAttribute('d', d)
          // the gold edge fades once the eye is past "open"; the hint goes at the first scroll
          root.current.style.setProperty('--edge', String(1 - clamp01((state.o - OPEN_AT * 0.8) / 0.25)))
          root.current.style.setProperty('--hint', String(1 - clamp01(state.o / 0.06)))
        }

        // arrival: the eye flickers open a crack, inviting the scroll
        const arrive = gsap.fromTo(state, { o: 0 }, { o: 0.07, duration: 1.1, delay: 0.4, ease: 'power2.inOut', onUpdate: draw })

        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: root.current,
            start: 'top top',
            end: '+=170%',
            pin: '.dh-eye__stage',
            scrub: 0.8,
            onEnter: () => arrive.progress(1).kill(),
            invalidateOnRefresh: true,
          },
        })
        tl.fromTo(state, { o: 0.07 }, { o: 1, onUpdate: draw }, 0)
          .fromTo('.dh-eye__plate', { scale: 1.35 }, { scale: 1 }, 0)
          .fromTo('.dh-eye__shade', { opacity: 0.55 }, { opacity: 0 }, 0)

        draw()
        const onRefresh = () => draw()
        ScrollTrigger.addEventListener('refresh', onRefresh)
        return () => {
          ScrollTrigger.removeEventListener('refresh', onRefresh)
          if (lid.current) lid.current.style.clipPath = ''
        }
      })
      return () => mm.revert()
    },
    { scope: root },
  )

  return (
    <section ref={root} className="dh-eye" aria-label="Dhadhas">
      <div className="dh-eye__stage">
        <div ref={lid} className="dh-eye__lid">
          <Plate image={image} alt="" seed={33} horizon={0.62} priority className="dh-eye__plate" />
          <div className="dh-eye__shade" aria-hidden="true" />
        </div>
        <svg ref={svg} className="dh-eye__edge" aria-hidden="true" preserveAspectRatio="none">
          <path ref={outline} />
        </svg>
        <p className="dh-eye__hint" aria-hidden="true">
          <span className="dh-eye__hint-line" />
          Scroll to open
        </p>
      </div>
    </section>
  )
}
