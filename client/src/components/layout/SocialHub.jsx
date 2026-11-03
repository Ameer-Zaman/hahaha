import { useEffect, useId, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

import SocialIcon from '../ui/SocialIcon'

const CYCLE_MS = 1900
const motionOk = () => typeof window === 'undefined' || !window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * The community links in the header: a small button where the links' logos take turns coming
 * to the centre, one at a time; clicking it drops down a plain see-through list of the links,
 * one under another. The links come from Panel → Sections & maintenance → Community links.
 */
export default function SocialHub({ links }) {
  // open belongs to the page it was opened on, so moving to another page closes it
  const { pathname } = useLocation()
  const [openOn, setOpenOn] = useState(null)
  const open = openOn === pathname
  const root = useRef(null)
  const trigger = useRef(null)
  const panelId = useId()

  // which logo is in the centre of the button; it steps to the next one on a gentle timer
  const [active, setActive] = useState(0)
  useEffect(() => {
    if (links.length <= 1 || !motionOk()) return undefined
    const timer = setInterval(() => setActive((i) => (i + 1) % links.length), CYCLE_MS)
    return () => clearInterval(timer)
  }, [links.length])

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => {
      if (!root.current?.contains(e.target)) setOpenOn(null)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpenOn(null)
        trigger.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (links.length === 0) return null

  return (
    <div ref={root} className={`hub ${open ? 'is-open' : ''}`}>
      <button
        ref={trigger}
        type="button"
        className="hub__trigger"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? 'Close community links' : 'Community links'}
        title="Community"
        onClick={() => setOpenOn((cur) => (cur === pathname ? null : pathname))}
      >
        {/* the logos take turns in the centre, one fading out as the next fades in */}
        <span className="hub__mini" aria-hidden="true">
          {links.map((link, i) => (
            <span key={`${link.id}-${i}`} className={`hub__spot ${i === active ? 'is-active' : ''}`}>
              <SocialIcon id={link.id} size={18} />
            </span>
          ))}
        </span>
      </button>

      <div id={panelId} className="hub__panel" inert={!open} aria-label="Community links">
        <ul role="list" className="hub__list">
          {links.map((link, i) => (
            <li key={`${link.id}-${i}`} className="hub__item" style={{ '--i': i }}>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hub__link"
                aria-label={`${link.label} (opens in a new tab)`}
              >
                <span className="hub__logo" aria-hidden="true">
                  <SocialIcon id={link.id} size={18} />
                </span>
                <span className="hub__name">{link.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
