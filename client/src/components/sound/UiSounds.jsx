import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

import { clickSound, closeSound, hoverSound, openSound, pageSound } from '../../lib/uiSound'

// what counts as "something you can click" for the hover and click sounds
const TARGETS =
  'a[href], button:not(:disabled), [role="button"], [role="tab"], summary, select, label:has(input[type="checkbox"]), input[type="checkbox"]'

/**
 * Plays the interface sounds for the whole public site from a few document-wide listeners,
 * so no button needs wiring: hover (mouse only), click, open/close for anything with
 * aria-expanded, and a page sweep when the route changes. Silent while the sound is off.
 */
export default function UiSounds() {
  const { pathname } = useLocation()
  const first = useRef(true)

  useEffect(() => {
    let current = null
    const onOver = (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return
      const el = e.target.closest?.(TARGETS)
      if (el === current) return
      current = el
      if (el) hoverSound()
    }
    const onClick = (e) => {
      const el = e.target.closest?.(TARGETS)
      if (!el) return
      // read before the click is handled: an element about to open plays the whoosh instead
      const expanded = el.getAttribute('aria-expanded')
      if (expanded === 'false') openSound()
      else if (expanded === 'true') closeSound()
      else clickSound()
    }
    document.addEventListener('pointerover', onOver, { passive: true })
    document.addEventListener('click', onClick, { capture: true, passive: true })
    return () => {
      document.removeEventListener('pointerover', onOver)
      document.removeEventListener('click', onClick, { capture: true })
    }
  }, [])

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    pageSound()
  }, [pathname])

  return null
}
