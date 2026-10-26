import { useEffect, useRef, useState } from 'react'

import './fluid-cursor.css'

/**
 * The gold smoke that follows the mouse, on every page. Only with a mouse (not touch),
 * only when the visitor allows motion, and loaded after the page is ready so it never
 * slows the first paint. If the browser can't run it, nothing is shown.
 */
const canRun = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
  window.matchMedia('(prefers-reduced-motion: no-preference)').matches &&
  !navigator.connection?.saveData

export default function FluidCursor() {
  const canvas = useRef(null)
  const [enabled] = useState(canRun)

  useEffect(() => {
    if (!enabled) return undefined
    let fluid = null
    let cancelled = false
    const start = () => {
      window.removeEventListener('pointermove', start)
      import('./fluid').then(({ createFluid }) => {
        if (cancelled || !canvas.current) return
        try {
          fluid = createFluid(canvas.current)
        } catch {
          fluid = null // shaders not supported: quietly skip
        }
        if (!fluid) canvas.current.hidden = true
      })
    }
    // load on the first mouse movement: nothing to download for visitors who never move it
    window.addEventListener('pointermove', start, { passive: true })
    return () => {
      cancelled = true
      window.removeEventListener('pointermove', start)
      fluid?.dispose()
    }
  }, [enabled])

  if (!enabled) return null
  return <canvas ref={canvas} className="fluid-cursor" aria-hidden="true" />
}
