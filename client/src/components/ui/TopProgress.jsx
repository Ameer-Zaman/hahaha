import { useEffect, useRef, useState } from 'react'

import { useIsLoading } from '../../lib/loading'
import './loading.css'

/**
 * The gold line along the top of the screen while a page or its data loads: it trickles
 * forward (never quite finishing on its own), then completes and fades once everything is in.
 * Brief loads under ~150 ms don't show it at all.
 */
export default function TopProgress() {
  const loading = useIsLoading()
  const [state, setState] = useState({ visible: false, value: 0 })
  const timers = useRef([])

  useEffect(() => {
    const clear = () => {
      timers.current.forEach(clearTimeout)
      timers.current.forEach(clearInterval)
      timers.current = []
    }
    clear()
    if (loading) {
      const show = setTimeout(() => {
        setState({ visible: true, value: 0.12 })
        const trickle = setInterval(() => setState((s) => ({ visible: true, value: s.value + (0.92 - s.value) * 0.12 })), 280)
        timers.current.push(trickle)
      }, 150)
      timers.current.push(show)
    } else {
      // finish the line, then fade it (scheduled, so it never fires mid-render)
      timers.current.push(setTimeout(() => setState((s) => (s.visible ? { visible: true, value: 1 } : s)), 0))
      timers.current.push(setTimeout(() => setState({ visible: false, value: 0 }), 420))
    }
    return clear
  }, [loading])

  return (
    <div className={`top-progress ${state.visible ? 'is-visible' : ''}`} aria-hidden="true">
      <span style={{ transform: `scaleX(${state.value})` }} />
    </div>
  )
}
