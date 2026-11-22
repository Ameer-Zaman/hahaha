import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { applyLink, navigation, site } from '../../config/site'
import { SITE_TOUR_EVENT as START } from '../../lib/siteTour'
import './site-tour.css'

/**
 * A short guided tour for first-time visitors, led by a little floating ghost bot: a spotlight
 * moves over the main parts of the site (the two menus, the rules, the players-in-the-city counter, the community links, the
 * bell, the music and the chat) with a card explaining each. Next / Back / Skip, or the arrow
 * keys and Esc. Steps whose part isn't on screen (a phone's collapsed menu, a counter that's
 * switched off) are left out; on phones the menu button gets a step of its own.
 *
 * It shows once per browser (remembered on this device only), after the welcome screen. The
 * footer's "Site tour" button plays it again.
 */
const DONE_KEY = 'rameirah:tour-done'

const remembered = () => {
  try {
    return localStorage.getItem(DONE_KEY) === '1'
  } catch {
    return false
  }
}
const remember = () => {
  try {
    localStorage.setItem(DONE_KEY, '1')
  } catch {
    /* private mode: it may show again next time, which is harmless */
  }
}

const groupHints = (label) =>
  navigation
    .find((n) => n.label === label)
    ?.children?.map((c) => c.label)
    .join(', ')

/** A nav dropdown's button, found by its label. */
const dropdown = (label) => () =>
  [...document.querySelectorAll('.site-nav .nav-dd__trigger')].find((b) => b.textContent.trim().startsWith(label))

const STEPS = [
  {
    title: `Welcome to ${site.name}`,
    text: 'A quick look around, so you know where everything is. It takes about 20 seconds.',
  },
  {
    find: () => document.querySelector('.site-header__toggle'),
    title: 'The menu',
    text: 'Every page is in here: the community, the factions, the rules and the store.',
    phoneOnly: true,
  },
  {
    find: dropdown('Community'),
    title: 'Community',
    text: () => `${groupHints('Community')}: the people of the city and what’s going on.`,
  },
  {
    find: dropdown('Factions'),
    title: 'Factions',
    text: () => `${groupHints('Factions')}: who runs the streets.`,
  },
  {
    find: () => [...document.querySelectorAll('.site-nav__link')].find((a) => a.getAttribute('href') === '/rules'),
    title: 'Rules',
    text: 'Read these before you play: everyone in the city follows them.',
  },
  {
    find: () => document.querySelector('.site-header__city'),
    title: 'Players in the city',
    text: 'How many people are on the server right now.',
  },
  {
    find: () => document.querySelector('.site-nav__social'),
    title: 'Join the community',
    text: 'Our Discord and other channels. Applying to play starts on Discord.',
  },
  {
    find: () => document.querySelector('.site-header__bell'),
    title: 'Live alerts',
    text: 'What’s happening in the city right now, when the team posts it.',
  },
  {
    find: () => document.querySelector('.site-header__music'),
    title: 'Music',
    text: 'Turn the city’s music on or off.',
  },
  {
    find: () => document.querySelector('.chatw__launcher'),
    title: 'Questions?',
    text: 'Ask here: answers come from the rule book, and you can reach the staff.',
  },
  {
    title: 'You’re all set',
    text: 'Have a look around. You can take this tour again from the bottom of any page.',
    last: true,
  },
]

const visible = (el) => {
  if (!el) return null
  const r = el.getBoundingClientRect()
  if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > window.innerHeight) return null
  return getComputedStyle(el).visibility === 'hidden' ? null : r
}

/** The steps that apply on this screen right now. */
function stepsHere() {
  const phone = window.matchMedia('(max-width: 1023px)').matches && !!visible(document.querySelector('.site-header__toggle'))
  return STEPS.filter((s) => {
    if (!s.find) return true
    if (s.phoneOnly && !phone) return false
    return !!visible(s.find())
  })
}

