import { useEffect, useId, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

const isIn = (pathname, to) => pathname === to || pathname.startsWith(`${to}/`)

function Chevron() {
  return (
    <svg className="nav-chevron" viewBox="0 0 10 6" width="10" height="6" aria-hidden="true">
      <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * Desktop dropdown (e.g. Factions → Gangs, Clubs). Opens on hover with a mouse, and on
 * click / Enter / Space / ↓ for everyone; Escape or clicking elsewhere closes it.
 */
export function NavDropdown({ item }) {
  const { pathname } = useLocation()
  // the open state belongs to the page it was opened on, so navigating closes it
  const [openOn, setOpenOn] = useState(null)
  const open = openOn === pathname
  const setOpen = (next) => setOpenOn(next ? pathname : null)
  const root = useRef(null)
  const button = useRef(null)
  const closeTimer = useRef(0)
  const id = useId()
  const active = item.children.some((c) => isIn(pathname, c.to))

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => {
      if (!root.current?.contains(e.target)) setOpenOn(null)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpenOn(null)
        button.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => () => window.clearTimeout(closeTimer.current), [])

  const hoverOpen = (e) => {
    if (e.pointerType !== 'mouse') return
    window.clearTimeout(closeTimer.current)
    setOpenOn(pathname)
  }
  const hoverClose = (e) => {
    if (e.pointerType !== 'mouse') return
    window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => setOpenOn(null), 180)
  }

  return (
    <div
      ref={root}
      className={`nav-dd ${open ? 'is-open' : ''}`}
      onPointerEnter={hoverOpen}
      onPointerLeave={hoverClose}
      onBlur={(e) => {
        if (!root.current?.contains(e.relatedTarget)) setOpenOn(null)
      }}
    >
      <button
        ref={button}
        type="button"
        className={`site-nav__link nav-dd__trigger ${active ? 'active' : ''}`}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setOpen(true)
            requestAnimationFrame(() => root.current?.querySelector('.nav-dd__link')?.focus())
          }
        }}
      >
        {item.label}
        <Chevron />
      </button>
      <div id={id} className="nav-dd__panel" inert={!open}>
        <ul role="list" className="nav-dd__list">
          {item.children.map((child, i) => (
            <li key={child.to}>
              <NavLink to={child.to} className="nav-dd__link" onClick={() => setOpenOn(null)}>
                <span className="nav-dd__num" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="nav-dd__text">
                  <span className="nav-dd__label">{child.label}</span>
                  {child.hint && <span className="nav-dd__hint">{child.hint}</span>}
                </span>
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/** Phone menu: the group's name opens and closes its links, in the same plain style. */
export function MobileNavGroup({ item }) {
  const { pathname } = useLocation()
  const active = item.children.some((c) => isIn(pathname, c.to))
  const [open, setOpen] = useState(active)
  const id = useId()
  return (
    <div className={`mobile-group ${open ? 'is-open' : ''}`}>
      <button
        type="button"
        className={`mobile-menu__link mobile-group__trigger ${active ? 'active' : ''}`}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        {item.label}
        <Chevron />
      </button>
      <div id={id} className="mobile-group__panel" inert={!open}>
        <ul role="list" className="mobile-group__list">
          {item.children.map((child) => (
            <li key={child.to}>
              <NavLink to={child.to} className="mobile-group__link">
                {child.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
