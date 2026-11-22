import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { navigation } from '../../config/site'
import './faction-transition.css'

/**
 * A cut-scene between pages when a visitor heads into the Factions (Gangs, Clubs, Dhadhas,
 * Leaderboard): slanted bands of gold and black sweep across and cover the screen, the page's
 * name is stamped in the middle, and the bands carry on across to uncover the new page.
 *
 * It catches clicks on any link into a Factions page (the menu, the footer, cards …), plays the
 * cover, then changes page underneath, waits for the page to load (it loads on demand), and
 * plays the reveal. Back/forward, opening in a new tab, and reduced motion skip it.
 */
const COVER_MS = 560
const HOLD_MS = 520 // the least time the name is on screen
const MAX_WAIT_MS = 2500 // never hold longer than this waiting for a slow page
const REVEAL_MS = 680

const group = navigation.find((item) => item.label === 'Factions' || item.children?.some((c) => c.to === '/gangs'))
const FACTIONS = (group?.children ?? []).map((c, i, all) => ({ ...c, index: i + 1, total: all.length }))

const sectionOf = (path) => `/${(path || '/').split('/')[1] ?? ''}`
const factionFor = (path) => FACTIONS.find((f) => f.to === sectionOf(path))

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** Resolves once the new page has replaced the "loading page" placeholder (or after `max`). */
function pageReady(max) {
  return new Promise((resolve) => {
    const start = performance.now()
    const check = () => {
      const loading = document.querySelector('#main .route-loading')
      if (!loading || performance.now() - start > max) resolve()
      else setTimeout(check, 60)
    }
    check()
  })
}

export default function FactionTransition() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [scene, setScene] = useState(null) // { faction, phase: 'cover' | 'reveal' }
  const busy = useRef(false)
  const here = useRef(pathname)
  useEffect(() => {
    here.current = pathname
  }, [pathname])

  useEffect(() => {
    const onClick = async (e) => {
      if (busy.current || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const link = e.target.closest?.('a[href]')
      if (!link || (link.target && link.target !== '_self') || link.hasAttribute('download')) return
      const url = new URL(link.href, window.location.href)
      if (url.origin !== window.location.origin) return
      const faction = factionFor(url.pathname)
      // only on the way into a Factions page from somewhere else (not within the same one)
      if (!faction || sectionOf(here.current) === faction.to || reducedMotion()) return

      e.preventDefault()
      e.stopPropagation() // the link's own router handler would change page at once
      busy.current = true
      setScene({ faction, phase: 'cover' })
      await wait(COVER_MS)
      navigate(url.pathname + url.search + url.hash)
      await Promise.all([wait(HOLD_MS), pageReady(MAX_WAIT_MS)])
      setScene({ faction, phase: 'reveal' })
      await wait(REVEAL_MS)
      setScene(null)
      busy.current = false
    }
    // capture: runs before the router's own click handling
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [navigate])

  if (!scene) return null
  const { faction, phase } = scene
  const pad = (n) => String(n).padStart(2, '0')
  return (
    <div className={`fx-cut is-${phase}`} aria-hidden="true">
      <span className="fx-cut__band fx-cut__band--gold" />
      <span className="fx-cut__band fx-cut__band--bronze" />
      <span className="fx-cut__band fx-cut__band--ink" />
      <div className="fx-cut__title">
        <p className="fx-cut__eyebrow">
          <span>{group?.label ?? 'Factions'}</span>
          <span>
            {pad(faction.index)} / {pad(faction.total)}
          </span>
        </p>
        <h2 className="fx-cut__name" style={{ '--len': faction.label.length }}>
          {[...faction.label].map((ch, i) => (
            <span key={i} style={{ '--i': i }}>
              <span>{ch === ' ' ? ' ' : ch}</span>
            </span>
          ))}
        </h2>
        <span className="fx-cut__rule" />
        {faction.hint && <p className="fx-cut__hint">{faction.hint}</p>}
      </div>
    </div>
  )
}
