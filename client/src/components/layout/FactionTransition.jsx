import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { navigation } from '../../config/site'
import './faction-transition.css'

/**
 * Cut-scenes between pages when a visitor heads into one of the menu's groups, each group with
 * its own look:
 *  - Factions (Gangs, Clubs, Dhadhas, Leaderboard), "bands": slanted bands of gold and black
 *    sweep across and cover the screen, the page's name is stamped in, and the bands carry on
 *    across to uncover the new page.
 *  - Community (Staffs, Creators, Events, Updates, Gallery), "burst": circles of gold, bronze
 *    and black burst out from where the visitor clicked, the name gathers in the middle, and the
 *    circles rise away like bubbles to uncover the page.
 *
 * It catches clicks on any link into those pages (the menus, the footer, cards …), plays the
 * cover, then changes page underneath, waits for the page to load (it loads on demand), and
 * plays the reveal. Back/forward, opening in a new tab, and reduced motion skip it.
 */
const STYLES = {
  bands: { cover: 560, reveal: 680 },
  burst: { cover: 600, reveal: 720 },
}
const HOLD_MS = 520 // the least time the name is on screen
const MAX_WAIT_MS = 2500 // never hold longer than this waiting for a slow page

// which menu groups get a cut-scene, and which look (matched by a page each group contains,
// so renaming a group in config/site.js doesn't lose it)
const GROUPS = [
  { has: '/gangs', style: 'bands' },
  { has: '/staff', style: 'burst' },
]
const PAGES = GROUPS.flatMap(({ has, style }) => {
  const group = navigation.find((item) => item.children?.some((c) => c.to === has))
  return (group?.children ?? []).map((c, i, all) => ({ ...c, group: group.label, style, index: i + 1, total: all.length }))
})

const sectionOf = (path) => `/${(path || '/').split('/')[1] ?? ''}`
const factionFor = (path) => PAGES.find((f) => f.to === sectionOf(path))
const DISC = 600 // the burst's circles are drawn this size and scaled up to cover the screen

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
      // the burst starts where the visitor clicked (a keyboard "click" has no point: the middle)
      const w = window.innerWidth
      const h = window.innerHeight
      const keyboard = e.detail === 0
      const x = keyboard ? w / 2 : e.clientX
      const y = keyboard ? h / 2 : e.clientY
      const r = Math.hypot(Math.max(x, w - x), Math.max(y, h - y)) + 4 // to the farthest corner
      const geo = { x, y, k: r / (DISC / 2), rise: -(y + r + 24) }
      const { cover, reveal } = STYLES[faction.style]
      setScene({ faction, geo, phase: 'cover' })
      await wait(cover)
      navigate(url.pathname + url.search + url.hash)
      await Promise.all([wait(HOLD_MS), pageReady(MAX_WAIT_MS)])
      setScene({ faction, geo, phase: 'reveal' })
      await wait(reveal)
      setScene(null)
      busy.current = false
    }
    // capture: runs before the router's own click handling
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [navigate])

  if (!scene) return null
  const { faction, geo, phase } = scene
  const pad = (n) => String(n).padStart(2, '0')
  const mid = (faction.label.length - 1) / 2
  const discs = {
    left: geo.x - DISC / 2,
    top: geo.y - DISC / 2,
    width: DISC,
    height: DISC,
    '--k': geo.k,
    '--rise': `${geo.rise}px`,
  }
  return (
    <div className={`fx-cut fx-cut--${faction.style} is-${phase}`} aria-hidden="true">
      {faction.style === 'burst' ? (
        <>
          <span className="fx-cut__disc fx-cut__disc--gold" style={discs} />
          <span className="fx-cut__disc fx-cut__disc--bronze" style={discs} />
          <span className="fx-cut__disc fx-cut__disc--ink" style={discs} />
        </>
      ) : (
        <>
          <span className="fx-cut__band fx-cut__band--gold" />
          <span className="fx-cut__band fx-cut__band--bronze" />
          <span className="fx-cut__band fx-cut__band--ink" />
        </>
      )}
      <div className="fx-cut__title">
        <p className="fx-cut__eyebrow">
          <span>{faction.group}</span>
          <span>
            {pad(faction.index)} / {pad(faction.total)}
          </span>
        </p>
        <h2 className="fx-cut__name" style={{ '--len': faction.label.length }}>
          {[...faction.label].map((ch, i) => (
            <span key={i} style={{ '--i': i, '--from-mid': Math.abs(i - mid) }}>
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
