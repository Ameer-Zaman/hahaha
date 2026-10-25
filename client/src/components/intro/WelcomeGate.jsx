import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import '@fontsource/cinzel/latin-500.css'
import { site } from '../../config/site'
import { enterSite, markIntroSeen } from '../../lib/intro'
import { createRipple, paintWelcome } from './rippleRenderer'
import './welcome-gate.css'

const COMMIT_AT = 0.26 // past this, the wave carries on by itself
const GLIDE_MS = 1600 // once committed, the wave finishes on the clock, the same on any device

const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2

/**
 * The welcome screen: royal and minimal — "Welcome to", the name, a gold hairline.
 *
 * Scrolling drives a water-drop wave that spreads from the centre and dissolves the screen
 * into the site. A little scroll moves the wave and lets it settle back; past a point it
 * glides through on its own. Click / tap, Enter, Space or the arrow keys enter as well.
 *
 * Without WebGL, or with reduced motion, the same text simply fades away.
 */
export default function WelcomeGate({ onDone }) {
  const rootRef = useRef(null)
  const canvasRef = useRef(null)
  const buttonRef = useRef(null)
  const hintRef = useRef(null)
  const rippleRef = useRef(null)
  const [initialMode] = useState(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'fade' : 'pending',
  )
  const modeRef = useRef(initialMode)
  const onDoneRef = useRef(onDone)
  const state = useRef({ target: 0, current: 0, committed: false, lastInput: 0, done: false, glideFrom: 0, glideAt: 0 })
  const [mode, setMode] = useState(initialMode) // pending → ripple | fade
  const [fading, setFading] = useState(false)

  useEffect(() => {
    onDoneRef.current = onDone
  }, [onDone])

  const switchMode = (next) => {
    modeRef.current = next
    setMode(next)
  }

  /* page behind: inert and not scrollable while the welcome screen is up */
  useEffect(() => {
    const app = document.getElementById('root')
    app?.setAttribute('inert', '')
    const prev = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    // No autofocus: the screen stays text-only. Keys work anyway, and Tab reveals the button.
    return () => {
      app?.removeAttribute('inert')
      document.documentElement.style.overflow = prev
    }
  }, [])

  /* set up the water renderer once the royal typeface is ready */
  useEffect(() => {
    if (modeRef.current === 'fade') return undefined
    let cancelled = false
    const fontReady = document.fonts?.load('500 64px Cinzel') ?? Promise.resolve()
    const timeout = new Promise((resolve) => setTimeout(resolve, 1500))
    Promise.race([fontReady, timeout]).then(() => {
      if (cancelled || !canvasRef.current) return
      const ripple = createRipple(canvasRef.current, paintWelcome(site.name))
      if (!ripple) {
        switchMode('fade')
        return
      }
      rippleRef.current = ripple
      switchMode('ripple')
    })
    return () => {
      cancelled = true
      rippleRef.current?.dispose()
      rippleRef.current = null
    }
  }, [])

  /* handlers built once; they read live values from refs, so they never go stale */
  const [actionsObj] = useState(() => {
    const a = {
      finish() {
        const s = state.current
        if (s.done) return
        s.done = true
        onDoneRef.current?.()
        requestAnimationFrame(() => document.getElementById('main')?.focus({ preventScroll: true }))
      },
      commit() {
        const s = state.current
        if (s.committed) return
        s.committed = true
        s.glideFrom = s.current
        s.glideAt = performance.now()
        markIntroSeen()
        if (hintRef.current) {
          hintRef.current.style.transition = 'opacity 250ms ease-out'
          hintRef.current.style.opacity = '0'
        }
        enterSite() // the hero begins its entrance as the wave reveals it
        if (modeRef.current !== 'ripple') {
          setFading(true)
          setTimeout(() => a.finish(), 650)
        }
      },
      push(amount) {
        const s = state.current
        if (s.committed) return
        if (modeRef.current !== 'ripple') {
          if (amount > 0) a.commit()
          return
        }
        s.lastInput = performance.now()
        s.target = Math.min(1, Math.max(0, s.target + amount))
        if (s.target >= COMMIT_AT) a.commit()
      },
    }
    return a
  })
  const actions = useRef(actionsObj)

  /* the progress loop: eases toward the scroll target; recedes if the visitor stops early */
  useEffect(() => {
    if (mode !== 'ripple') return undefined
    let raf = 0
    let last = performance.now()
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const s = state.current
      if (s.committed) {
        const t = Math.min(1, (now - s.glideAt) / (GLIDE_MS * (1 - s.glideFrom * 0.5)))
        s.current = s.glideFrom + (1 - s.glideFrom) * easeInOutSine(t)
      } else {
        if (now - s.lastInput > 260) s.target = Math.max(0, s.target - dt * 0.6)
        s.current += (s.target - s.current) * (1 - Math.exp(-dt * 7))
      }
      rippleRef.current?.setProgress(s.current)
      if (hintRef.current) hintRef.current.style.opacity = String(Math.max(0, 1 - s.current * 9))
      if (s.committed && s.current >= 0.999) {
        actions.current.finish()
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [mode])

  /* input: wheel, touch drag and keys */
  useEffect(() => {
    const root = rootRef.current
    if (!root) return undefined
    const onWheel = (event) => {
      event.preventDefault()
      const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1
      actions.current.push((event.deltaY * scale) / 1400)
    }
    let touchY = null
    const onTouchStart = (event) => {
      touchY = event.touches[0].clientY
    }
    const onTouchMove = (event) => {
      if (touchY === null) return
      event.preventDefault()
      const y = event.touches[0].clientY
      actions.current.push((touchY - y) / 520)
      touchY = y
    }
    const onKey = (event) => {
      if (['Enter', ' ', 'ArrowDown', 'PageDown', 'End', 'Escape'].includes(event.key)) {
        event.preventDefault()
        actions.current.commit()
      }
      if (event.key === 'Tab') {
        // Keep focus on the welcome screen's only control (and reveal it for keyboard users).
        event.preventDefault()
        buttonRef.current?.focus()
      }
    }
    root.addEventListener('wheel', onWheel, { passive: false })
    root.addEventListener('touchstart', onTouchStart, { passive: true })
    root.addEventListener('touchmove', onTouchMove, { passive: false })
    document.addEventListener('keydown', onKey)
    return () => {
      root.removeEventListener('wheel', onWheel)
      root.removeEventListener('touchstart', onTouchStart)
      root.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  return createPortal(
    <div
      ref={rootRef}
      className={`gate gate--${mode} ${fading ? 'is-fading' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="gate-title"
      onClick={() => actions.current.commit()}
    >
      {/* The real text: shown as-is without WebGL; under the water canvas otherwise */}
      <div className="gate__card">
        <p className="gate__kicker">Welcome to</p>
        <h2 id="gate-title" className="gate__name">
          {site.name}
        </h2>
        <span className="gate__rule" aria-hidden="true">
          <span />
        </span>
      </div>

      <canvas ref={canvasRef} className="gate__water" aria-hidden="true" />

      <div ref={hintRef} className="gate__hint" aria-hidden="true">
        <span className="gate__hint-line" />
        <span>Scroll to enter</span>
      </div>

      <button ref={buttonRef} type="button" className="gate__enter" onClick={() => actions.current.commit()}>
        Enter the city
      </button>
    </div>,
    document.body,
  )
}
