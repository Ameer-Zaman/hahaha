import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { site } from '../../config/site'
import { preloadHomeAssets, releasePreload, usePreloadProgress } from '../../lib/preload'
import './loading-screen.css'

/**
 * The loading screen shown when the homepage is opened: the name, a progress bar and a
 * percentage while the homepage's videos, images and sounds download. It ends as soon as
 * everything is ready (never sooner than MIN_MS, so it doesn't flash, and never later than
 * MAX_MS, after which anything unfinished streams as usual) and hands over to the welcome
 * screen. Returning visitors load from the browser's saved copies, so it's brief for them.
 */
const MIN_MS = 900
const MAX_MS = 12000
const EXIT_MS = 600

export default function LoadingScreen({ onLeave, onDone }) {
  const { progress, done } = usePreloadProgress()
  const [shown, setShown] = useState(0) // the number on screen, easing towards `progress`
  const [leaving, setLeaving] = useState(false)
  const target = useRef(progress)
  const onDoneRef = useRef(onDone)
  const onLeaveRef = useRef(onLeave)

  useEffect(() => {
    target.current = done ? 1 : progress
  }, [progress, done])
  useEffect(() => {
    onDoneRef.current = onDone
    onLeaveRef.current = onLeave
  }, [onDone, onLeave])

  useEffect(() => {
    preloadHomeAssets()
    // a smooth count up, timed by the clock (not by frames, which slow down on busy phones):
    // it closes most of the gap quickly and never jumps or runs backwards
    let raf = 0
    let value = 0
    let last = performance.now()
    const tick = (now) => {
      const dt = Math.min(100, now - last) / 1000
      last = now
      const gap = target.current - value
      value = Math.min(target.current, value + gap * dt * 8 + dt * 0.4)
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

  // everything downloaded and the counter has reached 100: leave (after MIN_MS at the earliest)
  useEffect(() => {
    if (!done || shown < 1 || leaving) return undefined
    const wait = Math.max(0, MIN_MS - performance.now()) // performance.now() = time since the page opened
    const timer = setTimeout(() => setLeaving(true), wait)
    return () => clearTimeout(timer)
  }, [done, shown, leaving])

  useEffect(() => {
    if (!leaving) return undefined
    releasePreload() // anything still downloading streams normally from here
    onLeaveRef.current?.() // the welcome screen starts its entrance underneath, as this fades
    const timer = setTimeout(() => onDoneRef.current?.(), EXIT_MS)
    return () => clearTimeout(timer)
  }, [leaving])

  const pct = Math.round(shown * 100)

  return createPortal(
    <div className={`loader ${leaving ? 'is-leaving' : ''}`} role="progressbar" aria-label={`Loading ${site.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <div className="loader__inner">
        <p className="loader__name">{site.name}</p>
        <div className="loader__bar" aria-hidden="true">
          <span style={{ transform: `scaleX(${shown})` }} />
        </div>
        <div className="loader__meta" aria-hidden="true">
          <span>{pct < 100 ? 'Loading assets' : 'Ready'}</span>
          <span className="loader__pct">{String(pct).padStart(3, '0')}%</span>
        </div>
      </div>
    </div>,
    document.body,
  )
}
