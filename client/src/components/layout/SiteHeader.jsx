import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'

import { applyLink, communityLinks, navigation, site } from '../../config/site'
import Arrow from '../ui/Arrow'
import BrandMark from '../ui/BrandMark'
import SocialIcon from '../ui/SocialIcon'
import './header.css'
import ApplyLink from '../ui/ApplyLink'
import MusicButton from '../ui/MusicButton'
import { MobileNavGroup, NavDropdown } from './NavDropdown'

const socials = communityLinks.filter((link) => link.url).slice(0, 3)
const YEAR = new Date().getFullYear()

/**
 * Fixed header. Transparent over the first screen, solid black once the visitor scrolls.
 * `tone` sets text contrast while transparent ('dark' page top → light text).
 *
 * It tucks away while the visitor scrolls down through content and returns the moment they
 * scroll up — but never hides near the top, while the menu is open, or while it has focus.
 */
export default function SiteHeader({ tone = 'dark' }) {
  const [scrolled, setScrolled] = useState(false)
  const [tucked, setTucked] = useState(false)
  const headerRef = useRef(null)
  const { pathname } = useLocation()
  // The menu belongs to the page it was opened on, so navigating closes it without an effect.
  const [openOn, setOpenOn] = useState(null)
  const open = openOn === pathname
  const setOpen = (next) => setOpenOn(next ? pathname : null)
  const toggleRef = useRef(null)
  const menuRef = useRef(null)

  useEffect(() => {
    let lastY = window.scrollY
    let frame = 0
    const update = () => {
      frame = 0
      const y = window.scrollY
      const delta = y - lastY
      setScrolled(y > 24)
      if (Math.abs(delta) > 6) {
        const focusInside = headerRef.current?.contains(document.activeElement)
        setTucked(delta > 0 && y > window.innerHeight * 0.6 && !focusInside)
        lastY = y
      }
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  // Mobile menu: lock page scroll, close on Escape, keep focus inside while open.
  useEffect(() => {
    if (!open) return undefined
    const menu = menuRef.current
    const focusables = menu?.querySelectorAll('a, button')
    focusables?.[0]?.focus()
    document.body.style.overflow = 'hidden'

    const onKey = (event) => {
      if (event.key === 'Escape') {
        setOpenOn(null)
        toggleRef.current?.focus()
      }
      if (event.key === 'Tab' && focusables?.length) {
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const solid = scrolled || open
  const className = [
    'site-header',
    solid ? 'is-solid' : `is-clear is-on-${tone}`,
    open ? 'is-open' : '',
    tucked && !open ? 'is-tucked' : '',
  ].join(' ')

  return (
    <header ref={headerRef} className={className} onFocus={() => setTucked(false)}>
      <div className="site-header__bar container">
        <Link to="/" className="site-header__brand" aria-label={`${site.name} — home`}>
          <BrandMark className="site-header__mark" />
          <span>{site.name}</span>
        </Link>

        <nav className="site-nav" aria-label="Main">
          <ul role="list" className="site-nav__list">
            {navigation.map((item) =>
              item.children ? (
                <li key={item.label}>
                  <NavDropdown item={item} />
                </li>
              ) : (
                <li key={item.to}>
                  <NavLink to={item.to} end={item.to === '/'} className="site-nav__link">
                    {item.label}
                  </NavLink>
                </li>
              ),
            )}
          </ul>
          {socials.length > 0 && (
            <ul role="list" className="site-nav__social">
              {socials.map((link) => (
                <li key={link.id}>
                  <a href={link.url} target="_blank" rel="noopener noreferrer" aria-label={link.label}>
                    <SocialIcon id={link.id} />
                  </a>
                </li>
              ))}
            </ul>
          )}
          <ApplyLink className="btn btn--primary site-nav__cta">{applyLink.label}</ApplyLink>
        </nav>

        <MusicButton className="site-header__music" />

        <button
          ref={toggleRef}
          type="button"
          className="site-header__toggle"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen(!open)}
        >
          <span className="visually-hidden">{open ? 'Close menu' : 'Open menu'}</span>
          <span className="site-header__toggle-bars" aria-hidden="true">
            <i />
            <i />
          </span>
        </button>
      </div>

      <div
        id="mobile-menu"
        ref={menuRef}
        className={`mobile-menu theme-black ${open ? 'is-open' : ''}`}
        inert={!open}
      >
        <nav aria-label="Main mobile" className="container mobile-menu__inner">
          <ul role="list" className="mobile-menu__list">
            {navigation.map((item, i) =>
              item.children ? (
                <li key={item.label} style={{ '--i': i }}>
                  <MobileNavGroup item={item} />
                </li>
              ) : (
                <li key={item.to} style={{ '--i': i }}>
                  <NavLink to={item.to} end={item.to === '/'} className="mobile-menu__link">
                    {item.label}
                  </NavLink>
                </li>
              ),
            )}
          </ul>
          <div className="mobile-menu__foot" style={{ '--i': navigation.length }}>
            <ApplyLink className="btn btn--primary btn--large mobile-menu__cta" onClick={() => setOpen(false)}>
              {applyLink.label} <Arrow />
            </ApplyLink>
            {socials.length > 0 && (
              <ul role="list" className="mobile-menu__socials">
                {socials.map((link) => (
                  <li key={link.id}>
                    <a href={link.url} target="_blank" rel="noopener noreferrer" aria-label={`${link.label} (opens in a new tab)`}>
                      <SocialIcon id={link.id} />
                      <span>{link.label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
            <p className="mobile-menu__small">
              © {YEAR} {site.name}
            </p>
          </div>
        </nav>
      </div>
    </header>
  )
}
