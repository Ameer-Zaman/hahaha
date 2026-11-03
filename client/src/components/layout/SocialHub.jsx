import { useEffect, useId, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

import BrandMark from '../ui/BrandMark'
import SocialIcon from '../ui/SocialIcon'

/**
 * The community links in the header: one small button that drops down a little "platform"
 * — the server's mark in the middle, every link's logo on a ring around it. The links come
 * from Panel → Sections & maintenance → Community links.
 */
export default function SocialHub({ links }) {
  // open belongs to the page it was opened on, so moving to another page closes it
  const { pathname } = useLocation()
  const [openOn, setOpenOn] = useState(null)
  const open = openOn === pathname
  const root = useRef(null)
  const trigger = useRef(null)
  const panelId = useId()

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
    <div ref={root} className={`hub ${open ? 'is-open' : ''}`} style={{ '--n': links.length }}>
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
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="12" cy="12" r="3.2" />
          <circle cx="12" cy="12" r="8.5" className="hub__trigger-orbit" />
          <circle cx="12" cy="3.5" r="1.7" className="hub__trigger-dot" />
          <circle cx="19.4" cy="16.2" r="1.7" className="hub__trigger-dot" />
          <circle cx="4.6" cy="16.2" r="1.7" className="hub__trigger-dot" />
        </svg>
      </button>

      <div id={panelId} className="hub__panel" inert={!open} aria-label="Community links">
        <div className="hub__orbit">
          <span className="hub__ring" aria-hidden="true" />
          <span className="hub__core" aria-hidden="true">
            <BrandMark />
          </span>
          <ul role="list" className="hub__list">
            {links.map((link, i) => (
              <li key={`${link.id}-${i}`} className="hub__item" style={{ '--i': i }}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hub__link"
                  aria-label={`${link.label} (opens in a new tab)`}
                  title={link.label}
                >
                  <SocialIcon id={link.id} size={18} />
                </a>
              </li>
            ))}
          </ul>
        </div>
        <p className="hub__caption">Find us on</p>
      </div>
    </div>
  )
}