export default function SiteTour({ ready }) {
  const [steps, setSteps] = useState(null) // null: not running
  const [at, setAt] = useState(0)
  const [box, setBox] = useState(null) // the spotlight's rectangle, or null for a centred card
  const next = useRef(null)
  const card = useRef(null)
  const [cardH, setCardH] = useState(200) // the card's height, to place it above or below

  const start = useCallback(() => {
    const list = stepsHere()
    setAt(0)
    setSteps(list)
  }, [])
  const finish = useCallback(() => {
    remember()
    setSteps(null)
  }, [])

  // first visit: once the welcome screen has gone and the page has settled
  useEffect(() => {
    if (!ready || remembered()) return undefined
    const t = setTimeout(start, 1400)
    return () => clearTimeout(t)
  }, [ready, start])

  // the footer's "Site tour" button
  useEffect(() => {
    window.addEventListener(START, start)
    return () => window.removeEventListener(START, start)
  }, [start])

  const step = steps?.[at]

  // follow the part being shown (it can move: the header tucks away, the window resizes)
  useLayoutEffect(() => {
    if (!step) return undefined
    let raf = 0
    const measure = () => {
      const r = step.find ? visible(step.find()) : null
      setBox((old) => {
        if (!r) return null
        const pad = 8
        const nb = { x: r.left - pad, y: r.top - pad, w: r.width + pad * 2, h: r.height + pad * 2 }
        return old && Math.abs(old.x - nb.x) < 0.5 && Math.abs(old.y - nb.y) < 0.5 && old.w === nb.w && old.h === nb.h ? old : nb
      })
    }
    const loop = () => {
      measure()
      raf = requestAnimationFrame(loop)
    }
    // the header hides on scroll; bring it back while the tour points at it
    document.querySelector('.site-header')?.classList.remove('is-tucked')
    loop()
    return () => cancelAnimationFrame(raf)
  }, [step])

  // keys: → / Enter next, ← back, Esc skip
  useEffect(() => {
    if (!steps) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') finish()
      else if (e.key === 'ArrowRight') setAt((i) => Math.min(i + 1, steps.length - 1))
      else if (e.key === 'ArrowLeft') setAt((i) => Math.max(i - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [steps, finish])

  useEffect(() => {
    if (step) next.current?.focus({ preventScroll: true })
  }, [step])
  useLayoutEffect(() => {
    if (card.current) setCardH(card.current.offsetHeight)
  }, [at, steps])

  if (!steps || !step) return null

  // the card sits under the part shown (or above it, near the bottom of the screen), kept on screen
  const vw = window.innerWidth
  const vh = window.innerHeight
  const cardW = Math.min(340, vw - 24)
  let pos = { left: (vw - cardW) / 2, top: Math.max(16, vh / 2 - 120) }
  let arrow = null
  if (box) {
    const below = box.y + box.h + 14
    const cx = box.x + box.w / 2
    const left = Math.max(12, Math.min(vw - cardW - 12, cx - cardW / 2))
    if (below + cardH < vh - 12) {
      pos = { left, top: below }
      arrow = { side: 'top', x: cx - left }
    } else {
      pos = { left, top: Math.max(12, box.y - 14 - cardH) }
      arrow = { side: 'bottom', x: cx - left }
    }
  }
  // the ghost: beside the part shown, on the roomier side, pointing at it and looking at it;
  // with nothing to show, waving from just above the card
  const G = vw < 600 ? 56 : 80
  let ghost
  if (box) {
    const cx = box.x + box.w / 2
    const cy = box.y + box.h / 2
    const onLeft = cx > vw / 2 // the part is on the right: float on its left, pointing right
    const gx = onLeft ? box.x - G - 6 : box.x + box.w + 6
    const gy = Math.max(6, Math.min(vh - G * 1.1 - 6, cy - G * 0.6))
    const ex = cx - (gx + G / 2)
    const ey = cy - (gy + G * 0.45)
    const d = Math.hypot(ex, ey) || 1
    ghost = {
      x: Math.max(4, Math.min(vw - G - 4, gx)),
      y: gy,
      flip: !onLeft,
      look: { x: (ex / d) * 3.5 * (onLeft ? 1 : -1), y: (ey / d) * 2.5 },
      waving: false,
    }
  } else {
    ghost = { x: pos.left + cardW / 2 - G / 2, y: Math.max(4, pos.top - G * 1.1 + 8), flip: false, look: { x: 0, y: 2 }, waving: true }
  }
  const text = typeof step.text === 'function' ? step.text() : step.text
  const isLast = at === steps.length - 1

  return createPortal(
    <div className={`tour ${box ? 'has-spot' : 'is-centred'}`}>
      {/* the dimmed screen, with the spotlight cut out of it */}
      <div
        className="tour__spot"
        aria-hidden="true"
        style={
          box
            ? { transform: `translate3d(${box.x}px, ${box.y}px, 0)`, width: box.w, height: box.h }
            : { transform: `translate3d(${vw / 2}px, ${vh / 2}px, 0)`, width: 0, height: 0 }
        }
      />
      <div className="tour__catch" aria-hidden="true" />
      <GhostBot {...ghost} size={G} />

      <section
        ref={card}
        key={at}
        className="tour__card"
        role="dialog"
        aria-modal="false"
        aria-labelledby="tour-title"
        aria-describedby="tour-text"
        style={{ left: pos.left, top: pos.top, width: cardW, '--arrow-x': arrow ? `${arrow.x}px` : '50%' }}
        data-arrow={arrow?.side}
      >
        <p className="tour__count" aria-live="polite">
          {at + 1} / {steps.length}
        </p>
        <h2 id="tour-title" className="tour__title">
          {step.title}
        </h2>
        <p id="tour-text" className="tour__text">
          {text}
        </p>
        <div className="tour__dots" aria-hidden="true">
          {steps.map((s, i) => (
            <i key={s.title} className={i === at ? 'is-on' : i < at ? 'is-done' : ''} />
          ))}
        </div>
        <div className="tour__actions">
          {!isLast && (
            <button type="button" className="tour__skip" onClick={finish}>
              Skip tour
            </button>
          )}
          {at > 0 && (
            <button type="button" className="tour__btn tour__btn--ghost" onClick={() => setAt(at - 1)}>
              Back
            </button>
          )}
          {isLast && applyLink.href && (
            <a className="tour__btn tour__btn--ghost" href={applyLink.href} target="_blank" rel="noopener noreferrer" onClick={finish}>
              {applyLink.label}
            </a>
          )}
          <button ref={next} type="button" className="tour__btn" onClick={() => (isLast ? finish() : setAt(at + 1))}>
            {at === 0 ? 'Show me' : isLast ? 'Done' : 'Next'}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  )
}

/**
 * The tour's guide: a little ghost bot (our own character: an ivory ghost with a dark visor,
 * glowing gold eyes and an antenna). It floats beside whatever is being shown, points at it
 * and looks at it; on the first and last cards it waves from above the card.
 */
function GhostBot({ x, y, flip, look, waving, size }) {
  return (
    <div className="tour-ghost" aria-hidden="true" style={{ transform: `translate3d(${x}px, ${y}px, 0)`, width: size, height: size * 1.1 }}>
      <div className="tour-ghost__float">
        <svg viewBox="0 0 100 110" className={`tour-ghost__svg ${flip ? 'is-flipped' : ''} ${waving ? 'is-waving' : ''}`}>
          <defs>
            <linearGradient id="tour-ghost-body" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fffaf0" />
              <stop offset="0.7" stopColor="#efe8f6" stopOpacity="0.95" />
              <stop offset="1" stopColor="#d9cfe8" stopOpacity="0.7" />
            </linearGradient>
          </defs>
          {/* antenna, with a glowing tip */}
          <line x1="50" y1="14" x2="50" y2="5" stroke="#d9cfe8" strokeWidth="3" strokeLinecap="round" />
          <circle className="tour-ghost__bulb" cx="50" cy="5" r="4.5" fill="#f6c75a" />
          {/* the pointing (or waving) arm, behind the body */}
          <path className="tour-ghost__arm" d="M80 62 Q94 58 97 47" fill="none" stroke="#f3eef8" strokeWidth="8" strokeLinecap="round" />
          {/* body, with a wavy hem */}
          <path
            d="M50 12 C27 12 15 30 15 52 L15 92 Q22 104 30 94 Q38 84 46 96 Q54 106 62 94 Q70 84 78 96 Q84 103 85 92 L85 52 C85 30 73 12 50 12 Z"
            fill="url(#tour-ghost-body)"
          />
          {/* visor and eyes */}
          <rect x="24" y="35" width="52" height="23" rx="11.5" fill="#16131b" />
          <g className="tour-ghost__eyes" style={{ transform: `translate(${look.x}px, ${look.y}px)` }}>
            <g className="tour-ghost__blink">
              <ellipse cx="40" cy="46.5" rx="5" ry="6" fill="#f6c75a" />
              <ellipse cx="60" cy="46.5" rx="5" ry="6" fill="#f6c75a" />
              <circle cx="41.8" cy="44.2" r="1.6" fill="#fff6dc" />
              <circle cx="61.8" cy="44.2" r="1.6" fill="#fff6dc" />
            </g>
          </g>
          {/* cheeks and a small smile */}
          <ellipse cx="30" cy="65" rx="5" ry="3" fill="#f6c75a" opacity="0.3" />
          <ellipse cx="70" cy="65" rx="5" ry="3" fill="#f6c75a" opacity="0.3" />
          <path d="M45 66 Q50 71 55 66" fill="none" stroke="#16131b" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
        <span className="tour-ghost__shadow" />
      </div>
    </div>
  )
}
