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
 * with the page, blinking now and then. With reduced motion the eye is simply shown open.
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
        const state = { o: 0, blink: 0 } // blink: 0 = lids where the scroll put them, 1 = shut
        const draw = () => {
          const w = lid.current.clientWidth
          const h = lid.current.clientHeight
          const d = eyePath(w, h, state.o * (1 - state.blink))
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

        // blinking: while the eye is open and on screen, a quick blink every few seconds
        // (now and then a double blink); it pauses when the eye is scrolled out of view
        let visible = true
        let timer = null
        const blink = () => {
          const twice = Math.random() < 0.25
          const tl = gsap.timeline({ onUpdate: draw, onComplete: schedule })
          tl.to(state, { blink: 1, duration: 0.12, ease: 'power2.in' }).to(state, { blink: 0, duration: 0.22, ease: 'power2.out' }, '+=0.04')
          if (twice) tl.to(state, { blink: 1, duration: 0.1, ease: 'power2.in' }, '+=0.14').to(state, { blink: 0, duration: 0.22, ease: 'power2.out' }, '+=0.03')
        }
        function schedule() {
          timer = gsap.delayedCall(2.4 + Math.random() * 3, () => (visible && state.o > 0.3 ? blink() : schedule()))
        }
        schedule()
        const seen = ScrollTrigger.create({
          trigger: root.current,
          start: 'top bottom',
          end: 'bottom top',
          onToggle: (self) => (visible = self.isActive),
        })

        draw()
        const onRefresh = () => draw()
        ScrollTrigger.addEventListener('refresh', onRefresh)
        return () => {
          timer?.kill()
          seen.kill()
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
