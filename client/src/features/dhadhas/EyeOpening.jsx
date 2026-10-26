import { useRef } from 'react'

import Plate from '../../components/media/Plate'
import { gsap, MOTION_OK, ScrollTrigger, useGSAP } from '../../lib/gsap'

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)

/**
 * The eye's outline for a w × h screen at openness `o` (0 = shut, 1 = fully open):
 * two curves meeting at the corners of the eye. The picture stays inside the eye.
 */
function eyePath(w, h, o) {
  const cx = w / 2
  const cy = h / 2
  const phone = w < 640
  const half = (phone ? 0.47 : 0.4) * w // half the eye's width
  // how far the lids open: an almond, as tall as the screen allows
  const maxPull = Math.min(half * (phone ? 1.05 : 0.8), h * 0.9)
  const pull = h * 0.004 + (maxPull - h * 0.004) * easeInOut(clamp01(o))
  const l = cx - half
  const r = cx + half
  return `M${l} ${cy} Q${cx} ${cy - pull} ${r} ${cy} Q${cx} ${cy + pull} ${l} ${cy} Z`
}

/**
 * The opening of the Dhadhas page: a closed eye, a thin gold line. Scrolling opens it —
 * the lids part and the picture inside comes into focus — then the open eye scrolls away
 * with the page. With reduced motion the eye is simply shown open.
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
          root.current.style.setProperty('--hint', String(1 - clamp01((state.o - 0.07) / 0.08))) // goes at the first scroll
        }

        // arrival: the eye flickers open a crack, inviting the scroll
        const arrive = gsap.fromTo(state, { o: 0 }, { o: 0.07, duration: 1.1, delay: 0.4, ease: 'power2.inOut', onUpdate: draw })

        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: root.current,
            start: 'top top',
            end: '+=110%',
            pin: '.dh-eye__stage',
            scrub: 0.8,
            onEnter: () => arrive.progress(1).kill(),
            invalidateOnRefresh: true,
          },
        })
        tl.fromTo(state, { o: 0.07 }, { o: 1, onUpdate: draw }, 0)
          .fromTo('.dh-eye__plate', { scale: 1.3 }, { scale: 1.05 }, 0)
          .fromTo('.dh-eye__shade', { opacity: 1 }, { opacity: 0.35 }, 0)

        draw()
        const onRefresh = () => draw()
        ScrollTrigger.addEventListener('refresh', onRefresh)
        return () => {
          ScrollTrigger.removeEventListener('refresh', onRefresh)
          if (lid.current) lid.current.style.clipPath = ''
        }
      })
      mm.add('(prefers-reduced-motion: reduce)', () => {
        const draw = () => {
          const w = lid.current.clientWidth
          const h = lid.current.clientHeight
          const d = eyePath(w, h, 1)
          lid.current.style.clipPath = `path('${d}')`
          svg.current.setAttribute('viewBox', `0 0 ${w} ${h}`)
          outline.current.setAttribute('d', d)
        }
        draw()
        window.addEventListener('resize', draw)
        return () => window.removeEventListener('resize', draw)
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
